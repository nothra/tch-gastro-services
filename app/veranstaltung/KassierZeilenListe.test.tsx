import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { stubRequestAnimationFrame } from "@/app/_verzehr/raf-stub";
import { KassierZeilenListe, type KassierZeile } from "./KassierZeilenListe";

// Baut die Props so, wie sie die Kassier-Seite liefert: pro Zeile ihre id plus den (server-seitig
// gerenderten) Inhalt. Der Inhalt trägt Name + Status, damit sich Reihenfolge (Position) und
// Inhalt (Badge) getrennt prüfen lassen.
function zeile(id: string, name: string, status = "offen"): KassierZeile {
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

// Die hervorgehobene Zeile ist über aria-current auffindbar (Hervorhebung = Semantik + Optik).
function hervorgehobeneNamen(): string[] {
  return screen
    .getAllByRole("listitem")
    .filter((li) => li.getAttribute("aria-current") === "true")
    .map((li) => li.querySelector("span")?.textContent ?? "");
}

function listenEintrag(name: string): HTMLElement {
  return screen.getByText(name).closest("li")!;
}

let raf: ReturnType<typeof stubRequestAnimationFrame>;

beforeEach(() => {
  // jsdom implementiert scrollIntoView nicht; die Komponente ruft es guarded im rAF-Callback auf.
  Element.prototype.scrollIntoView = vi.fn();
  raf = stubRequestAnimationFrame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("KassierZeilenListe", () => {
  it("should_renderZeilenInServerOrder_when_firstRendered", () => {
    render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
      />,
    );

    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Carla"]);
  });

  it("should_keepFrozenOrder_when_serverReordersOnRerender", () => {
    const { rerender } = render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
      />,
    );

    // Server sortiert die mittlere Zeile (Bernd) nach dem Kassieren ans Ende.
    rerender(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-3", "Carla"), zeile("z-2", "Bernd", "bezahlt")]}
      />,
    );

    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Carla"]);
  });

  it("should_showCurrentServerContent_when_zeileStaysAtFrozenPosition", () => {
    const { rerender } = render(
      <KassierZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />,
    );
    expect(screen.getByTestId("status-z-2")).toHaveTextContent("offen");

    rerender(
      <KassierZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd", "bezahlt")]} />,
    );

    // Eingefroren wird nur die Position, nicht der Inhalt: der Status folgt den Server-Daten.
    expect(screen.getByTestId("status-z-2")).toHaveTextContent("bezahlt");
  });

  it("should_keepEveryFrozenPosition_when_severalZeilenKassiertInSequence", () => {
    const { rerender } = render(
      <KassierZeilenListe
        zeilen={[
          zeile("z-1", "Anna"),
          zeile("z-2", "Bernd"),
          zeile("z-3", "Carla"),
          zeile("z-4", "Dora"),
        ]}
      />,
    );

    rerender(
      <KassierZeilenListe
        zeilen={[
          zeile("z-1", "Anna"),
          zeile("z-3", "Carla"),
          zeile("z-4", "Dora"),
          zeile("z-2", "Bernd", "bezahlt"),
        ]}
      />,
    );
    rerender(
      <KassierZeilenListe
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

  it("should_keepFrozenPositionAndStatus_when_subsequentKassierenFails", () => {
    const { rerender } = render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
      />,
    );

    // Bernd wird erfolgreich kassiert – das erzeugt die Divergenz zwischen Server- und
    // eingefrorener Reihenfolge, gegen die die folgende Assertion erst diskriminierend ist.
    rerender(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-3", "Carla"), zeile("z-2", "Bernd", "bezahlt")]}
      />,
    );

    // Das Kassieren von Carla schlägt fehl: der Server liefert dieselben (bereits divergierten)
    // Daten unverändert zurück.
    rerender(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-3", "Carla"), zeile("z-2", "Bernd", "bezahlt")]}
      />,
    );

    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Carla"]);
    expect(screen.getByTestId("status-z-3")).toHaveTextContent("offen");
  });

  it("should_useServerOrder_when_mountedFreshAfterReload", () => {
    const { unmount } = render(
      <KassierZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />,
    );
    unmount();

    // Neuer Seitenaufruf (Reload) → neue Instanz, die Reihenfolge des Servers gilt wieder.
    render(
      <KassierZeilenListe zeilen={[zeile("z-2", "Bernd", "bezahlt"), zeile("z-1", "Anna")]} />,
    );

    expect(namenInReihenfolge()).toEqual(["Bernd", "Anna"]);
  });

  it("should_appendZeile_when_idIsNotInFrozenOrder", () => {
    const { rerender } = render(
      <KassierZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />,
    );

    rerender(
      <KassierZeilenListe
        zeilen={[zeile("z-9", "Neuling"), zeile("z-1", "Anna"), zeile("z-2", "Bernd")]}
      />,
    );

    // Ohne eingefrorene Position ans Ende – nie stillschweigend ausgeblendet.
    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Neuling"]);
  });

  it("should_skipFrozenId_when_serverNoLongerDeliversThatZeile", () => {
    const { rerender } = render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
      />,
    );

    // Die mittlere Zeile ist entfallen – die eingefrorene Position wird übersprungen, die
    // verbleibenden Zeilen behalten ihre relative Reihenfolge (keine Lücke, kein Absturz).
    rerender(<KassierZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-3", "Carla")]} />);

    expect(namenInReihenfolge()).toEqual(["Anna", "Carla"]);
  });

  it("should_highlightOnlyTargetZeile_when_hervorgehobeneZeileIdGiven", () => {
    // #308 AK2: die Zielzeile ist von den übrigen unterscheidbar – semantisch (aria-current) und
    // optisch (Rahmen + Fläche in Akzentfarbe, Light und Dark).
    render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
        hervorgehobeneZeileId="z-2"
      />,
    );

    expect(hervorgehobeneNamen()).toEqual(["Bernd"]);
    expect(listenEintrag("Bernd")).toHaveClass(
      "border-cyan-600",
      "bg-cyan-50",
      "dark:border-cyan-500",
      "dark:bg-cyan-950",
    );
    expect(listenEintrag("Anna")).toHaveClass("border-zinc-200", "dark:border-zinc-800");
    expect(listenEintrag("Anna")).not.toHaveClass("border-cyan-600");
  });

  it("should_highlightNoZeile_when_hervorgehobeneZeileIdOmitted", () => {
    render(<KassierZeilenListe zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]} />);

    expect(hervorgehobeneNamen()).toEqual([]);
    expect(listenEintrag("Anna")).toHaveClass("border-zinc-200");
  });

  it("should_highlightNoZeile_when_hervorgehobeneZeileIdIsUnknown", () => {
    // F1: unbekannter Personenbezug → Standardzustand, kein Fehler.
    render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]}
        hervorgehobeneZeileId="z-fremd"
      />,
    );
    raf.flush();

    expect(hervorgehobeneNamen()).toEqual([]);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("should_scrollTargetIntoViewAfterLayout_when_hervorgehobeneZeileIdGiven", () => {
    render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]}
        hervorgehobeneZeileId="z-2"
      />,
    );
    const scrollSpy = vi.spyOn(listenEintrag("Bernd"), "scrollIntoView");

    // Erst nach dem Layout-Aufbau scrollen (analog #188), nicht synchron im Render-Tick.
    expect(scrollSpy).not.toHaveBeenCalled();

    raf.flush();
    expect(scrollSpy).toHaveBeenCalledWith({ block: "start" });
  });

  it("should_keepFrozenOrder_when_zeileIsHervorgehoben", () => {
    // #308 AK4: die Hervorhebung findet die Zeile, sie verschiebt sie nicht – der Positions-Freeze
    // (#253) bleibt gültig. Der erste Rerender erzeugt die Divergenz, gegen die das erst
    // diskriminierend ist.
    const { rerender } = render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd"), zeile("z-3", "Carla")]}
        hervorgehobeneZeileId="z-2"
      />,
    );

    rerender(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-3", "Carla"), zeile("z-2", "Bernd", "bezahlt")]}
        hervorgehobeneZeileId="z-2"
      />,
    );

    expect(namenInReihenfolge()).toEqual(["Anna", "Bernd", "Carla"]);
    expect(hervorgehobeneNamen()).toEqual(["Bernd"]);
  });

  it("should_keepHighlight_when_mountedFreshAfterReload", () => {
    // #308 AK11: die Hervorhebung kommt aus dem Aufruf (Prop), nicht aus flüchtigem Zustand.
    const { unmount } = render(
      <KassierZeilenListe
        zeilen={[zeile("z-1", "Anna"), zeile("z-2", "Bernd")]}
        hervorgehobeneZeileId="z-2"
      />,
    );
    unmount();

    render(
      <KassierZeilenListe
        zeilen={[zeile("z-2", "Bernd", "bezahlt"), zeile("z-1", "Anna")]}
        hervorgehobeneZeileId="z-2"
      />,
    );

    expect(hervorgehobeneNamen()).toEqual(["Bernd"]);
  });
});
