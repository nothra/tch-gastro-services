import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Veranstaltung } from "@/db/schema";
import { OffeneVeranstaltungen, OffeneVeranstaltungenLadefehler } from "./OffeneVeranstaltungen";

function veranstaltung(overrides: Partial<Veranstaltung>): Veranstaltung {
  return {
    id: "v-1",
    typ: "veranstaltung",
    bezeichnung: "Montagsrunde",
    datum: new Date("2026-07-13"),
    kasse: "montagsrunde",
    status: "offen",
    ...overrides,
  } as Veranstaltung;
}

function abschnitt() {
  return screen.getByRole("region", { name: "Offene Veranstaltungen" });
}

describe("OffeneVeranstaltungen", () => {
  it("should_linkEachRowToDetailWithBezeichnungDatumKasse_when_veranstaltungenGiven", () => {
    // spec-374 AK2.1: je Zeile Bezeichnung, Datum und Kasse, verlinkt auf die Detailseite.
    render(
      <OffeneVeranstaltungen
        veranstaltungen={[
          veranstaltung({ id: "v-1", bezeichnung: "Montagsrunde 13.07." }),
          veranstaltung({
            id: "v-2",
            bezeichnung: "Sommerfest",
            datum: new Date("2026-07-06"),
            kasse: "vereinskasse",
          }),
        ]}
      />,
    );

    const zeilen = within(abschnitt()).getAllByRole("listitem");
    expect(zeilen).toHaveLength(2);
    expect(within(zeilen[0]).getByRole("link", { name: /Montagsrunde 13\.07\./ })).toHaveAttribute(
      "href",
      "/veranstaltung/v-1",
    );
    expect(zeilen[0]).toHaveTextContent("13.07.2026 · Montagsrunde");
    expect(within(zeilen[1]).getByRole("link", { name: /Sommerfest/ })).toHaveAttribute(
      "href",
      "/veranstaltung/v-2",
    );
    expect(zeilen[1]).toHaveTextContent("06.07.2026 · Vereinskasse");
  });

  it("should_keepGivenOrder_when_rendered", () => {
    // AK2.2: die Sortierung liefert die Data-Layer – die Komponente sortiert nicht um.
    render(
      <OffeneVeranstaltungen
        veranstaltungen={[
          veranstaltung({ id: "v-alt", bezeichnung: "Alt", datum: new Date("2026-06-01") }),
          veranstaltung({ id: "v-neu", bezeichnung: "Neu", datum: new Date("2026-07-01") }),
        ]}
      />,
    );

    const links = within(abschnitt()).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/veranstaltung/v-alt",
      "/veranstaltung/v-neu",
    ]);
  });

  it("should_showEmptyHintWithAnlegenButton_when_noVeranstaltungen", () => {
    // AK2.3: statt der Liste ein Leer-Hinweis mit Button „Veranstaltung anlegen".
    render(<OffeneVeranstaltungen veranstaltungen={[]} />);

    expect(within(abschnitt()).queryByRole("list")).not.toBeInTheDocument();
    expect(within(abschnitt()).getByText("Keine offene Veranstaltung.")).toBeInTheDocument();
    expect(
      within(abschnitt()).getByRole("link", { name: "Veranstaltung anlegen" }),
    ).toHaveAttribute("href", "/veranstaltung");
  });

  it("should_showHeadingAsLevel2_when_rendered", () => {
    render(<OffeneVeranstaltungen veranstaltungen={[]} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Offene Veranstaltungen" }),
    ).toBeInTheDocument();
  });
});

describe("OffeneVeranstaltungenLadefehler", () => {
  it("should_showErrorHintInSection_when_rendered", () => {
    // Fehlerszenario: Hinweis statt Absturz, im selben Abschnitt.
    render(<OffeneVeranstaltungenLadefehler />);

    expect(within(abschnitt()).getByRole("alert")).toHaveTextContent(
      "Veranstaltungen konnten nicht geladen werden",
    );
  });
});
