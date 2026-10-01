import { describe, it, expect, vi } from "vitest";
import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "./Dialog";

// Test-Harness wie beim realen Konsumenten: ein Auslöser öffnet, der Dialog meldet das Schließen
// über `onClose` zurück (kontrolliertes `open`, ADR-053 D1).
function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Öffnen
      </button>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Teilnehmer hinzufügen"
        description="Wähle Stammteilnehmer oder lege einen Gast an."
      >
        <input aria-label="Suche" />
      </Dialog>
    </>
  );
}

function dialogElement(): HTMLDialogElement {
  return document.querySelector("dialog")!;
}

describe("Dialog (ADR-053 D1, spec-369 AK29/AK30)", () => {
  it("should_openModally_when_openBecomesTrue", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialogElement()).toHaveAttribute("open");
    showModal.mockRestore();
  });

  it("should_mountChildrenOnlyWhileOpen_when_toggled", () => {
    render(<Harness />);
    expect(screen.queryByRole("textbox", { name: "Suche", hidden: true })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));

    expect(screen.getByRole("textbox", { name: "Suche" })).toBeInTheDocument();
  });

  it("should_linkTitleAndDescription_when_open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));

    const dialog = screen.getByRole("dialog", { name: "Teilnehmer hinzufügen" });
    expect(dialog).toHaveAccessibleDescription("Wähle Stammteilnehmer oder lege einen Gast an.");
  });

  it("should_callOnCloseAndClose_when_escapePressed", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));

    // Escape löst im Browser zuerst `cancel` aus; der Baustein übernimmt das Schließen selbst,
    // damit der React-Zustand die einzige Quelle für „offen" bleibt.
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialogElement(), cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(screen.queryByRole("textbox", { name: "Suche", hidden: true })).not.toBeInTheDocument();
  });

  it("should_ignoreEscapeAndStayOpen_when_notDismissible", () => {
    // Sperre im Baustein selbst (Review #369, Iteration 2): alle Konsumenten folgen derselben Regel.
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="T" schliessbar={false}>
        x
      </Dialog>,
    );
    const cancel = new Event("cancel", { cancelable: true });

    fireEvent(dialogElement(), cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(dialogElement()).toHaveAttribute("open");
  });

  it("should_returnFocusToTrigger_when_closed", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Öffnen" });
    trigger.focus();
    fireEvent.click(trigger);
    screen.getByRole("textbox", { name: "Suche" }).focus();

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(trigger).toHaveFocus();
  });

  it("should_returnFocusToReturnFocusRef_when_triggerWasNotFocused", () => {
    // Safari fokussiert einen getippten Button nicht – `document.activeElement` ist dann `<body>`.
    // Das explizit übergebene Rücksprungziel gilt trotzdem.
    function MitRuecksprungziel() {
      const [open, setOpen] = useState(false);
      const ausloeserRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={ausloeserRef} type="button" onClick={() => setOpen(true)}>
            Öffnen
          </button>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title="T"
            returnFocusRef={ausloeserRef}
          >
            x
          </Dialog>
        </>
      );
    }
    render(<MitRuecksprungziel />);
    const trigger = screen.getByRole("button", { name: "Öffnen" });
    fireEvent.click(trigger);
    expect(trigger).not.toHaveFocus();

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(trigger).toHaveFocus();
  });

  it("should_skipFocus_when_returnTargetIsNoHtmlElement", () => {
    // Ein Ziel, das kein `HTMLElement` ist (z. B. ein SVG-Auslöser), bekommt keinen Fokus. Ein
    // Stellvertreter mit `focus`-Spion macht den Unterschied sichtbar: in jsdom hätte schon ein
    // echtes `SVGElement` eine `focus()`-Methode, die nichts bewirkt.
    const focus = vi.fn();
    const keinHtmlElement = { focus } as unknown as HTMLElement;
    const ref = { current: keinHtmlElement };
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="T" returnFocusRef={ref}>
        x
      </Dialog>,
    );

    rerender(
      <Dialog open={false} onClose={() => {}} title="T" returnFocusRef={ref}>
        x
      </Dialog>,
    );

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(focus).not.toHaveBeenCalled();
  });

  it("should_callOnClose_when_closedNatively", () => {
    // Ein nativer Schließweg (z. B. `<form method="dialog">`) umgeht `cancel` – auch dann muss
    // der Konsument davon erfahren, sonst hielte er den Dialog für offen.
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));

    dialogElement().close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should_notCallOnClose_when_closedBecauseOpenBecameFalse", () => {
    // Schließt der Konsument selbst (open → false), ist das kein zweites Schließ-Signal.
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open onClose={onClose} title="T">
        x
      </Dialog>,
    );

    rerender(
      <Dialog open={false} onClose={onClose} title="T">
        x
      </Dialog>,
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(dialogElement()).not.toHaveAttribute("open");
  });

  it("should_omitDescribedBy_when_noDescriptionGiven", () => {
    render(
      <Dialog open onClose={() => {}} title="Nur Titel">
        x
      </Dialog>,
    );

    expect(dialogElement()).not.toHaveAttribute("aria-describedby");
  });
});
