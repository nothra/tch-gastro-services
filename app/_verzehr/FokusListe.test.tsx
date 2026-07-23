import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FokusListe } from "./FokusListe";
import { stubRequestAnimationFrame } from "./raf-stub";
import type { VerzehrArtikel, VerzehrZeile } from "./VerzehrErfassung";
import type { VerzehrPositionRow } from "@/db/verzehr";

// MengeControl (Client, useActionState) durch ein Stub ersetzt, das die editable-Prop spiegelt –
// so ist prüfbar, welche Karte aufgeklappt (= MengeControl gerendert) und ob sie bearbeitbar ist.
vi.mock("@/app/_verzehr/MengeControl", () => ({
  MengeControl: ({ menge, editable }: { menge: number; editable: boolean }) => (
    <span data-testid="menge" data-editable={String(editable)}>
      {menge}
    </span>
  ),
}));

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];
const artikel: VerzehrArtikel[] = [
  { id: "c1", name: "Cola", size: "", priceCents: 250, category: "getraenk" },
];
const positionen: VerzehrPositionRow[] = [];

let raf: ReturnType<typeof stubRequestAnimationFrame>;

beforeEach(() => {
  // jsdom implementiert scrollIntoView nicht; die Komponente ruft es guarded auf – hier stubben,
  // falls es als werfende Methode vorhanden ist.
  Element.prototype.scrollIntoView = vi.fn();
  raf = stubRequestAnimationFrame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderListe(overrides: Partial<Parameters<typeof FokusListe>[0]> = {}) {
  return render(
    <FokusListe
      zeilen={zeilen}
      artikel={artikel}
      positionen={positionen}
      action={vi.fn()}
      editable
      initialOpenId="z1"
      {...overrides}
    />,
  );
}

// Der Karten-Kopf ist der Button mit aria-expanded (der Chip trägt aria-current, kein aria-expanded).
function cardHead(name: string) {
  const head = screen
    .getAllByRole("button", { name: new RegExp(name) })
    .find((button) => button.hasAttribute("aria-expanded"));
  if (!head) throw new Error(`Kein Karten-Kopf für ${name}`);
  return head;
}

describe("FokusListe (#183/ADR-035, route-neutral #187/ADR-039)", () => {
  it("should_openExactlyOneCard_when_initialOpenIdSet", () => {
    renderListe({ initialOpenId: "z1" });

    // Genau die fokussierte Karte ist offen → genau eine MengeControl (ein Artikel, eine offene Karte).
    expect(screen.getAllByTestId("menge")).toHaveLength(1);
  });

  it("should_openNoCard_when_initialOpenIdNull", () => {
    renderListe({ initialOpenId: null });

    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });

  it("should_switchFocusCloseOthersAndNotifyConsumer_when_chipTapped", () => {
    const onFokusWechsel = vi.fn();
    renderListe({ initialOpenId: "z1", onFokusWechsel });

    fireEvent.click(screen.getByRole("button", { name: "Bernd" }));

    expect(screen.getAllByTestId("menge")).toHaveLength(1);
    expect(onFokusWechsel).toHaveBeenCalledWith("z2");
  });

  it("should_setAriaCurrentOnActiveChip_when_focusSelected", () => {
    renderListe({ initialOpenId: "z1" });

    expect(screen.getByRole("button", { name: "Anna" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Bernd" })).not.toHaveAttribute("aria-current");
  });

  it("should_openCollapsedCardCloseOtherAndNotifyConsumer_when_cardHeadTapped", () => {
    const onFokusWechsel = vi.fn();
    renderListe({ initialOpenId: "z1", onFokusWechsel });

    fireEvent.click(cardHead("Bernd"));

    expect(cardHead("Bernd")).toHaveAttribute("aria-expanded", "true");
    expect(cardHead("Anna")).toHaveAttribute("aria-expanded", "false");
    expect(onFokusWechsel).toHaveBeenCalledWith("z2");
  });

  it("should_collapseCardAndNotNotifyConsumer_when_openCardHeadTapped", () => {
    const onFokusWechsel = vi.fn();
    renderListe({ initialOpenId: "z1", onFokusWechsel });

    fireEvent.click(cardHead("Anna"));

    expect(cardHead("Anna")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
    // Zuklappen ist kein Fokuswechsel – der Konsument wird dabei nicht benachrichtigt.
    expect(onFokusWechsel).not.toHaveBeenCalled();
  });

  it("should_workWithoutCallback_when_onFokusWechselOmitted", () => {
    // F5 reicht keinen Callback herein: Chip klappt trotzdem lokal auf, kein Absturz.
    renderListe({ initialOpenId: null });

    fireEvent.click(screen.getByRole("button", { name: "Anna" }));

    expect(cardHead("Anna")).toHaveAttribute("aria-expanded", "true");
  });

  it("should_showOnlyOwnPositions_when_multipleZeilenHavePositions", () => {
    // Belegt, dass jede Karte NUR ihre eigenen Positionen erhält (Filter in FokusListe, nicht nur
    // in der geteilten VerzehrErfassung/F5) – unterschiedliche Mengen je Zeile für denselben Artikel.
    const positionenMitMehrerenZeilen: VerzehrPositionRow[] = [
      {
        zeileId: "z1",
        catalogItemId: "c1",
        menge: 2,
        name: "Cola",
        size: "",
        priceCents: 250,
        category: "getraenk",
        active: true,
      },
      {
        zeileId: "z2",
        catalogItemId: "c1",
        menge: 5,
        name: "Cola",
        size: "",
        priceCents: 250,
        category: "getraenk",
        active: true,
      },
    ];

    renderListe({ positionen: positionenMitMehrerenZeilen, initialOpenId: "z1" });
    expect(screen.getByTestId("menge")).toHaveTextContent("2");

    fireEvent.click(cardHead("Bernd"));
    expect(screen.getByTestId("menge")).toHaveTextContent("5");
  });

  it("should_reserveScrollMarginTopClearingChipBar_when_collapsibleCard", () => {
    // Bug #188 (Screenshot 1): scrollIntoView({block:"start"}) richtet den Kartenkopf an der
    // Viewport-Oberkante aus – die sticky Chip-Leiste (top-0) verdeckt ihn. Die Zielkarte braucht
    // ein scroll-margin-top in Höhe der Chip-Leiste, damit der Kopf (Name) sichtbar bleibt.
    renderListe({ initialOpenId: "z1" });

    const karte = cardHead("Anna").closest("li");
    expect(karte).toHaveClass("scroll-mt-16");
  });

  it("should_deferScrollUntilAfterLayoutExpansion_when_focusSelected", () => {
    // Bug #188 (Screenshot 2): setOpenId + scrollIntoView im selben Tick scrollt gegen das NOCH
    // eingeklappte Layout; nach dem Reflow (andere Karte klappt zu, Ziel klappt auf) ist nur noch
    // der untere Rand sichtbar. Der Scroll muss NACH dem Layout-Update laufen (requestAnimationFrame).
    renderListe({ initialOpenId: "z1" });
    const scrollSpy = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    scrollSpy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Bernd" }));

    // Nicht synchron im Klick-Tick (Layout noch nicht expandiert) …
    expect(scrollSpy).not.toHaveBeenCalled();

    // … sondern erst im requestAnimationFrame-Callback nach dem Reflow.
    raf.flush();
    expect(scrollSpy).toHaveBeenCalledWith({ block: "start" });
  });

  it("should_collapseAllAndRenderDisabled_when_readOnly", () => {
    // Read-only (D5): alle Karten zu, kein Callback (der Konsument merkt sich bei read-only nichts).
    // Chip klappt lokal auf, die aufgeklappte Karte ist nicht bearbeitbar.
    renderListe({ editable: false, initialOpenId: null });
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Anna" }));

    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
  });
});
