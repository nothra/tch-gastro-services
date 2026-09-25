import { describe, it, expect } from "vitest";
import {
  KASSE_LABEL,
  STATUS_LABEL,
  AUSLAGE_KATEGORIE_LABEL,
  AUSLAGE_KATEGORIE_ORDER,
  AUSLAGE_STATUS_LABEL,
  EREIGNIS_ART_LABEL,
  formatDatum,
  formatDatumInput,
  formatZeitpunkt,
} from "./labels";

describe("formatDatum", () => {
  it("should_formatDateInUtc_when_dateGiven", () => {
    expect(formatDatum(new Date("2026-07-13"))).toBe("13.07.2026");
  });

  it("should_returnDash_when_null", () => {
    expect(formatDatum(null)).toBe("—");
  });
});

describe("formatDatumInput", () => {
  it("should_formatAsIsoDayInUtc_when_dateGiven", () => {
    // #352 AK1: die Vorbelegung des <input type="date"> braucht exakt "YYYY-MM-DD". In UTC
    // formatiert, damit eine westliche Zeitzone den Tag nicht auf den Vortag zurückzieht.
    expect(formatDatumInput(new Date("2026-07-13"))).toBe("2026-07-13");
  });

  it("should_keepUtcDay_when_localTimezoneWouldShiftIt", () => {
    // UTC-Mitternacht ist in Amerika noch der Vortag – eine `getFullYear()`-basierte
    // Formatierung lieferte hier den 12.07. und das Formular zeigte das falsche Datum. Ein
    // negativer Offset ist nötig, um das trennscharf zu prüfen: unter der Berlin-Runner-TZ
    // (positiver Offset) würde dieselbe Mutante keinen Tag zurückfallen und der Test bliebe
    // grün aus dem falschen Grund (Review-Runde 3/4, Nitpick – eigene Zeitzonen-Probe belegt
    // das). `TZ` lässt sich in Node zur Laufzeit ändern, `getFullYear()`/`getDate()` lesen sie
    // pro Aufruf neu.
    const zuvor = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(formatDatumInput(new Date("2026-07-13T00:00:00.000Z"))).toBe("2026-07-13");
    } finally {
      process.env.TZ = zuvor;
    }
  });

  it("should_returnEmptyString_when_null", () => {
    // `veranstaltung.datum` ist typseitig `Date | null` (die Theke hat keins) – ein leerer
    // Wert ist die einzige Vorbelegung, die ein date-Input akzeptiert.
    expect(formatDatumInput(null)).toBe("");
  });
});

describe("formatZeitpunkt", () => {
  it("should_formatDateAndTimeInBerlinZone_when_timestampGiven", () => {
    // 2026-07-13T18:30:00Z ist in Europe/Berlin (Sommerzeit, +02:00) der 13.07. um 20:30.
    expect(formatZeitpunkt(new Date("2026-07-13T18:30:00Z"))).toBe("13.07.2026, 20:30");
  });
});

describe("labels", () => {
  it("should_provideGermanKasseLabels", () => {
    expect(KASSE_LABEL.montagsrunde).toBe("Montagsrunde");
    expect(KASSE_LABEL.vereinskasse).toBe("Vereinskasse");
  });

  it("should_provideStatusLabels", () => {
    expect(STATUS_LABEL.offen).toBe("offen");
    expect(STATUS_LABEL.abgeschlossen).toBe("abgeschlossen");
  });

  it("should_provideAllThreeAuslageKategorieLabels", () => {
    expect(AUSLAGE_KATEGORIE_LABEL.getraenke).toBe("Getränke");
    expect(AUSLAGE_KATEGORIE_LABEL.essen).toBe("Essen");
    expect(AUSLAGE_KATEGORIE_LABEL.sonstiges).toBe("Sonstiges");
  });

  it("should_provideAuslageStatusLabels", () => {
    expect(AUSLAGE_STATUS_LABEL.offen).toBe("offen zu erstatten");
    expect(AUSLAGE_STATUS_LABEL.erstattet).toBe("erstattet");
  });

  it("should_provideEreignisArtLabels", () => {
    expect(EREIGNIS_ART_LABEL.abgeschlossen).toBe("Abgeschlossen");
    expect(EREIGNIS_ART_LABEL.wiedereroeffnet).toBe("Wiedereröffnet");
  });

  it("should_orderAllThreeKategorien_when_ordering", () => {
    expect(AUSLAGE_KATEGORIE_ORDER).toEqual(["getraenke", "essen", "sonstiges"]);
  });
});
