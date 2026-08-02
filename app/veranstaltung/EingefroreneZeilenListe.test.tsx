import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EingefroreneZeilenListe, type EingefroreneZeile } from "./EingefroreneZeilenListe";

// Baut die Props so, wie sie die Kassier-Seite liefert: pro Zeile ihre id plus den (server-seitig
// gerenderten) Inhalt. Der Inhalt trägt Name + Status, damit sich Reihenfolge (Position) und
// Inhalt (Badge) getrennt prüfen lassen.
function zeile(id: string, name: string, status = "offen"): EingefroreneZeile {
  return {
    id,
    inhalt: (
      <>
        <span>{name}</span>
        <span data-testid={`status-${id}`}>{status}</span>
      </>
    ),
  };
}

function namenInReihenfolge(): string[] {
  return screen.getAllByRole("listitem").map((li) => li.querySelector("span")?.textContent ?? "");
}

describe("EingefroreneZeilenListe", () => {
  it("should_renderZeilenInServerOrder_when_firstRendered", () => {
    render(
      <EingefroreneZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
      />,
    );

    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Carla"]);
  });

  it("should_keepFrozenOrder_when_serverReordersOnRerender", () => {
    const { rerender } = render(
      <EingefroreneZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
      />,
    );

    // Server sortiert die mittlere Zeile (Bernd) nach dem Kassieren ans Ende.
    rerender(
      <EingefroreneZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-3", "Carla"), zeile("z-2", "Bernd", "bezahlt")]}
      />,
    );

    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Carla"]);
  });

  it("should_showCurrentServerContent_when_zeileStaysAtFrozenPosition", () => {
    const { rerender } = render(
      <EingefroreneZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />,
    );
    expect(screen.getByTestId("status-z-2")).toHaveTextContent("offen");

    rerender(
      <EingefroreneZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd", "bezahlt")]} />,
    );

    // Eingefroren wird nur die Position, nicht der Inhalt: der Status folgt den Server-Daten.
    expect(screen.getByTestId("status-z-2")).toHaveTextContent("bezahlt");
  });

  it("should_keepEveryFrozenPosition_when_severalZeilenKassiertInSequence", () => {
    const { rerender } = render(
      <EingefroreneZeilenListe
        zeilen={[
          zeile("z-1", "Anna"),
          zeile("z-2", "Bernd"),
          zeile("z-3", "Carla"),
          zeile("z-4", "Dora"),
        ]}
      />,
    );

    rerender(
      <EingefroreneZeilenListe
        zeilen={[
          zeile("z-1", "Anna"),
          zeile("z-3", "Carla"),
          zeile("z-4", "Dora"),
          zeile("z-2", "Bernd", "bezahlt"),
        ]}
      />,
    );
    rerender(
      <EingefroreneZeilenListe
        zeilen={[
          zeile("z-1", "Anna"),
          zeile("z-4", "Dora"),
          zeile("z-2", "Bernd", "bezahlt"),
          zeile("z-3", "Carla", "bezahlt"),
        ]}
      />,
    );

    // Kein kumulatives Nachrutschen: jede Zeile steht weiter auf ihrer Ausgangsposition.
    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Carla", "Dora"]);
  });

  it("should_keepFrozenOrder_when_rerenderedWithUnchangedZeilen", () => {
    const { rerender } = render(
      <EingefroreneZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />,
    );

    // Fehlgeschlagenes Kassieren: der Server liefert unveränderte Daten.
    rerender(<EingefroreneZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />);

    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd"]);
    expect(screen.getByTestId("status-z-2")).toHaveTextContent("offen");
  });

  it("should_useServerOrder_when_mountedFreshAfterReload", () => {
    const { unmount } = render(
      <EingefroreneZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />,
    );
    unmount();

    // Neuer Seitenaufruf (Reload) → neue Instanz, die Reihenfolge des Servers gilt wieder.
    render(
      <EingefroreneZeilenListe zeilen={[zeile("z-2", "Bernd", "bezahlt"), zeile("z-1", "Anna")]} />,
    );

    expect(namenInReihenfolge()).toEqual(["Bernd", "Anna"]);
  });

  it("should_appendZeile_when_idIsNotInFrozenOrder", () => {
    const { rerender } = render(
      <EingefroreneZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />,
    );

    rerender(
      <EingefroreneZeilenListe
        zeilen={[zeile("z-9", "Neuling"), zeile("z-1", "Anna"), zeile("z-2", "Bernd")]}
      />,
    );

    // Ohne eingefrorene Position ans Ende – nie stillschweigend ausgeblendet.
    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Neuling"]);
  });

  it("should_skipFrozenId_when_serverNoLongerDeliversThatZeile", () => {
    const { rerender } = render(
      <EingefroreneZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
      />,
    );

    // Die mittlere Zeile ist entfallen – die eingefrorene Position wird übersprungen, die
    // verbleibenden Zeilen behalten ihre relative Reihenfolge (keine Lücke, kein Absturz).
    rerender(<EingefroreneZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-3", "Carla")]} />);

    expect(namenInReihenfolge()).toEqual(["Anna", "Carla"]);
  });
});
