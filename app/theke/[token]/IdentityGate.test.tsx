import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { IdentityGate } from "./IdentityGate";
import { stubRequestAnimationFrame } from "@/app/_verzehr/raf-stub";
import type { VerzehrArtikel, VerzehrZeile } from "@/app/_verzehr/verzehr-props";

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

// Chip der Einzelansicht (spec-370 AK1a) – über die Chip-Leiste, damit ein gleichnamiges Element
// anderswo (Kopf-Überschrift) nicht mitzählt.
function chip(name: string): HTMLElement {
  return within(screen.getByRole("group", { name: "Teilnehmer auswählen" })).getByRole("button", {
    name,
  });
}

// Name der aktiven Person im Kopf der Einzelansicht.
function aktivePerson() {
  return screen.getByRole("heading", { level: 2 }).textContent;
}

let raf: ReturnType<typeof stubRequestAnimationFrame>;

beforeEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
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
    // Darunter die Nur-Lese-Liste Name + Gesamt (spec-370 AK6.3): alle Teilnehmer, keine
    // Erfassungs-Controls, keine Artikel.
    const liste = screen.getByRole("list", { name: "Bisher erfasst" });
    expect(
      within(liste)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["AnnaGesamt 0,00 €", "BerndGesamt 0,00 €"]);
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
    expect(screen.queryByText("Cola")).not.toBeInTheDocument();
  });

  it("should_keepReadOnlyListBelowQuestion_when_zielQuestionShown", () => {
    // spec-370 AK6.3 gilt für beide Schritte des Gates.
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    renderGate();
    expect(screen.getByRole("list", { name: "Bisher erfasst" })).toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
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
    // Ziel (Anna) ist die aktive Person, ihre Erfassung bearbeitbar.
    expect(aktivePerson()).toBe("Anna");
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
    expect(aktivePerson()).toBe("Bernd");
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
    // Zuletzt gewähltes Ziel (Bernd) direkt aktiv + bearbeitbar (spec-370 AK1a.6).
    expect(aktivePerson()).toBe("Bernd");
    expect(chip("Bernd")).toHaveAttribute("aria-pressed", "true");
    const menge = screen.getAllByTestId("menge");
    expect(menge).toHaveLength(1);
    expect(menge[0]).toHaveAttribute("data-editable", "true");
  });

  it("should_scrollRememberedZielChipIntoViewAfterLayout_when_bothStored", () => {
    // Das gemerkte Ziel (ADR-035 D1) ist beim Mounten aktiv; sein Chip kommt in der Leiste in den
    // Sichtbereich (spec-370 AK1a.3) – gegen Regression am echten Konsumenten gesichert.
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    // Ein Spy auf der Prototyp-Methode statt zweier Element-Spies: `vi.spyOn(element,
    // "scrollIntoView")` fällt hier auf `Element.prototype` zurück (die Elemente haben die Methode
    // nicht selbst), zwei Element-Spies wären also derselbe Spy und könnten nicht unterscheiden.
    const scrollSpy = Element.prototype.scrollIntoView as unknown as ReturnType<typeof vi.fn>;
    renderGate();

    // Erst nach dem Layout-Aufbau, nicht synchron beim Mounten (Codify #188).
    expect(scrollSpy).not.toHaveBeenCalled();

    raf.flush();

    expect(scrollSpy).toHaveBeenCalledWith({ inline: "center", block: "nearest" });
    // Diskriminierend: es springt der Chip des GEMERKTEN Ziels in den Sichtbereich.
    expect(scrollSpy.mock.contexts).toEqual([chip("Bernd")]);
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
    fireEvent.click(chip("Anna"));

    // ADR-039 D1: die Einzelansicht kennt kein Storage, IdentityGate hängt die Ziel-Merkung über
    // onFokusWechsel an – dieser Test belegt die Verdrahtung durch Aufruf, nicht nur durch
    // Codelesen (spec-370 AK1a.2).
    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z1");
  });

  it("should_persistNewZiel_when_naechstePersonTapped", () => {
    // spec-370 AK5.1: „Nächste Person" wirkt wie ein Chip-Tipp – inklusive Ziel-Merkung.
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    renderGate();
    fireEvent.click(screen.getByRole("button", { name: "Nächste Person →" }));

    expect(aktivePerson()).toBe("Anna");
    expect(window.localStorage.getItem(ZIEL_KEY)).toBe("z1");
  });

  it("should_offerNoKassierenAction_when_focusViewShownInPublicWeg", () => {
    // #308 AK9: der öffentliche Selbstbedienungs-Weg bekommt KEINE Wechsel-Aktion – auch nicht in
    // der geöffneten Karte. Belegt die Abwesenheit an der echten Route, nicht nur an der Prop:
    // IdentityGate reicht `aktionJeZeile` gar nicht herein.
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    renderGate();

    // Vorbedingung: die Einzelansicht ist da (Erfassung sichtbar) – sonst wäre die
    // Abwesenheits-Assertion trivial erfüllt.
    expect(screen.getAllByTestId("menge")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Kassieren/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should_alignStickyBlockAndFooterWithPagePadding_when_focusViewShown", () => {
    // ADR-054 D3/#205, Lesson #188: Bleed und Fußleisten-Innenabstand passen zum `p-6` der Seite.
    window.localStorage.setItem(ERFASSER_KEY, "z1");
    window.localStorage.setItem(ZIEL_KEY, "z2");

    renderGate();

    expect(screen.getByRole("group", { name: "Teilnehmer auswählen" }).parentElement).toHaveClass(
      "-mx-6",
      "px-6",
    );
    expect(screen.getByRole("button", { name: "Nächste Person →" }).parentElement).toHaveClass(
      "px-6",
    );
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
  it("should_renderReadOnlyEinzelansichtWithoutGate_when_notEditable", () => {
    renderGate({ editable: false });

    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByText(/Für wen/)).not.toBeInTheDocument();
    expect(screen.queryByText("Erfasser wechseln")).not.toBeInTheDocument();
    // Lese-Ansicht (spec-370 AK6.2): erste Person aktiv, Erfassung sichtbar, nicht bearbeitbar.
    expect(aktivePerson()).toBe("Anna");
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
  });

  it("should_alignStickyBlockAndFooterWithPagePadding_when_readOnly", () => {
    renderGate({ editable: false });

    expect(screen.getByRole("group", { name: "Teilnehmer auswählen" }).parentElement).toHaveClass(
      "-mx-6",
      "px-6",
    );
    expect(screen.getByRole("button", { name: "Nächste Person →" }).parentElement).toHaveClass(
      "px-6",
    );
  });

  it("should_notPersistZiel_when_chipTappedInReadOnly", () => {
    // Read-only merkt sich nichts (ADR-035 D5) – auch nicht beim Personenwechsel.
    renderGate({ editable: false });
    fireEvent.click(chip("Bernd"));
    expect(aktivePerson()).toBe("Bernd");
    expect(window.localStorage.getItem(ZIEL_KEY)).toBeNull();
  });

  it("should_showHint_when_noZeilen", () => {
    renderGate({ zeilen: [] });

    expect(screen.getByText(/bitte an den Veranstalter wenden/)).toBeInTheDocument();
    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });
});
