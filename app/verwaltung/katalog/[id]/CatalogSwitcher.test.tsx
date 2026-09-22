import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Catalog } from "@/db/schema";

// Externe Grenze: Next.js-Routing. `CatalogSwitcher` ist bislang der einzige Konsument von
// `useRouter` im Projekt – bekommt hier seine erste eigene Testdatei (vorher nur indirekt über
// [id]/page.tsx mitgetestet, siehe page.test.tsx).
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

beforeEach(() => {
  pushMock.mockClear();
});

afterEach(() => cleanup());

describe("CatalogSwitcher", () => {
  it("should_listAllCatalogNames_when_rendered", () => {
    const catalogs = [makeCatalog(), makeCatalog({ id: "cat-2", name: "Dorfmeisterschaften" })];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);

    expect(screen.getByText("Montagsrunde")).toBeInTheDocument();
    expect(screen.getByText("Dorfmeisterschaften")).toBeInTheDocument();
  });

  it("should_checkCurrentCatalog_when_currentIdMatches", () => {
    const catalogs = [makeCatalog(), makeCatalog({ id: "cat-2", name: "Dorfmeisterschaften" })];

    render(<CatalogSwitcher currentId="cat-2" allCatalogs={catalogs} />);

    expect(screen.getByRole("radio", { name: /Montagsrunde/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Dorfmeisterschaften/ })).toBeChecked();
  });

  // AK4: ein deaktivierter Katalog bleibt im Umschalter sichtbar und auswählbar (nur optisch
  // gekennzeichnet), Artikel-Pflege bleibt möglich.
  it("should_markInactiveCatalog_when_catalogIsInactive", () => {
    const catalogs = [makeCatalog({ active: false })];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);

    expect(screen.getByText("(inaktiv)")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Montagsrunde/ })).not.toBeDisabled();
  });

  it("should_notMarkActiveCatalog_when_catalogIsActive", () => {
    const catalogs = [makeCatalog()];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);

    expect(screen.queryByText("(inaktiv)")).not.toBeInTheDocument();
  });

  // AK6: Wechsel im Umschalter navigiert zur Detailseite des gewählten Katalogs, wo die
  // Artikel-Pflege ab sofort auf diesen Katalog wirkt (Parent-Key-Bindung).
  it("should_navigateToSelectedCatalog_when_otherCatalogChosen", () => {
    const catalogs = [makeCatalog(), makeCatalog({ id: "cat-2", name: "Dorfmeisterschaften" })];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);
    fireEvent.click(screen.getByRole("radio", { name: /Dorfmeisterschaften/ }));

    expect(pushMock).toHaveBeenCalledWith("/verwaltung/katalog/cat-2");
  });

  it("should_notNavigate_when_switcherRendersWithoutInteraction", () => {
    const catalogs = [makeCatalog()];

    render(<CatalogSwitcher currentId="cat-1" allCatalogs={catalogs} />);

    expect(pushMock).not.toHaveBeenCalled();
  });
});
