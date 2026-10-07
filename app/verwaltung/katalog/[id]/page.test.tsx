import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Session } from "next-auth";
import type { Catalog, CatalogItem } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/catalog", () => ({ listCatalogs: vi.fn(), listCatalog: vi.fn() }));

// Eingebettete Komponenten sind hier durch Stubs ersetzt – sie haben eigene Tests
// (CatalogSwitcher, CatalogControls, ArtikelAnlegen, CatalogRow). Für die Detailseite zählen RBAC,
// die Datenzusammenstellung (welcher Katalog wird an wen durchgereicht) und die Gruppierung.
vi.mock("./CatalogSwitcher", () => ({
  CatalogSwitcher: ({ currentId }: { currentId: string }) => (
    <div data-testid="catalog-switcher">{currentId}</div>
  ),
}));
vi.mock("./CatalogControls", () => ({
  CatalogControls: ({ currentCatalog }: { currentCatalog?: Catalog }) => (
    <div data-testid="catalog-controls">{currentCatalog ? currentCatalog.id : "none"}</div>
  ),
}));
vi.mock("../ArtikelAnlegen", () => ({
  ArtikelAnlegen: ({ catalogId, ausloeser }: { catalogId: string; ausloeser: string }) => (
    <button type="button" data-catalog-id={catalogId}>
      {ausloeser}
    </button>
  ),
}));
vi.mock("../CatalogRow", () => ({
  CatalogRow: ({ item }: { item: CatalogItem }) => <li>{item.name}</li>,
}));

import { auth } from "@/auth";
import { listCatalogs, listCatalog } from "@/db/catalog";
import CatalogDetailPage from "./page";

// auth ist überladen (Middleware- vs. Session-Resolver-Signatur) – auf Letztere casten
// (etabliertes Muster, siehe app/components/AppHeader.test.tsx).
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const listCatalogsMock = vi.mocked(listCatalogs);
const listCatalogMock = vi.mocked(listCatalog);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

function params(id: string) {
  return Promise.resolve({ id });
}

const catalogA: Catalog = {
  id: "cat-1",
  name: "Montagsrunde",
  active: true,
  sortOrder: 0,
  createdAt: new Date("2026-09-17T00:00:00.000Z"),
  updatedAt: new Date("2026-09-17T00:00:00.000Z"),
};
const catalogB: Catalog = { ...catalogA, id: "cat-2", name: "Dorfmeisterschaften" };

function artikel(id: string, name: string, category: CatalogItem["category"]): CatalogItem {
  return {
    id,
    catalogId: "cat-1",
    name,
    size: "",
    priceCents: 250,
    category,
    sortOrder: 0,
    active: true,
    createdAt: new Date("2026-09-17T00:00:00.000Z"),
    updatedAt: new Date("2026-09-17T00:00:00.000Z"),
  };
}

function plusArtikel() {
  return screen.getByRole("button", { name: "+ Artikel" });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CatalogDetailPage", () => {
  it("should_denyAccess_when_userIsNotVerwalter", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));

    render(await CatalogDetailPage({ params: params("cat-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(listCatalogsMock).not.toHaveBeenCalled();
    expect(listCatalogMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_userHasNoSession", async () => {
    authMock.mockResolvedValue(null);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });

  it("should_renderSwitcherManagerAndAnlegen_when_catalogIdKnown", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA, catalogB]);
    listCatalogMock.mockResolvedValue([]);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    // #345 AK6: der Umschalter bekommt die gewählte Id, Management-Controls und Anlegen
    // bekommen denselben Katalog als Parent-Key-Bindung (nicht irgendeinen anderen).
    expect(screen.getByTestId("catalog-switcher")).toHaveTextContent("cat-1");
    expect(screen.getByTestId("catalog-controls")).toHaveTextContent("cat-1");
    expect(plusArtikel()).toHaveAttribute("data-catalog-id", "cat-1");
    expect(listCatalogMock).toHaveBeenCalledWith("cat-1");
  });

  it("should_putPlusArtikelIntoHeaderWithoutForm_when_verwalter", async () => {
    // spec-373 AK1.1: „+ Artikel" im Seitenkopf, kein Anlege-Formular beim Laden.
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA]);
    listCatalogMock.mockResolvedValue([artikel("bier", "Bier", "getraenk")]);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    const kopf = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    expect(within(kopf).getByRole("button", { name: "+ Artikel" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Bezeichnung")).not.toBeInTheDocument();
  });

  it("should_groupItemsByCategoryInLabelOrderWithoutEmptyGroups_when_itemsPresent", async () => {
    // spec-373 AK4.1: Reihenfolge wie CATEGORY_LABEL (Getränk, Kaffee, Essen), leere fehlen.
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA]);
    listCatalogMock.mockResolvedValue([
      artikel("wurst", "Bratwurst", "essen"),
      artikel("bier", "Bier", "getraenk"),
      artikel("cola", "Cola", "getraenk"),
    ]);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    const gruppen = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(gruppen).toEqual(["Getränk (2)", "Essen (1)"]);
    const getraenke = screen.getByRole("region", { name: "Getränk (2)" });
    // Die Sortierung aus listCatalog bleibt innerhalb der Gruppe erhalten (AK4.4).
    expect(
      within(getraenke)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Bier", "Cola"]);
  });

  it("should_keepInactiveItemAtItsPositionInGroup_when_itemInactive", async () => {
    // spec-373 AK4.4: inaktive Artikel bleiben an ihrer Sortierstelle (Optik: CatalogRow).
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA]);
    listCatalogMock.mockResolvedValue([
      artikel("bier", "Bier", "getraenk"),
      { ...artikel("alt", "Altbier", "getraenk"), active: false },
      artikel("cola", "Cola", "getraenk"),
    ]);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Bier",
      "Altbier",
      "Cola",
    ]);
  });

  it("should_showEmptyStateWithAnlegenForThisCatalog_when_noItemsInCatalog", async () => {
    // spec-373 AK6.1/AK6.2
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA, catalogB]);
    listCatalogMock.mockResolvedValue([]);

    render(await CatalogDetailPage({ params: params("cat-2") }));

    expect(screen.getByText("Noch keine Artikel in diesem Katalog.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Artikel anlegen" })).toHaveAttribute(
      "data-catalog-id",
      "cat-2",
    );
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  // Kein 404: eine unbekannte Katalog-ID wird von dieser Seite bewusst nicht abgewiesen – kein
  // AK/FS aus spec-345 verlangt das für die Verwaltungsseite selbst (anders als z. B.
  // veranstaltung/[id], das bei fehlender Veranstaltung `notFound()` wirft). `CatalogControls`
  // bekommt dann kein `currentCatalog` und zeigt nur „+ Katalog anlegen" (siehe
  // CatalogControls.test.tsx: should_showOnlyCreateButton_when_noCurrentCatalog).
  it("should_passUndefinedCurrentCatalog_when_catalogIdUnknown", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA]);
    listCatalogMock.mockResolvedValue([]);

    render(await CatalogDetailPage({ params: params("does-not-exist") }));

    expect(screen.getByTestId("catalog-controls")).toHaveTextContent("none");
    expect(screen.getByTestId("catalog-switcher")).toHaveTextContent("does-not-exist");
    expect(plusArtikel()).toHaveAttribute("data-catalog-id", "does-not-exist");
  });
});
