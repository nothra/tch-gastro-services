import { describe, it, expect } from "vitest";
import { EURO_INPUT_RE, parseEuroToCents, formatCents } from "./money";

describe("parseEuroToCents", () => {
  it("should_returnCents_when_wholeEuroWithoutDecimals", () => {
    expect(parseEuroToCents("2")).toBe(200);
  });

  it("should_returnCents_when_commaDecimalSeparator", () => {
    expect(parseEuroToCents("2,10")).toBe(210);
  });

  it("should_returnCents_when_dotDecimalSeparator", () => {
    expect(parseEuroToCents("2.10")).toBe(210);
  });

  it("should_padSingleDecimal_when_onlyOneDecimalGiven", () => {
    expect(parseEuroToCents("2,1")).toBe(210);
  });

  it("should_returnZero_when_zeroInput", () => {
    expect(parseEuroToCents("0")).toBe(0);
    expect(parseEuroToCents("0,00")).toBe(0);
  });

  it("should_ignoreSurroundingWhitespace_when_inputPadded", () => {
    expect(parseEuroToCents("  1,20  ")).toBe(120);
  });

  it("should_throw_when_moreThanTwoDecimals", () => {
    expect(() => parseEuroToCents("2,105")).toThrow();
  });

  it("should_throw_when_negative", () => {
    expect(() => parseEuroToCents("-1,00")).toThrow();
  });

  it("should_throw_when_empty", () => {
    expect(() => parseEuroToCents("")).toThrow();
  });

  it("should_throw_when_notANumber", () => {
    expect(() => parseEuroToCents("abc")).toThrow();
  });

  it("should_throw_when_thousandSeparatorOrIncompleteDecimal", () => {
    expect(() => parseEuroToCents("1.234,56")).toThrow();
    expect(() => parseEuroToCents("2,")).toThrow();
    expect(() => parseEuroToCents(",5")).toThrow();
  });

  it("should_matchRegexForValidInputsOnly", () => {
    expect(EURO_INPUT_RE.test("2,10")).toBe(true);
    expect(EURO_INPUT_RE.test("2,105")).toBe(false);
    expect(EURO_INPUT_RE.test("-1")).toBe(false);
  });
});

describe("formatCents", () => {
  it("should_renderTwoDecimalsAndEuroSign_when_wholeEuros", () => {
    expect(formatCents(200)).toBe("2,00 €");
  });

  it("should_renderTwoDecimals_when_centsPresent", () => {
    expect(formatCents(210)).toBe("2,10 €");
    expect(formatCents(5)).toBe("0,05 €");
  });

  it("should_renderZero_when_zeroCents", () => {
    expect(formatCents(0)).toBe("0,00 €");
  });

  it("should_groupThousands_when_largeAmount", () => {
    expect(formatCents(1234567)).toBe("12.345,67 €");
  });

  it("should_renderNegative_when_negativeCents", () => {
    expect(formatCents(-210)).toBe("-2,10 €");
  });

  it("should_throw_when_notAnInteger", () => {
    expect(() => formatCents(2.5)).toThrow();
  });
});
