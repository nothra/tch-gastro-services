import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  readErfasserId,
  readZielId,
  writeErfasserId,
  writeZielId,
  clearIdentitaet,
  adoptLegacyErfasser,
  type IdentitaetZeile,
} from "./erfasser-ziel-storage";

const TOKEN = "tok-1";
const ERFASSER_KEY = `tch:sb:erfasser:${TOKEN}`;
const ZIEL_KEY = `tch:sb:ziel:${TOKEN}`;
const LEGACY_KEY = `tch:sb:name:${TOKEN}`;

const zeilen: IdentitaetZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readErfasserId / readZielId", () => {
  it("should_returnStoredId_when_idInList", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    expect(readErfasserId(TOKEN, zeilen)).toBe("z1");
    expect(readZielId(TOKEN, zeilen)).toBe("z2");
  });

  it("should_returnNull_when_nothingStored", () => {
    expect(readErfasserId(TOKEN, zeilen)).toBeNull();
    expect(readZielId(TOKEN, zeilen)).toBeNull();
  });

  it("should_returnNull_when_storedIdStale", () => {
    // Gemerkte ID zeigt nicht (mehr) auf eine aktuelle Zeile → Stale-Fallback (D4).
    window.localStorage.setItem(ERFASSER_KEY, "z-weg");
    window.localStorage.setItem(ZIEL_KEY, "z-weg");

    expect(readErfasserId(TOKEN, zeilen)).toBeNull();
    expect(readZielId(TOKEN, zeilen)).toBeNull();
  });

  it("should_returnNull_when_storageThrows", () => {
    // localStorage nicht verfügbar (privater Modus) → fail-open, kein Throw (D4).
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => readErfasserId(TOKEN, zeilen)).not.toThrow();
    expect(readErfasserId(TOKEN, zeilen)).toBeNull();
  });
});

describe("writeErfasserId / writeZielId", () => {
  it("should_persistId_when_written", () => {
    writeErfasserId(TOKEN, "z1");
    writeZielId(TOKEN, "z2");

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBe("z1");
    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z2");
  });

  it("should_notThrow_when_storageThrows", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });

    expect(() => writeErfasserId(TOKEN, "z1")).not.toThrow();
    expect(() => writeZielId(TOKEN, "z2")).not.toThrow();
  });
});

describe("clearIdentitaet", () => {
  it("should_removeBothKeys_when_cleared", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    clearIdentitaet(TOKEN);

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBeNull();
    expect(window.localStorage.getItem(ZIEL_KEY)).toBeNull();
  });
});

describe("adoptLegacyErfasser (D6)", () => {
  it("should_adoptNameAsErfasserIdAndRemoveLegacy_when_nameMatchesZeile", () => {
    window.localStorage.setItem(LEGACY_KEY, "Anna");

    adoptLegacyErfasser(TOKEN, zeilen);

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBe("z1");
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(readErfasserId(TOKEN, zeilen)).toBe("z1");
  });

  it("should_removeLegacyWithoutAdopting_when_nameNotInList", () => {
    window.localStorage.setItem(LEGACY_KEY, "Cäcilia");

    adoptLegacyErfasser(TOKEN, zeilen);

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it("should_doNothing_when_erfasserAlreadySet", () => {
    // Idempotenz: existiert bereits ein Erfasser, bleibt der Alt-Schlüssel unangetastet.
    window.localStorage.setItem(ERFASSER_KEY, "z2");
    window.localStorage.setItem(LEGACY_KEY, "Anna");

    adoptLegacyErfasser(TOKEN, zeilen);

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBe("z2");
    expect(window.localStorage.getItem(LEGACY_KEY)).toBe("Anna");
  });

  it("should_doNothing_when_noLegacyKey", () => {
    adoptLegacyErfasser(TOKEN, zeilen);

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBeNull();
  });
});
