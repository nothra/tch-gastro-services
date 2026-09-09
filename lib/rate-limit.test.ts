import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createKeyedRateLimiter,
  createRateLimiter,
  selfServiceVerzehrRateLimiter,
  thekeActionRateLimiter,
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
    // Pinnt genau eine Zusicherung: Das Singleton startet mit einem **positiven** Budget, eine
    // frische Function-Instanz lässt also durch (die Umsetzung von FS-1 ist strukturell – der
    // Modul-Zustand selbst, nicht ein Fehlerpfad). Absichtlich schwach: Über `tryAcquire` allein
    // kann dieser Fall nur rot werden, wenn `limit <= 0` konfiguriert wäre; die scharfe
    // Parameter-Zusicherung liefert der Test darunter. `resetModules` + Re-Import ist dabei der
    // echte Cold-Start: ein eigenes Modul-Objekt mit eigenem Zähler, das das Budget des
    // Singletons unten nicht anfasst (der globale Zähler hat keinen Schlüssel zur Isolation).
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

describe("thekeActionRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should_allow240ThenThrottleUntilWindowElapsed_when_globalCounter", () => {
    // Pinnt beide produktiv verdrahteten Parameter des Schreib-Budgets (240 Anfragen je 60 s,
    // ADR-048 D5) am echten Singleton. Es ist bewusst ein **eigenes** Objekt: Ein gemeinsames
    // Budget mit dem Lesepfad ließe einen Lese-Flood die Erfassung mit abwürgen (AK-7). Fake-Uhr
    // wie beim Lese-Singleton über die Importzeit hinaus, damit das Fenster garantiert frisch ist.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3_600_000);

    for (let i = 0; i < 240; i++) {
      expect(thekeActionRateLimiter.tryAcquire()).toBe(true);
    }
    expect(thekeActionRateLimiter.tryAcquire()).toBe(false);

    vi.advanceTimersByTime(59_999);
    expect(thekeActionRateLimiter.tryAcquire()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(thekeActionRateLimiter.tryAcquire()).toBe(true);
  });

  it("should_keepSeparateBudget_when_readBudgetExhausted", () => {
    // Der Kern der Trennung: Ein ausgeschöpftes Lesebudget lässt das Schreib-Budget unberührt.
    // Ohne eigene Zähler-Instanz wäre dieser Test grün, ohne dass AK-7 gilt.
    //
    // Der Sprung ist doppelt so groß wie die +1 h der Tests darüber, und das ist Absicht mit
    // Reihenfolge-Semantik: Diese Datei teilt sich die produktiven Singletons über alle
    // `describe`-Blöcke hinweg. Die Tests darüber haben die Fake-Uhr bis ~+1 h + 60 s vorgestellt
    // und dort zuletzt gezählt – beide Singletons stehen seither mit count 1 in einem Fenster, das
    // dort beginnt. Nochmals +1 h läge *vor* diesem Fenster-Start, die Zähler liefen also mit
    // vorbelastetem Stand weiter und die Prämisse „240 sind hier frei" wäre falsch (empirisch:
    // mit +1 h liefert bereits der 240. `tryAcquire` der Schleife `false`). +2 h liegt garantiert
    // jenseits davon – beide Zähler beginnen hier ein frisches Fenster.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 7_200_000);

    for (let i = 0; i < 240; i++) thekeReadRateLimiter.tryAcquire();
    expect(thekeReadRateLimiter.tryAcquire()).toBe(false);

    expect(thekeActionRateLimiter.tryAcquire()).toBe(true);
  });
});
