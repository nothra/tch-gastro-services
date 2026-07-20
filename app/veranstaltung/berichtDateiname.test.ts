import { describe, expect, it } from "vitest";
import { berichtDateiname, berichtSlug } from "./berichtDateiname";

// Reine, getestete Ableitung des Download-Dateinamens (F9, #185, ADR-036 D9):
// `abschlussbericht-<YYYY-MM-DD>-<slug>.{xlsx,pdf}`.

describe("berichtSlug", () => {
  it("should_lowercaseAndHyphenate_when_plainText", () => {
    expect(berichtSlug("Montagsrunde Juli")).toBe("montagsrunde-juli");
  });

  it("should_transliterateUmlauts_when_present", () => {
    expect(berichtSlug("Grillfest Öäü ß")).toBe("grillfest-oeaeue-ss");
  });

  it("should_collapseNonAlnumRuns_when_specialChars", () => {
    expect(berichtSlug("A / B  C!!!")).toBe("a-b-c");
  });

  it("should_trimLeadingAndTrailingHyphens_when_edgesAreSpecial", () => {
    expect(berichtSlug("  -Sommerfest-  ")).toBe("sommerfest");
  });

  it("should_returnEmpty_when_noAlnumChars", () => {
    expect(berichtSlug("!!! ??? ---")).toBe("");
  });

  it("should_truncateToMaxLength_when_veryLong", () => {
    const slug = berichtSlug("a".repeat(80));
    expect(slug.length).toBe(60);
  });
});

describe("berichtDateiname", () => {
  it("should_composeDateAndSlug_when_xlsx", () => {
    expect(berichtDateiname(new Date("2026-07-14"), "Montagsrunde Juli", "xlsx")).toBe(
      "abschlussbericht-2026-07-14-montagsrunde-juli.xlsx",
    );
  });

  it("should_usePdfExtension_when_pdf", () => {
    expect(berichtDateiname(new Date("2026-07-14"), "Montagsrunde Juli", "pdf")).toBe(
      "abschlussbericht-2026-07-14-montagsrunde-juli.pdf",
    );
  });

  it("should_omitSlug_when_bezeichnungHasNoAlnum", () => {
    expect(berichtDateiname(new Date("2026-07-14"), "!!!", "xlsx")).toBe(
      "abschlussbericht-2026-07-14.xlsx",
    );
  });

  it("should_omitDate_when_datumMissing", () => {
    expect(berichtDateiname(null, "Montagsrunde Juli", "pdf")).toBe(
      "abschlussbericht-montagsrunde-juli.pdf",
    );
  });
});
