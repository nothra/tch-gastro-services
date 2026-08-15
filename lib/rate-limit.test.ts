import { describe, it, expect } from "vitest";
import {
  createKeyedRateLimiter,
  createRateLimiter,
  selfServiceVerzehrRateLimiter,
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

  it("should_throttleKey_when_limitExceededWithinWindow", () => {
    const limiter = createKeyedRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });

    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(false);
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
  it("should_allow60AndThrottle61st_when_sameTokenWithinWindow", () => {
    // AK-2: die produktiv verdrahteten Parameter (60/60 s, ADR-044 D1). Der Zähler eines
    // Schlüssels startet beim ersten Zugriff – 61 synchrone Aufrufe liegen sicher im Fenster.
    const token = "spec-182-parameter-probe";

    for (let i = 0; i < 60; i++) {
      expect(selfServiceVerzehrRateLimiter.tryAcquire(token)).toBe(true);
    }

    expect(selfServiceVerzehrRateLimiter.tryAcquire(token)).toBe(false);
  });
});
