import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CatalogFields } from "./CatalogFields";

afterEach(() => cleanup());

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
});
