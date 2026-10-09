import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungZeile } from "@/db/schema";

// Das Zeilenmenü hat eigene Tests; hier zählt nur, OB die Zeile es zeigt und mit welchen Daten.
vi.mock("./ZeilenMenue", () => ({
  ZeilenMenue: ({ zeileId, name }: { zeileId: string; name: string }) => (
    <div data-testid="zeilen-menue" data-zeile-id={zeileId}>
      {name}
    </div>
  ),
}));

import { ZeileRow } from "./ZeileRow";

const aZeile: VeranstaltungZeile = {
  id: "z-1",
  veranstaltungId: "v-1",
  teilnehmerId: "t-1",
  anzeigename: "Erika Mustermann",
  erhaltenCents: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ZeileRow (spec-369 AK17/AK18/AK9)", () => {
  it("should_linkNameToVerzehrOfThisPerson_when_editable", () => {
    // AK17: Tipp auf den Namen öffnet die Verzehr-Seite mit Personenbezug (#308).
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable />);

    expect(screen.getByRole("link", { name: "Erika Mustermann" })).toHaveAttribute(
      "href",
      "/veranstaltung/v-1/verzehr?zeile=z-1",
    );
  });

  it("should_showZeilenMenueForThisZeile_when_editable", () => {
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable />);

    expect(screen.getByTestId("zeilen-menue")).toHaveAttribute("data-zeile-id", "z-1");
    expect(screen.getByTestId("zeilen-menue")).toHaveTextContent("Erika Mustermann");
  });

  it("should_notShowZeilenMenue_when_notEditable", () => {
    // AK9: abgeschlossene Veranstaltung – kein Zeilenmenü.
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable={false} />);

    expect(screen.queryByTestId("zeilen-menue")).not.toBeInTheDocument();
  });

  it("should_keepNameAsReadOnlyLink_when_notEditable", () => {
    // Nachschlagen bleibt erlaubt: die Verzehr-Seite ist bei Abschluss schreibgeschützt.
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable={false} />);

    expect(screen.getByRole("link", { name: "Erika Mustermann" })).toHaveAttribute(
      "href",
      "/veranstaltung/v-1/verzehr?zeile=z-1",
    );
  });

  it("should_allowLongNamesToWrap_when_nameIsVeryLong", () => {
    // FS6: lange Namen brechen um und verdrängen das Menü nicht.
    const langerName = "Familie Sehr-Lange-Doppelnamen-Mustermann-Beispielhausen ".repeat(3);
    render(
      <ZeileRow zeile={{ ...aZeile, anzeigename: langerName }} veranstaltungId="v-1" editable />,
    );

    expect(screen.getByRole("link")).toHaveClass("min-w-0");
    expect(screen.getByText(langerName.trim(), { selector: "a span" })).toHaveClass("break-words");
  });

  it("should_placeZeilenMenueNextToLinkInListenZeileCard_when_editable", () => {
    // spec-403 AK4.3/AK4.4/AK2.4: Karte aus dem Baustein, Menü als Zeilenaktion neben dem Link.
    render(
      <ul>
        <ZeileRow zeile={aZeile} veranstaltungId="v-1" editable />
      </ul>,
    );

    const karte = screen.getByRole("listitem");
    expect(karte).toHaveClass("border-line-subtle", "bg-surface", "hover:bg-accent-subtle");
    expect(karte).toContainElement(screen.getByTestId("zeilen-menue"));
    expect(screen.getByRole("link")).not.toContainElement(screen.getByTestId("zeilen-menue"));
  });

  // ADR-059 D1: ohne Zeilenaktion steht der Pfeil im Link – die schreibgeschützte Zeile zeigt ihn,
  // die bearbeitbare nicht (dort nimmt das ⋯ den Platz). Beide Richtungen (Lesson #211).
  it("should_showArrowAndNoAktionContainer_when_notEditable", () => {
    render(
      <ul>
        <ZeileRow zeile={aZeile} veranstaltungId="v-1" editable={false} />
      </ul>,
    );

    expect(screen.getByRole("link").querySelector("svg")).not.toBeNull();
    // Einziges Kind der Zeile ist der Link – kein Aktions-Container für das Menü.
    expect(screen.getByRole("listitem").children).toHaveLength(1);
  });

  it("should_showNoArrow_when_editable", () => {
    render(
      <ul>
        <ZeileRow zeile={aZeile} veranstaltungId="v-1" editable />
      </ul>,
    );

    expect(screen.getByRole("link").querySelector("svg")).toBeNull();
    // Link + Aktions-Container mit dem Zeilenmenü daneben.
    expect(screen.getByRole("listitem").children).toHaveLength(2);
  });
});
