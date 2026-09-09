// Best-Effort-Rate-Limiter für die öffentlichen Grenzen der App – kanonische Quelle der
// Fixed-Window-Arithmetik. Zwei Ausprägungen auf derselben Kernlogik:
//   1. `createRateLimiter` – ein globaler Zähler, für den /api/health-Endpunkt (ADR-020) sowie
//      für Lese- und Server-Action-Pfad der öffentlichen Theken-Route im Proxy (ADR-048).
//   2. `createKeyedRateLimiter` – ein Zähler je Schlüssel, für die token-scoped
//      Selbstbedienungs-Action (ADR-044).
// Zweck in beiden Fällen: die DB-Amplifikation auf Neon-Free deckeln, ohne einen geteilten
// Store, Secrets oder eine Netz-Abhängigkeit im Schreib-/Gate-Pfad einzuführen.
//
// Fixed-Window pro Function-Instanz: reine O(1)-Arithmetik, kein I/O → der Throttle-Pfad
// ist immer billiger als der DB-Read (FS-3). Cold-Start = frischer Zähler = durchlassen →
// strukturell fail-open (FS-1).

export interface RateLimiterOptions {
  /** Erlaubte Anfragen pro Fenster – die produktiven Werte stehen an den Singletons unten. */
  limit: number;
  /** Fensterlänge in Millisekunden – die produktiven Werte stehen an den Singletons unten. */
  windowMs: number;
  /** Injizierbare Uhr für deterministische Tests. Default: () => Date.now(). */
  now?: () => number;
}

export interface RateLimiter {
  /** true = erlaubt (weiter zum DB-Read), false = gedrosselt (ohne Side-Effect ablehnen). */
  tryAcquire(): boolean;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options;
  const now = options.now ?? (() => Date.now());

  let count = 0;
  let windowStart = now();

  return {
    tryAcquire(): boolean {
      const current = now();
      if (current - windowStart >= windowMs) {
        windowStart = current;
        count = 0;
      }
      if (count < limit) {
        count++;
        return true;
      }
      return false;
    },
  };
}

export const healthRateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

// Fensterlänge beider Theken-Zähler (ADR-048 D2). Exportiert, weil die Drossel-Antwort ihren
// `Retry-After`-Header daraus ableitet (lib/theke-throttle-response.ts) – zwei unabhängige
// 60er-Literale in zwei Modulen wären eine behauptete, aber unerzwungene Kopplung (#142).
export const THEKE_RATE_LIMIT_WINDOW_MS = 60_000;

// Lesepfad der öffentlichen Theken-Route, ausgewertet im Proxy vor der Seite (ADR-048 D1/D2).
// Bewusst EIN globaler Zähler statt eines je Token: das Token ist hier ein frei wählbares
// URL-Segment, jeder Zufallswert wäre also ein neuer Schlüssel mit frischem Budget – die
// Pro-Schlüssel-Dimension aus ADR-044 liefe gegen genau den Angriff leer, den sie deckeln soll.
// 240/60 s = ~40 gleichzeitige Teilnehmer × ~4 Lese-Anfragen/min plus ~50 % Puffer.
export const thekeReadRateLimiter = createRateLimiter({
  limit: 240,
  windowMs: THEKE_RATE_LIMIT_WINDOW_MS,
});

// Zweitbudget für POSTs auf `/theke/*`, die sich als Server-Action ausweisen (ADR-048 D5).
// Getrennt vom Lesebudget, damit ein Lese-Flood die Erfassung an der Theke nicht mit abwürgt
// (AK-7) – aber eben nicht ungedeckelt: Der Ausweis ist ein Header, den jeder setzen kann, und
// eine Anfrage mit ungültiger Action-ID rendert die Seite trotzdem (am Dev-Server gemessen).
// 240/60 s: Reale Erfassung erreicht das nie, weil ADR-044 pro Token bereits bei 60/Fenster
// abriegelt – die Grenze greift erst jenseits von vier parallel geführten Veranstaltungen.
export const thekeActionRateLimiter = createRateLimiter({
  limit: 240,
  windowMs: THEKE_RATE_LIMIT_WINDOW_MS,
});

export interface KeyedRateLimiter {
  /** true = erlaubt, false = gedrosselt – pro key ein eigenes Fenster. */
  tryAcquire(key: string): boolean;
}

// Ein Zähler je Schlüssel (ADR-044 D1), lazy angelegt: ein unbekannter Schlüssel bekommt ein
// frisches Fenster und wird durchgelassen. Keine Eviction alter Einträge (ADR-044 D2, YAGNI) –
// die Map wächst mit der Zahl unterschiedlicher Schlüssel, nicht mit der Zahl der Anfragen.
export function createKeyedRateLimiter(options: RateLimiterOptions): KeyedRateLimiter {
  const limiters = new Map<string, RateLimiter>();

  return {
    tryAcquire(key: string): boolean {
      let limiter = limiters.get(key);
      if (!limiter) {
        limiter = createRateLimiter(options);
        limiters.set(key, limiter);
      }
      return limiter.tryAcquire();
    },
  };
}

// Schlüssel = Veranstaltungs-Token der öffentlichen Selbstbedienungs-Action (ADR-044 D3).
// Großzügiger als der Health-Wert, weil hier reale gleichzeitige menschliche Nutzung an der
// Theke bedient wird.
export const selfServiceVerzehrRateLimiter = createKeyedRateLimiter({
  limit: 60,
  windowMs: 60_000,
});
