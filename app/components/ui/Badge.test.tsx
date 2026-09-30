import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, BADGE_TONES } from "./Badge";

describe("Badge (AK2.9)", () => {
  // Der Status muss als Text im Badge stehen – Information nie allein über Farbe.
  it("should_showStatusAsText_when_rendered", () => {
    render(<Badge tone="warnung">offen</Badge>);

    expect(screen.getByText("offen")).toBeInTheDocument();
  });

  it("should_renderDistinctClasses_when_tonesCompared", () => {
    const classLists = BADGE_TONES.map((tone) => {
      const { unmount } = render(<Badge tone={tone}>Status</Badge>);
      const className = screen.getByText("Status").className;
      unmount();
      return className;
    });

    expect(new Set(classLists).size).toBe(BADGE_TONES.length);
  });

  it("should_defaultToNeutralTone_when_noToneGiven", () => {
    const { unmount } = render(<Badge tone="neutral">Status</Badge>);
    const neutralClassName = screen.getByText("Status").className;
    unmount();

    render(<Badge>Status</Badge>);

    expect(screen.getByText("Status").className).toBe(neutralClassName);
  });

  it.each(BADGE_TONES)("should_avoidDarkVariants_when_toneIs%s", (tone) => {
    render(<Badge tone={tone}>Status</Badge>);

    expect(screen.getByText("Status").className).not.toMatch(/\bdark:/);
  });

  it("should_appendLayoutClassName_when_classNameGiven", () => {
    render(<Badge className="ml-auto">Status</Badge>);

    expect(screen.getByText("Status")).toHaveClass("ml-auto");
  });
});
