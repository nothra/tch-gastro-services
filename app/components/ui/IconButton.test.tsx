import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { IconButton } from "./IconButton";

function Symbol() {
  return <svg data-testid="symbol" aria-hidden="true" />;
}

describe("IconButton (ADR-055 D2, spec-391 AK3)", () => {
  it("should_exposeLabelAsAccessibleNameAndTooltip_when_rendered", () => {
    render(<IconButton label="Einstellungen" icon={<Symbol />} />);

    const button = screen.getByRole("button", { name: "Einstellungen" });
    expect(button).toHaveAttribute("aria-label", "Einstellungen");
    expect(button).toHaveAttribute("title", "Einstellungen");
  });

  it("should_showIconWithoutVisibleText_when_rendered", () => {
    // AK3: Symbol ohne sichtbaren Text – der Name steht nur im `aria-label`.
    render(<IconButton label="Einstellungen" icon={<Symbol />} />);

    const button = screen.getByRole("button", { name: "Einstellungen" });
    expect(button).toContainElement(screen.getByTestId("symbol"));
    expect(button).toHaveTextContent(/^$/);
  });

  it("should_haveSquareTouchTarget_when_rendered", () => {
    // AK3: mindestens 44 × 44 px = `size-11` (11 × 0.25rem).
    render(<IconButton label="Einstellungen" icon={<Symbol />} />);

    expect(screen.getByRole("button")).toHaveClass("size-11");
  });

  it("should_defaultToTypeButton_when_noTypeGiven", () => {
    // Im Seitenkopf darf ein Tipp nie versehentlich ein umgebendes Formular absenden.
    render(<IconButton label="Einstellungen" icon={<Symbol />} />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("should_useNeutralTone_when_noToneGiven", () => {
    render(<IconButton label="Einstellungen" icon={<Symbol />} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-foreground");
    expect(button).not.toHaveClass("text-danger");
  });

  it("should_highlightOnHoverAgainstPageBackground_when_toneNeutral", () => {
    render(<IconButton label="Einstellungen" icon={<Symbol />} />);

    // Der Seitenkopf steht selbst auf `background` – eine Hover-Fläche in derselben Farbe wäre
    // unsichtbar, deshalb die abgesetzte `line-subtle`-Fläche.
    const button = screen.getByRole("button");
    expect(button).toHaveClass("not-disabled:hover:bg-line-subtle");
    expect(button).not.toHaveClass("not-disabled:hover:bg-background");
  });

  it("should_useDangerToken_when_toneDanger", () => {
    // AK3: der Papierkorb ist als zerstörerische Aktion abgesetzt – Gefahr-Token als Symbolfarbe,
    // bewusst keine gefüllte Fläche (ADR-055 D2).
    render(<IconButton label="Veranstaltung löschen" tone="danger" icon={<Symbol />} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-danger");
    expect(button).not.toHaveClass("text-foreground");
    expect(button).not.toHaveClass("bg-danger");
  });

  it("should_shareFocusAndDisabledStylingWithButton_when_rendered", () => {
    render(<IconButton label="Einstellungen" icon={<Symbol />} />);

    expect(screen.getByRole("button")).toHaveClass(
      "focus-visible:outline-accent",
      "disabled:opacity-60",
    );
  });

  it("should_forwardClickAndRef_when_used", () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(<IconButton ref={ref} label="Einstellungen" icon={<Symbol />} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(ref.current).toBe(screen.getByRole("button"));
  });

  it("should_notFire_when_disabled", () => {
    const onClick = vi.fn();
    render(<IconButton label="Einstellungen" icon={<Symbol />} disabled onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });
});
