import { describe, it, expect } from "vitest";
import {
  PERSONENBEZUG_PARAM,
  kassierenHref,
  personenbezogeneZeileId,
  verzehrHref,
} from "./personenbezug";

// Suchparameter einer Seite, wie Next.js sie liefert – hier direkt als Objekt aufgebaut.
function suchparameter(werte: Record<string, string | string[] | undefined>) {
  return werte;
}

// Liest die Suchparameter aus einem von den Href-Bauern erzeugten Link zurück – so prüft der
// Round-Trip-Test beide Seiten (Bauen + Lesen) gegen dieselbe Parameter-Konstante.
function suchparameterAusHref(href: string): Record<string, string> {
  return Object.fromEntries(new URL(href, "https://tch.example").searchParams);
}

describe("personenbezug", () => {
  it("should_buildKassierenHrefWithPersonenbezug_when_zeileGiven", () => {
    expect(kassierenHref("v-1", "z-7")).toBe("/veranstaltung/v-1/kassieren?zeile=z-7");
  });

  it("should_buildVerzehrHrefWithPersonenbezug_when_zeileGiven", () => {
    expect(verzehrHref("v-1", "z-7")).toBe("/veranstaltung/v-1/verzehr?zeile=z-7");
  });

  it("should_encodeZeileId_when_idContainsUrlSyntax", () => {
    expect(kassierenHref("v-1", "z 7&x=1")).toBe("/veranstaltung/v-1/kassieren?zeile=z+7%26x%3D1");
  });

  it("should_resolveOwnHref_when_roundTripped", () => {
    const gelesen = suchparameterAusHref(verzehrHref("v-1", "z-7"));

    expect(personenbezogeneZeileId(gelesen, ["z-1", "z-7"])).toBe("z-7");
  });

  it("should_returnZeileId_when_paramMatchesKnownZeile", () => {
    expect(personenbezogeneZeileId(suchparameter({ zeile: "z-2" }), ["z-1", "z-2"])).toBe("z-2");
  });

  it("should_returnNull_when_paramMissing", () => {
    expect(personenbezogeneZeileId(suchparameter({}), ["z-1"])).toBeNull();
  });

  it("should_returnNull_when_zeileIsUnknown", () => {
    // F1: getilgte Zeile, Zeile einer anderen Veranstaltung oder Zufallswert – fail-soft.
    expect(personenbezogeneZeileId(suchparameter({ zeile: "z-fremd" }), ["z-1"])).toBeNull();
  });

  it("should_returnNull_when_paramGivenSeveralTimes", () => {
    // `?zeile=z-1&zeile=z-2` liefert ein Array – kein Personenbezug statt „erster gewinnt".
    expect(personenbezogeneZeileId(suchparameter({ zeile: ["z-1", "z-2"] }), ["z-1"])).toBeNull();
  });

  it("should_returnNull_when_noZeilenExist", () => {
    // F3: Veranstaltung ohne Teilnehmer.
    expect(personenbezogeneZeileId(suchparameter({ zeile: "z-1" }), [])).toBeNull();
  });

  it("should_useOneParamNameForBuildingAndReading", () => {
    // Drift-Guard: beide Href-Bauer und der Leser hängen an derselben Konstante.
    expect(suchparameterAusHref(kassierenHref("v-1", "z-3"))).toEqual({
      [PERSONENBEZUG_PARAM]: "z-3",
    });
  });
});
