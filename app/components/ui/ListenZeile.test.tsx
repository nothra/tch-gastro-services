import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { ListenZeile } from "./ListenZeile";

// Transparenter next/link-Mock: spiegelt den prefetch-Prop als data-prefetch, damit das
// Durchreichen testbar ist (das echte <Link> rendert prefetch nicht ins DOM).
vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

function renderZeile(zeile: ReactNode) {
  return render(<ul>{zeile}</ul>);
}

function karte() {
  return screen.getByRole("listitem");
}

describe("ListenZeile (spec-403 AK2)", () => {
  it("should_renderCardListItem_when_rendered", () => {
    // AK2.1: Karte mit Token-Optik.
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" />);

    expect(karte()).toHaveClass("rounded-lg", "border", "border-line-subtle", "bg-surface");
  });

  it("should_makeWholeRowTheLinkTarget_when_rendered", () => {
    // AK2.1: die ganze Zeile (Titel + Untertitel) ist das Tipp-Ziel.
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" untertitel="13.07.2026" />);

    const link = within(karte()).getByRole("link");
    expect(link).toHaveAttribute("href", "/ziel");
    expect(link).toHaveTextContent("Montagsrunde");
    expect(link).toHaveTextContent("13.07.2026");
    expect(link).toHaveClass("flex-1", "self-stretch");
  });

  it("should_highlightOnHoverAndFocus_when_rendered", () => {
    // AK2.2: Hover und Fokus wechseln auf die Akzent-Optik; der Link zeigt einen Fokusring.
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" />);

    expect(karte()).toHaveClass(
      "hover:border-accent",
      "hover:bg-accent-subtle",
      "focus-within:border-accent",
      "focus-within:bg-accent-subtle",
    );
    expect(screen.getByRole("link")).toHaveClass(
      "focus-visible:outline-2",
      "focus-visible:outline-accent",
    );
  });

  it("should_showArrowInsideLink_when_noAktion", () => {
    // AK2.3: Variante „führt woandershin" mit Pfeil rechts.
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" />);

    expect(screen.getByRole("link").querySelector("svg")).not.toBeNull();
  });

  it.each([
    [false, "false"],
    [undefined, "undefined"],
  ])("should_passPrefetchThrough_when_prefetchIs%s", (prefetch, erwartet) => {
    // AK2.3: das Prefetch-Verhalten bestimmt der Konsument (Startseite: false, ADR-031).
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" prefetch={prefetch} />);

    expect(screen.getByRole("link")).toHaveAttribute("data-prefetch", erwartet);
  });

  it("should_omitArrow_when_pfeilFalse", () => {
    // Q2: Arbeitsschritt-Kacheln ohne Pfeil.
    renderZeile(<ListenZeile href="/ziel" titel="Kassieren" pfeil={false} />);

    expect(karte().querySelector("svg")).toBeNull();
  });

  it("should_placeAktionNextToLinkNotInside_when_aktionGiven", () => {
    // AK2.4/F4: der Knopf ist Geschwister des Links – keine verschachtelten interaktiven Elemente.
    renderZeile(
      <ListenZeile href="/ziel" titel="Erika" aktion={<button type="button">Aktionen</button>} />,
    );

    const link = screen.getByRole("link");
    const knopf = screen.getByRole("button", { name: "Aktionen" });
    expect(link).not.toContainElement(knopf);
    expect(karte()).toContainElement(knopf);
  });

  it("should_notNavigate_when_aktionClicked", () => {
    // AK2.4: ein Tipp auf den Knopf löst die Zeilen-Navigation nicht aus.
    const linkKlick = vi.fn();
    renderZeile(
      <ListenZeile href="/ziel" titel="Erika" aktion={<button type="button">Aktionen</button>} />,
    );
    screen.getByRole("link").addEventListener("click", linkKlick);

    fireEvent.click(screen.getByRole("button", { name: "Aktionen" }));

    expect(linkKlick).not.toHaveBeenCalled();
  });

  it("should_omitArrow_when_aktionGiven", () => {
    // ADR-059 D1: mit Zeilenaktion nimmt der Knopf den Platz des Pfeils.
    renderZeile(
      <ListenZeile href="/ziel" titel="Erika" aktion={<button type="button">Aktionen</button>} />,
    );

    expect(karte().querySelector("svg")).toBeNull();
  });

  // Konsumenten übergeben bedingt (`aktion={editable && <Menue/>}`): ein leerer Slot zeigt den
  // Pfeil und keinen Aktions-Container – Gegenrichtung zu den beiden Tests oben (Lesson #211).
  it.each<{ aktion: ReactNode; label: string }>([
    { aktion: false, label: "False" },
    { aktion: null, label: "Null" },
  ])("should_showArrowWithoutAktionContainer_when_aktionIs$label", ({ aktion }) => {
    renderZeile(<ListenZeile href="/ziel" titel="Erika" aktion={aktion} />);

    expect(screen.getByRole("link").querySelector("svg")).not.toBeNull();
    // Einziges Kind der Karte ist der Link – kein Aktions-Container daneben.
    expect(karte().children).toHaveLength(1);
  });

  it.each<{ untertitel: ReactNode; label: string }>([
    { untertitel: false, label: "False" },
    { untertitel: null, label: "Null" },
    { untertitel: "", label: "Leer" },
  ])("should_renderNoUntertitelSpan_when_untertitelIs$label", ({ untertitel }) => {
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" untertitel={untertitel} />);

    expect(karte().querySelector(".text-sm")).toBeNull();
  });

  it("should_neitherDimNorShowBadge_when_zustandIsEmpty", () => {
    // „Zustand immer als Text": ein leerer Zustand ergäbe ein leeres Badge ohne Aussage.
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" zustand="" />);

    expect(karte().querySelector(".opacity-60")).toBeNull();
    // Link-Kinder: Textblock + Pfeil – kein Badge dazwischen.
    expect(screen.getByRole("link").children).toHaveLength(2);
  });

  it("should_dimTextAndArrowButNotBadge_when_zustandSet", () => {
    // AK2.5 / ADR-059 D3: Textblock + Pfeil verblasst, das Badge mit dem Zustandstext nicht.
    renderZeile(
      <ListenZeile
        href="/ziel"
        titel="Montagsrunde August"
        untertitel="11.08.2026"
        zustand="abgeschlossen"
      />,
    );

    const textblock = screen.getByText("Montagsrunde August").parentElement!;
    expect(textblock).toHaveClass("opacity-60");
    expect(textblock).toContainElement(screen.getByText("11.08.2026"));
    expect(karte().querySelector("svg")!.parentElement).toHaveClass("opacity-60");

    const badge = screen.getByText("abgeschlossen");
    expect(badge).toHaveClass("text-muted", "bg-background");
    expect(badge.closest(".opacity-60")).toBeNull();
    expect(karte()).not.toHaveClass("opacity-60");
  });

  it("should_useForegroundForUntertitel_when_zustandSet", () => {
    // AK2.5 / D3: gedämpft wie der Titel, aber ≥ 4,5 : 1 (Rechnung in tokens.test.ts).
    renderZeile(
      <ListenZeile
        href="/ziel"
        titel="Montagsrunde"
        untertitel="11.08.2026"
        zustand="deaktiviert"
      />,
    );

    expect(screen.getByText("11.08.2026")).toHaveClass("text-foreground");
    expect(screen.getByText("11.08.2026")).not.toHaveClass("text-muted");
  });

  it("should_useMutedUntertitelWithoutDimmingOrBadge_when_noZustand", () => {
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" untertitel="13.07.2026" />);

    expect(screen.getByText("13.07.2026")).toHaveClass("text-muted");
    expect(karte().querySelector(".opacity-60")).toBeNull();
    expect(karte()).not.toHaveTextContent(/abgeschlossen|deaktiviert/);
  });

  it("should_includeZustandInLinkName_when_zustandSet", () => {
    // AK2.5: der Zustand steht als Text, nicht nur als Abblendung – auch für Screenreader.
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" zustand="abgeschlossen" />);

    expect(screen.getByRole("link")).toHaveAccessibleName(/abgeschlossen/);
  });

  it("should_wrapLongTexts_when_rendered", () => {
    // AK2.6/F2: lange Texte brechen um, statt Pfeil/Knopf aus dem Bild zu schieben.
    renderZeile(<ListenZeile href="/ziel" titel="Titel" untertitel="Untertitel" />);

    expect(screen.getByText("Titel")).toHaveClass("break-words");
    expect(screen.getByText("Untertitel")).toHaveClass("break-words");
    expect(screen.getByText("Titel").parentElement).toHaveClass("min-w-0");
    expect(screen.getByRole("link")).toHaveClass("min-w-0");
  });

  it("should_haveMinimumTouchHeight_when_rendered", () => {
    // AK2.8
    renderZeile(<ListenZeile href="/ziel" titel="Montagsrunde" />);

    expect(screen.getByRole("link")).toHaveClass("min-h-11");
  });

  it("should_addLayoutClassesToCard_when_classNameGiven", () => {
    renderZeile(<ListenZeile href="/ziel" titel="Kassieren" className="min-w-0" />);

    expect(karte()).toHaveClass("bg-surface", "min-w-0");
  });

  it("should_renderUntertitelNode_when_reactNodeGiven", () => {
    // Kacheln übergeben die Kennzahl als eigenes Element (tabular-nums).
    renderZeile(
      <ListenZeile
        href="/ziel"
        titel="Kassieren"
        untertitel={<span className="tabular-nums">3 offen</span>}
      />,
    );

    expect(screen.getByText("3 offen")).toHaveClass("tabular-nums");
  });
});
