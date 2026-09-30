import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import type { CatalogItem } from "@/db/schema";
import type { CatalogFormState } from "./actions";

// Externe Grenze: Server Actions aus derselben Feature-Schicht.
vi.mock("./actions", () => ({
  updateCatalogItemAction: vi.fn(),
  setCatalogItemActiveAction: vi.fn(),
}));

// useActionState steuert Fehlerzustand/Pending direkt (etablierter Ansatz, Codify #49).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { updateCatalogItemAction } from "./actions";
import { CatalogRow } from "./CatalogRow";

const useActionStateMock = vi.mocked(useActionState);
const updateCatalogItemActionMock = vi.mocked(updateCatalogItemAction);

function withState(state: CatalogFormState | undefined, pending = false) {
  useActionStateMock.mockImplementation(() => [state, vi.fn(), pending] as never);
}

const activeItem: CatalogItem = {
  id: "item-1",
  catalogId: "cat-1",
  name: "Pils",
  size: "0,5 l",
  priceCents: 250,
  category: "getraenk",
  sortOrder: 10,
  active: true,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

afterEach(() => cleanup());

// Der `useCallback`-Wrapper, den CatalogRow an useActionState übergibt – direkt aufgerufen,
// um das Schließen-bei-Erfolg-Verhalten ohne echte Formular-Submission zu prüfen.
function wrappedUpdateAction() {
  return useActionStateMock.mock.calls[0][0] as (
    prev: CatalogFormState | undefined,
    formData: FormData,
  ) => Promise<CatalogFormState>;
}

describe("CatalogRow – Anzeige", () => {
  it("should_showNameSizePriceAndCategory_when_itemIsDisplayed", () => {
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);

    expect(screen.getByText("Pils · 0,5 l")).toBeInTheDocument();
    expect(screen.getByText(/Getränk/)).toBeInTheDocument();
  });

  it("should_renderPriceWithTabularNums_when_itemIsDisplayed", () => {
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);

    expect(screen.getByText("2,50 €")).toHaveClass("tabular-nums");
  });

  it("should_sayOhneGroesse_when_itemHasNoSize", () => {
    render(<CatalogRow item={{ ...activeItem, size: "" }} catalogId="cat-1" />);

    expect(screen.getByText("Pils · ohne Größe")).toBeInTheDocument();
  });

  it("should_offerDeaktivierenWithoutBadge_when_itemIsActive", () => {
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);

    expect(screen.getByRole("button", { name: "Deaktivieren" })).toBeInTheDocument();
    expect(screen.queryByText("deaktiviert")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem")).not.toHaveClass("opacity-60");
  });

  it("should_showBadgeDimmedAndOfferAktivieren_when_itemIsInactive", () => {
    render(<CatalogRow item={{ ...activeItem, active: false }} catalogId="cat-1" />);

    expect(screen.getByText("deaktiviert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aktivieren" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveClass("opacity-60");
  });

  it("should_sendInvertedActiveFlag_when_toggleFormIsRendered", () => {
    const { container } = render(<CatalogRow item={activeItem} catalogId="cat-1" />);

    const activeInput = container.querySelector('input[name="active"]') as HTMLInputElement;
    expect(activeInput.value).toBe("false");
  });
});

describe("CatalogRow – Inline-Bearbeitung", () => {
  it("should_openEditForm_when_bearbeitenIsClicked", () => {
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByRole("button", { name: "Speichern" })).toHaveAttribute("type", "submit");
    expect(screen.getByLabelText("Bezeichnung")).toHaveValue("Pils");
  });

  it("should_closeEditForm_when_abbrechenIsClicked", () => {
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
  });

  it("should_showErrorAsAlert_when_saveFailed", () => {
    withState({ error: "Name fehlt" });
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Name fehlt");
  });

  it("should_disableSpeichern_when_saveIsPending", () => {
    withState(undefined, true);
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  });

  it("should_closeEditForm_when_saveSucceeded", async () => {
    updateCatalogItemActionMock.mockResolvedValue({ ok: true });
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    await act(() => wrappedUpdateAction()(undefined, new FormData()));

    expect(screen.getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
  });

  it("should_keepEditFormOpen_when_saveFailed", async () => {
    updateCatalogItemActionMock.mockResolvedValue({ error: "Duplikat" });
    render(<CatalogRow item={activeItem} catalogId="cat-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    const result = await act(() => wrappedUpdateAction()(undefined, new FormData()));

    expect(result).toEqual({ error: "Duplikat" });
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });
});
