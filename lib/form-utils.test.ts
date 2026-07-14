import { describe, it, expect } from "vitest";
import { z } from "zod";
import { firstIssueMessage } from "./form-utils";

describe("firstIssueMessage", () => {
  it("should_returnFirstIssueMessage_when_singleIssue", () => {
    const result = z.object({ name: z.string() }).safeParse({ name: 123 });
    if (result.success) throw new Error("Parsing sollte fehlschlagen");

    expect(firstIssueMessage(result.error)).toBe(result.error.issues[0].message);
  });

  it("should_returnFirstIssueMessage_when_multipleIssues", () => {
    const result = z
      .object({ name: z.string(), size: z.number() })
      .safeParse({ name: 123, size: "x" });
    if (result.success) throw new Error("Parsing sollte fehlschlagen");

    expect(firstIssueMessage(result.error)).toBe(result.error.issues[0].message);
  });

  it("should_returnFallback_when_noIssues", () => {
    expect(firstIssueMessage({ issues: [] })).toBe("Ungültige Eingabe.");
  });
});
