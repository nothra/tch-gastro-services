import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Notice } from "./Notice";

describe("Notice (AK2.10)", () => {
  it("should_useStatusRole_when_kindIsErfolg", () => {
    render(<Notice kind="erfolg">Artikel angelegt.</Notice>);

    expect(screen.getByRole("status")).toHaveTextContent("Artikel angelegt.");
  });

  it("should_useAlertRole_when_kindIsFehler", () => {
    render(<Notice kind="fehler">Name fehlt.</Notice>);

    expect(screen.getByRole("alert")).toHaveTextContent("Name fehlt.");
  });

  it("should_useSuccessToken_when_kindIsErfolg", () => {
    render(<Notice kind="erfolg">Artikel angelegt.</Notice>);

    expect(screen.getByRole("status")).toHaveClass("text-success");
  });

  it("should_useDangerToken_when_kindIsFehler", () => {
    render(<Notice kind="fehler">Name fehlt.</Notice>);

    expect(screen.getByRole("alert")).toHaveClass("text-danger");
  });

  // Nicht nur über Farbe unterscheidbar: je Art ein eigenes, sichtbares Zeichen. Es ist
  // `aria-hidden`, weil die Rolle (status/alert) die Semantik bereits trägt.
  it("should_showDistinctGlyphs_when_kindsCompared", () => {
    const { unmount } = render(<Notice kind="erfolg">Gut.</Notice>);
    const successGlyph = screen.getByRole("status").textContent;
    unmount();

    render(<Notice kind="fehler">Schlecht.</Notice>);

    expect(screen.getByRole("alert").textContent).not.toBe(successGlyph);
    expect(screen.getByRole("alert").querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  // Fehlerszenario aus der Spec: kein leerer `role="alert"`, den ein Screenreader ansagen würde.
  it.each([undefined, null, ""])("should_renderNothing_when_contentIs%s", (content) => {
    render(<Notice kind="fehler">{content}</Notice>);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_renderNothing_when_successContentIsEmpty", () => {
    render(<Notice kind="erfolg">{""}</Notice>);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // spec-405 AK4.1 / ADR-060 D2: Warnung ist nicht unterbrechend wie die bisherige Duplikat-Warnung.
  it("should_useStatusRoleAndWarningToken_when_kindIsWarnung", () => {
    render(<Notice kind="warnung">Gibt es schon.</Notice>);

    const warnung = screen.getByRole("status");
    expect(warnung).toHaveTextContent("Gibt es schon.");
    expect(warnung).toHaveClass("border-warning", "bg-warning-subtle", "text-warning");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_showWarningGlyph_when_kindIsWarnung", () => {
    render(<Notice kind="warnung">Gibt es schon.</Notice>);

    const zeichen = screen.getByRole("status").querySelector("[aria-hidden='true']");
    expect(zeichen).toHaveTextContent("⚠");
  });

  it("should_renderNothing_when_warnungContentIsEmpty", () => {
    render(<Notice kind="warnung">{undefined}</Notice>);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_appendLayoutClassName_when_classNameGiven", () => {
    render(
      <Notice kind="fehler" className="mt-2">
        Name fehlt.
      </Notice>,
    );

    expect(screen.getByRole("alert")).toHaveClass("mt-2");
  });
});
