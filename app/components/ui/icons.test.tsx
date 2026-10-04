import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PapierkorbIcon, TeilenIcon, ZahnradIcon } from "./icons";

const ICONS = [
  ["TeilenIcon", TeilenIcon],
  ["ZahnradIcon", ZahnradIcon],
  ["PapierkorbIcon", PapierkorbIcon],
] as const;

function renderSvg(Icon: (typeof ICONS)[number][1]) {
  const { container } = render(<Icon />);
  return container.querySelector("svg")!;
}

describe("Symbole (ADR-055 D1, spec-391 AK3/AK15)", () => {
  it.each(ICONS)("should_beHiddenFromAssistiveTech_when_%sRendered", (_name, Icon) => {
    // Der zugängliche Name kommt von der Schaltfläche (`IconButton.label`) – das Symbol selbst
    // darf nicht zusätzlich vorgelesen oder per Tab angesteuert werden.
    const svg = renderSvg(Icon);

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it.each(ICONS)("should_drawWithCurrentColor_when_%sRendered", (_name, Icon) => {
    // AK15: die Farbe kommt allein aus der Token-Klasse des Elternelements – so stimmt das
    // Symbol im hellen und im dunklen Farbschema, ohne eigene Farbklasse.
    const svg = renderSvg(Icon);

    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("should_drawDistinctShapes_when_iconsCompared", () => {
    // Drei verschiedene Aktionen brauchen drei unterscheidbare Symbole.
    const formen = ICONS.map(([, Icon]) => {
      const { container, unmount } = render(<Icon />);
      const innerHtml = container.querySelector("svg")!.innerHTML;
      unmount();
      return innerHtml;
    });

    expect(new Set(formen).size).toBe(ICONS.length);
  });
});
