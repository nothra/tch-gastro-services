import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicHeader } from "./PublicHeader";

describe("PublicHeader", () => {
  it("should_showContextLabel_when_provided", () => {
    render(<PublicHeader contextLabel="Montagsrunde" />);
    expect(screen.getByText("Montagsrunde")).toBeInTheDocument();
  });

  it("should_showFallbackLabel_when_noContextGiven", () => {
    render(<PublicHeader />);
    expect(screen.getByText(/TCH Gastro Services/i)).toBeInTheDocument();
  });

  it("should_offerOnlyAnmeldenLink_when_rendered", () => {
    // Anonym-Leiste: kein Personal-Menü, kein Link auf geschützte Bereiche – nur "Anmelden".
    render(<PublicHeader contextLabel="Theke" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(/Anmelden/i);
    expect(links[0]).toHaveAttribute("href", "/login");
  });

  it("should_notLinkToProtectedAreas_when_rendered", () => {
    render(<PublicHeader contextLabel="Theke" />);
    expect(screen.queryByRole("link", { name: "Veranstaltungen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Katalog" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teilnehmer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Abmelden/i })).not.toBeInTheDocument();
  });
});
