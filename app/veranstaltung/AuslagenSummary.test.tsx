import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { AuslagenSummen } from "./auslagenSummen";
import { AuslagenSummary } from "./AuslagenSummary";

const summen: AuslagenSummen = {
  getraenke: { offenCents: 1250, erstattetCents: 500 },
  essen: { offenCents: 0, erstattetCents: 2000 },
  sonstiges: { offenCents: 300, erstattetCents: 0 },
  gesamt: { offenCents: 1550, erstattetCents: 2500 },
};

describe("AuslagenSummary", () => {
  it("should_renderPerCategoryOffenAndErstattet_when_summenGiven", () => {
    render(<AuslagenSummary summen={summen} />);

    const getraenke = screen.getByText("Getränke").closest("tr")!;
    expect(within(getraenke).getByText("12,50 €")).toBeInTheDocument();
    expect(within(getraenke).getByText("5,00 €")).toBeInTheDocument();

    const essen = screen.getByText("Essen").closest("tr")!;
    expect(within(essen).getByText("0,00 €")).toBeInTheDocument();
    expect(within(essen).getByText("20,00 €")).toBeInTheDocument();
  });

  it("should_renderGesamtRow_when_summenGiven", () => {
    render(<AuslagenSummary summen={summen} />);

    const gesamt = screen.getByText("Gesamt").closest("tr")!;
    expect(within(gesamt).getByText("15,50 €")).toBeInTheDocument();
    expect(within(gesamt).getByText("25,00 €")).toBeInTheDocument();
  });

  it("should_labelBothColumns_when_rendered", () => {
    render(<AuslagenSummary summen={summen} />);

    expect(screen.getByText("offen zu erstatten")).toBeInTheDocument();
    expect(screen.getByText("erstattet")).toBeInTheDocument();
  });
});
