import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { CatalogItem } from "@/db/schema";

// Externe Grenzen: Server Actions und Toast-Kapsel. Anlege-Dialog und Zeilen bleiben echt – der
// Bereich verantwortet, welcher Knopf primär ist und wohin angelegt wird.
vi.mock("../actions", () => ({
  createCatalogItemAction: vi.fn(),
  updateCatalogItemAction: vi.fn(),
  setCatalogItemActiveAction: vi.fn(),
}));
vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { ArtikelBereich } from "./ArtikelBereich";

function artikel(
  id: string,
  name: string,
  category: CatalogItem["category"],
  active = true,
): CatalogItem {
  return {
    id,
    catalogId: "cat-1",
    name,
    size: "",
    priceCents: 250,
    category,
    sortOrder: 0,
    active,
    createdAt: new Date("2026-09-17T00:00:00.000Z"),
    updatedAt: new Date("2026-09-17T00:00:00.000Z"),
  };
}

function renderBereich(items: CatalogItem[], catalogId = "cat-1") {
  render(<ArtikelBereich items={items} catalogId={catalogId} />);
}

function primaerKnoepfe() {
  return screen.getAllByRole("button").filter((knopf) => knopf.classList.contains("bg-accent"));
}

function zeilenNamen(container: HTMLElement) {
  return within(container)
    .getAllByRole("listitem")
    .map((li) => within(li).getByRole("button").querySelector(".font-semibold")?.textContent);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ArtikelBereich – Rahmen und Kopfzeile (spec-407 AK3.1–AK3.3)", () => {
  it("should_beNamedRegionWithCountOfActiveAndInactiveItems_when_rendered", () => {
    // AK3.1 (Q3: „Artikel 24") + AK3.3: benannter Abschnitt, Überschrift verknüpft.
    renderBereich([
      artikel("bier", "Bier", "getraenk"),
      artikel("alt", "Altbier", "getraenk", false),
      artikel("wurst", "Bratwurst", "essen"),
    ]);

    const bereich = screen.getByRole("region", { name: "Artikel 3" });
    expect(within(bereich).getByRole("heading", { level: 2 })).toHaveTextContent("Artikel 3");
  });

  it("should_drawCardBorderWithTokenClasses_when_rendered", () => {
    renderBereich([artikel("bier", "Bier", "getraenk")]);

    const karte = screen.getByRole("region", { name: "Artikel 1" }).firstElementChild;
    expect(karte).toHaveClass("rounded-lg", "border", "border-line-subtle", "bg-surface");
  });

  it("should_putPrimaryNeuIntoHeaderAsOnlyPrimaryButton_when_itemsPresent", () => {
    // AK3.2 + AK1.4: „+ Neu" ist der einzige Primär-Knopf und trägt die Auslöser-Id.
    renderBereich([artikel("bier", "Bier", "getraenk")]);

    const neu = screen.getByRole("button", { name: "+ Neu" });
    expect(primaerKnoepfe()).toEqual([neu]);
    expect(neu).toHaveAttribute("id", "anlegen-seitenkopf");
    const ueberschrift = screen.getByRole("heading", { level: 2 });
    expect(ueberschrift.parentElement).toContainElement(neu);
  });

  it("should_openArtikelAnlegenForThisCatalog_when_neuClicked", () => {
    // AK3.2: angelegt wird in diesem Katalog (spec-373 AK6.2).
    renderBereich([artikel("bier", "Bier", "getraenk")], "cat-7");

    fireEvent.click(screen.getByRole("button", { name: "+ Neu" }));

    const dialog = screen.getByRole("dialog", { name: "Artikel anlegen" });
    expect(dialog.querySelector('input[name="catalogId"]')).toHaveValue("cat-7");
  });
});

describe("ArtikelBereich – Leerzustand (spec-407 AK3.4/AK3.5)", () => {
  it("should_showEmptyStateInsideRegionWithHeaderAndNeu_when_noItems", () => {
    renderBereich([], "cat-2");

    const bereich = screen.getByRole("region", { name: "Artikel 0" });
    expect(within(bereich).getByText("Noch keine Artikel in diesem Katalog.")).toBeInTheDocument();
    expect(within(bereich).getByRole("button", { name: "+ Neu" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("should_offerSecondaryArtikelAnlegenAndKeepOnePrimary_when_noItems", () => {
    // AK3.4 (Q4): zweite Anlege-Aktion als Neben-Knopf – „+ Neu" bleibt der einzige Primär-Knopf.
    renderBereich([], "cat-2");

    const leerAnlegen = screen.getByRole("button", { name: "Artikel anlegen" });
    expect(leerAnlegen).toHaveClass("border-line");
    expect(primaerKnoepfe()).toEqual([screen.getByRole("button", { name: "+ Neu" })]);
  });
});

describe("ArtikelBereich – Kategorie-Gruppen (spec-407 AK4.1/AK4.4)", () => {
  it("should_groupByCategoryInLabelOrderWithCountsWithoutEmptyGroups_when_itemsPresent", () => {
    // Reihenfolge wie CATEGORY_LABEL (Getränk, Kaffee, Essen), leere fehlen, Zähler bleibt (Q5).
    renderBereich([
      artikel("wurst", "Bratwurst", "essen"),
      artikel("bier", "Bier", "getraenk"),
      artikel("cola", "Cola", "getraenk"),
    ]);

    const gruppen = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(gruppen).toEqual(["Getränk (2)", "Essen (1)"]);
    expect(zeilenNamen(screen.getByRole("region", { name: "Getränk (2)" }))).toEqual([
      "Bier",
      "Cola",
    ]);
  });

  it("should_keepInactiveItemAtItsSortPosition_when_itemInactive", () => {
    // AK4.4: kein gesonderter Block für deaktivierte Artikel (spec-373 AK4.4).
    renderBereich([
      artikel("bier", "Bier", "getraenk"),
      artikel("alt", "Altbier", "getraenk", false),
      artikel("cola", "Cola", "getraenk"),
    ]);

    expect(zeilenNamen(screen.getByRole("region", { name: "Getränk (3)" }))).toEqual([
      "Bier",
      "Altbier",
      "Cola",
    ]);
  });

  it("should_renderRowsAsCardList_when_itemsPresent", () => {
    // AK4.2: Zeilen als Karten (ListenZeile) statt Sammelkarte mit Trennlinien.
    renderBereich([artikel("bier", "Bier", "getraenk"), artikel("cola", "Cola", "getraenk")]);

    const liste = within(screen.getByRole("region", { name: "Getränk (2)" })).getByRole("list");
    expect(liste).not.toHaveClass("divide-y");
    expect(within(liste).getAllByRole("listitem")[0]).toHaveClass("rounded-lg", "bg-surface");
  });
});
