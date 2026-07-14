import { describe, it, expect } from "vitest";
import { teilnehmerSchema } from "./schema";

const valid = {
  name: "Familie Müller",
  typ: "familie",
  mitglied: "on",
};

describe("teilnehmerSchema", () => {
  it("should_parseAndMapMitgliedToTrue_when_checkboxChecked", () => {
    const result = teilnehmerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Familie Müller");
      expect(result.data.typ).toBe("familie");
      expect(result.data.mitglied).toBe(true);
    }
  });

  it("should_mapMitgliedToFalse_when_checkboxOmitted", () => {
    const { mitglied, ...withoutMitglied } = valid;
    void mitglied;
    const result = teilnehmerSchema.safeParse({ ...withoutMitglied, typ: "person" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mitglied).toBe(false);
  });

  it("should_trimName_when_surroundedByWhitespace", () => {
    const result = teilnehmerSchema.safeParse({ ...valid, name: "  Anna  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Anna");
  });

  it("should_rejectName_when_empty", () => {
    const result = teilnehmerSchema.safeParse({ ...valid, name: "   " });
    expect(result.success).toBe(false);
  });

  it("should_rejectTyp_when_notInEnum", () => {
    const result = teilnehmerSchema.safeParse({ ...valid, typ: "verein" });
    expect(result.success).toBe(false);
  });
});
