import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { anlegenLabel, DuplikatWarnung } from "./DuplikatWarnung";

const WARNUNG = "Es gibt bereits einen aktiven Teilnehmer mit diesem Namen.";

function versteckterWert(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>("input[name='confirmDuplicate']")!.value;
}

describe("DuplikatWarnung (spec-405 AK4.2, ADR-060 D2)", () => {
  it("should_showWarnungAsNotice_when_confirmNeeded", () => {
    render(<DuplikatWarnung state={{ needsConfirm: true, warning: WARNUNG }} />);

    const warnung = screen.getByRole("status");
    expect(warnung).toHaveTextContent(WARNUNG);
    // Notice-Art `warnung`: Token-Farbe plus sichtbares Zeichen, nicht nur Farbe.
    expect(warnung).toHaveClass("bg-warning-subtle", "text-warning");
    expect(warnung.querySelector("[aria-hidden='true']")).toHaveTextContent("⚠");
  });

  it("should_sendConfirmTrue_when_confirmNeeded", () => {
    // ADR-022: der Zweitversuch überstimmt die Warnung.
    const { container } = render(
      <DuplikatWarnung state={{ needsConfirm: true, warning: WARNUNG }} />,
    );

    expect(versteckterWert(container)).toBe("true");
  });

  it("should_showNoWarnungAndSendConfirmFalse_when_noConfirmNeeded", () => {
    const { container } = render(<DuplikatWarnung state={undefined} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(versteckterWert(container)).toBe("false");
  });

  it.each([
    [{ needsConfirm: true }, "Trotzdem anlegen"],
    [undefined, "Anlegen"],
  ])("should_labelSubmit_when_state%#", (state, erwartet) => {
    expect(anlegenLabel(state)).toBe(erwartet);
  });
});
