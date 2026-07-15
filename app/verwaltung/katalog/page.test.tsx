import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CatalogItem } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/catalog", () => ({ listCatalog: vi.fn() }));

import { auth } from "@/auth";
import { listCatalog } from "@/db/catalog";
import CatalogPage from "./page";

const authMock = vi.mocked(auth);
const listCatalogMock = vi.mocked(listCatalog);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

const seededItem: CatalogItem = {
  id: "1",
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

    expect(screen.getByText("Getränke-Katalog")).toBeInTheDocument();
    expect(screen.getByText(/ISO-Sportdrink/)).toBeInTheDocument();
    expect(screen.getByText(/2,00 €/)).toBeInTheDocument();
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
