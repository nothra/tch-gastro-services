import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import type { Catalog } from "@/db/schema";
import type { CatalogFormState } from "../actions";

// Externe Grenze: Server Actions aus derselben Feature-Schicht.
vi.mock("../actions", () => ({
  createCatalogAction: vi.fn(),
  renameCatalogAction: vi.fn(),
  setCatalogActiveAction: vi.fn(),
  duplicateCatalogAction: vi.fn(),
}));

// useActionState steuert Fehlerzustand/Pending direkt (etablierter Ansatz, Codify #49,
// AuslageForm/WalkInForm). Vier Aufrufe pro Render in fester Reihenfolge: create, rename,
// duplicate, setActive – siehe Aufrufreihenfolge in CatalogManager.tsx.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import {
  createCatalogAction,
  renameCatalogAction,
  setCatalogActiveAction,
  duplicateCatalogAction,
} from "../actions";
import { CatalogManager } from "./CatalogManager";

const useActionStateMock = vi.mocked(useActionState);
const createCatalogActionMock = vi.mocked(createCatalogAction);
const renameCatalogActionMock = vi.mocked(renameCatalogAction);
const setCatalogActiveActionMock = vi.mocked(setCatalogActiveAction);
const duplicateCatalogActionMock = vi.mocked(duplicateCatalogAction);
const noopDispatch = vi.fn();

// Setzt den Rückgabewert für alle vier useActionState-Aufrufe eines Renders (Reihenfolge:
// create, rename, duplicate, setActive). Ohne explizit gesetzten State bleibt er `undefined`.
function withStates(
  states: {
    create?: CatalogFormState;
    rename?: CatalogFormState;
    duplicate?: CatalogFormState;
    setActive?: CatalogFormState;
  } = {},
) {
  const sequence = [states.create, states.rename, states.duplicate, states.setActive];
  let callIndex = 0;
  useActionStateMock.mockImplementation(() => {
    const state = sequence[callIndex % sequence.length];
    callIndex += 1;
    return [state, noopDispatch, false] as never;
  });
}

const currentCatalog: Catalog = {
  id: "cat-1",
  name: "Montagsrunde",
  active: true,
  sortOrder: 0,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  withStates();
});

afterEach(() => cleanup());

// Holt den `useCallback`-Wrapper, den CatalogManager an das n-te useActionState übergeben hat
// (0 = create, 1 = rename, 2 = duplicate) – analog zu AuslageForm.test.tsx. Wird direkt
// aufgerufen, um das Schließen-bei-Erfolg-Verhalten ohne echte Formular-Submission zu prüfen.
function nthWrappedAction(index: number) {
  return useActionStateMock.mock.calls[index][0] as (
    prev: CatalogFormState | undefined,
    formData: FormData,
  ) => Promise<CatalogFormState>;
}

describe("CatalogManager – Grundstruktur", () => {
  it("should_showOnlyCreateButton_when_noCurrentCatalog", () => {
    render(<CatalogManager />);

    expect(screen.getByRole("button", { name: "+ Katalog anlegen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Umbenennen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplizieren" })).not.toBeInTheDocument();
  });

  it("should_showManagementButtons_when_currentCatalogGiven", () => {
    render(<CatalogManager currentCatalog={currentCatalog} />);

    expect(screen.getByRole("button", { name: "Umbenennen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplizieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deaktivieren" })).toBeInTheDocument();
  });

  // Review-Finding #345 Runde 2 (Wichtig): AK5 erster Teil – ein deaktivierter Katalog darf
  // im Duplizieren-Fluss nicht mehr als Quelle auswählbar sein. Der Button verschwand bisher
  // nicht (unconditional gerendert), erst die serverseitige Ablehnung griff.
  it("should_hideDuplicateButton_when_currentCatalogIsInactive", () => {
    render(<CatalogManager currentCatalog={{ ...currentCatalog, active: false }} />);

    expect(screen.queryByRole("button", { name: "Duplizieren" })).not.toBeInTheDocument();
    // Umbenennen/Deaktivieren bleiben erreichbar (AK4: inaktiver Katalog bleibt editierbar) –
    // nur das Duplizieren-Sourcing ist betroffen (AK5).
    expect(screen.getByRole("button", { name: "Umbenennen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reaktivieren" })).toBeInTheDocument();
  });
});

describe("CatalogManager – Katalog anlegen", () => {
  it("should_openCreateModal_when_createButtonClicked", () => {
    render(<CatalogManager />);

    fireEvent.click(screen.getByRole("button", { name: "+ Katalog anlegen" }));

    expect(screen.getByRole("heading", { name: "Neuen Katalog anlegen" })).toBeInTheDocument();
  });

  it("should_showErrorMessage_when_createStateHasError", () => {
    withStates({ create: { error: "Ein Katalog mit diesem Namen existiert bereits." } });
    render(<CatalogManager />);

    fireEvent.click(screen.getByRole("button", { name: "+ Katalog anlegen" }));

    expect(screen.getByText("Ein Katalog mit diesem Namen existiert bereits.")).toBeInTheDocument();
  });

  // Kern des Review-Findings (Wichtig, Runde 1): Das Modal schloss sich bisher unabhängig vom
  // Ergebnis der Action – ein Namenskonflikt verschwand kommentarlos statt eine Meldung zu zeigen.
  it("should_keepCreateModalOpen_when_createFails", async () => {
    createCatalogActionMock.mockResolvedValue({
      error: "Ein Katalog mit diesem Namen existiert bereits.",
    });
    render(<CatalogManager />);
    fireEvent.click(screen.getByRole("button", { name: "+ Katalog anlegen" }));

    await act(async () => {
      await nthWrappedAction(0)(undefined, new FormData());
    });

    expect(screen.getByRole("heading", { name: "Neuen Katalog anlegen" })).toBeInTheDocument();
  });

  it("should_closeCreateModal_when_createSucceeds", async () => {
    createCatalogActionMock.mockResolvedValue({ ok: true });
    render(<CatalogManager />);
    fireEvent.click(screen.getByRole("button", { name: "+ Katalog anlegen" }));

    await act(async () => {
      await nthWrappedAction(0)(undefined, new FormData());
    });

    expect(
      screen.queryByRole("heading", { name: "Neuen Katalog anlegen" }),
    ).not.toBeInTheDocument();
  });
});

describe("CatalogManager – Katalog umbenennen", () => {
  it("should_showErrorMessage_when_renameStateHasError", () => {
    withStates({ rename: { error: "Katalog nicht gefunden." } });
    render(<CatalogManager currentCatalog={currentCatalog} />);

    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));

    expect(screen.getByText("Katalog nicht gefunden.")).toBeInTheDocument();
  });

  it("should_keepRenameModalOpen_when_renameFails", async () => {
    renameCatalogActionMock.mockResolvedValue({ error: "Katalog nicht gefunden." });
    render(<CatalogManager currentCatalog={currentCatalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));

    await act(async () => {
      await nthWrappedAction(1)(undefined, new FormData());
    });

    expect(screen.getByRole("heading", { name: "Katalog umbenennen" })).toBeInTheDocument();
  });

  it("should_closeRenameModal_when_renameSucceeds", async () => {
    renameCatalogActionMock.mockResolvedValue({ ok: true });
    render(<CatalogManager currentCatalog={currentCatalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));

    await act(async () => {
      await nthWrappedAction(1)(undefined, new FormData());
    });

    expect(screen.queryByRole("heading", { name: "Katalog umbenennen" })).not.toBeInTheDocument();
  });
});

describe("CatalogManager – Katalog duplizieren", () => {
  it("should_showErrorMessage_when_duplicateStateHasError", () => {
    withStates({ duplicate: { error: "Der Quell-Katalog ist nicht aktiv." } });
    render(<CatalogManager currentCatalog={currentCatalog} />);

    fireEvent.click(screen.getByRole("button", { name: "Duplizieren" }));

    expect(screen.getByText("Der Quell-Katalog ist nicht aktiv.")).toBeInTheDocument();
  });

  it("should_keepDuplicateModalOpen_when_duplicateFails", async () => {
    duplicateCatalogActionMock.mockResolvedValue({ error: "Der Quell-Katalog ist nicht aktiv." });
    render(<CatalogManager currentCatalog={currentCatalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Duplizieren" }));

    await act(async () => {
      await nthWrappedAction(2)(undefined, new FormData());
    });

    expect(screen.getByRole("heading", { name: "Katalog duplizieren" })).toBeInTheDocument();
  });

  it("should_closeDuplicateModal_when_duplicateSucceeds", async () => {
    duplicateCatalogActionMock.mockResolvedValue({ ok: true });
    render(<CatalogManager currentCatalog={currentCatalog} />);
    fireEvent.click(screen.getByRole("button", { name: "Duplizieren" }));

    await act(async () => {
      await nthWrappedAction(2)(undefined, new FormData());
    });

    expect(screen.queryByRole("heading", { name: "Katalog duplizieren" })).not.toBeInTheDocument();
  });
});

describe("CatalogManager – Katalog deaktivieren/reaktivieren", () => {
  it("should_showErrorMessage_when_setActiveStateHasError", () => {
    withStates({ setActive: { error: "Katalog nicht gefunden." } });
    render(<CatalogManager currentCatalog={currentCatalog} />);

    expect(screen.getByText("Katalog nicht gefunden.")).toBeInTheDocument();
  });
});
