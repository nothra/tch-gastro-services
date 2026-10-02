import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PersonenKopf } from "./PersonenKopf";

const summen = { getraenkeCents: 500, kaffeeCents: 150, essenCents: 900, gesamtCents: 1550 };

describe("PersonenKopf (spec-370 AK1)", () => {
  it("should_showNameAsHeading_when_rendered", () => {
    render(<PersonenKopf name="Anna" summen={summen} />);
    expect(screen.getByRole("heading", { level: 2, name: "Anna" })).toBeInTheDocument();
  });

  it("should_showGesamtLabelledAndTabular_when_rendered", () => {
    // AK1.1: Gesamtbetrag groß rechts daneben, Ziffern gleicher Breite.
    render(<PersonenKopf name="Anna" summen={summen} />);
    const gesamt = screen.getByText("15,50 €");
    expect(gesamt).toHaveClass("tabular-nums", "text-xl");
    expect(gesamt.closest("p")).toHaveTextContent("Gesamt 15,50 €");
  });

  it("should_showBreakdownInOrderGetraenkeKaffeeEssen_when_rendered", () => {
    render(<PersonenKopf name="Anna" summen={summen} />);
    const aufschluesselung = screen.getByText(/^Getränke/);
    expect(aufschluesselung).toHaveTextContent("Getränke 5,00 € · Kaffee 1,50 € · Essen 9,00 €");
    expect(aufschluesselung).toHaveClass("tabular-nums");
  });

  it("should_clampNameToTwoLinesAndKeepGesamtOnOneLine_when_nameIsLong", () => {
    // AK1.2: Name bricht höchstens zweizeilig um (dann Auslassung), Gesamt bricht nie um.
    // Die Messung bei 375 px übernimmt der E2E-Test (jsdom hat kein Layout, ADR-054 D5).
    render(<PersonenKopf name="Familie Müller-Lüdenscheidt-Hoffmann" summen={summen} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("line-clamp-2", "min-w-0");
    expect(screen.getByText("15,50 €").closest("p")).toHaveClass("shrink-0", "whitespace-nowrap");
  });

  it("should_showZeroAmounts_when_noVerzehr", () => {
    render(
      <PersonenKopf
        name="Anna"
        summen={{ getraenkeCents: 0, kaffeeCents: 0, essenCents: 0, gesamtCents: 0 }}
      />,
    );
    expect(screen.getByText(/^Getränke/)).toHaveTextContent(
      "Getränke 0,00 € · Kaffee 0,00 € · Essen 0,00 €",
    );
    expect(screen.getByText("0,00 €")).toBeInTheDocument();
  });
});
