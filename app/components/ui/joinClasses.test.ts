import { describe, expect, it } from "vitest";
import { joinClasses } from "./joinClasses";

describe("joinClasses", () => {
  it("should_joinWithSingleSpace_when_allPartsPresent", () => {
    expect(joinClasses("a b", "c")).toBe("a b c");
  });

  it("should_skipEmptyParts_when_undefinedOrEmptyStringGiven", () => {
    expect(joinClasses("a", undefined, "", "b")).toBe("a b");
  });

  it("should_returnEmptyString_when_noPartGiven", () => {
    expect(joinClasses()).toBe("");
  });
});
