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
    const plus = screen.getByRole("button", { name: /erhöhen/i });
    expect(plus).toHaveAttribute("name", "delta");
    expect(plus).toHaveValue?.("1");
    expect(plus.getAttribute("value")).toBe("1");
  });

  it("should_submitDeltaMinusOne_when_decrementButton", () => {
    renderControl();
    const minus = screen.getByRole("button", { name: /verringern/i });
    expect(minus.getAttribute("value")).toBe("-1");
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

  it("should_showErrorMessage_when_actionReturnsError", () => {
    // FS3: Fehler der Action (z. B. Verbindungsabbruch) wird sichtbar –
    // keine stille Ablehnung, kein lost-update ohne Rückmeldung.
    useActionStateMock.mockReturnValue([
      { error: "Speichern fehlgeschlagen." },
      noopDispatch,
      false,
    ] as never);

    renderControl();

    expect(screen.getByText("Speichern fehlgeschlagen.")).toBeInTheDocument();
  });
});
