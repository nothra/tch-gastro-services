import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Aufklapper } from "./Aufklapper";

// jsdom wertet die Tailwind-Variante `group-open/aufklapper:` nicht aus – hier werden Struktur,
// Klassen und das `open`-Attribut geprüft; dass Pfeil und Hinweis im Browser wirklich wechseln, belegt
// Playwright (ADR-059 D2, e2e/bausteine-listenzeile-aufklapper.spec.ts).

function details(container: HTMLElement) {
  return container.querySelector("details")!;
}

function summary(container: HTMLElement) {
  return container.querySelector("summary")!;
}

describe("Aufklapper (spec-403 AK1)", () => {
  it("should_renderNativeDetailsWithOwnArrowBeforeTitle_when_rendered", () => {
    // AK1.1: natives <details>/<summary>, natives Dreieck aus, eigener Pfeil vor dem Titel.
    const { container } = render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    expect(details(container)).toHaveClass("group/aufklapper");
    expect(summary(container)).toHaveClass("list-none", "[&::-webkit-details-marker]:hidden");
    const pfeil = summary(container).querySelector("svg")!;
    const titel = screen.getByText("Abgeschlossen");
    expect(pfeil.compareDocumentPosition(titel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("should_rotateArrowViaGroupOpen_when_detailsIsOpen", () => {
    // AK1.2: die Drehung hängt am CSS-Zustand des <details>, nicht an React-State (F1).
    const { container } = render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    const pfeilRahmen = summary(container).querySelector("svg")!.parentElement!;
    expect(pfeilRahmen).toHaveClass("group-open/aufklapper:rotate-90");
  });

  it("should_useOnlyNamedGroupVariant_when_rendered", () => {
    // Benannte Gruppe: ein fremder offener `.group`-Vorfahre schaltet nicht mit – keine unbenannte
    // `group-open:`-Variante im Baustein. Verschachtelte Aufklapper schützt das nicht (ADR-059 D2).
    const { container } = render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    expect(container.innerHTML).not.toMatch(/group-open:/);
  });

  it("should_showTitleWithCounter_when_zaehlerGiven", () => {
    // AK1.3
    render(
      <Aufklapper titel="Abgeschlossen" zaehler={3}>
        Inhalt
      </Aufklapper>,
    );

    expect(screen.getByText("Abgeschlossen (3)")).toBeInTheDocument();
  });

  it("should_showTitleWithoutCounter_when_zaehlerOmitted", () => {
    // Q4: der Zähler ist optional.
    render(<Aufklapper titel="Abrechnung im Detail">Inhalt</Aufklapper>);

    expect(screen.getByText("Abrechnung im Detail")).toHaveTextContent(/^Abrechnung im Detail$/);
  });

  it("should_showCounterZero_when_zaehlerIsZero", () => {
    // AK3.4: „Offen (0)" – die Null ist ein gültiger Zähler, kein fehlender.
    render(
      <Aufklapper titel="Offen" zaehler={0}>
        Inhalt
      </Aufklapper>,
    );

    expect(screen.getByText("Offen (0)")).toBeInTheDocument();
  });

  it("should_switchHintBetweenAnzeigenAndAusblendenViaCss_when_rendered", () => {
    // AK1.3 + F1: beide Hinweise stehen im Markup, `group-open/aufklapper:` blendet je einen aus.
    const { container } = render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    const anzeigen = screen.getByText("Anzeigen");
    const ausblenden = screen.getByText("Ausblenden");
    expect(summary(container)).toContainElement(anzeigen);
    expect(summary(container)).toContainElement(ausblenden);
    expect(anzeigen).toHaveClass("group-open/aufklapper:hidden");
    expect(ausblenden).toHaveClass("hidden", "group-open/aufklapper:inline");
  });

  it("should_keepHintOutOfAccessibleName_when_rendered", () => {
    // Den Zustand meldet `<details>` nativ; der sichtbare Hinweis würde ihn im Namen doppeln.
    render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    expect(screen.getByText("Anzeigen").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("should_beCollapsed_when_offenOmitted", () => {
    // AK1.4, erste Hälfte.
    const { container } = render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    expect(details(container)).not.toHaveAttribute("open");
  });

  it("should_beExpanded_when_offenSet", () => {
    // AK1.4, zweite Hälfte.
    const { container } = render(
      <Aufklapper titel="Offen" offen>
        Inhalt
      </Aufklapper>,
    );

    expect(details(container)).toHaveAttribute("open");
  });

  it("should_toggleOpenState_when_summaryActivated", () => {
    // AK1.5: die native Umschaltung bleibt erhalten (kein preventDefault, keine eigene Logik).
    const { container } = render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    fireEvent.click(summary(container));
    expect(details(container)).toHaveAttribute("open");

    fireEvent.click(summary(container));
    expect(details(container)).not.toHaveAttribute("open");
  });

  it("should_beTouchTargetWithVisibleFocusRing_when_rendered", () => {
    // AK1.5: sichtbarer Fokusring; Tippfläche mindestens 44 px.
    const { container } = render(<Aufklapper titel="Abgeschlossen">Inhalt</Aufklapper>);

    expect(summary(container)).toHaveClass(
      "min-h-11",
      "focus-visible:outline-2",
      "focus-visible:outline-accent",
    );
  });

  it("should_renderTitleInHeadingWithId_when_ueberschriftGiven", () => {
    // AK1.7: die Überschrift steckt im <summary> und trägt die id für `aria-labelledby`.
    const { container } = render(
      <section aria-labelledby="gruppe-abgeschlossen">
        <Aufklapper
          titel="Abgeschlossen"
          zaehler={2}
          ueberschrift={{ id: "gruppe-abgeschlossen", ebene: "h2" }}
        >
          Inhalt
        </Aufklapper>
      </section>,
    );

    const heading = screen.getByRole("heading", { level: 2, name: "Abgeschlossen (2)" });
    expect(heading).toHaveAttribute("id", "gruppe-abgeschlossen");
    expect(summary(container)).toContainElement(heading);
    expect(screen.getByRole("region", { name: "Abgeschlossen (2)" })).toBeInTheDocument();
  });

  it("should_renderLevel3Heading_when_ebeneIsH3", () => {
    render(
      <Aufklapper titel="Details" ueberschrift={{ id: "details", ebene: "h3" }}>
        Inhalt
      </Aufklapper>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Details" })).toBeInTheDocument();
  });

  it("should_renderNoHeading_when_ueberschriftOmitted", () => {
    render(<Aufklapper titel="Verzehr">Inhalt</Aufklapper>);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("should_renderChildrenInsideDetails_when_given", () => {
    const { container } = render(
      <Aufklapper titel="Verzehr">
        <p>Kein Verzehr erfasst</p>
      </Aufklapper>,
    );

    expect(details(container)).toContainElement(screen.getByText("Kein Verzehr erfasst"));
    expect(summary(container)).not.toContainElement(screen.getByText("Kein Verzehr erfasst"));
  });

  it("should_addLayoutClassesToDetails_when_classNameGiven", () => {
    const { container } = render(
      <Aufklapper titel="Verzehr" className="text-sm">
        Inhalt
      </Aufklapper>,
    );

    expect(details(container)).toHaveClass("group/aufklapper", "text-sm");
  });
});
