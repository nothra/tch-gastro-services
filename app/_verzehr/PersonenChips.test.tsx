import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PersonenChips } from "./PersonenChips";
import { stubRequestAnimationFrame } from "./raf-stub";
import type { VerzehrZeile } from "./verzehr-props";

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
  { id: "z3", anzeigename: "Carla" },
];

let raf: ReturnType<typeof stubRequestAnimationFrame>;
let scrollSpy: ReturnType<typeof vi.fn<Element["scrollIntoView"]>>;

beforeEach(() => {
  // jsdom implementiert scrollIntoView nicht; die Komponente ruft es guarded auf.
  scrollSpy = vi.fn<Element["scrollIntoView"]>();
  Element.prototype.scrollIntoView = scrollSpy;
  raf = stubRequestAnimationFrame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderChips(overrides: Partial<Parameters<typeof PersonenChips>[0]> = {}) {
  return render(
    <PersonenChips
      zeilen={zeilen}
      aktiveZeileId="z2"
      zeilenMitVerzehr={new Set()}
      onWaehle={vi.fn()}
      {...overrides}
    />,
  );
}

function chip(name: string) {
  return screen.getByRole("button", { name: new RegExp(`^${name}`) });
}

describe("PersonenChips (spec-370 AK1a)", () => {
  it("should_renderOneChipPerZeileInListOrder_when_rendered", () => {
    renderChips();
    const gruppe = screen.getByRole("group", { name: "Teilnehmer auswählen" });
    expect(Array.from(gruppe.querySelectorAll("button")).map((b) => b.textContent)).toEqual([
      "Anna",
      "Bernd",
      "Carla",
    ]);
  });

  it("should_markExactlyActiveChipPressed_when_rendered", () => {
    // AK1a.1: aktiv nicht nur über Farbe → aria-pressed.
    renderChips();
    expect(chip("Bernd")).toHaveAttribute("aria-pressed", "true");
    expect(chip("Anna")).toHaveAttribute("aria-pressed", "false");
    expect(chip("Carla")).toHaveAttribute("aria-pressed", "false");
  });

  it("should_reportZeile_when_chipClicked", () => {
    const onWaehle = vi.fn();
    renderChips({ onWaehle });
    fireEvent.click(chip("Carla"));
    expect(onWaehle).toHaveBeenCalledWith("z3");
  });

  it("should_markChipWithTextAlternative_when_personHasVerzehr", () => {
    // AK1a.4: Marke „hat Verzehr" mit Textalternative, nicht nur Farbe – beide Richtungen.
    renderChips({ zeilenMitVerzehr: new Set(["z1"]) });
    expect(screen.getByRole("button", { name: "Anna, Verzehr erfasst" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bernd" })).toBeInTheDocument();
  });

  it("should_useTouchSizedButtonBaustein_when_rendered", () => {
    // AK4.2: Höhe aus dem Button-Baustein, zusätzlich Mindestbreite; gemessen im E2E.
    renderChips();
    expect(chip("Anna")).toHaveClass("min-h-11", "min-w-11", "shrink-0");
  });

  it("should_scrollBarHorizontallyWithoutHardcodedBleed_when_rendered", () => {
    // AK1a.3/AK7.4 (#205): eigene horizontale Scroll-Fläche, kein Eltern-Padding im Baustein.
    renderChips();
    const gruppe = screen.getByRole("group", { name: "Teilnehmer auswählen" });
    expect(gruppe).toHaveClass("overflow-x-auto");
    expect(gruppe.className).not.toContain("mx-6");
    expect(gruppe.className).not.toContain("px-6");
  });

  it("should_scrollActiveChipIntoViewAfterLayout_when_activeChanges", () => {
    // AK1a.3: aktiver Chip horizontal sichtbar – erst im nächsten Frame (Codify #188).
    const { rerender } = renderChips({ aktiveZeileId: "z1" });
    raf.flush();
    scrollSpy.mockClear();

    rerender(
      <PersonenChips
        zeilen={zeilen}
        aktiveZeileId="z3"
        zeilenMitVerzehr={new Set()}
        onWaehle={vi.fn()}
      />,
    );
    expect(scrollSpy).not.toHaveBeenCalled();

    raf.flush();
    expect(scrollSpy).toHaveBeenCalledWith({ inline: "center", block: "nearest" });
    expect(scrollSpy.mock.contexts).toEqual([chip("Carla")]);
  });

  it("should_scrollInitialActiveChipIntoView_when_mounted", () => {
    // AK1a.5: auch die Start-Person (Personenbezug/gemerktes Ziel) ist in der Leiste sichtbar.
    renderChips({ aktiveZeileId: "z3" });
    raf.flush();
    expect(scrollSpy.mock.contexts).toEqual([chip("Carla")]);
  });

  it("should_cancelPendingFrame_when_unmountedBeforeNextFrame", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = renderChips();
    unmount();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
