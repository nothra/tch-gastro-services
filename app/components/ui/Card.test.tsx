import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card (AK2.8)", () => {
  it("should_renderChildren_when_contentGiven", () => {
    render(<Card>Inhalt</Card>);

    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });

  // Die Abgrenzung entsteht über Fläche- und Linie-Token; beide folgen dem Gerätemodus von
  // selbst, deshalb steht hier keine `dark:`-Variante (spec AK1.2).
  it("should_useSurfaceAndLineTokens_when_rendered", () => {
    render(<Card>Inhalt</Card>);

    const card = screen.getByText("Inhalt");
    expect(card).toHaveClass("bg-surface");
    expect(card).toHaveClass("border-line-subtle");
    expect(card.className).not.toMatch(/\bdark:/);
  });

  it("should_appendLayoutClassName_when_classNameGiven", () => {
    render(<Card className="max-w-sm">Inhalt</Card>);

    expect(screen.getByText("Inhalt")).toHaveClass("max-w-sm");
  });

  it("should_passThroughNativeAttributes_when_given", () => {
    render(<Card data-testid="karte">Inhalt</Card>);

    expect(screen.getByTestId("karte")).toBeInTheDocument();
  });
});
