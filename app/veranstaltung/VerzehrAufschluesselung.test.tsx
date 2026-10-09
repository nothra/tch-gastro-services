import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { VerzehrPositionDetail } from "@/app/_verzehr/positionen";
import { VerzehrAufschluesselung } from "./VerzehrAufschluesselung";

// Cola 0,5 l: 2 × 1,50 € = 3,00 €; Schnitzel: 2 × 8,50 € = 17,00 € (Einzelpreis/Betrag eindeutig).
const positionen: VerzehrPositionDetail[] = [
  {
    name: "Cola",
    size: "0,5 l",
    category: "getraenk",
    menge: 2,
    einzelpreisCents: 150,
    zeilenbetragCents: 300,
  },
  {
    name: "Schnitzel",
    size: "",
    category: "essen",
    menge: 2,
    einzelpreisCents: 850,
    zeilenbetragCents: 1700,
  },
];

describe("VerzehrAufschluesselung", () => {
  it("should_beCollapsedByDefault_when_rendered", () => {
    const { container } = render(<VerzehrAufschluesselung positionen={positionen} />);

    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
  });

  it("should_beAufklapperTitledVerzehrWithArrowAndHint_when_rendered", () => {
    // spec-403 AK5.2 + Q3: Titel „Verzehr" ohne Zähler, Pfeil und Hinweis „Anzeigen".
    const { container } = render(<VerzehrAufschluesselung positionen={positionen} />);

    const summary = container.querySelector("summary")!;
    expect(within(summary).getByText("Verzehr")).toHaveTextContent(/^Verzehr$/);
    expect(within(summary).getByText("Anzeigen")).toBeInTheDocument();
    expect(summary.querySelector("svg")).not.toBeNull();
  });

  it.each([
    ["Positionen", positionen],
    ["keinePositionen", []],
  ])("should_dimContentNotAufklapper_when_%s", (_fall, liste) => {
    // ADR-052 D1: Farben nicht per `className` an den Aufklapper – gedämpft wird nur der Inhalt.
    const { container } = render(<VerzehrAufschluesselung positionen={liste} />);

    const details = container.querySelector("details")!;
    expect(details.className).not.toMatch(/\btext-muted\b/);
    expect(details.lastElementChild).toHaveClass("text-muted");
  });

  it("should_showQuantityLabelUnitPriceAndLineTotal_when_positionsGiven", () => {
    render(<VerzehrAufschluesselung positionen={positionen} />);

    const cola = screen.getByText("Cola (0,5 l)").closest("tr")!;
    expect(within(cola).getByText("2 ×")).toBeInTheDocument();
    expect(within(cola).getByText("1,50 €")).toBeInTheDocument();
    expect(within(cola).getByText("3,00 €")).toBeInTheDocument();

    const schnitzel = screen.getByText("Schnitzel").closest("tr")!;
    expect(within(schnitzel).getByText("8,50 €")).toBeInTheDocument();
    expect(within(schnitzel).getByText("17,00 €")).toBeInTheDocument();
  });

  it("should_renderPositionsInGivenOrder_when_multiple", () => {
    render(<VerzehrAufschluesselung positionen={positionen} />);

    const bezeichnungen = screen
      .getAllByRole("cell")
      .map((cell) => cell.textContent)
      .filter((text) => text === "Cola (0,5 l)" || text === "Schnitzel");
    expect(bezeichnungen).toEqual(["Cola (0,5 l)", "Schnitzel"]);
  });

  it("should_showHint_when_noPositions", () => {
    render(<VerzehrAufschluesselung positionen={[]} />);

    expect(screen.getByText("Kein Verzehr erfasst")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Verzehr")).toBeInTheDocument();
  });
});
