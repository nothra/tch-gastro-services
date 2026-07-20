import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FokusListe } from "./FokusListe";
import type { VerzehrArtikel, VerzehrZeile } from "@/app/_verzehr/VerzehrErfassung";
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

const TOKEN = "tok-1";
const ZIEL_KEY = `tch:sb:ziel:${TOKEN}`;

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];
const artikel: VerzehrArtikel[] = [
  { id: "c1", name: "Cola", size: "", priceCents: 250, category: "getraenk" },
];
const positionen: VerzehrPositionRow[] = [];

beforeEach(() => {
  window.localStorage.clear();
  // jsdom implementiert scrollIntoView nicht; die Komponente ruft es guarded auf – hier stubben,
  // falls es als werfende Methode vorhanden ist.
  Element.prototype.scrollIntoView = vi.fn();
});

function renderListe(overrides: Partial<Parameters<typeof FokusListe>[0]> = {}) {
  return render(
    <FokusListe
      token={TOKEN}
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

describe("FokusListe (#183/ADR-035)", () => {
  it("should_openExactlyOneCard_when_initialOpenIdSet", () => {
    renderListe({ initialOpenId: "z1" });

    // Genau die Ziel-Karte ist offen → genau eine MengeControl (ein Artikel, eine offene Karte).
    expect(screen.getAllByTestId("menge")).toHaveLength(1);
  });

  it("should_switchZielCloseOthersAndPersist_when_chipTapped", () => {
    renderListe({ initialOpenId: "z1" });

    fireEvent.click(screen.getByRole("button", { name: "Bernd" }));

    expect(screen.getAllByTestId("menge")).toHaveLength(1);
    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z2");
  });

  it("should_setAriaCurrentOnActiveChip_when_zielSelected", () => {
    renderListe({ initialOpenId: "z1" });

    expect(screen.getByRole("button", { name: "Anna" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Bernd" })).not.toHaveAttribute("aria-current");
  });

  it("should_openCollapsedCardAndCloseOther_when_cardHeadTapped", () => {
    renderListe({ initialOpenId: "z1" });

    fireEvent.click(cardHead("Bernd"));

    expect(cardHead("Bernd")).toHaveAttribute("aria-expanded", "true");
    expect(cardHead("Anna")).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z2");
  });

  it("should_collapseCard_when_openCardHeadTapped", () => {
    renderListe({ initialOpenId: "z1" });

    fireEvent.click(cardHead("Anna"));

    expect(cardHead("Anna")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });

  it("should_collapseAllAndNotPersist_when_readOnly", () => {
    // Read-only (D5): alle Karten zu, kein Ziel-Flow. Chip klappt lokal auf, merkt aber nichts.
    renderListe({ editable: false, initialOpenId: null });
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Anna" }));

    const menge = screen.getByTestId("menge");
    expect(menge).toHaveAttribute("data-editable", "false");
    expect(window.localStorage.getItem(ZIEL_KEY)).toBeNull();
  });
});
