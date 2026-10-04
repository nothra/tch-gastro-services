import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KopfDialog } from "./KopfDialog";

function Symbol() {
  return <svg data-testid="symbol" aria-hidden="true" />;
}

function renderDialog() {
  render(
    <KopfDialog label="Einstellungen" icon={<Symbol />}>
      <p>Inhalt vom Server</p>
    </KopfDialog>,
  );
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

function ausloeser() {
  return screen.getByRole("button", { name: "Einstellungen" });
}

describe("KopfDialog (spec-391 AK3/AK4/AK8/AK9, ADR-056 D3)", () => {
  it("should_notShowContent_when_dialogClosed", () => {
    // AK4: vorher ist keiner der Inhalte auf der Seite sichtbar.
    renderDialog();

    expect(screen.queryByText("Inhalt vom Server")).not.toBeInTheDocument();
  });

  it("should_renderIconButtonAsTrigger_when_rendered", () => {
    // AK3: Symbol ohne sichtbaren Text, zugänglicher Name = label, 44 × 44 px.
    renderDialog();

    expect(ausloeser()).toContainElement(screen.getByTestId("symbol"));
    expect(ausloeser()).toHaveTextContent(/^$/);
    expect(ausloeser()).toHaveClass("size-11");
  });

  it("should_openDialogTitledWithLabelShowingChildren_when_triggerTapped", () => {
    // AK4/AK9: der Dialog trägt den Namen der Schaltfläche als Titel; der Inhalt kommt als
    // `children` (beim Teilen aus der Server Component, ADR-053 D5).
    renderDialog();

    fireEvent.click(ausloeser());

    const dialog = screen.getByRole("dialog", { name: "Einstellungen" });
    expect(dialog).toHaveTextContent("Inhalt vom Server");
  });

  it("should_closeAndFocusTrigger_when_schliessenTapped", () => {
    // AK8/AK9: Fokus zurück auf die Schaltfläche im Kopf. Kein `trigger.focus()` vorab: Safari
    // fokussiert einen getippten Button nicht, der Rücksprung darf daran nicht hängen.
    renderDialog();
    fireEvent.click(ausloeser());

    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(ausloeser()).toHaveFocus();
  });

  it("should_closeAndFocusTrigger_when_escapePressed", () => {
    // AK8: Escape schließt ebenso – mit demselben Fokus-Rücksprung.
    renderDialog();
    fireEvent.click(ausloeser());

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(ausloeser()).toHaveFocus();
  });
});
