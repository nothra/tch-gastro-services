// Best-Effort-Rate-Limiter für den öffentlichen /api/health-Endpunkt (ADR-019).
// Zweck: die DB-Amplifikation auf Neon-Free deckeln, ohne einen geteilten Store, Secrets
// oder eine Netz-Abhängigkeit im kritischen Deploy-Gate-Pfad einzuführen.
//
// Fixed-Window pro Function-Instanz: reine O(1)-Arithmetik, kein I/O → der Throttle-Pfad
// ist immer billiger als der DB-Read (FS-3). Cold-Start = frischer Zähler = durchlassen →
// strukturell fail-open (FS-1).

export interface RateLimiterOptions {
  /** Erlaubte Anfragen pro Fenster (Produktion: 30). */
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
