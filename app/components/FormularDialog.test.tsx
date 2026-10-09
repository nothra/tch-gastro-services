import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import {
  AnlegeDialog,
  DialogAktionen,
  useDialogFormular,
  type DialogSteuerung,
} from "./FormularDialog";

type State = { ok?: boolean; error?: string };

const action = vi.fn<(prev: State | undefined, formData: FormData) => Promise<State>>();
const meldeErfolgMock = vi.mocked(meldeErfolg);

function Formular({ steuerung }: { steuerung: DialogSteuerung }) {
  const { state, pending, absenden } = useDialogFormular(action, steuerung, "Etwas angelegt");
  return (
    <form onSubmit={absenden}>
      <label>
        Name
        <input name="name" />
      </label>
      {state?.error && <p role="alert">{state.error}</p>}
      <DialogAktionen
        steuerung={steuerung}
        pending={pending}
        label="Anlegen"
        laufLabel="Anlegen …"
      />
    </form>
  );
}

function renderDialog() {
  render(
    <AnlegeDialog ausloeser="+ Neu" titel="Etwas anlegen">
      {(steuerung) => <Formular steuerung={steuerung} />}
    </AnlegeDialog>,
  );
}

function oeffnen() {
  fireEvent.click(screen.getByRole("button", { name: "+ Neu" }));
  return screen.getByRole("dialog", { name: "Etwas anlegen" });
}

function dialogElement() {
  return document.querySelector("dialog")!;
}

async function absenden() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("AnlegeDialog + useDialogFormular (spec-373 AK1.1–AK1.5)", () => {
  it("should_showOnlyTrigger_when_rendered", () => {
    // AK1.1: das Formular ist beim Laden nicht sichtbar.
    renderDialog();

    expect(screen.getByRole("button", { name: "+ Neu" })).toHaveClass("min-h-11");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("should_openModalDialogWithForm_when_triggerTapped", () => {
    // AK1.2
    renderDialog();

    oeffnen();

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("should_closeDialog_when_actionSucceeds", async () => {
    // AK1.3
    action.mockResolvedValue({ ok: true });
    renderDialog();
    oeffnen();

    await absenden();

    expect(action).toHaveBeenCalledTimes(1);
    expect(dialogElement()).not.toHaveAttribute("open");
  });

  it("should_reportErfolgsMeldung_when_actionSucceeds", async () => {
    // spec-372 AK12: der Dialog schließt, die Rückmeldung kommt als Toast.
    action.mockResolvedValue({ ok: true });
    renderDialog();
    oeffnen();

    await absenden();

    expect(meldeErfolgMock).toHaveBeenCalledWith("Etwas angelegt");
  });

  it("should_notReport_when_actionRejects", async () => {
    // AK16: die Ablehnung bleibt im Dialog, kein Toast.
    action.mockResolvedValue({ error: "Name fehlt." });
    renderDialog();
    oeffnen();

    await absenden();

    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_sendFormFields_when_submitted", async () => {
    action.mockResolvedValue({ ok: true });
    renderDialog();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sommerfest" } });

    await absenden();

    const formData = action.mock.calls[0][1];
    expect(formData.get("name")).toBe("Sommerfest");
  });

  it("should_keepDialogOpenWithErrorAndInput_when_actionRejects", async () => {
    // AK1.4: Fehler im Dialog, Eingaben gehen nicht verloren (kein Formular-Reset).
    action.mockResolvedValue({ error: "Name fehlt." });
    renderDialog();
    oeffnen();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sommerfest" } });

    await absenden();

    expect(dialogElement()).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent("Name fehlt.");
    expect(screen.getByLabelText("Name")).toHaveValue("Sommerfest");
  });

  it("should_closeWithoutActionAndReturnFocus_when_abbrechen", () => {
    // AK1.5
    renderDialog();
    oeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(action).not.toHaveBeenCalled();
    expect(dialogElement()).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "+ Neu" })).toHaveFocus();
  });

  it("should_closeAndReturnFocus_when_escapePressed", () => {
    // AK1.5 nennt Abbrechen UND Escape.
    renderDialog();
    oeffnen();

    fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));

    expect(dialogElement()).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "+ Neu" })).toHaveFocus();
  });

  it("should_startWithoutOldError_when_reopenedAfterRejection", async () => {
    // AK1.5, zweiter Teil
    action.mockResolvedValue({ error: "Name fehlt." });
    renderDialog();
    oeffnen();
    await absenden();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    oeffnen();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("während die Action läuft (Fehlerszenario Doppeltipp)", () => {
    let aufloesen: (state: State) => void;

    beforeEach(() => {
      action.mockImplementation(
        () =>
          new Promise<State>((resolve) => {
            aufloesen = resolve;
          }),
      );
    });

    it("should_lockButtonsAndEscape_when_actionPending", async () => {
      renderDialog();
      oeffnen();
      await absenden();

      expect(screen.getByRole("button", { name: "Anlegen …" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDisabled();
      fireEvent(dialogElement(), new Event("cancel", { cancelable: true }));
      expect(dialogElement()).toHaveAttribute("open");

      await act(async () => aufloesen({ error: "Abgelehnt." }));
      expect(screen.getByRole("button", { name: "Abbrechen" })).toBeEnabled();
    });
  });
});

describe("AnlegeDialog – Leerzustand", () => {
  // Seite mit Kopf-Auslöser und Leerzustand: Ein erfolgreiches Anlegen füllt die Liste, der
  // Leerzustand samt seinem Auslöser verschwindet (Zweigwechsel nach Revalidierung, Lesson #371).
  const seite = { listeFuellen: () => {} };

  function SeiteMitLeerzustand() {
    const [leer, setLeer] = useState(true);
    useEffect(() => {
      seite.listeFuellen = () => setLeer(false);
    });
    const formular = (steuerung: DialogSteuerung) => <Formular steuerung={steuerung} />;
    return (
      <>
        <AnlegeDialog ausloeser="+ Neu" titel="Etwas anlegen">
          {formular}
        </AnlegeDialog>
        {leer ? (
          <AnlegeDialog ausloeser="Erstes anlegen" titel="Etwas anlegen" imLeerzustand>
            {formular}
          </AnlegeDialog>
        ) : (
          <p>Liste</p>
        )}
      </>
    );
  }

  function ausLeerzustandOeffnen() {
    render(<SeiteMitLeerzustand />);
    fireEvent.click(screen.getByRole("button", { name: "Erstes anlegen" }));
  }

  it("should_renderSecondaryTrigger_when_imLeerzustand", () => {
    // AK6.1: der Button im Leerzustand ist eine zweite, ruhigere Instanz desselben Dialogs.
    render(<SeiteMitLeerzustand />);

    expect(screen.getByRole("button", { name: "Erstes anlegen" })).toHaveClass("border-line");
    expect(screen.getByRole("button", { name: "+ Neu" })).toHaveClass("bg-accent");
  });

  it("should_focusHeaderTrigger_when_successRemovesEmptyState", async () => {
    // W1/Lesson #371: der eigene Auslöser ist nach dem Erfolg ausgehängt – Fokusziel ist der
    // Auslöser im Seitenkopf, nicht `<body>`.
    action.mockImplementation(async () => {
      seite.listeFuellen();
      return { ok: true };
    });
    ausLeerzustandOeffnen();

    await absenden();

    expect(screen.getByText("Liste")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Neu" })).toHaveFocus();
  });

  it("should_returnFocusToEmptyStateTrigger_when_abbrechen", () => {
    ausLeerzustandOeffnen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.getByRole("button", { name: "Erstes anlegen" })).toHaveFocus();
  });
});
