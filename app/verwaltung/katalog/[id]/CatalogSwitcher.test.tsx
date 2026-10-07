import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Catalog } from "@/db/schema";

// Externe Grenze: Next.js-Routing.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { CatalogSwitcher } from "./CatalogSwitcher";

function makeCatalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    id: "cat-1",
    name: "Montagsrunde",
    active: true,
    sortOrder: 0,
    createdAt: new Date("2026-09-17T00:00:00.000Z"),
    updatedAt: new Date("2026-09-17T00:00:00.000Z"),
    ...overrides,
  };
}

function auswahl() {
  return screen.getByRole("combobox", { name: "Katalog" });
}

function optionen() {
  return screen.getAllByRole("option").map((option) => option.textContent);
}

beforeEach(() => {
  pushMock.mockClear();
});

afterEach(() => cleanup());

describe("CatalogSwitcher (spec-373 AK5)", () => {
  it("should_listAllCatalogsInSelectLabelledKatalog_when_rendered", () => {
    // AK5.1: Auswahlliste statt Radiobutton-Gruppe.
    const catalogs = [makeCatalog(), makeCatalog({ id: "cat-2", name: "Dorfmeisterschaften" })];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);

    expect(auswahl().tagName).toBe("SELECT");
    expect(optionen()).toEqual(["Montagsrunde", "Dorfmeisterschaften"]);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("should_preselectCurrentCatalog_when_currentIdMatches", () => {
    const catalogs = [makeCatalog(), makeCatalog({ id: "cat-2", name: "Dorfmeisterschaften" })];

    render(<CatalogSwitcher currentId="cat-2" allCatalogs={catalogs} />);

    expect(auswahl()).toHaveValue("cat-2");
  });

  // #345 AK4: ein deaktivierter Katalog bleibt wählbar und ist nur gekennzeichnet.
  it("should_markInactiveCatalogButKeepItSelectable_when_catalogIsInactive", () => {
    const catalogs = [makeCatalog(), makeCatalog({ id: "cat-2", name: "Alt", active: false })];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);

    expect(optionen()).toEqual(["Montagsrunde", "Alt (inaktiv)"]);
    expect(screen.getByRole("option", { name: "Alt (inaktiv)" })).not.toBeDisabled();
  });

  it("should_navigateToSelectedCatalog_when_otherCatalogChosen", () => {
    // AK5.2
    const catalogs = [makeCatalog(), makeCatalog({ id: "cat-2", name: "Dorfmeisterschaften" })];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);
    fireEvent.change(auswahl(), { target: { value: "cat-2" } });

    expect(pushMock).toHaveBeenCalledWith("/verwaltung/katalog/cat-2");
  });

  it("should_notNavigate_when_switcherRendersWithoutInteraction", () => {
    render(<CatalogSwitcher currentId="cat-1" allCatalogs={[makeCatalog()]} />);

    expect(pushMock).not.toHaveBeenCalled();
  });
});
