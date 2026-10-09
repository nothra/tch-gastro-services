import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { Catalog } from "@/db/schema";
import type { CatalogFormState } from "../actions";

// Externe Grenzen: Server Actions aus derselben Feature-Schicht und die Toast-Kapsel (ADR-058 D1).
// `useActionState` bleibt echt – geprüft wird das Zusammenspiel mit den Dialog-Bausteinen.
vi.mock("../actions", () => ({
  createCatalogAction: vi.fn(),
  renameCatalogAction: vi.fn(),
  setCatalogActiveAction: vi.fn(),
  duplicateCatalogAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import {
  createCatalogAction,
  duplicateCatalogAction,
  renameCatalogAction,
  setCatalogActiveAction,
} from "../actions";
import { CatalogControls } from "./CatalogControls";

const createMock = vi.mocked(createCatalogAction);
const renameMock = vi.mocked(renameCatalogAction);
const duplicateMock = vi.mocked(duplicateCatalogAction);
const setActiveMock = vi.mocked(setCatalogActiveAction);
const meldeErfolgMock = vi.mocked(meldeErfolg);

const currentCatalog: Catalog = {
  id: "cat-1",
  name: "Montagsrunde",
  active: true,
  sortOrder: 0,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};
const inaktiverKatalog: Catalog = { ...currentCatalog, active: false };

beforeEach(() => {
  vi.resetAllMocks();
  for (const mock of [createMock, renameMock, duplicateMock, setActiveMock]) {
    mock.mockResolvedValue({ ok: true });
  }
});

function knopf(name: string) {
  return screen.getByRole("button", { name });
}

/** Der Dialog trägt seinen Titel als zugänglichen Namen (AK5: Titel verknüpft). */
function offenerDialog(titel: string) {
  return screen.getByRole("dialog", { name: titel });
}

/** Ein geschlossener Dialog rendert keinen Inhalt – der Titel fehlt dann. */
function istOffen(titel: string) {
  return screen.queryByRole("heading", { name: titel }) !== null;
}

async function klickeIm(dialog: HTMLElement, name: string) {
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name }));
  });
}

const sendeAb = klickeIm;

function escape(dialog: HTMLElement) {
  fireEvent(dialog.closest("dialog")!, new Event("cancel", { cancelable: true }));
}

describe("CatalogControls – Grundstruktur", () => {
  it("should_showOnlyCreateButton_when_noCurrentCatalog", () => {
    render(<CatalogControls />);

    expect(knopf("+ Katalog anlegen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Umbenennen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplizieren" })).not.toBeInTheDocument();
  });

  it("should_showManagementButtons_when_currentCatalogGiven", () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);

    expect(knopf("Umbenennen")).toBeInTheDocument();
    expect(knopf("Duplizieren")).toBeInTheDocument();
    expect(knopf("Deaktivieren")).toBeInTheDocument();
  });

  // Review-Finding #345 Runde 2 (Wichtig): ein deaktivierter Katalog ist keine Duplizier-Quelle.
  it("should_hideDuplicateButtonAndOfferAktivieren_when_currentCatalogIsInactive", () => {
    render(<CatalogControls currentCatalog={inaktiverKatalog} />);

    expect(screen.queryByRole("button", { name: "Duplizieren" })).not.toBeInTheDocument();
    expect(knopf("Umbenennen")).toBeInTheDocument();
    // spec-372 Q4 + Glossar: „Aktivieren" statt „Reaktivieren".
    expect(knopf("Aktivieren")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reaktivieren" })).not.toBeInTheDocument();
  });
});

describe("CatalogControls – Katalog anlegen (spec-372 AK5/AK6)", () => {
  const TITEL = "Neuen Katalog anlegen";

  function oeffnen() {
    fireEvent.click(knopf("+ Katalog anlegen"));
    return offenerDialog(TITEL);
  }

  it("should_openDialogWithLinkedTitleAndLabel_when_triggerClicked", () => {
    render(<CatalogControls />);

    const dialog = oeffnen();

    expect(within(dialog).getByLabelText("Katalogname")).toHaveAttribute("name", "name");
  });

  it("should_sendNameCloseAndReportAngelegt_when_createSucceeds", async () => {
    render(<CatalogControls />);
    const dialog = oeffnen();
    fireEvent.change(within(dialog).getByLabelText("Katalogname"), {
      target: { value: "Dorfmeisterschaften" },
    });

    await sendeAb(dialog, "Anlegen");

    expect(createMock.mock.calls[0][1].get("name")).toBe("Dorfmeisterschaften");
    expect(istOffen(TITEL)).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog angelegt");
  });

  it("should_keepDialogWithAlertAndInput_when_createRejected", async () => {
    createMock.mockResolvedValue({ error: "Ein Katalog mit diesem Namen existiert bereits." });
    render(<CatalogControls />);
    const dialog = oeffnen();
    fireEvent.change(within(dialog).getByLabelText("Katalogname"), {
      target: { value: "Montagsrunde" },
    });

    await sendeAb(dialog, "Anlegen");

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Ein Katalog mit diesem Namen existiert bereits.",
    );
    expect(within(dialog).getByLabelText("Katalogname")).toHaveValue("Montagsrunde");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_closeAndReturnFocus_when_cancelClicked", async () => {
    render(<CatalogControls />);
    const dialog = oeffnen();

    await klickeIm(dialog, "Abbrechen");

    expect(istOffen(TITEL)).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
    expect(knopf("+ Katalog anlegen")).toHaveFocus();
  });

  it("should_close_when_escapePressed", () => {
    render(<CatalogControls />);
    const dialog = oeffnen();

    escape(dialog);

    expect(istOffen(TITEL)).toBe(false);
  });

  it("should_lockEscapeAndButtons_when_createRunning", async () => {
    // AK6. Die Action wird am Ende aufgelöst – ein nie endendes Promise hielte den Scope offen
    // (Lesson #370).
    let beenden: (state: CatalogFormState) => void = () => {};
    createMock.mockReturnValue(new Promise((resolve) => (beenden = resolve)));
    render(<CatalogControls />);
    const dialog = oeffnen();

    await sendeAb(dialog, "Anlegen");
    escape(dialog);

    expect(istOffen(TITEL)).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Abbrechen" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Anlegen …" })).toBeDisabled();
    await act(async () => beenden({ ok: true }));
  });
});

describe("CatalogControls – Katalog umbenennen (spec-372 AK5)", () => {
  const TITEL = "Katalog umbenennen";

  function oeffnen() {
    fireEvent.click(knopf("Umbenennen"));
    return offenerDialog(TITEL);
  }

  it("should_prefillCurrentName_when_opened", () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);

    const dialog = oeffnen();

    expect(within(dialog).getByLabelText("Neuer Name")).toHaveValue("Montagsrunde");
  });

  it("should_sendIdAndNameAndReportUmbenannt_when_renameSucceeds", async () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    await sendeAb(dialog, "Umbenennen");

    const formData = renameMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("cat-1");
    expect(formData.get("name")).toBe("Montagsrunde");
    expect(istOffen(TITEL)).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog umbenannt");
  });

  it("should_keepDialogWithAlert_when_renameRejected", async () => {
    renameMock.mockResolvedValue({ error: "Katalog nicht gefunden." });
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    await sendeAb(dialog, "Umbenennen");

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Katalog nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_returnFocusToTrigger_when_cancelled", async () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    await klickeIm(dialog, "Abbrechen");

    expect(knopf("Umbenennen")).toHaveFocus();
  });
});

describe("CatalogControls – Katalog duplizieren (spec-372 AK5)", () => {
  const TITEL = "Katalog duplizieren";

  function oeffnen() {
    fireEvent.click(knopf("Duplizieren"));
    return offenerDialog(TITEL);
  }

  it("should_nameSourceCatalogInDescription_when_opened", () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);

    const dialog = oeffnen();

    expect(dialog).toHaveAccessibleDescription(/„Montagsrunde“/);
    expect(within(dialog).getByLabelText("Name der Kopie")).toHaveAttribute(
      "placeholder",
      "Montagsrunde (Kopie)",
    );
  });

  it("should_sendSourceIdAndReportDupliziert_when_duplicateSucceeds", async () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();
    fireEvent.change(within(dialog).getByLabelText("Name der Kopie"), {
      target: { value: "Sommerfest" },
    });

    await sendeAb(dialog, "Duplizieren");

    const formData = duplicateMock.mock.calls[0][1];
    expect(formData.get("sourceId")).toBe("cat-1");
    expect(formData.get("name")).toBe("Sommerfest");
    expect(istOffen(TITEL)).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog dupliziert");
  });

  it("should_keepDialogWithAlert_when_duplicateRejected", async () => {
    duplicateMock.mockResolvedValue({ error: "Der Quell-Katalog ist nicht aktiv." });
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    await sendeAb(dialog, "Duplizieren");

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Der Quell-Katalog ist nicht aktiv.",
    );
  });
});

describe("CatalogControls – Katalog deaktivieren mit Bestätigung (spec-372 AK3/AK6/AK7, FS3)", () => {
  const TITEL = "Katalog deaktivieren?";

  function oeffnen() {
    fireEvent.click(knopf("Deaktivieren"));
    return offenerDialog(TITEL);
  }

  it("should_openDangerConfirmationNamingCatalogAndConsequence_when_deaktivierenClicked", () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);

    const dialog = oeffnen();

    // Q4: nur die Folge, ohne Zählung.
    expect(dialog).toHaveAccessibleDescription(
      "„Montagsrunde“ ist danach für neue Veranstaltungen nicht mehr wählbar.",
    );
    expect(within(dialog).getByRole("button", { name: "Deaktivieren" })).toHaveClass("bg-danger");
    expect(setActiveMock).not.toHaveBeenCalled();
  });

  it("should_notSubmitByItself_when_triggerRendered", () => {
    // Analog FS7: der Auslöser ist ein reiner Knopf, kein Absenden.
    render(<CatalogControls currentCatalog={currentCatalog} />);

    expect(knopf("Deaktivieren")).toHaveAttribute("type", "button");
  });

  it("should_deactivateAndReportDeaktiviert_when_confirmed", async () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    await sendeAb(dialog, "Deaktivieren");

    const formData = setActiveMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("cat-1");
    expect(formData.get("active")).toBe("false");
    expect(istOffen(TITEL)).toBe(false);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog deaktiviert");
  });

  it("should_keepDialogWithAlertAndNoToast_when_deactivateRejected", async () => {
    // FS3
    setActiveMock.mockResolvedValue({ error: "Katalog nicht gefunden." });
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    await sendeAb(dialog, "Deaktivieren");

    expect(istOffen(TITEL)).toBe(true);
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Katalog nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_notDeactivateAndReturnFocus_when_cancelled", async () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    await klickeIm(dialog, "Abbrechen");

    expect(istOffen(TITEL)).toBe(false);
    expect(setActiveMock).not.toHaveBeenCalled();
    expect(knopf("Deaktivieren")).toHaveFocus();
  });

  it("should_notDeactivate_when_escaped", () => {
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();

    escape(dialog);

    expect(istOffen(TITEL)).toBe(false);
    expect(setActiveMock).not.toHaveBeenCalled();
  });

  it("should_notShowOldError_when_reopened", async () => {
    setActiveMock.mockResolvedValue({ error: "Abgelehnt." });
    render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();
    await sendeAb(dialog, "Deaktivieren");
    await klickeIm(dialog, "Abbrechen");

    oeffnen();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_keepFocusOnToggle_when_catalogBecomesInactiveAfterConfirm", async () => {
    // Lesson #371: der Statuswechsel tauscht die Beschriftung. Der Knopf bleibt derselbe Knoten,
    // der Fokus geht also nicht an `<body>` verloren.
    const { rerender } = render(<CatalogControls currentCatalog={currentCatalog} />);
    const dialog = oeffnen();
    await sendeAb(dialog, "Deaktivieren");

    rerender(<CatalogControls currentCatalog={inaktiverKatalog} />);

    expect(knopf("Aktivieren")).toHaveFocus();
  });
});

describe("CatalogControls – Katalog aktivieren ohne Bestätigung (spec-372 AK4)", () => {
  it("should_activateImmediatelyAndReportAktiviert_when_aktivierenClicked", async () => {
    render(<CatalogControls currentCatalog={inaktiverKatalog} />);

    await act(async () => {
      fireEvent.click(knopf("Aktivieren"));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const formData = setActiveMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("cat-1");
    expect(formData.get("active")).toBe("true");
    expect(meldeErfolgMock).toHaveBeenCalledWith("Katalog aktiviert");
  });

  it("should_showAlertAndNoToast_when_activateRejected", async () => {
    setActiveMock.mockResolvedValue({ error: "Katalog nicht gefunden." });
    render(<CatalogControls currentCatalog={inaktiverKatalog} />);

    await act(async () => {
      fireEvent.click(knopf("Aktivieren"));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Katalog nicht gefunden.");
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });
});
