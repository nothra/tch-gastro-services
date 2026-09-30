import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

function renderConfirm(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const props: React.ComponentProps<typeof ConfirmDialog> = {
    open: true,
    onClose: vi.fn(),
    title: "Teilnehmer entfernen?",
    description: "„Anna Beispiel“ wird aus der Veranstaltung entfernt.",
    confirmLabel: "Entfernen",
    action: vi.fn(),
    ...overrides,
  };
  render(
    <ConfirmDialog {...props}>
      <input type="hidden" name="zeileId" value="z-1" />
    </ConfirmDialog>,
  );
  return props;
}

describe("ConfirmDialog (ADR-053 D1, spec-369 AK29)", () => {
  it("should_renderAsModalDialogWithTitleAndDescription_when_open", () => {
    renderConfirm();

    const dialog = screen.getByRole("dialog", { name: "Teilnehmer entfernen?" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAccessibleDescription(
      "„Anna Beispiel“ wird aus der Veranstaltung entfernt.",
    );
  });

  it("should_useDangerVariant_when_variantDanger", () => {
    renderConfirm({ variant: "danger" });

    expect(screen.getByRole("button", { name: "Entfernen" })).toHaveClass("bg-danger");
  });

  it("should_usePrimaryVariant_when_noVariantGiven", () => {
    renderConfirm();

    expect(screen.getByRole("button", { name: "Entfernen" })).toHaveClass("bg-accent");
  });

  it("should_submitFormWithChildFields_when_confirmed", () => {
    const action = vi.fn();
    renderConfirm({ action });

    fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));

    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("zeileId")).toBe("z-1");
  });

  it("should_callOnCloseWithoutSubmitting_when_cancelClicked", () => {
    const action = vi.fn();
    const onClose = vi.fn();
    renderConfirm({ action, onClose });

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });

  it("should_callOnCloseWithoutSubmitting_when_escapePressed", () => {
    const action = vi.fn();
    const onClose = vi.fn();
    renderConfirm({ action, onClose });

    fireEvent(document.querySelector("dialog")!, new Event("cancel", { cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });

  it("should_showErrorAsAlert_when_errorGiven", () => {
    renderConfirm({ error: "Die Veranstaltung ist abgeschlossen und schreibgeschützt." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die Veranstaltung ist abgeschlossen und schreibgeschützt.",
    );
  });

  it("should_showNoAlert_when_noErrorGiven", () => {
    renderConfirm();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_disableBothButtonsAndShowPendingLabel_when_pending", () => {
    renderConfirm({ pending: true, pendingLabel: "Entfernen …" });

    expect(screen.getByRole("button", { name: "Entfernen …" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });

  it("should_ignoreEscapeAndStayOpen_when_pending", () => {
    // Die Sperre gilt auch für Escape: sonst schlösse der Dialog, während der Server den Vorgang
    // trotzdem ausführt, und eine Ablehnung sähe niemand.
    const onClose = vi.fn();
    renderConfirm({ onClose, pending: true });
    const cancel = new Event("cancel", { cancelable: true });

    fireEvent(document.querySelector("dialog")!, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector("dialog")).toHaveAttribute("open");
  });

  it("should_returnFocusToReturnFocusRef_when_closed", () => {
    // Das Rücksprungziel reicht der ConfirmDialog an die Dialog-Grundlage durch (AK29).
    const ausloeser = document.createElement("button");
    document.body.append(ausloeser);
    const props = {
      onClose: vi.fn(),
      title: "Teilnehmer entfernen?",
      description: "„Anna Beispiel“ wird entfernt.",
      confirmLabel: "Entfernen",
      action: vi.fn(),
      returnFocusRef: { current: ausloeser },
    };
    const { rerender } = render(<ConfirmDialog open {...props} />);

    rerender(<ConfirmDialog open={false} {...props} />);

    expect(ausloeser).toHaveFocus();
    ausloeser.remove();
  });

  it("should_keepConfirmLabel_when_pendingWithoutPendingLabel", () => {
    renderConfirm({ pending: true });

    expect(screen.getByRole("button", { name: "Entfernen" })).toBeDisabled();
  });
});
