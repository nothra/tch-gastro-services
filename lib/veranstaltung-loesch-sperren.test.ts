import { describe, it, expect } from "vitest";
import {
  loeschSperreMeldung,
  loeschSperren,
  loeschSperrenBeschreibung,
} from "./veranstaltung-loesch-sperren";

const leer = { zeilen: [], positionen: [], auslagen: [] };
const nichtKassiert = { erhaltenCents: null };

describe("loeschSperren (spec-372 AK9/AK10, ADR-058 D3)", () => {
  it("should_returnEmpty_when_nothingRecorded", () => {
    expect(loeschSperren(leer)).toEqual([]);
  });

  it("should_returnVerzehr_when_positionHasMengeAboveZero", () => {
    expect(loeschSperren({ ...leer, positionen: [{ menge: 2 }] })).toEqual(["verzehr"]);
  });

  it("should_ignorePosition_when_mengeIsZero", () => {
    // Hoch- und wieder runtergezählt ist kein Verzehr (#346 AK4, #352 FS1).
    expect(loeschSperren({ ...leer, positionen: [{ menge: 0 }] })).toEqual([]);
  });

  it("should_returnKassiert_when_zeileHasErhalten", () => {
    // Auch 0 € erhalten ist kassiert – nur `null` heißt „noch nicht kassiert".
    const zeilen = [nichtKassiert, { erhaltenCents: 0 }];
    expect(loeschSperren({ ...leer, zeilen })).toEqual(["kassiert"]);
  });

  it("should_ignoreZeilen_when_noneKassiert", () => {
    expect(loeschSperren({ ...leer, zeilen: [nichtKassiert] })).toEqual([]);
  });

  it("should_returnAuslage_when_anyAuslageExists", () => {
    expect(loeschSperren({ ...leer, auslagen: [{}] })).toEqual(["auslage"]);
  });

  it("should_returnAllInOrderVerzehrKassiertAuslage_when_allApply", () => {
    // Q5: alle zutreffenden Gründe, Reihenfolge fest – unabhängig von der Eingabe-Reihenfolge.
    const sperren = loeschSperren({
      auslagen: [{}],
      zeilen: [{ erhaltenCents: 1500 }],
      positionen: [{ menge: 1 }],
    });
    expect(sperren).toEqual(["verzehr", "kassiert", "auslage"]);
  });
});

describe("loeschSperreMeldung – Ablehnung der Action (AK11)", () => {
  it.each([
    ["verzehr", "Löschen nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst."],
    ["kassiert", "Löschen nicht möglich: für diese Veranstaltung ist bereits Geld kassiert."],
    [
      "auslage",
      "Löschen nicht möglich: für diese Veranstaltung ist bereits eine Auslage erstattet oder erfasst.",
    ],
  ] as const)("should_nameReason_when_sperre_%s", (sperre, meldung) => {
    expect(loeschSperreMeldung(sperre)).toBe(meldung);
  });
});

describe("loeschSperrenBeschreibung – Text im Dialog (AK9)", () => {
  it("should_nameSingleReason_when_oneSperre", () => {
    expect(loeschSperrenBeschreibung("Montagsrunde", ["kassiert"])).toBe(
      "Für „Montagsrunde“ ist bereits Geld kassiert.",
    );
  });

  it("should_joinTwoReasonsWithUnd_when_twoSperren", () => {
    expect(loeschSperrenBeschreibung("Montagsrunde", ["verzehr", "auslage"])).toBe(
      "Für „Montagsrunde“ ist bereits Verzehr erfasst und bereits eine Auslage erstattet oder erfasst.",
    );
  });

  it("should_listAllReasonsInGivenOrder_when_threeSperren", () => {
    expect(loeschSperrenBeschreibung("M", ["verzehr", "kassiert", "auslage"])).toBe(
      "Für „M“ ist bereits Verzehr erfasst, bereits Geld kassiert und bereits eine Auslage erstattet oder erfasst.",
    );
  });
});
