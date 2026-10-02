import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { VerzehrEinzelansicht } from "./VerzehrEinzelansicht";
import { stubRequestAnimationFrame } from "./raf-stub";
import type { VerzehrArtikel, VerzehrZeile } from "./verzehr-props";
import type { VerzehrPositionRow } from "@/db/verzehr";

// Ersetzt die Tests des früheren Fokus-Akkordeons (FokusListe.test.tsx, ADR-039) durch Tests der
// Einzelansicht (spec-370 AK7.3, ADR-054). MengeControl (Client, useActionState) ist ein Stub, das
// Menge, Artikel und editable spiegelt – so ist prüfbar, WESSEN Positionen sichtbar und ob sie
// bearbeitbar sind.
vi.mock("@/app/_verzehr/MengeControl", () => ({
  MengeControl: ({
    menge,
    editable,
    catalogItemId,
  }: {
    menge: number;
    editable: boolean;
    catalogItemId: string;
  }) => (
    <span data-testid="menge" data-editable={String(editable)} data-artikel={catalogItemId}>
      {menge}
    </span>
  ),
}));

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
  { id: "z3", anzeigename: "Carla" },
];
const cola: VerzehrArtikel = {
  id: "c-cola",
  name: "Cola",
  size: "",
  priceCents: 250,
  category: "getraenk",
};
const kaffee: VerzehrArtikel = {
  id: "c-kaffee",
  name: "Filterkaffee",
  size: "",
  priceCents: 150,
  category: "kaffee",
};
const schnitzel: VerzehrArtikel = {
  id: "c-schnitzel",
  name: "Schnitzel",
  size: "",
  priceCents: 900,
  category: "essen",
};
const artikel = [schnitzel, kaffee, cola];

function position(overrides: Partial<VerzehrPositionRow>): VerzehrPositionRow {
  return {
    zeileId: "z1",
    catalogItemId: "c-cola",
    menge: 1,
    name: "Cola",
    size: "",
    priceCents: 250,
    category: "getraenk",
    active: true,
    ...overrides,
  };
}

let raf: ReturnType<typeof stubRequestAnimationFrame>;
let scrollToSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // jsdom implementiert weder scrollIntoView noch scrollTo; beide werden guarded aufgerufen.
  Element.prototype.scrollIntoView = vi.fn();
  scrollToSpy = vi.fn();
  window.scrollTo = scrollToSpy as unknown as typeof window.scrollTo;
  raf = stubRequestAnimationFrame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

type Props = Parameters<typeof VerzehrEinzelansicht>[0];

function renderAnsicht(overrides: Partial<Props> = {}) {
  const props: Props = {
    zeilen,
    artikel,
    positionen: [],
    action: vi.fn(),
    editable: true,
    initialeZeileId: null,
    ...overrides,
  };
  return { ...render(<VerzehrEinzelansicht {...props} />), props };
}

function chip(name: string) {
  return within(screen.getByRole("group", { name: "Teilnehmer auswählen" })).getByRole("button", {
    name: new RegExp(`^${name}`),
  });
}

function kategorie(name: string) {
  return within(screen.getByRole("group", { name: "Kategorie wählen" })).getByRole("button", {
    name,
  });
}

function aktivePerson() {
  return screen.getByRole("heading", { level: 2 }).textContent;
}

function naechstePerson() {
  return screen.getByRole("button", { name: "Nächste Person →" });
}

describe("VerzehrEinzelansicht – Start-Person (spec-370 AK1a.1/AK1a.5/AK1a.6, FS3)", () => {
  it("should_activateReferencedPerson_when_initialeZeileIdKnown", () => {
    renderAnsicht({ initialeZeileId: "z2" });
    expect(aktivePerson()).toBe("Bernd");
    expect(chip("Bernd")).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getAllByRole("button", { pressed: true, name: /^(Anna|Bernd|Carla)/ }),
    ).toHaveLength(1);
  });

  it("should_activateFirstPerson_when_initialeZeileIdNull", () => {
    renderAnsicht({ initialeZeileId: null });
    expect(aktivePerson()).toBe("Anna");
  });

  it("should_activateFirstPersonWithoutError_when_initialeZeileIdUnknown", () => {
    // AK1a.5/FS3: ungültiger oder parallel entfernter Bezug → fail-soft auf die erste Person.
    renderAnsicht({ initialeZeileId: "z-weg" });
    expect(aktivePerson()).toBe("Anna");
    expect(screen.queryByText(/z-weg/)).not.toBeInTheDocument();
  });

  it("should_fallBackToFirstPerson_when_activePersonDisappearsOnReload", () => {
    // FS3: die aktive Person wird parallel entfernt; beim Neuladen kommen die Zeilen ohne sie.
    const { rerender, props } = renderAnsicht({ initialeZeileId: "z2" });
    rerender(<VerzehrEinzelansicht {...props} zeilen={[zeilen[0], zeilen[2]]} />);
    expect(aktivePerson()).toBe("Anna");
  });

  it("should_renderNothing_when_noZeilen", () => {
    // Der Leer-Hinweis ist wegabhängig und bleibt beim Konsumenten (spec AK6.4).
    const { container } = renderAnsicht({ zeilen: [] });
    expect(container).toBeEmptyDOMElement();
  });
});

describe("VerzehrEinzelansicht – Personenwechsel (spec-370 AK1a.2/AK5.3)", () => {
  it("should_showOnlyChosenPersonsPositions_when_chipTapped", () => {
    renderAnsicht({
      positionen: [position({ zeileId: "z1", menge: 2 }), position({ zeileId: "z2", menge: 5 })],
    });
    expect(screen.getByTestId("menge")).toHaveTextContent("2");

    fireEvent.click(chip("Bernd"));

    expect(aktivePerson()).toBe("Bernd");
    expect(screen.getByTestId("menge")).toHaveTextContent("5");
  });

  it("should_notifyConsumer_when_chipTapped", () => {
    const onFokusWechsel = vi.fn();
    renderAnsicht({ onFokusWechsel });
    fireEvent.click(chip("Carla"));
    expect(onFokusWechsel).toHaveBeenCalledWith("z3");
  });

  it("should_switchWithoutCallback_when_onFokusWechselOmitted", () => {
    // F5 reicht keinen Callback herein (keine Merkung, AK1a.2).
    renderAnsicht();
    fireEvent.click(chip("Bernd"));
    expect(aktivePerson()).toBe("Bernd");
  });

  it("should_scrollToTopAfterLayout_when_personSwitched", () => {
    // AK5.3: neue Person beginnt oben – erst im nächsten Frame nach dem Umbau (Codify #188).
    renderAnsicht();
    raf.flush();
    scrollToSpy.mockClear();

    fireEvent.click(chip("Bernd"));
    expect(scrollToSpy).not.toHaveBeenCalled();

    raf.flush();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 });
  });

  it("should_notScrollPage_when_mountedWithoutSwitch", () => {
    renderAnsicht({ initialeZeileId: "z2" });
    raf.flush();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});

describe("VerzehrEinzelansicht – Kopf und Chips (spec-370 AK1.1/AK1.4/AK1a.4)", () => {
  it("should_showActivePersonsSums_when_rendered", () => {
    renderAnsicht({
      positionen: [position({ zeileId: "z1", menge: 2 }), position({ zeileId: "z2", menge: 4 })],
    });
    expect(screen.getByText(/^Getränke \d/)).toHaveTextContent("Getränke 5,00 €");
  });

  it("should_showServerConfirmedSum_when_positionenPropChanges", () => {
    // AK1.4: server-autoritativ – der Kopf folgt den neu geladenen Positionen (revalidatePath).
    const { rerender, props } = renderAnsicht({ positionen: [position({ menge: 1 })] });
    expect(screen.getByText(/^Getränke \d/)).toHaveTextContent("Getränke 2,50 €");

    rerender(<VerzehrEinzelansicht {...props} positionen={[position({ menge: 3 })]} />);

    expect(screen.getByText(/^Getränke \d/)).toHaveTextContent("Getränke 7,50 €");
  });

  it("should_markOnlyPersonsWithVerzehr_when_chipsRendered", () => {
    renderAnsicht({
      positionen: [position({ zeileId: "z2", menge: 1 }), position({ zeileId: "z3", menge: 0 })],
    });
    expect(chip("Bernd")).toHaveAccessibleName("Bernd, Verzehr erfasst");
    expect(chip("Anna")).toHaveAccessibleName("Anna");
    expect(chip("Carla")).toHaveAccessibleName("Carla");
  });
});

describe("VerzehrEinzelansicht – Kategorie (spec-370 AK2)", () => {
  it("should_preselectFirstCategoryInOrderAndShowOnlyItsArtikel_when_opened", () => {
    renderAnsicht();
    expect(kategorie("Getränke")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 3, name: "Cola" })).toBeInTheDocument();
    expect(screen.queryByText("Filterkaffee")).not.toBeInTheDocument();
    expect(screen.queryByText("Schnitzel")).not.toBeInTheDocument();
  });

  it("should_preselectKaffee_when_catalogHasNoGetraenke", () => {
    renderAnsicht({ artikel: [schnitzel, kaffee] });
    expect(kategorie("Kaffee")).toHaveAttribute("aria-pressed", "true");
  });

  it("should_showOnlyChosenCategory_when_categorySwitched", () => {
    // AK2.2: die anderen Kategorien sind nicht im Dokument.
    renderAnsicht();
    fireEvent.click(kategorie("Essen"));
    expect(screen.getByRole("heading", { level: 3, name: "Schnitzel" })).toBeInTheDocument();
    expect(screen.queryByText("Cola")).not.toBeInTheDocument();
    expect(screen.queryByText("Filterkaffee")).not.toBeInTheDocument();
  });

  it("should_keepChosenCategory_when_personSwitched", () => {
    // AK2.4: Zügig-Erfassen derselben Kategorie für mehrere Personen.
    renderAnsicht();
    fireEvent.click(kategorie("Kaffee"));
    fireEvent.click(chip("Bernd"));
    expect(kategorie("Kaffee")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 3, name: "Filterkaffee" })).toBeInTheDocument();
  });

  it("should_offerInaktivEntryOnlyForPersonWithSuchPositions_when_rendered", () => {
    // AK2.5: Eintrag erscheint nur bei der Person, die Positionen auf deaktivierten Artikeln hat.
    const altbier = position({
      zeileId: "z2",
      catalogItemId: "c-alt",
      name: "Altbier",
      menge: 2,
      active: false,
    });
    renderAnsicht({ positionen: [altbier] });
    expect(screen.queryByRole("button", { name: "Nicht mehr im Katalog" })).not.toBeInTheDocument();

    fireEvent.click(chip("Bernd"));
    fireEvent.click(kategorie("Nicht mehr im Katalog"));

    expect(screen.getByRole("heading", { level: 3, name: "Altbier" })).toBeInTheDocument();
    expect(screen.getByTestId("menge")).toHaveAttribute("data-artikel", "c-alt");
    expect(screen.getByTestId("menge")).toHaveTextContent("2");
  });

  it("should_fallBackToFirstCategory_when_inaktivChosenAndPersonWithoutSuchPositions", () => {
    const altbier = position({ zeileId: "z1", catalogItemId: "c-alt", menge: 1, active: false });
    renderAnsicht({ positionen: [altbier] });
    fireEvent.click(kategorie("Nicht mehr im Katalog"));

    fireEvent.click(chip("Bernd"));

    expect(kategorie("Getränke")).toHaveAttribute("aria-pressed", "true");
    // Zurück bei Anna gilt die gemerkte Wahl wieder – sie wurde nicht überschrieben.
    fireEvent.click(chip("Anna"));
    expect(kategorie("Nicht mehr im Katalog")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("VerzehrEinzelansicht – Nächste Person (spec-370 AK5.1/AK5.2/AK5.4)", () => {
  it("should_switchToFollowingPersonAndNotify_when_naechstePersonTapped", () => {
    const onFokusWechsel = vi.fn();
    renderAnsicht({ initialeZeileId: "z1", onFokusWechsel });
    fireEvent.click(naechstePerson());
    expect(aktivePerson()).toBe("Bernd");
    expect(onFokusWechsel).toHaveBeenCalledWith("z2");
  });

  it("should_wrapToFirstPerson_when_lastPersonActive", () => {
    renderAnsicht({ initialeZeileId: "z3" });
    fireEvent.click(naechstePerson());
    expect(aktivePerson()).toBe("Anna");
  });

  it("should_scrollToTopAfterLayout_when_naechstePersonTapped", () => {
    renderAnsicht();
    fireEvent.click(naechstePerson());
    expect(scrollToSpy).not.toHaveBeenCalled();
    raf.flush();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 });
  });

  it("should_offerNoNaechstePerson_when_onlyOneTeilnehmer", () => {
    renderAnsicht({ zeilen: [zeilen[0]] });
    expect(screen.queryByRole("button", { name: /Nächste Person/ })).not.toBeInTheDocument();
    expect(chip("Anna")).toBeInTheDocument();
  });

  it("should_placeNaechstePersonInFixedFooterWithPlaceholder_when_rendered", () => {
    // AK5.1/ADR-054 D3: fixiert am Viewport-Rand; ein Platzhalter hält das Inhaltsende frei.
    renderAnsicht();
    const fussleiste = screen.getByRole("navigation", { name: "Weiter" });
    expect(fussleiste).toContainElement(naechstePerson());
    expect(fussleiste).toHaveClass("fixed", "inset-x-0", "bottom-0");
    expect(screen.getByTestId("fussleiste-platzhalter")).toHaveAttribute("aria-hidden", "true");
  });

  it("should_renderNoFooter_when_oneTeilnehmerAndNoAktion", () => {
    renderAnsicht({ zeilen: [zeilen[0]] });
    expect(screen.queryByRole("navigation", { name: "Weiter" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("fussleiste-platzhalter")).not.toBeInTheDocument();
  });
});

describe("VerzehrEinzelansicht – Aktion je Person (spec-370 AK5.5, #308)", () => {
  const aktionJeZeile = {
    z1: <a href="/kassieren-anna">Kassieren →</a>,
    z2: <a href="/kassieren-bernd">Kassieren →</a>,
    z3: <a href="/kassieren-carla">Kassieren →</a>,
  };

  it("should_renderActivePersonsAktionInFooter_when_aktionJeZeileGiven", () => {
    renderAnsicht({ initialeZeileId: "z2", aktionJeZeile });
    const links = screen.getAllByRole("link", { name: "Kassieren →" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/kassieren-bernd");
    expect(screen.getByRole("navigation", { name: "Weiter" })).toContainElement(links[0]);
  });

  it("should_moveAktionToNewPerson_when_personSwitched", () => {
    renderAnsicht({ initialeZeileId: "z2", aktionJeZeile });
    fireEvent.click(naechstePerson());
    expect(screen.getByRole("link", { name: "Kassieren →" })).toHaveAttribute(
      "href",
      "/kassieren-carla",
    );
  });

  it("should_renderFooterWithAktion_when_onlyOneTeilnehmer", () => {
    renderAnsicht({ zeilen: [zeilen[0]], aktionJeZeile });
    expect(screen.getByRole("navigation", { name: "Weiter" })).toContainElement(
      screen.getByRole("link", { name: "Kassieren →" }),
    );
  });

  it("should_renderNoAktion_when_aktionJeZeileOmitted", () => {
    // Theke (#308 AK9): kein Kassieren-Weg.
    renderAnsicht();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should_keepAktion_when_readOnly", () => {
    // #308 AK10: reine Navigation, auch in der Lese-Ansicht.
    renderAnsicht({ editable: false, aktionJeZeile });
    expect(screen.getByRole("link", { name: "Kassieren →" })).toBeInTheDocument();
  });
});

describe("VerzehrEinzelansicht – Lese-Ansicht und Layout (spec-370 AK6.2/AK1.3/AK7.4)", () => {
  it("should_keepNavigationUsableButRenderMengenReadOnly_when_notEditable", () => {
    // AK6.2: Lese-Sicht vollständig einsehbar, nicht versteckt (Codify #54).
    renderAnsicht({ editable: false, positionen: [position({ zeileId: "z2", menge: 3 })] });
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");

    fireEvent.click(chip("Bernd"));
    fireEvent.click(kategorie("Getränke"));

    expect(aktivePerson()).toBe("Bernd");
    expect(screen.getByTestId("menge")).toHaveTextContent("3");
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
    expect(naechstePerson()).toBeEnabled();
  });

  it("should_stickChipsKopfAndUmschalterAsOneBlock_when_rendered", () => {
    // AK1.3/ADR-054 D3: ein sticky Block statt sticky Chip-Leiste allein.
    renderAnsicht();
    const block = screen.getByRole("group", { name: "Teilnehmer auswählen" }).parentElement!;
    expect(block).toHaveClass("sticky", "top-0");
    expect(block).toContainElement(screen.getByRole("heading", { level: 2 }));
    expect(block).toContainElement(screen.getByRole("group", { name: "Kategorie wählen" }));
  });

  it("should_takeBleedFromConsumer_when_kopfClassNameGiven", () => {
    // AK7.4/#205: kein hart kodierter Rand-Bleed in der route-neutralen Komponente.
    const { unmount } = renderAnsicht();
    const ohne = screen.getByRole("group", { name: "Teilnehmer auswählen" }).parentElement!;
    expect(ohne.className).not.toContain("mx-6");
    expect(ohne.className).not.toContain("px-6");
    unmount();

    renderAnsicht({ kopfClassName: "-mx-6 px-6" });
    const mit = screen.getByRole("group", { name: "Teilnehmer auswählen" }).parentElement!;
    expect(mit).toHaveClass("-mx-6", "px-6");
  });
});
