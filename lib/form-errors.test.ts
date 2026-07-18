import { describe, it, expect } from "vitest";
import { z } from "zod";
import { firstIssueMessage } from "./form-errors";

describe("firstIssueMessage", () => {
  it("should_returnIssueMessage_when_singleIssue", () => {
    const result = z.object({ name: z.string({ error: "Name fehlt" }) }).safeParse({ name: 123 });
    if (result.success) throw new Error("Parsing sollte fehlschlagen");

    expect(firstIssueMessage(result.error)).toBe("Name fehlt");
  });

  it("should_returnFirstIssueMessage_when_multipleIssues", () => {
    const result = z
      .object({
        name: z.string({ error: "Name fehlt" }),
        size: z.number({ error: "Größe fehlt" }),
      })
      .safeParse({ name: 123, size: "x" });
    if (result.success) throw new Error("Parsing sollte fehlschlagen");

    // Erwartet die Meldung des ERSTEN Issues, nicht des zweiten.
    expect(firstIssueMessage(result.error)).toBe("Name fehlt");
  });

  it("should_returnFallback_when_noIssues", () => {
    expect(firstIssueMessage({ issues: [] })).toBe("Ungültige Eingabe.");
  });
});
