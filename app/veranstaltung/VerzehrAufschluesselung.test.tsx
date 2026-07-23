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
    expect(screen.getByText("Verzehr anzeigen")).toBeInTheDocument();
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
    expect(screen.getByText("Verzehr anzeigen")).toBeInTheDocument();
  });
});
