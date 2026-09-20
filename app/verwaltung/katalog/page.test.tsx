import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import CatalogListPage from "./page";

const redirectMock = vi.mocked(redirect);

describe("CatalogListPage (#345)", () => {
  it("should_redirectToStandardCatalog_when_pageLoads", async () => {
    // Die Übersichts-Seite `/verwaltung/katalog` leitet auf `/verwaltung/katalog/standard` um.
    // Details und Katalog-Umschalter sind unter `/verwaltung/katalog/[id]` implementiert.
    await CatalogListPage();

    expect(redirectMock).toHaveBeenCalledWith("/verwaltung/katalog/standard");
  });
});
