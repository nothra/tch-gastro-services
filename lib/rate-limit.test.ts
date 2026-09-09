import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createKeyedRateLimiter,
  createRateLimiter,
  selfServiceVerzehrRateLimiter,
  thekeReadRateLimiter,
} from "./rate-limit";

describe("createRateLimiter", () => {
  it("should_allowUpToLimit_when_withinWindow", () => {
    const clock = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => clock });

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("should_resetCounter_when_windowElapsed", () => {
    let clock = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => clock });

    limiter.tryAcquire();
    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);

    clock += 1000;
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("should_notResetCounter_when_stillInsideWindow", () => {
    let clock = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => clock });

    limiter.tryAcquire();
    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);

    clock += 999;
    expect(limiter.tryAcquire()).toBe(false);
  });
});

describe("createKeyedRateLimiter", () => {
  it("should_allowFirstCall_when_keyUnknown", () => {
    // FS-1 (ADR-044): Fail-open ist strukturell – ein noch nie gesehener Schlüssel bekommt
    // einen frischen Zähler und wird durchgelassen (Cold-Start-Äquivalent).
    const limiter = createKeyedRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });

    expect(limiter.tryAcquire("bislang-unbekannt")).toBe(true);
  });

  it("should_countKeysIndependently_when_oneKeyExhausted", () => {
    // AK-3/FS-2: ein geflutetes Token darf andere Veranstaltungen nicht mitdrosseln.
    const limiter = createKeyedRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });

    limiter.tryAcquire("a");
    limiter.tryAcquire("a");
    expect(limiter.tryAcquire("a")).toBe(false);

    expect(limiter.tryAcquire("b")).toBe(true);
    expect(limiter.tryAcquire("b")).toBe(true);
    expect(limiter.tryAcquire("b")).toBe(false);
  });

  it("should_resetKeyCounter_when_windowElapsed", () => {
    // AK-4: die injizierte Uhr wird an jeden inneren Zähler durchgereicht (ADR-044 D1).
    let clock = 0;
    const limiter = createKeyedRateLimiter({ limit: 2, windowMs: 1000, now: () => clock });

    limiter.tryAcquire("a");
    limiter.tryAcquire("a");
    expect(limiter.tryAcquire("a")).toBe(false);

    clock += 1000;
    expect(limiter.tryAcquire("a")).toBe(true);
  });

  it("should_notResetKeyCounter_when_stillInsideWindow", () => {
    let clock = 0;
    const limiter = createKeyedRateLimiter({ limit: 2, windowMs: 1000, now: () => clock });

    limiter.tryAcquire("a");
    limiter.tryAcquire("a");
    expect(limiter.tryAcquire("a")).toBe(false);

    clock += 999;
    expect(limiter.tryAcquire("a")).toBe(false);
  });

  it("should_useDefaultClock_when_nowNotInjected", () => {
    const limiter = createKeyedRateLimiter({ limit: 1, windowMs: 60_000 });

    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(false);
  });
});

describe("selfServiceVerzehrRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should_allow60ThenThrottleUntilWindowElapsed_when_sameToken", () => {
    // AK-2/AK-4: pinnt **beide** produktiv verdrahteten Parameter (60 Anfragen je 60 s,
    // spec-182 / ADR-044 D1) am echten Singleton. Die Fenster-Tests weiter oben laufen gegen
    // ad-hoc erzeugte Limiter mit `windowMs: 1000` und würden ein Vertippen an
    // `selfServiceVerzehrRateLimiter` nicht bemerken.
    // Fake-Uhr statt Wanduhr: Der Zähler eines Schlüssels wird lazy beim ersten `tryAcquire`
    // angelegt (ADR-044 D1) – der Fensterstart stammt also aus der bereits eingefrorenen
    // Fake-Zeit, ein Vorstellen der Systemzeit ist dafür nicht nötig.
    vi.useFakeTimers();
    const token = "spec-182-parameter-probe";

    for (let i = 0; i < 60; i++) {
      expect(selfServiceVerzehrRateLimiter.tryAcquire(token)).toBe(true);
    }
    expect(selfServiceVerzehrRateLimiter.tryAcquire(token)).toBe(false);

    vi.advanceTimersByTime(59_999);
    expect(selfServiceVerzehrRateLimiter.tryAcquire(token)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(selfServiceVerzehrRateLimiter.tryAcquire(token)).toBe(true);
  });
});

describe("thekeReadRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should_allowFirstRequest_when_coldStart", async () => {
    // FS-1 (spec-297): Fail-open ist strukturell – eine frisch gestartete Function-Instanz hat
    // einen Zähler bei 0 und lässt durch. `resetModules` + Re-Import ist der echte Cold-Start:
    // ein eigenes Modul-Objekt mit eigenem Zähler, das das Budget des Singletons im Test unten
    // nicht anfasst (der globale Zähler hat keinen Schlüssel zur Isolation).
    vi.resetModules();

    const { thekeReadRateLimiter: coldStarted } = await import("./rate-limit");

    expect(coldStarted.tryAcquire()).toBe(true);
  });

  it("should_allow240ThenThrottleUntilWindowElapsed_when_globalCounter", () => {
    // AK-9/AK-10/OF-2: pinnt **beide** produktiv verdrahteten Parameter (240 Anfragen je 60 s,
    // ADR-048 D2) am echten Singleton. Die Fenster-Tests weiter oben laufen gegen ad-hoc erzeugte
    // Limiter mit `windowMs: 1000` und würden ein Vertippen hier nicht bemerken.
    // Anders als die keyed-Variante startet der globale Zähler sein Fenster beim **Modul-Import**,
    // nicht lazy beim ersten Aufruf. Die Fake-Uhr wird deshalb um mehr als eine Fensterlänge über
    // die Importzeit hinaus gestellt – der erste `tryAcquire` unten beginnt damit garantiert ein
    // frisches Fenster bei 0, unabhängig davon, wie lange die Datei vorher schon geladen war.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3_600_000);

    for (let i = 0; i < 240; i++) {
      expect(thekeReadRateLimiter.tryAcquire()).toBe(true);
    }
    expect(thekeReadRateLimiter.tryAcquire()).toBe(false);

    vi.advanceTimersByTime(59_999);
    expect(thekeReadRateLimiter.tryAcquire()).toBe(false);

    // AK-9/FS-3: nach Fensterablauf wieder normal – kein Lockout über das Fenster hinaus.
    vi.advanceTimersByTime(1);
    expect(thekeReadRateLimiter.tryAcquire()).toBe(true);
  });
});
