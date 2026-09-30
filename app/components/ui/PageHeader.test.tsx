import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader (AK2.11)", () => {
  it("should_renderTitleAsH1_when_titleGiven", () => {
    render(<PageHeader title="Katalog" />);

    expect(screen.getByRole("heading", { level: 1, name: "Katalog" })).toBeInTheDocument();
  });

  it("should_omitOptionalParts_when_onlyTitleGiven", () => {
    render(<PageHeader title="Katalog" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should_renderBackLinkWithAccessibleName_when_backGiven", () => {
    render(<PageHeader title="Katalog" back={{ href: "/verwaltung", label: "Zur Verwaltung" }} />);

    const link = screen.getByRole("link", { name: "Zur Verwaltung" });
    expect(link).toHaveAttribute("href", "/verwaltung");
  });

  it("should_renderMeta_when_metaGiven", () => {
    render(<PageHeader title="Katalog" meta="12 Artikel" />);

    expect(screen.getByText("12 Artikel")).toBeInTheDocument();
  });

  it("should_renderAction_when_actionGiven", () => {
    render(<PageHeader title="Katalog" action={<button type="button">Anlegen</button>} />);

    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });

  // Fehlerszenario aus der Spec: sehr lange Titel bei 375 px umbrechen statt überlaufen,
  // die Aktion bleibt erreichbar.
  it("should_allowTitleToWrap_when_titleIsVeryLong", () => {
    render(<PageHeader title={"Sehr langer Katalogname ".repeat(5)} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("break-words");
    expect(heading).toHaveClass("min-w-0");
  });

  it("should_appendLayoutClassName_when_classNameGiven", () => {
    const { container } = render(<PageHeader title="Katalog" className="mb-4" />);

    expect(container.firstElementChild).toHaveClass("mb-4");
  });
});
