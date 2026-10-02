import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MengeControl } from "./MengeControl";
import type { VerzehrFormAction } from "./types";

// useActionState mocken, damit Fehlerzustand und Pending direkt kontrollierbar sind –
// analog AddTeilnehmerForm.test.tsx (Codify #49).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

const noopAction: VerzehrFormAction = vi.fn(async () => ({ ok: true, menge: 0 }));

function renderControl(overrides: Partial<Parameters<typeof MengeControl>[0]> = {}) {
  return render(
    <MengeControl
      action={noopAction}
      zeileId="z1"
      catalogItemId="c1"
      menge={2}
      editable
      {...overrides}
    />,
  );
}

function plusButton() {
  return screen.getByRole("button", { name: "Menge erhöhen" });
}

function minusButton() {
  return screen.getByRole("button", { name: "Menge verringern" });
}

beforeEach(() => {
  vi.resetAllMocks();
  useActionStateMock.mockReturnValue([undefined, noopDispatch, false] as never);
});

describe("MengeControl", () => {
  it("should_showCurrentMenge_when_rendered", () => {
    renderControl({ menge: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should_submitDeltaPlusOne_when_incrementButton", () => {
    renderControl();
    expect(plusButton()).toHaveAttribute("name", "delta");
    expect(plusButton().getAttribute("value")).toBe("1");
  });

  it("should_submitDeltaMinusOne_when_decrementButton", () => {
    renderControl();
    expect(minusButton().getAttribute("value")).toBe("-1");
  });

  it("should_carryZeileAndItemIds_when_rendered", () => {
    const { container } = renderControl();
    expect(container.querySelector('input[name="zeileId"]')).toHaveValue("z1");
    expect(container.querySelector('input[name="catalogItemId"]')).toHaveValue("c1");
  });

  it("should_notRenderButtons_when_notEditable", () => {
    renderControl({ editable: false });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should_showErrorMessageAsAlert_when_actionReturnsError", () => {
    // spec-370 FS1: Fehler der Action (z. B. Drossel) wird inline sichtbar, nicht nur farblich –
    // als Live-Region mit eigenem Zeichen (Notice-Baustein).
    useActionStateMock.mockReturnValue([
      { error: "Speichern fehlgeschlagen." },
      noopDispatch,
      false,
    ] as never);

    renderControl();

    expect(screen.getByRole("alert")).toHaveTextContent("Speichern fehlgeschlagen.");
  });

  it("should_renderNoAlert_when_actionHasNoError", () => {
    renderControl();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("MengeControl – Touch und Zustände (spec-370 AK4)", () => {
  it("should_useButtonBausteinWithSquareTouchTarget_when_editable", () => {
    // AK4.1/AK4.6: Höhe kommt aus dem Button-Baustein (min-h-11), die Breite als Layout-className.
    // Gemessen wird im E2E (jsdom hat kein Layout, ADR-054 D5).
    renderControl();
    for (const button of [minusButton(), plusButton()]) {
      expect(button).toHaveClass("min-h-11", "min-w-11");
    }
  });

  it("should_disableMinus_when_mengeIsZero", () => {
    renderControl({ menge: 0 });
    expect(minusButton()).toBeDisabled();
    expect(plusButton()).toBeEnabled();
  });

  it("should_enableMinus_when_mengeIsOne", () => {
    renderControl({ menge: 1 });
    expect(minusButton()).toBeEnabled();
  });

  it("should_disableBothButtons_when_actionPending", () => {
    // AK4.4: kein Doppelklick-Verlust während die Aktion läuft.
    useActionStateMock.mockReturnValue([undefined, noopDispatch, true] as never);
    renderControl({ menge: 2 });
    expect(minusButton()).toBeDisabled();
    expect(plusButton()).toBeDisabled();
  });

  it("should_mutedZeroMenge_when_mengeIsZero", () => {
    // AK4.5: Menge 0 zurückgenommen, sonst in voller Vordergrundfarbe – beide Richtungen.
    const { unmount } = renderControl({ menge: 0 });
    expect(screen.getByText("0")).toHaveClass("text-muted", "tabular-nums");
    unmount();

    renderControl({ menge: 4 });
    expect(screen.getByText("4")).not.toHaveClass("text-muted");
    expect(screen.getByText("4")).toHaveClass("tabular-nums");
  });

  it("should_mutedZeroMenge_when_notEditable", () => {
    renderControl({ menge: 0, editable: false });
    expect(screen.getByText("0")).toHaveClass("text-muted", "tabular-nums");
  });
});
