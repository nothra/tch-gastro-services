// Best-Effort-Rate-Limiter für die öffentlichen Grenzen der App – kanonische Quelle der
// Fixed-Window-Arithmetik. Zwei Ausprägungen auf derselben Kernlogik:
//   1. `createRateLimiter` – ein globaler Zähler, für den /api/health-Endpunkt (ADR-020).
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
  /** Fensterlänge in Millisekunden (Produktion: 60_000). */
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
