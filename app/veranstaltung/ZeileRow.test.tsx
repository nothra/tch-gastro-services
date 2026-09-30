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

    const link = screen.getByRole("link");
    expect(link).toHaveClass("min-w-0", "break-words");
  });
});
