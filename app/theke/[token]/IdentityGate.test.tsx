import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IdentityGate } from "./IdentityGate";
import type { VerzehrArtikel, VerzehrZeile } from "@/app/_verzehr/VerzehrErfassung";

// MengeControl (Client, useActionState) durch ein Stub ersetzt, das die editable-Prop spiegelt –
// so ist prüfbar, ob die Erfassung hinter dem Zweischritt read-only ist oder freigeschaltet.
vi.mock("@/app/_verzehr/MengeControl", () => ({
  MengeControl: ({ menge, editable }: { menge: number; editable: boolean }) => (
    <span data-testid="menge" data-editable={String(editable)}>
      {menge}
    </span>
  ),
}));

const TOKEN = "tok-1";
const ERFASSER_KEY = `tch:sb:erfasser:${TOKEN}`;
const ZIEL_KEY = `tch:sb:ziel:${TOKEN}`;
const LEGACY_KEY = `tch:sb:name:${TOKEN}`;

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];
const artikel: VerzehrArtikel[] = [
  { id: "c1", name: "Cola", size: "0,5l", priceCents: 250, category: "getraenk" },
];

function renderGate(overrides: Partial<Parameters<typeof IdentityGate>[0]> = {}) {
  return render(
    <IdentityGate
      token={TOKEN}
      zeilen={zeilen}
      artikel={artikel}
      positionen={[]}
      action={vi.fn()}
      editable
      {...overrides}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("IdentityGate – Schritt 1: Erfasser", () => {
  it("should_showErfasserPickerAndReadOnlyList_when_nothingStored", () => {
    renderGate();

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anna" })).toBeInTheDocument();
    // Erfassbereiche sichtbar, aber nicht bearbeitbar (spec-54 AC B, Codify #54).
    const menge = screen.getAllByTestId("menge");
    expect(menge.length).toBeGreaterThan(0);
    menge.forEach((control) => expect(control).toHaveAttribute("data-editable", "false"));
  });

  it("should_storeErfasserAndAskZiel_when_erfasserPicked", () => {
    renderGate();

    fireEvent.click(screen.getByRole("button", { name: "Anna" }));

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBe("z1");
    expect(screen.getByText("Für wen möchtest du einen Verzehr erfassen?")).toBeInTheDocument();
  });

  it("should_reAskErfasser_when_erfasserStale", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z-weg");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    renderGate();

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
  });
});

describe("IdentityGate – Schritt 2: Ziel-Teilnehmer", () => {
  it("should_offerFuerMichAsFirstOption_when_zielQuestionShown", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");

    renderGate();

    const fuerMich = screen.getByRole("button", { name: /Für mich/ });
    expect(fuerMich).toHaveTextContent("Für mich (Anna)");
    // „Für mich" steht vor den übrigen Teilnehmern.
    const bernd = screen.getByRole("button", { name: "Bernd" });
    expect(fuerMich.compareDocumentPosition(bernd) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Der Erfasser (Anna) taucht nicht zusätzlich als „übriger" Teilnehmer auf.
    expect(screen.queryByRole("button", { name: "Anna" })).not.toBeInTheDocument();
  });

  it("should_adoptErfasserAsZielAndShowFocus_when_fuerMichChosen", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");

    renderGate();
    fireEvent.click(screen.getByRole("button", { name: /Für mich/ }));

    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z1");
    expect(screen.getByText(/Erfassung durch/)).toBeInTheDocument();
    expect(screen.queryByText(/Für wen/)).not.toBeInTheDocument();
    // Ziel-Karte (Anna) offen und bearbeitbar.
    const menge = screen.getAllByTestId("menge");
    expect(menge).toHaveLength(1);
    expect(menge[0]).toHaveAttribute("data-editable", "true");
  });

  it("should_setZielAndShowFocus_when_otherParticipantChosen", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");

    renderGate();
    fireEvent.click(screen.getByRole("button", { name: "Bernd" }));

    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z2");
    expect(screen.getByText(/Erfassung durch/)).toBeInTheDocument();
  });

  it("should_reAskZiel_when_zielStaleButErfasserKnown", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z-weg");

    renderGate();

    expect(screen.getByText("Für wen möchtest du einen Verzehr erfassen?")).toBeInTheDocument();
  });
});

describe("IdentityGate – Wiederkehr & Erfasser-Wechsel", () => {
  it("should_skipBothQuestionsAndShowFocus_when_bothStored", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    renderGate();

    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByText(/Für wen/)).not.toBeInTheDocument();
    // Zuletzt gewähltes Ziel (Bernd) direkt offen + bearbeitbar.
    const menge = screen.getAllByTestId("menge");
    expect(menge).toHaveLength(1);
    expect(menge[0]).toHaveAttribute("data-editable", "true");
  });

  it("should_clearBothAndReAskErfasser_when_erfasserWechseln", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    renderGate();
    fireEvent.click(screen.getByRole("button", { name: "Erfasser wechseln" }));

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBeNull();
    expect(window.localStorage.getItem(ZIEL_KEY)).toBeNull();
    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
  });
});

describe("IdentityGate – Legacy-Adoption (#54, D6)", () => {
  it("should_adoptLegacyNameAsErfasserAndAskZiel_when_legacyKeyMatches", () => {
    window.localStorage.setItem(LEGACY_KEY, "Anna");

    renderGate();

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBe("z1");
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(screen.getByText("Für wen möchtest du einen Verzehr erfassen?")).toBeInTheDocument();
  });
});

describe("IdentityGate – Read-only & Leerfälle", () => {
  it("should_renderReadOnlyAccordionWithoutGate_when_notEditable", () => {
    renderGate({ editable: false });

    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByText(/Für wen/)).not.toBeInTheDocument();
    expect(screen.queryByText("Erfasser wechseln")).not.toBeInTheDocument();
    // Read-only-Akkordeon: alle Karten zu → keine MengeControl, bis aufgeklappt wird.
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
    // Teilnehmer bleiben sichtbar (Chip + Karten-Kopf tragen den Namen).
    expect(screen.getAllByRole("button", { name: /Anna/ }).length).toBeGreaterThan(0);
  });

  it("should_showHint_when_noZeilen", () => {
    renderGate({ zeilen: [] });

    expect(screen.getByText(/bitte an den Veranstalter wenden/)).toBeInTheDocument();
    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });
});
