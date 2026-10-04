import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicHeader } from "./PublicHeader";

describe("PublicHeader", () => {
  it("should_showWortmarkeAndContextLabel_when_contextProvided", () => {
    // spec-374 AK3.1: Wortmarke plus Veranstaltungs-/Thekenname als Kontext.
    render(<PublicHeader contextLabel="Montagsrunde" />);
    expect(screen.getByText("TCH Gastro Services")).toBeInTheDocument();
    expect(screen.getByText("Montagsrunde")).toBeInTheDocument();
  });

  it("should_showOnlyWortmarke_when_noContextGiven", () => {
    render(<PublicHeader />);
    expect(screen.getByRole("banner")).toHaveTextContent(/^TCH Gastro ServicesAnmelden$/);
  });

  it("should_notLinkWortmarke_when_rendered", () => {
    // AK3.2: die Wortmarke führt Gäste nicht auf die (geschützte) Startseite.
    render(<PublicHeader contextLabel="Theke" />);
    expect(screen.getByText("TCH Gastro Services").closest("a")).toBeNull();
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
    expect(screen.queryByRole("button", { name: "Konto" })).not.toBeInTheDocument();
  });
});
