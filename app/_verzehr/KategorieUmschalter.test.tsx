import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KategorieUmschalter } from "./KategorieUmschalter";

describe("KategorieUmschalter (spec-370 AK2)", () => {
  it("should_renderOneButtonPerCategoryInGivenOrder_when_rendered", () => {
    render(
      <KategorieUmschalter
        kategorien={["getraenk", "kaffee", "essen"]}
        aktiv="getraenk"
        onWaehle={vi.fn()}
      />,
    );
    const gruppe = screen.getByRole("group", { name: "Kategorie wählen" });
    const namen = Array.from(gruppe.querySelectorAll("button")).map((b) => b.textContent);
    expect(namen).toEqual(["Getränke", "Kaffee", "Essen"]);
  });

  it("should_markOnlyActiveCategoryPressed_when_rendered", () => {
    // AK2.1: aktiver Eintrag nicht nur farblich erkennbar → aria-pressed.
    render(
      <KategorieUmschalter kategorien={["getraenk", "kaffee"]} aktiv="kaffee" onWaehle={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Kaffee" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Getränke" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("should_reportChosenCategory_when_buttonClicked", () => {
    const onWaehle = vi.fn();
    render(
      <KategorieUmschalter
        kategorien={["getraenk", "kaffee"]}
        aktiv="getraenk"
        onWaehle={onWaehle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kaffee" }));
    expect(onWaehle).toHaveBeenCalledWith("kaffee");
  });

  it("should_offerInaktivEntry_when_categoryListContainsIt", () => {
    render(
      <KategorieUmschalter
        kategorien={["getraenk", "inaktiv"]}
        aktiv="inaktiv"
        onWaehle={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Nicht mehr im Katalog" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("should_useButtonBausteinWithTouchHeight_when_rendered", () => {
    // AK4.2/AK4.6: Höhe aus dem Button-Baustein; gemessen im E2E.
    render(<KategorieUmschalter kategorien={["getraenk"]} aktiv="getraenk" onWaehle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Getränke" })).toHaveClass("min-h-11");
  });

  it("should_renderNothing_when_noCategories", () => {
    const { container } = render(
      <KategorieUmschalter kategorien={[]} aktiv={null} onWaehle={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
