import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DialogSteuerung } from "@/app/components/FormularDialog";
import type { AuslageFormState } from "./actions";

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import { AuslageFormular, type AuslageFormInitial } from "./AuslageForm";

const meldeErfolgMock = vi.mocked(meldeErfolg);

const teilnehmer = [
  { teilnehmerId: "t-1", anzeigename: "Anna" },
  { teilnehmerId: "t-2", anzeigename: "Bernd" },
];

const initial: AuslageFormInitial = {
  teilnehmerId: "t-2",
  kategorie: "sonstiges",
  betrag: "7,30",
  zweck: "Servietten",
};

// Die Dialog-Steuerung kommt im Betrieb aus `useFormularDialog` (eigene Tests); hier genügt ein
// Double, das die Aufrufe sichtbar macht.
function steuerung(overrides: Partial<DialogSteuerung> = {}): DialogSteuerung {
  return {
    schliessen: vi.fn(),
    schliessenNachErfolg: vi.fn(),
    meldeLauf: vi.fn(),
    gesperrt: false,
    ...overrides,
  };
}

const action =
  vi.fn<(prev: AuslageFormState | undefined, fd: FormData) => Promise<AuslageFormState>>();

// Offen gehaltene Action für den Lauf-Test; Auflösung in `afterEach` innerhalb von `act`
// (Lesson #370).
let laufendeActionBeenden: (() => void) | undefined;

beforeEach(() => {
  vi.resetAllMocks();
  laufendeActionBeenden = undefined;
  action.mockResolvedValue({ ok: true });
});

afterEach(async () => {
  await act(async () => laufendeActionBeenden?.());
});

function renderFormular(props: Partial<Parameters<typeof AuslageFormular>[0]> = {}) {
  const dialog = steuerung();
  render(<AuslageFormular action={action} teilnehmer={teilnehmer} steuerung={dialog} {...props} />);
  return dialog;
}

function optionen(label: string) {
  const select = screen.getByLabelText(label);
  return [...select.querySelectorAll("option")].map((option) => option.textContent);
}

// Pflichtfelder füllen, damit eine Ablehnung aus der Action stammt, nicht aus der nativen
// Pflichtfeld-Prüfung.
function felderFuellen() {
  fireEvent.change(screen.getByLabelText("Teilnehmer"), { target: { value: "t-1" } });
  fireEvent.change(screen.getByLabelText("Kategorie"), { target: { value: "essen" } });
  fireEvent.change(screen.getByLabelText("Betrag (€)"), { target: { value: "12,50" } });
  fireEvent.change(screen.getByLabelText("Notiz (optional)"), { target: { value: "Grillkohle" } });
}

async function klicke(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

describe("AuslageFormular – Felder (spec-406 AK1.3, AK5.1, AK6.3, AK6.5)", () => {
  it("should_offerTeilnehmerWithGlossaryPlaceholder_when_rendered", () => {
    renderFormular();

    expect(optionen("Teilnehmer")).toEqual(["Bitte wählen …", "Anna", "Bernd"]);
    expect(screen.getByLabelText("Teilnehmer")).toBeRequired();
  });

  it("should_offerAllThreeKategorien_when_rendered", () => {
    renderFormular();

    expect(optionen("Kategorie")).toEqual(["Bitte wählen …", "Getränke", "Essen", "Sonstiges"]);
  });

  it("should_labelBetragWithEuroSign_when_rendered", () => {
    renderFormular();

    const betrag = screen.getByLabelText("Betrag (€)");
    expect(betrag).toHaveAttribute("inputmode", "decimal");
    expect(betrag).toBeRequired();
    expect(screen.queryByLabelText("Betrag (EUR)")).not.toBeInTheDocument();
  });

  it("should_offerOptionalNotizWithLimit_when_rendered", () => {
    renderFormular();

    const notiz = screen.getByLabelText("Notiz (optional)");
    expect(notiz).toHaveAttribute("name", "zweck");
    expect(notiz).toHaveAttribute("maxlength", "200");
    expect(notiz).not.toBeRequired();
  });

  it("should_useFieldBuildingBlocks_when_rendered", () => {
    // AK5.1: Steuerelemente aus `Field`/`SelectField`, keine eigenen Styles.
    renderFormular();

    for (const label of ["Teilnehmer", "Kategorie", "Betrag (€)", "Notiz (optional)"]) {
      expect(screen.getByLabelText(label)).toHaveClass("min-h-11", "border-line", "bg-surface");
    }
  });

  it("should_prefillFields_when_initialGiven", () => {
    // AK2a.1: Vorbelegung beim Bearbeiten, Betrag als EUR-Eingabewert.
    renderFormular({ initial });

    expect(screen.getByLabelText("Teilnehmer")).toHaveValue("t-2");
    expect(screen.getByLabelText("Kategorie")).toHaveValue("sonstiges");
    expect(screen.getByLabelText("Betrag (€)")).toHaveValue("7,30");
    expect(screen.getByLabelText("Notiz (optional)")).toHaveValue("Servietten");
  });

  it("should_startEmpty_when_noInitial", () => {
    renderFormular();

    expect(screen.getByLabelText("Teilnehmer")).toHaveValue("");
    expect(screen.getByLabelText("Kategorie")).toHaveValue("");
    expect(screen.getByLabelText("Betrag (€)")).toHaveValue("");
    expect(screen.getByLabelText("Notiz (optional)")).toHaveValue("");
  });
});

describe("AuslageFormular – Erfassen (spec-406 AK1.4/AK1.5, AK6.1/AK6.2)", () => {
  it("should_offerErfassenAndAbbrechen_when_noInitial", () => {
    renderFormular();

    expect(screen.getByRole("button", { name: "Erfassen" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
  });

  it("should_submitFieldsCloseAndReportErfasst_when_actionSucceeds", async () => {
    const dialog = renderFormular();
    felderFuellen();

    await klicke("Erfassen");

    const formData = action.mock.calls[0][1];
    expect(formData.get("teilnehmerId")).toBe("t-1");
    expect(formData.get("kategorie")).toBe("essen");
    expect(formData.get("betrag")).toBe("12,50");
    expect(formData.get("zweck")).toBe("Grillkohle");
    expect(dialog.schliessenNachErfolg).toHaveBeenCalledTimes(1);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Auslage erfasst");
  });

  it("should_keepInputsAndShowAlert_when_actionRejects", async () => {
    // AK1.5: kein `<form action>`-Reset (Lesson #373), Meldung als Notice im Dialog.
    action.mockResolvedValue({ error: "Betrag muss größer als 0 sein." });
    const dialog = renderFormular();
    felderFuellen();

    await klicke("Erfassen");

    expect(screen.getByRole("alert")).toHaveTextContent("Betrag muss größer als 0 sein.");
    expect(screen.getByLabelText("Betrag (€)")).toHaveValue("12,50");
    expect(screen.getByLabelText("Teilnehmer")).toHaveValue("t-1");
    expect(dialog.schliessenNachErfolg).not.toHaveBeenCalled();
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_showErfassenBusyText_when_actionRunning", async () => {
    action.mockImplementation(
      () =>
        new Promise((resolve) => {
          laufendeActionBeenden = () => resolve({ ok: true });
        }),
    );
    const dialog = renderFormular();
    felderFuellen();

    await klicke("Erfassen");

    expect(screen.getByRole("button", { name: "Erfassen …" })).toBeDisabled();
    expect(dialog.meldeLauf).toHaveBeenCalledWith(true);
  });
});

describe("AuslageFormular – Bearbeiten (spec-406 AK2a.2/AK2a.3)", () => {
  it("should_offerSpeichern_when_initialGiven", () => {
    renderFormular({ initial });

    expect(screen.getByRole("button", { name: "Speichern" })).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("button", { name: "Erfassen" })).not.toBeInTheDocument();
  });

  it("should_closeAndReportGespeichert_when_editSucceeds", async () => {
    const dialog = renderFormular({ initial });

    await klicke("Speichern");

    expect(action.mock.calls[0][1].get("zweck")).toBe("Servietten");
    expect(dialog.schliessenNachErfolg).toHaveBeenCalledTimes(1);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
  });

  it("should_keepEditedInputsAndShowAlert_when_editRejects", async () => {
    action.mockResolvedValue({ error: "Auslage nicht gefunden." });
    renderFormular({ initial });
    fireEvent.change(screen.getByLabelText("Notiz (optional)"), { target: { value: "Becher" } });

    await klicke("Speichern");

    expect(screen.getByRole("alert")).toHaveTextContent("Auslage nicht gefunden.");
    expect(screen.getByLabelText("Notiz (optional)")).toHaveValue("Becher");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_showSpeichernBusyText_when_editRunning", async () => {
    action.mockImplementation(
      () =>
        new Promise((resolve) => {
          laufendeActionBeenden = () => resolve({ ok: true });
        }),
    );
    renderFormular({ initial });

    await klicke("Speichern");

    expect(screen.getByRole("button", { name: "Speichern …" })).toBeDisabled();
  });
});

describe("AuslageFormular – ohne Teilnehmer (spec-406 AK1.7, spec-420 AK3)", () => {
  it("should_showHintWithoutFields_when_noTeilnehmer", () => {
    // spec-420 AK3.1/AK3.2: Warnhinweis bleibt, keine Formularfelder.
    renderFormular({ teilnehmer: [] });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Zuerst Teilnehmer zur Veranstaltung hinzufügen, dann sind Auslagen erfassbar.",
    );
    expect(screen.queryByLabelText("Teilnehmer")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("should_showDisabledErfassen_when_noTeilnehmer", async () => {
    // spec-420 AK3.1/AK3.2: „Erfassen" sichtbar, aber nicht auslösbar.
    renderFormular({ teilnehmer: [] });

    const erfassen = screen.getByRole("button", { name: "Erfassen" });
    await klicke("Erfassen");

    expect(erfassen).toBeDisabled();
    expect(action).not.toHaveBeenCalled();
  });

  it("should_showDisabledSpeichern_when_bearbeitenOhneTeilnehmer", () => {
    // Bearbeiten-Dialog, nachdem alle Zeilen entfernt wurden: Primär-Label bleibt „Speichern".
    renderFormular({ teilnehmer: [], initial });

    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Erfassen" })).not.toBeInTheDocument();
  });

  it("should_orderAbbrechenBeforeErfassenInOneRow_when_noTeilnehmer", () => {
    // spec-420 AK3.4: Anordnung exakt wie `DialogAktionen` (Abbrechen links, Primär rechts) –
    // dieselbe Fußzeile wie im Fall mit Teilnehmern.
    renderFormular();
    const erwarteteKlassen = screen.getByRole("button", { name: "Abbrechen" }).parentElement
      ?.className;
    cleanup();

    renderFormular({ teilnehmer: [] });

    const knoepfe = screen.getAllByRole("button");
    expect(knoepfe.map((knopf) => knopf.textContent)).toEqual(["Abbrechen", "Erfassen"]);
    expect(knoepfe[0].parentElement).toBe(knoepfe[1].parentElement);
    expect(knoepfe[0].parentElement?.className).toBe(erwarteteKlassen);
  });

  it("should_enableErfassen_when_teilnehmerVorhanden", () => {
    // spec-420 AK3.5: Gegenprobe zu AK3.2.
    renderFormular();

    expect(screen.getByRole("button", { name: "Erfassen" })).toBeEnabled();
  });

  it("should_closeDialog_when_abbrechenClickedWithoutTeilnehmer", () => {
    const dialog = renderFormular({ teilnehmer: [] });

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialog.schliessen).toHaveBeenCalledTimes(1);
  });
});
