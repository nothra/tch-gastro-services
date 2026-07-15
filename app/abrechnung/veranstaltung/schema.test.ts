import { describe, it, expect } from "vitest";
import { veranstaltungSchema } from "./schema";

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
