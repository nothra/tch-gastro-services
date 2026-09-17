import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CatalogItem } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
// Der Mock ersetzt das ganze Modul – die Konstante muss mitgeliefert werden, sonst reichte die
// Seite `undefined` an die Data-Layer durch und die Wiring-Assertion unten wäre wertlos.
vi.mock("@/db/catalog", () => ({ listCatalog: vi.fn(), STANDARD_CATALOG_ID: "standard" }));

import { auth } from "@/auth";
import { listCatalog } from "@/db/catalog";
import CatalogPage from "./page";

const authMock = vi.mocked(auth);
const listCatalogMock = vi.mocked(listCatalog);

// Soll-Wert als Literal, nicht aus dem Mock gelesen (Testing-Standards). Gegen die
// Produktions-Konstante und das Migrations-Literal hält ihn der Drift-Guard in db/catalog.test.ts.
const STANDARD_CATALOG_ID = "standard";

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

const seededItem: CatalogItem = {
  id: "1",
  catalogId: STANDARD_CATALOG_ID,
  name: "ISO-Sportdrink",
  size: "0,5 l",
  priceCents: 200,
  category: "getraenk",
  sortOrder: 10,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.resetAllMocks());

describe("CatalogPage", () => {
  it("should_denyAccess_when_userIsNotVerwalter", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));

    render(await CatalogPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(listCatalogMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await CatalogPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });

  it("should_renderSeededItemsWithFormattedPrice_when_verwalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogMock.mockResolvedValue([seededItem]);

    render(await CatalogPage());

    expect(screen.getByText("Katalog")).toBeInTheDocument();
    expect(screen.queryByText("Getränke-Katalog")).not.toBeInTheDocument();
    expect(screen.getByText(/ISO-Sportdrink/)).toBeInTheDocument();
    expect(screen.getByText(/2,00 €/)).toBeInTheDocument();
  });

  it("should_loadStandardCatalog_when_verwalter", async () => {
    // AK7: die Seite bleibt verhaltensneutral, weil sie bis #346 genau den Standard-Katalog
    // pflegt (ADR-050 D3). Wiring-Assertion – ohne sie wäre ein `undefined` als Katalogbezug
    // in den gemockten Tests unauffällig.
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogMock.mockResolvedValue([seededItem]);

    render(await CatalogPage());

    expect(listCatalogMock).toHaveBeenCalledWith(STANDARD_CATALOG_ID);
  });

  it("should_notRenderCatalogSelectionOrField_when_verwalter", async () => {
    // AK7, Gegenrichtung: kein neues Eingabefeld und keine Katalog-Anzeige (spec-59 AK7).
    // Bewusst am Feld/Label statt am Katalognamen: der Name ist laut AK5 änderbar, und es gibt
    // echte Artikel, die ihn im eigenen Namen tragen („Essen Montagsrunde") – ein Guard darauf
    // bräche aus einem AK-fremden Grund.
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogMock.mockResolvedValue([seededItem]);

    render(await CatalogPage());

    expect(screen.queryByLabelText(/Katalog/)).not.toBeInTheDocument();
  });

  it("should_renderEssenLabel_when_itemCategoryIsEssen", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogMock.mockResolvedValue([
      { ...seededItem, id: "2", name: "Bratwurst mit Brötchen", category: "essen" },
    ]);

    render(await CatalogPage());

    // Zeilen-Label steht in der Preis-/Kategorie-Zeile ("2,00 € · Essen") – nicht die
    // gleichnamige <option> im Anlege-Formular.
    expect(screen.getByText(/· Essen/)).toBeInTheDocument();
  });

  it("should_showEmptyCatalogMessage_when_noItems", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listCatalogMock.mockResolvedValue([]);

    render(await CatalogPage());

    expect(screen.getByText(/Noch keine Artikel im Katalog/)).toBeInTheDocument();
    // Artikelzähler zeigt 0
    expect(screen.getByText(/Artikel \(0\)/)).toBeInTheDocument();
  });
});
