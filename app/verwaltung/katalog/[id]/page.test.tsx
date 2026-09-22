import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import type { Catalog, CatalogItem } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/catalog", () => ({ listCatalogs: vi.fn(), listCatalog: vi.fn() }));

// Eingebettete Komponenten sind hier durch Stubs ersetzt – sie haben eigene Tests
// (CatalogSwitcher.test.tsx, CatalogManager.test.tsx; CatalogItemForm/CatalogRow stammen aus
// #59 und haben eigene Coverage über CatalogFields.test.tsx). Für die Detailseite zählen RBAC
// und die Datenzusammenstellung (welcher Katalog wird an wen durchgereicht).
vi.mock("./CatalogSwitcher", () => ({
  CatalogSwitcher: ({ currentId }: { currentId: string }) => (
    <div data-testid="catalog-switcher">{currentId}</div>
  ),
}));
vi.mock("./CatalogManager", () => ({
  CatalogManager: ({ currentCatalog }: { currentCatalog?: Catalog }) => (
    <div data-testid="catalog-manager">{currentCatalog ? currentCatalog.id : "none"}</div>
  ),
}));
vi.mock("../CatalogItemForm", () => ({
  CatalogItemForm: ({ catalogId }: { catalogId: string }) => (
    <div data-testid="catalog-item-form">{catalogId}</div>
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

  it("should_renderSwitcherManagerAndForm_when_catalogIdKnown", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA, catalogB]);
    listCatalogMock.mockResolvedValue([]);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    // AK6: der Umschalter bekommt die gewählte Id, Management-Controls und Anlage-Formular
    // bekommen denselben Katalog als Parent-Key-Bindung (nicht irgendeinen anderen).
    expect(screen.getByTestId("catalog-switcher")).toHaveTextContent("cat-1");
    expect(screen.getByTestId("catalog-manager")).toHaveTextContent("cat-1");
    expect(screen.getByTestId("catalog-item-form")).toHaveTextContent("cat-1");
    expect(listCatalogMock).toHaveBeenCalledWith("cat-1");
  });

  it("should_renderItemRows_when_itemsPresent", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA]);
    const item: CatalogItem = {
      id: "item-1",
      catalogId: "cat-1",
      name: "Bier",
      size: "0,5 l",
      priceCents: 250,
      category: "getraenk",
      sortOrder: 0,
      active: true,
      createdAt: new Date("2026-09-17T00:00:00.000Z"),
      updatedAt: new Date("2026-09-17T00:00:00.000Z"),
    };
    listCatalogMock.mockResolvedValue([item]);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    expect(screen.getByText("Bier")).toBeInTheDocument();
  });

  it("should_showEmptyState_when_noItemsInCatalog", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA]);
    listCatalogMock.mockResolvedValue([]);

    render(await CatalogDetailPage({ params: params("cat-1") }));

    expect(screen.getByText("Noch keine Artikel im Katalog.")).toBeInTheDocument();
  });

  // Kein 404: eine unbekannte Katalog-ID wird von dieser Seite bewusst nicht abgewiesen – kein
  // AK/FS aus spec-345 verlangt das für die Verwaltungsseite selbst (anders als z. B.
  // veranstaltung/[id], das bei fehlender Veranstaltung `notFound()` wirft). `CatalogManager`
  // bekommt dann kein `currentCatalog` und zeigt nur „+ Katalog anlegen" (siehe
  // CatalogManager.test.tsx: should_showOnlyCreateButton_when_noCurrentCatalog).
  it("should_passUndefinedCurrentCatalog_when_catalogIdUnknown", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogsMock.mockResolvedValue([catalogA]);
    listCatalogMock.mockResolvedValue([]);

    render(await CatalogDetailPage({ params: params("does-not-exist") }));

    expect(screen.getByTestId("catalog-manager")).toHaveTextContent("none");
    expect(screen.getByTestId("catalog-switcher")).toHaveTextContent("does-not-exist");
    expect(screen.getByTestId("catalog-item-form")).toHaveTextContent("does-not-exist");
  });
});
