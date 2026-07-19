import { describe, it, expect } from "vitest";
import {
  KASSE_LABEL,
  STATUS_LABEL,
  AUSLAGE_KATEGORIE_LABEL,
  AUSLAGE_KATEGORIE_ORDER,
  AUSLAGE_STATUS_LABEL,
  EREIGNIS_ART_LABEL,
  formatDatum,
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
