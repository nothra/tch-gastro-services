import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { CatalogItem } from "@/db/schema";
import { CatalogFields } from "./CatalogFields";

afterEach(() => cleanup());

const essenItem: CatalogItem = {
  id: "1",
  name: "Essen Montagsrunde",
  size: "",
  priceCents: 600,
  category: "essen",
  sortOrder: 10,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("CatalogFields", () => {
  it("should_offerAllThreeCategories_when_rendered", () => {
    render(<CatalogFields />);

    const select = screen.getByLabelText("Kategorie") as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.value);

    expect(options).toEqual(["getraenk", "kaffee", "essen"]);
  });

  it("should_labelEssenOption_when_rendered", () => {
    render(<CatalogFields />);

    expect(screen.getByRole("option", { name: "Essen" })).toBeInTheDocument();
  });

  it("should_prefillPriceFormatted_when_itemPriceCentsProvided", () => {
    render(<CatalogFields item={essenItem} />);

    const priceInput = screen.getByLabelText("Preis (EUR)") as HTMLInputElement;
    expect(priceInput.value).toBe("6,00");
  });

  it("should_preSelectCategoryEssen_when_itemCategoryIsEssen", () => {
    render(<CatalogFields item={essenItem} />);

    const select = screen.getByLabelText("Kategorie") as HTMLSelectElement;
    expect(select.value).toBe("essen");
  });
});
