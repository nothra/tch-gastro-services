import { describe, it, expect } from "vitest";
import { firstIssueMessage } from "@/lib/form-errors";
import {
  auslageSchema,
  auslageStatusSchema,
  veranstaltungSchema,
  verzehrAdjustSchema,
} from "./schema";

const valid = {
  bezeichnung: "Montagsrunde",
  datum: "2026-07-13",
  kasse: "montagsrunde",
};

describe("veranstaltungSchema", () => {
  it("should_parseAndTransformDatumToDate_when_inputValid", () => {
    const result = veranstaltungSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bezeichnung).toBe("Montagsrunde");
      expect(result.data.kasse).toBe("montagsrunde");
      expect(result.data.datum).toBeInstanceOf(Date);
      expect(result.data.datum.toISOString()).toContain("2026-07-13");
    }
  });

  it("should_trimBezeichnung_when_surroundedByWhitespace", () => {
    const result = veranstaltungSchema.safeParse({ ...valid, bezeichnung: "  Sommerfest  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bezeichnung).toBe("Sommerfest");
  });

  it("should_reject_when_bezeichnungEmpty", () => {
    const result = veranstaltungSchema.safeParse({ ...valid, bezeichnung: "   " });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_datumMissing", () => {
    const result = veranstaltungSchema.safeParse({ ...valid, datum: "" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_datumInvalid", () => {
    const result = veranstaltungSchema.safeParse({ ...valid, datum: "kein-datum" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_kasseNotInSet", () => {
    const result = veranstaltungSchema.safeParse({ ...valid, kasse: "sparkasse" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_bezeichnungTooLong", () => {
    const result = veranstaltungSchema.safeParse({ ...valid, bezeichnung: "x".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("verzehrAdjustSchema", () => {
  const validAdjust = { zeileId: "z1", catalogItemId: "c1", delta: "1" };

  it("should_coerceDeltaToNumber_when_plusOne", () => {
    const result = verzehrAdjustSchema.safeParse(validAdjust);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.delta).toBe(1);
  });

  it("should_acceptMinusOne_when_deltaMinusOne", () => {
    const result = verzehrAdjustSchema.safeParse({ ...validAdjust, delta: "-1" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.delta).toBe(-1);
  });

  it("should_reject_when_deltaTwo", () => {
    const result = verzehrAdjustSchema.safeParse({ ...validAdjust, delta: "2" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_deltaZero", () => {
    const result = verzehrAdjustSchema.safeParse({ ...validAdjust, delta: "0" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_catalogItemIdEmpty", () => {
    const result = verzehrAdjustSchema.safeParse({ ...validAdjust, catalogItemId: "" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_zeileIdEmpty", () => {
    const result = verzehrAdjustSchema.safeParse({ ...validAdjust, zeileId: "  " });
    expect(result.success).toBe(false);
  });

  it("should_reportDeltaMessage_when_deltaOutOfRange", () => {
    const result = verzehrAdjustSchema.safeParse({ ...validAdjust, delta: "5" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe("Änderung muss +1 oder −1 sein.");
    }
  });
});

describe("auslageSchema", () => {
  const validAuslage = { teilnehmerId: "t1", kategorie: "sonstiges", betrag: "5,50", zweck: "Grillfleisch" };

  it("should_parseAndTransformBetragToCents_when_inputValid", () => {
    const result = auslageSchema.safeParse(validAuslage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.teilnehmerId).toBe("t1");
      expect(result.data.kategorie).toBe("sonstiges");
      expect(result.data.betrag).toBe(550);
      expect(result.data.zweck).toBe("Grillfleisch");
    }
  });

  it("should_trimAndKeepZweck_when_surroundedByWhitespace", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, zweck: "  Grillfleisch  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.zweck).toBe("Grillfleisch");
  });

  it("should_normalizeEmptyZweckToNull_when_zweckOmitted", () => {
    const { zweck: _zweck, ...withoutZweck } = validAuslage;
    const result = auslageSchema.safeParse(withoutZweck);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.zweck).toBeNull();
  });

  it("should_normalizeEmptyZweckToNull_when_zweckBlank", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, zweck: "   " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.zweck).toBeNull();
  });

  it("should_reject_when_teilnehmerIdEmpty", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, teilnehmerId: "  " });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_kategorieNotInEnum", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, kategorie: "getraenk" });
    expect(result.success).toBe(false);
  });

  it("should_nameAllThreeCategoriesInMessage_when_kategorieInvalid", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, kategorie: "getraenk" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe("Kategorie muss Getränke, Essen oder Sonstiges sein.");
    }
  });

  it("should_reject_when_betragZero", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, betrag: "0" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_betragNegative", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, betrag: "-5" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_betragNotNumeric", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, betrag: "abc" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_betragHasThreeDecimals", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, betrag: "5,555" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_betragExceedsInt4Max", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, betrag: "99999999999" });
    expect(result.success).toBe(false);
  });

  it("should_reject_when_zweckTooLong", () => {
    const result = auslageSchema.safeParse({ ...validAuslage, zweck: "x".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("auslageStatusSchema", () => {
  it("should_accept_when_statusOffen", () => {
    const result = auslageStatusSchema.safeParse({ status: "offen" });
    expect(result.success).toBe(true);
  });

  it("should_accept_when_statusErstattet", () => {
    const result = auslageStatusSchema.safeParse({ status: "erstattet" });
    expect(result.success).toBe(true);
  });

  it("should_reject_when_statusNotInEnum", () => {
    const result = auslageStatusSchema.safeParse({ status: "storniert" });
    expect(result.success).toBe(false);
  });
});
