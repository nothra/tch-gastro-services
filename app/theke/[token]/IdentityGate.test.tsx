import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { IdentityGate } from "./IdentityGate";
import { stubRequestAnimationFrame } from "@/app/_verzehr/raf-stub";
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

let raf: ReturnType<typeof stubRequestAnimationFrame>;

beforeEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  raf = stubRequestAnimationFrame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("IdentityGate – Schritt 1: Erfasser", () => {
  it("should_showErfasserSelectAndReadOnlyList_when_nothingStored", () => {
    renderGate();

    const select = screen.getByRole("combobox", { name: "Wer bist du?" });
    expect(select).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Anna" })).toBeInTheDocument();
    // Keine Teilnehmer-Buttons mehr (AC: natives Dropdown statt Button-Liste).
    expect(screen.queryByRole("button", { name: "Anna" })).not.toBeInTheDocument();
    // Platzhalter ist vorausgewählt.
    expect(select).toHaveValue("");
    // Erfassbereiche sichtbar, aber nicht bearbeitbar (spec-54 AC B, Codify #54).
    const menge = screen.getAllByTestId("menge");
    expect(menge.length).toBeGreaterThan(0);
    menge.forEach((control) => expect(control).toHaveAttribute("data-editable", "false"));
  });

  it("should_storeErfasserAndAskZiel_when_erfasserSelected", () => {
    renderGate();

    fireEvent.change(screen.getByRole("combobox", { name: "Wer bist du?" }), {
      target: { value: "z1" },
    });

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBe("z1");
    expect(screen.getByText("Für wen möchtest du einen Verzehr erfassen?")).toBeInTheDocument();
  });

  it("should_doNothing_when_erfasserPlaceholderSelected", () => {
    renderGate();

    fireEvent.change(screen.getByRole("combobox", { name: "Wer bist du?" }), {
      target: { value: "" },
    });

    expect(window.localStorage.getItem(ERFASSER_KEY)).toBeNull();
    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
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

    const select = screen.getByRole("combobox", {
      name: "Für wen möchtest du einen Verzehr erfassen?",
    });
    const optionLabels = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    // Platzhalter, dann „Für mich" vor den übrigen Teilnehmern.
    expect(optionLabels).toEqual(["Bitte wählen…", "Für mich (Anna)", "Bernd"]);
    // Der Erfasser (Anna) taucht nicht zusätzlich als „übriger" Teilnehmer auf.
    expect(within(select).queryByRole("option", { name: "Anna" })).not.toBeInTheDocument();
  });

  it("should_adoptErfasserAsZielAndShowFocus_when_fuerMichChosen", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");

    renderGate();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Für wen möchtest du einen Verzehr erfassen?" }),
      { target: { value: "z1" } },
    );

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
    fireEvent.change(
      screen.getByRole("combobox", { name: "Für wen möchtest du einen Verzehr erfassen?" }),
      { target: { value: "z2" } },
    );

    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z2");
    expect(screen.getByText(/Erfassung durch/)).toBeInTheDocument();
  });

  it("should_doNothing_when_zielPlaceholderSelected", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");

    renderGate();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Für wen möchtest du einen Verzehr erfassen?" }),
      { target: { value: "" } },
    );

    expect(window.localStorage.getItem(ZIEL_KEY)).toBeNull();
    expect(screen.getByText("Für wen möchtest du einen Verzehr erfassen?")).toBeInTheDocument();
  });

  it("should_reAskZiel_when_zielStaleButErfasserKnown", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z-weg");

    renderGate();

    expect(screen.getByText("Für wen möchtest du einen Verzehr erfassen?")).toBeInTheDocument();
  });

  it("should_offerOnlyFuerMich_when_onlyOneTeilnehmer", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");

    renderGate({ zeilen: [zeilen[0]] });

    const select = screen.getByRole("combobox", {
      name: "Für wen möchtest du einen Verzehr erfassen?",
    });
    const optionLabels = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(optionLabels).toEqual(["Bitte wählen…", "Für mich (Anna)"]);

    fireEvent.change(select, { target: { value: "z1" } });

    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z1");
    expect(screen.getByText(/Erfassung durch/)).toBeInTheDocument();
  });
});

describe("IdentityGate – Fokus", () => {
  it("should_focusZielSelect_when_erfasserChosen", () => {
    renderGate();

    fireEvent.change(screen.getByRole("combobox", { name: "Wer bist du?" }), {
      target: { value: "z1" },
    });
    const zielSelect = screen.getByRole("combobox", {
      name: "Für wen möchtest du einen Verzehr erfassen?",
    });
    // Fokus landet erst im nächsten Frame (Codify #188), nicht synchron beim State-Wechsel.
    expect(zielSelect).not.toHaveFocus();

    raf.flush();

    expect(zielSelect).toHaveFocus();
  });

  it("should_cancelPendingFocusFrame_when_zielPickerUnmountsBeforeNextFrame", () => {
    const cancelSpy = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = renderGate();

    fireEvent.change(screen.getByRole("combobox", { name: "Wer bist du?" }), {
      target: { value: "z1" },
    });
    expect(raf.pendingCount()).toBe(1);

    unmount();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
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

  it("should_persistNewZiel_when_chipTappedInFocusView", () => {
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    renderGate();
    // Chip trägt exakt den Anzeigenamen als Namen, der Karten-Kopf zusätzlich die Summen-Zeile
    // (siehe cardHead-Unterscheidung in FokusListe.test.tsx) – exaktes "Anna" trifft nur den Chip.
    fireEvent.click(screen.getByRole("button", { name: "Anna" }));

    // ADR-039 D1: FokusListe kennt kein Storage, IdentityGate hängt die Ziel-Merkung über
    // onFokusWechsel an (IdentityGate.tsx:169) – dieser Test belegt die Verdrahtung durch Aufruf,
    // nicht nur durch Codelesen.
    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z1");
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
