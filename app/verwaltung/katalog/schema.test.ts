import { describe, it, expect } from "vitest";
import { catalogItemSchema } from "./schema";
import { firstIssueMessage } from "@/lib/form-errors";

const valid = {
  name: "Cola",
  size: "0,5 l",
  priceCents: "2,10",
  category: "getraenk",
  sortOrder: "10",
};

describe("catalogItemSchema", () => {
  it("should_parseAndConvertPriceToCents_when_inputValid", () => {
    const result = catalogItemSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceCents).toBe(210);
      expect(result.data.name).toBe("Cola");
      expect(result.data.size).toBe("0,5 l");
      expect(result.data.category).toBe("getraenk");
      expect(result.data.sortOrder).toBe(10);
    }
  });

  it("should_defaultSizeToEmpty_when_sizeOmitted", () => {
    const { size, ...withoutSize } = valid;
    void size;
    const result = catalogItemSchema.safeParse({ ...withoutSize, category: "kaffee" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.size).toBe("");
  });

  it("should_defaultSortOrderToZero_when_omitted", () => {
    const { sortOrder, ...withoutSort } = valid;
    void sortOrder;
    const result = catalogItemSchema.safeParse(withoutSort);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sortOrder).toBe(0);
  });

  it("should_rejectPrice_when_negative", () => {
    const result = catalogItemSchema.safeParse({ ...valid, priceCents: "-1,00" });
    expect(result.success).toBe(false);
  });

  it("should_rejectPrice_when_moreThanTwoDecimals", () => {
    const result = catalogItemSchema.safeParse({ ...valid, priceCents: "2,105" });
    expect(result.success).toBe(false);
  });

  it("should_rejectPrice_when_notANumber", () => {
    const result = catalogItemSchema.safeParse({ ...valid, priceCents: "" });
    expect(result.success).toBe(false);
  });

  it("should_rejectPrice_when_exceedingInt4Max", () => {
    const result = catalogItemSchema.safeParse({ ...valid, priceCents: "99999999999" });
    expect(result.success).toBe(false);
  });

  it("should_rejectName_when_empty", () => {
    const result = catalogItemSchema.safeParse({ ...valid, name: "   " });
    expect(result.success).toBe(false);
  });

  it("should_acceptCategory_when_essen", () => {
    const result = catalogItemSchema.safeParse({ ...valid, category: "essen" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.category).toBe("essen");
  });

  it("should_rejectCategory_when_notInEnum", () => {
    const result = catalogItemSchema.safeParse({ ...valid, category: "snack" });
    expect(result.success).toBe(false);
  });

  it("should_nameAllThreeCategoriesInMessage_when_categoryInvalid", () => {
    const result = catalogItemSchema.safeParse({ ...valid, category: "snack" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe(
        "Kategorie muss Getränk, Kaffee oder Essen sein.",
      );
    }
  });

  it("should_acceptName_when_exactly50Chars", () => {
    const result = catalogItemSchema.safeParse({ ...valid, name: "A".repeat(50) });
    expect(result.success).toBe(true);
  });

  it("should_rejectName_when_51CharsOrMore", () => {
    const result = catalogItemSchema.safeParse({ ...valid, name: "A".repeat(51) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe("Bezeichnung ist zu lang.");
    }
  });

  it("should_acceptSize_when_exactly50Chars", () => {
    const result = catalogItemSchema.safeParse({ ...valid, size: "A".repeat(50) });
    expect(result.success).toBe(true);
  });

  it("should_rejectSize_when_51CharsOrMore", () => {
    const result = catalogItemSchema.safeParse({ ...valid, size: "A".repeat(51) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe("Größe ist zu lang.");
    }
  });

  it("should_acceptSortOrder_when_exactlyInt4Max", () => {
    const result = catalogItemSchema.safeParse({ ...valid, sortOrder: "2147483647" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sortOrder).toBe(2_147_483_647);
  });

  it("should_rejectSortOrder_when_exceedingInt4Max", () => {
    const result = catalogItemSchema.safeParse({ ...valid, sortOrder: "2147483648" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe("Sortierung ist zu hoch.");
    }
  });
});
