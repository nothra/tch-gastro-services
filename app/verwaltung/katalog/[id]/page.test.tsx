import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Session } from "next-auth";
import type { Catalog, CatalogItem } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/catalog", () => ({ listCatalogs: vi.fn(), listCatalog: vi.fn() }));
// Externe Grenzen der eingebetteten Client-Komponenten: Server Actions und Toast-Kapsel. Die
// Komponenten selbst bleiben echt – die Seite verantwortet Reihenfolge und „genau ein
// Primär-Knopf" (spec-407 AK1), das lässt sich nur am echten Zusammenbau prüfen.
vi.mock("../actions", () => ({
  createCatalogAction: vi.fn(),
  renameCatalogAction: vi.fn(),
  setCatalogActiveAction: vi.fn(),
  duplicateCatalogAction: vi.fn(),
  createCatalogItemAction: vi.fn(),
  updateCatalogItemAction: vi.fn(),
  setCatalogItemActiveAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));
// Die Auswahl braucht den App-Router; sie hat eigene Tests (CatalogSwitcher.test.tsx).
vi.mock("./CatalogSwitcher", () => ({
  CatalogSwitcher: ({ currentId }: { currentId: string }) => (
    <div data-testid="catalog-switcher">{currentId}</div>
  ),
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

async function renderAlsVerwalter(id: string, items: CatalogItem[] = []) {
  authMock.mockResolvedValue(session(["verwalter"]));
  listCatalogsMock.mockResolvedValue([catalogA, catalogB]);
  listCatalogMock.mockResolvedValue(items);
  render(await CatalogDetailPage({ params: params(id) }));
}

function knopf(name: string) {
  return screen.getByRole("button", { name });
}

/** `a` steht im Dokument vor `b`. */
function stehtVor(a: Element, b: Element) {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CatalogDetailPage – Zugriff (F2)", () => {
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
});

describe("CatalogDetailPage – Seitenaufbau (spec-407 AK1)", () => {
  it("should_orderTitleSwitcherCatalogButtonsAndArticleRegion_when_rendered", async () => {
    // AK1.1: Titel, Auswahl, direkt darunter die Katalog-Knöpfe, danach der Artikelbereich.
    await renderAlsVerwalter("cat-1", [artikel("bier", "Bier", "getraenk")]);

    const reihenfolge = [
      screen.getByRole("heading", { level: 1, name: "Katalog" }),
      screen.getByTestId("catalog-switcher"),
      knopf("Katalog bearbeiten"),
      knopf("Katalog anlegen"),
      screen.getByRole("region", { name: "Artikel 1" }),
    ];
    for (let i = 1; i < reihenfolge.length; i++) {
      expect(stehtVor(reihenfolge[i - 1], reihenfolge[i])).toBe(true);
    }
  });

  it("should_placeCatalogButtonsSideBySideDirectlyAfterSwitcher_when_rendered", async () => {
    // AK1.1 „direkt darunter" + AK1.2 „nebeneinander (umbrechend)": ein gemeinsamer Container
    // unmittelbar nach der Auswahl.
    await renderAlsVerwalter("cat-1");

    const knopfzeile = knopf("Katalog bearbeiten").parentElement!;
    expect(knopfzeile).toContainElement(knopf("Katalog anlegen"));
    expect(knopfzeile).toHaveClass("flex", "flex-wrap");
    expect(screen.getByTestId("catalog-switcher").nextElementSibling).toBe(knopfzeile);
  });

  it("should_haveNoActionInPageHeader_when_rendered", async () => {
    // AK1.3: kein „+ Artikel" mehr neben dem Titel.
    await renderAlsVerwalter("cat-1");

    const kopf = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    expect(within(kopf).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Artikel" })).not.toBeInTheDocument();
  });

  it.each([
    ["mit Artikeln", [artikel("bier", "Bier", "getraenk")]],
    ["ohne Artikel", []],
  ])("should_haveExactlyOnePrimaryButtonNeuInArticleRegion_when_%s", async (_fall, items) => {
    // AK1.4: genau ein Primär-Knopf auf der Seite – „+ Neu" im Artikelbereich.
    await renderAlsVerwalter("cat-1", items);

    const primaer = screen
      .getAllByRole("button")
      .filter((element) => element.classList.contains("bg-accent"));
    expect(primaer).toEqual([knopf("+ Neu")]);
    expect(screen.getByRole("region", { name: /^Artikel/ })).toContainElement(knopf("+ Neu"));
  });

  it("should_offerAnlegenButNotBearbeiten_when_catalogIdUnknown", async () => {
    // AK1.5: keine 404 – ohne auflösbaren Katalog gibt es nur „Katalog anlegen".
    await renderAlsVerwalter("does-not-exist");

    expect(knopf("Katalog anlegen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Katalog bearbeiten" })).not.toBeInTheDocument();
    expect(screen.getByTestId("catalog-switcher")).toHaveTextContent("does-not-exist");
  });
});

describe("CatalogDetailPage – Datenzusammenstellung (#345 AK6)", () => {
  it("should_loadItemsOfRequestedCatalog_when_rendered", async () => {
    await renderAlsVerwalter("cat-2");

    expect(listCatalogMock).toHaveBeenCalledWith("cat-2");
    expect(screen.getByTestId("catalog-switcher")).toHaveTextContent("cat-2");
    expect(screen.getByText("Noch keine Artikel in diesem Katalog.")).toBeInTheDocument();
  });

  it("should_groupItemsInsideArticleRegion_when_itemsPresent", async () => {
    await renderAlsVerwalter("cat-1", [
      artikel("wurst", "Bratwurst", "essen"),
      artikel("bier", "Bier", "getraenk"),
    ]);

    const bereich = screen.getByRole("region", { name: "Artikel 2" });
    expect(
      within(bereich)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Getränk (1)", "Essen (1)"]);
  });
});
