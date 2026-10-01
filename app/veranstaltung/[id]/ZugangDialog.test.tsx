import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ZugangDialog } from "./ZugangDialog";

function renderDialog() {
  render(
    <ZugangDialog>
      <p>Link und QR</p>
    </ZugangDialog>,
  );
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

describe("ZugangDialog (spec-369 AK22, AK30)", () => {
  it("should_notShowLinkOrQr_when_dialogClosed", () => {
    // AK22: Auf der Detailseite ist weder Link noch QR sichtbar, solange der Dialog zu ist.
    renderDialog();

    expect(screen.queryByText("Link und QR")).not.toBeInTheDocument();
  });

  it("should_showServerRenderedContent_when_triggerTapped", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Link & QR teilen" }));

    const dialog = screen.getByRole("dialog", { name: "Link & QR teilen" });
    expect(dialog).toHaveTextContent("Link und QR");
  });

  it("should_closeAndFocusTrigger_when_schliessenTapped", () => {
    // AK30: dieselbe Dialog-Grundlage mit Fokusführung. Kein `trigger.focus()` vorab: Safari
    // fokussiert einen getippten Button nicht, der Rücksprung darf daran nicht hängen.
    renderDialog();
    const trigger = screen.getByRole("button", { name: "Link & QR teilen" });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
  });

  it("should_close_when_escapePressed", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Link & QR teilen" }));

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).not.toHaveAttribute("open");
  });

  it("should_meetTouchSize_when_triggerRendered", () => {
    // AK28: Tipp-Ziele mindestens 44 px hoch.
    renderDialog();

    expect(screen.getByRole("button", { name: "Link & QR teilen" })).toHaveClass("min-h-11");
  });
});
