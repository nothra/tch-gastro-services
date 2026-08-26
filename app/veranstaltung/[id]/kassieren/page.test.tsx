import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { stubRequestAnimationFrame } from "@/app/_verzehr/raf-stub";
import type { Veranstaltung, VeranstaltungEreignis, VeranstaltungZeile } from "@/db/schema";
import type { AuslageRow } from "@/db/auslage";
import type { VerzehrPositionRow } from "@/db/verzehr";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ getVeranstaltung: vi.fn(), listZeilen: vi.fn() }));
vi.mock("@/db/verzehr", () => ({ listPositionen: vi.fn() }));
vi.mock("@/db/auslage", () => ({ listAuslagen: vi.fn() }));
vi.mock("@/db/veranstaltung-ereignis", () => ({ listEreignisse: vi.fn() }));

// Server Action wird nur gebunden und an die (gestubbte) Client-Komponente gereicht.
vi.mock("../../actions", () => ({ kassiereZeileAction: vi.fn() }));

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Eingebettete Client-Komponenten sind Stubs (eigene Tests). Der KassiereZeileForm-Stub gibt die
// zeileId als Textinhalt aus, damit sich Vorhandensein (offen) und Fehlen (abgeschlossen) prüfen
// lassen, und `initialErhalten` als Attribut (nicht als Text, sonst bräche die Text-Assertion der
// Formular-Reihenfolge). Ohne diesen Durchgriff bliebe unbelegt, dass eine an eingefrorener
// Position stehende Zeile den **aktuellen** Erhalten-Betrag ins Formular bekommt (#253, AC5).
// `autoFocusErhalten` liegt aus demselben Grund als Attribut vor: dass GENAU die Zeile des
// Personenbezugs den Eingabefokus anfordert, ist eine Entscheidung dieser Seite (#308 AK3) – den
// Fokus selbst setzt und testet die Formular-Komponente.
vi.mock("../../StatusToggle", () => ({ StatusToggle: () => null }));
vi.mock("../../KassiereZeileForm", () => ({
  KassiereZeileForm: ({
    zeileId,
    initialErhalten,
    autoFocusErhalten,
  }: {
    zeileId: string;
    initialErhalten: string;
    autoFocusErhalten?: boolean;
  }) => (
    <div
      data-testid="kassiere-form"
      data-initial-erhalten={initialErhalten}
      data-autofocus-erhalten={String(autoFocusErhalten ?? false)}
    >
      {zeileId}
    </div>
  ),
}));

import { auth } from "@/auth";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { listEreignisse } from "@/db/veranstaltung-ereignis";
import KassierenPage from "./page";

const authMock = vi.mocked(auth);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const listZeilenMock = vi.mocked(listZeilen);
const listPositionenMock = vi.mocked(listPositionen);
const listAuslagenMock = vi.mocked(listAuslagen);
const listEreignisseMock = vi.mocked(listEreignisse);

function session(roles: string[]) {
  return { user: { id: "u1", name: "Vera Veranstalter", roles }, expires: "" } as never;
}

const aVeranstaltung: Veranstaltung = {
  id: "v-1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  kasse: "montagsrunde",
  status: "offen",
  token: "abc123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function zeile(overrides: Partial<VeranstaltungZeile>): VeranstaltungZeile {
  return {
    id: "z-1",
    veranstaltungId: "v-1",
    teilnehmerId: "t-1",
    anzeigename: "Anna Beispiel",
    erhaltenCents: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// z-1 "Anna": 2× Getränk @250 = 500 + 1× Essen @300 = 300 → Verzehr 800; Erhalten 1000 → Spende 200, bezahlt.
// z-2 "Bernd": 1× Getränk @250 = 250 → Verzehr 250; Erhalten null → offen.
const zeilen: VeranstaltungZeile[] = [
  zeile({ id: "z-1", teilnehmerId: "t-1", anzeigename: "Anna Beispiel", erhaltenCents: 1000 }),
  zeile({ id: "z-2", teilnehmerId: "t-2", anzeigename: "Bernd Beispiel", erhaltenCents: null }),
];

function pos(overrides: Partial<VerzehrPositionRow>): VerzehrPositionRow {
  return {
    zeileId: "z-1",
    catalogItemId: "c-1",
    menge: 1,
    name: "Cola",
    size: "",
    priceCents: 250,
    category: "getraenk",
    active: true,
    ...overrides,
  };
}

const positionen: VerzehrPositionRow[] = [
  pos({ zeileId: "z-1", menge: 2, priceCents: 250, category: "getraenk", name: "Cola", size: "" }),
  pos({
    zeileId: "z-1",
    menge: 1,
    priceCents: 300,
    category: "essen",
    name: "Schnitzel",
    size: "",
  }),
  pos({ zeileId: "z-2", menge: 1, priceCents: 250, category: "getraenk", name: "Cola", size: "" }),
];

// Auslagen: 5,50 € Sonstiges erstattet (kassenwirksam) + 2,00 € Getränke offen (nicht kassenwirksam).
const auslagen: AuslageRow[] = [
  {
    id: "a-1",
    teilnehmerId: "t-1",
    anzeigename: "Anna Beispiel",
    kategorie: "sonstiges",
    betragCents: 550,
    zweck: "Grillfleisch",
    status: "erstattet",
  },
  {
    id: "a-2",
    teilnehmerId: "t-2",
    anzeigename: "Bernd Beispiel",
    kategorie: "getraenke",
    betragCents: 200,
    zweck: null,
    status: "offen",
  },
];

const ereignisse: VeranstaltungEreignis[] = [
  {
    id: "e-1",
    veranstaltungId: "v-1",
    art: "abgeschlossen",
    akteurUserId: "u1",
    akteurName: "Vera Veranstalter",
    createdAt: new Date("2026-07-14T18:00:00Z"),
  },
];

// Props eines Seitenaufrufs; `zeile` ist der optionale Personenbezug des Aufrufs (#308).
function seite(id: string, zeile?: string) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(zeile === undefined ? {} : { zeile }),
  };
}

// Die Zielzeile eines personenbezogenen Aufrufs ist über aria-current auffindbar (#308 AK2).
function hervorgehobeneNamen(): string[] {
  const section = screen.getByRole("heading", { name: /^Teilnehmer/ }).closest("section")!;
  return within(section)
    .getAllByRole("listitem")
    .filter((li) => li.getAttribute("aria-current") === "true")
    .map((li) => li.querySelector("span")?.textContent ?? "");
}

function verzehrLinks() {
  return screen.queryAllByRole("link", { name: /Verzehr erfassen/ });
}

function teilnehmerEintrag(name: string): HTMLElement {
  return screen.getByText(name).closest("li")!;
}

// Alle zahlen- und statusführenden Texte der Seite: je Teilnehmerzeile (Beträge, Badge, Erhalten)
// plus Tagessummen und Gesamtabrechnung. Grundlage des AK12-Vergleichs „Navigation ändert nichts".
function betragsrelevanteTexte(): string[] {
  const teilnehmer = screen.getByRole("heading", { name: /^Teilnehmer/ }).closest("section")!;
  const zeilenTexte = within(teilnehmer)
    .getAllByRole("listitem")
    .map(
      (li) => `${li.querySelector("span")?.textContent} | ${li.querySelector("dl")?.textContent}`,
    );
  const summenTexte = ["Tagessummen", "Gesamtabrechnung (Kasse: Montagsrunde)"].map(
    (heading) => screen.getByText(heading).closest("section")!.textContent ?? "",
  );
  const badges = within(teilnehmer)
    .getAllByRole("listitem")
    .map((li) => (li.textContent?.includes("bezahlt") ? "bezahlt" : "offen"));
  return [...zeilenTexte, ...badges, ...summenTexte];
}

// Reihenfolge der Teilnehmer-Anzeigenamen in der Kassier-Liste (erster Span je <li> = Anzeigename).
function teilnehmerNamesInOrder(): string[] {
  const section = screen.getByRole("heading", { name: /^Teilnehmer/ }).closest("section")!;
  return within(section)
    .getAllByRole("listitem")
    .map((li) => li.querySelector("span")?.textContent ?? "");
}

// "8,00 €" → 800 (nur für die Testdaten; keine Tausendertrenner nötig).
function centsFromEuroText(text: string): number {
  const [euro, cent] = text.replace(/\s*€/, "").split(",");
  return Number(euro) * 100 + Number(cent);
}

function arrangeHappyPath() {
  authMock.mockResolvedValue(session(["veranstalter"]));
  getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
  listZeilenMock.mockResolvedValue(zeilen);
  listPositionenMock.mockResolvedValue(positionen);
  listAuslagenMock.mockResolvedValue(auslagen);
  listEreignisseMock.mockResolvedValue(ereignisse);
}

// Vier Zeilen mit je 1 Getränk @250 – `listZeilen` liefert sie alphabetisch (DB `.orderBy`).
// Der Erhalten-Betrag je Zeile steuert den abgeleiteten Bezahlt-Status und damit die Sortierung:
// 250 = bezahlt, null = offen. So lässt sich ein Kassiervorgang als erneuter Server-Render abbilden.
function arrangeVierZeilen(erhalten: {
  anna: number | null;
  bernd: number | null;
  carla: number | null;
  dora: number | null;
}) {
  authMock.mockResolvedValue(session(["veranstalter"]));
  getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
  listAuslagenMock.mockResolvedValue([]);
  listEreignisseMock.mockResolvedValue([]);
  listZeilenMock.mockResolvedValue([
    zeile({ id: "z-a", teilnehmerId: "t-a", anzeigename: "Anna", erhaltenCents: erhalten.anna }),
    zeile({ id: "z-b", teilnehmerId: "t-b", anzeigename: "Bernd", erhaltenCents: erhalten.bernd }),
    zeile({ id: "z-c", teilnehmerId: "t-c", anzeigename: "Carla", erhaltenCents: erhalten.carla }),
    zeile({ id: "z-d", teilnehmerId: "t-d", anzeigename: "Dora", erhaltenCents: erhalten.dora }),
  ]);
  listPositionenMock.mockResolvedValue([
    pos({ zeileId: "z-a", menge: 1, priceCents: 250 }),
    pos({ zeileId: "z-b", menge: 1, priceCents: 250 }),
    pos({ zeileId: "z-c", menge: 1, priceCents: 250 }),
    pos({ zeileId: "z-d", menge: 1, priceCents: 250 }),
  ]);
}

let raf: ReturnType<typeof stubRequestAnimationFrame>;

beforeEach(() => {
  vi.resetAllMocks();
  // jsdom implementiert scrollIntoView nicht; EingefroreneZeilenListe ruft es guarded im
  // rAF-Callback auf (#308 AK2).
  Element.prototype.scrollIntoView = vi.fn();
  raf = stubRequestAnimationFrame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("KassierenPage", () => {
  it("should_denyAccess_when_userIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await KassierenPage(seite("v-1")));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_notFound_when_veranstaltungMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(undefined);
    listZeilenMock.mockResolvedValue([]);
    listPositionenMock.mockResolvedValue([]);
    listAuslagenMock.mockResolvedValue([]);
    listEreignisseMock.mockResolvedValue([]);

    await expect(KassierenPage(seite("v-1"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("should_linkBackToDetail_when_rendered", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    expect(screen.getByRole("link", { name: /Zur Veranstaltung/ })).toHaveAttribute(
      "href",
      "/veranstaltung/v-1",
    );
  });

  it("should_renderResolvedCategoriesPerZeile_when_positionsPresent", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    expect(screen.getByText("Anna Beispiel")).toBeInTheDocument();
    expect(screen.getByText("Bernd Beispiel")).toBeInTheDocument();
    // Kategorie „Sonstige" ist überall in Essen + Kaffee aufgelöst.
    expect(screen.queryByText("Sonstige")).not.toBeInTheDocument();

    const annaLi = screen.getByText("Anna Beispiel").closest("li")!;
    // Alle drei Kategorien getrennt sichtbar; Verzehr-Gesamt der z-1 = 500 + 300 = 8,00 € (eindeutig).
    expect(within(annaLi).getByText("Getränke")).toBeInTheDocument();
    expect(within(annaLi).getByText("Essen")).toBeInTheDocument();
    expect(within(annaLi).getByText("Kaffee")).toBeInTheDocument();
    expect(within(annaLi).getByText("Verzehr-Gesamt")).toBeInTheDocument();
    expect(within(annaLi).getByText("8,00 €")).toBeInTheDocument();
  });

  it("should_showAllThreeCategoriesWithZero_when_onlyGetraenke", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    // Bernd hat nur ein Getränk (2,50 €) → Essen und Kaffee dennoch sichtbar mit 0,00 €.
    const berndLi = screen.getByText("Bernd Beispiel").closest("li")!;
    const essen = within(berndLi).getByText("Essen").closest("div")!;
    const kaffee = within(berndLi).getByText("Kaffee").closest("div")!;
    expect(within(essen).getByText("0,00 €")).toBeInTheDocument();
    expect(within(kaffee).getByText("0,00 €")).toBeInTheDocument();
  });

  it("should_renderCollapsedVerzehrBreakdownPerZeile_when_rendered", async () => {
    arrangeHappyPath();

    const { container } = render(await KassierenPage(seite("v-1")));

    const disclosures = container.querySelectorAll("details");
    expect(disclosures.length).toBe(2);
    disclosures.forEach((details) => expect(details).not.toHaveAttribute("open"));
    expect(screen.getAllByText("Verzehr anzeigen").length).toBe(2);

    // z-1 listet ihre konsumierten Artikel (inkl. aufgelöstem Namen).
    const annaLi = screen.getByText("Anna Beispiel").closest("li")!;
    expect(within(annaLi).getByText("Cola")).toBeInTheDocument();
    expect(within(annaLi).getByText("Schnitzel")).toBeInTheDocument();
  });

  it("should_matchBreakdownSumToVerzehrGesamt_when_expanded", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    // Positionsbeträge der z-1 aufsummiert = Verzehr-Gesamt (800): Cola 2×250 + Schnitzel 1×300.
    // Annas Zeile explizit wählen – die Liste sortiert offene Vorgänge (Bernd) nach oben (#223).
    const annaDetails = screen.getByText("Anna Beispiel").closest("li")!.querySelector("details")!;
    const summeCents = within(annaDetails as HTMLElement)
      .getAllByRole("row")
      .filter((row) => row.querySelector("td"))
      .reduce((sum, row) => {
        const cells = within(row).getAllByRole("cell");
        return sum + centsFromEuroText(cells[cells.length - 1].textContent ?? "");
      }, 0);
    expect(summeCents).toBe(800);
  });

  it("should_showKeinVerzehr_when_zeileHasNoPositions", async () => {
    arrangeHappyPath();
    // Nur z-1 hat Positionen; z-2 (Bernd) hat gar keinen erfassten Verzehr → auf Seitenebene
    // greift der undefined→[]-Fallback (kein Map-Eintrag) und die Aufschlüsselung zeigt den Hinweis.
    listPositionenMock.mockResolvedValue([
      pos({ zeileId: "z-1", menge: 2, priceCents: 250, category: "getraenk", name: "Cola" }),
    ]);

    render(await KassierenPage(seite("v-1")));

    const berndLi = screen.getByText("Bernd Beispiel").closest("li")!;
    expect(within(berndLi).getByText("Kein Verzehr erfasst")).toBeInTheDocument();
  });

  it("should_showSoftDeletedArticleInBreakdown_when_articleInactive", async () => {
    arrangeHappyPath();
    listPositionenMock.mockResolvedValue([
      pos({
        zeileId: "z-1",
        menge: 1,
        priceCents: 400,
        category: "essen",
        name: "Altes Gericht",
        size: "",
        active: false,
      }),
      pos({ zeileId: "z-2", menge: 1, priceCents: 250, category: "getraenk", name: "Cola" }),
    ]);

    render(await KassierenPage(seite("v-1")));

    // Soft-gelöschter Artikel (COALESCE-Name/-Preis) bleibt in der Aufschlüsselung sichtbar.
    const annaLi = screen.getByText("Anna Beispiel").closest("li")!;
    expect(within(annaLi).getByText("Altes Gericht")).toBeInTheDocument();
  });

  it("should_markPaidLineAsBezahlt_when_erhaltenCoversVerzehr", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    expect(screen.getByText("bezahlt")).toBeInTheDocument();
  });

  it("should_renderKassiereForm_forEachZeile_when_offen", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    const forms = screen.getAllByTestId("kassiere-form");
    // Sortierung (Spec-223): offene Zeilen zuerst → Bernd (offen, z-2) vor Anna (bezahlt, z-1).
    expect(forms.map((form) => form.textContent)).toEqual(["z-2", "z-1"]);
  });

  it("should_highlightAndScrollReferencedZeile_when_personenbezugGiven", async () => {
    // #308 AK2: die Zielzeile des Aufrufs ist von den übrigen unterscheidbar und kommt in den
    // Sichtbereich – erst nach dem Layout-Aufbau (analog #188), nicht synchron im Render-Tick.
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });

    render(await KassierenPage(seite("v-1", "z-c")));
    const scrollSpy = vi.spyOn(teilnehmerEintrag("Carla"), "scrollIntoView");

    expect(hervorgehobeneNamen()).toEqual(["Carla"]);
    expect(scrollSpy).not.toHaveBeenCalled();

    raf.flush();
    expect(scrollSpy).toHaveBeenCalledWith({ block: "start" });
  });

  it("should_focusErhaltenOfReferencedZeileOnly_when_offenAndPersonenbezugGiven", async () => {
    // #308 AK3: nur das Formular der gemeinten Person fordert den Eingabefokus an.
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });

    render(await KassierenPage(seite("v-1", "z-c")));

    const fokussierteZeilen = screen
      .getAllByTestId("kassiere-form")
      .filter((form) => form.getAttribute("data-autofocus-erhalten") === "true")
      .map((form) => form.textContent);
    expect(fokussierteZeilen).toEqual(["z-c"]);
  });

  it("should_requestNoFocus_when_calledWithoutPersonenbezug", async () => {
    // Ohne Personenbezug zieht keine der vielen Zeilen den Fokus an sich.
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });

    render(await KassierenPage(seite("v-1")));

    const werte = screen
      .getAllByTestId("kassiere-form")
      .map((form) => form.getAttribute("data-autofocus-erhalten"));
    expect(werte).toEqual(["false", "false", "false", "false"]);
    expect(hervorgehobeneNamen()).toEqual([]);
  });

  it("should_keepServerOrder_when_personenbezugPointsToLaterZeile", async () => {
    // #308 AK4: der Wechsel FINDET die Zeile, er verschiebt sie nicht – Sortierung #223 unberührt.
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });

    render(await KassierenPage(seite("v-1", "z-c")));

    expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);
  });

  it("should_offerVerzehrLinkForEveryZeile_when_rendered", async () => {
    // #308 AK5/AK8: der Rückweg steht in JEDER Kassierzeile und trägt deren Personenbezug.
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    const links = verzehrLinks();
    // Reihenfolge wie die Liste: offen (Bernd, z-2) vor bezahlt (Anna, z-1).
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/veranstaltung/v-1/verzehr?zeile=z-2",
      "/veranstaltung/v-1/verzehr?zeile=z-1",
    ]);
    expect(teilnehmerEintrag("Bernd Beispiel")).toContainElement(links[0]);
  });

  it("should_offerReturnToSamePerson_when_calledWithPersonenbezug", async () => {
    // #308 AK8: der Kreis schließt sich – die Zielzeile eines Hinwegs bietet den Rückweg auf
    // DIESELBE Person an, sodass beliebig oft gewechselt werden kann (ohne Detailseite).
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1", "z-2")));

    const berndLi = teilnehmerEintrag("Bernd Beispiel");
    expect(within(berndLi).getByRole("link", { name: /Verzehr erfassen/ })).toHaveAttribute(
      "href",
      "/veranstaltung/v-1/verzehr?zeile=z-2",
    );
  });

  it("should_highlightNothingAndNotScroll_when_personenbezugIsUnknown", async () => {
    // F1: getilgte Zeile, Zeile einer anderen Veranstaltung oder Zufallswert → Standardzustand,
    // keine Fehlermeldung, kein notFound, keine Aussage über den unbekannten Wert.
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });

    render(await KassierenPage(seite("v-1", "z-fremd")));
    raf.flush();

    expect(hervorgehobeneNamen()).toEqual([]);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/z-fremd/)).not.toBeInTheDocument();
    expect(
      screen
        .getAllByTestId("kassiere-form")
        .map((form) => form.getAttribute("data-autofocus-erhalten")),
    ).toEqual(["false", "false", "false", "false"]);
  });

  it("should_highlightWithoutFocus_when_abgeschlossenAndPersonenbezugGiven", async () => {
    // F2/AK10: ohne Erhalten-Eingabefeld greift nur die Hervorhebung – der Rückweg bleibt, die
    // Lesesicht bleibt Lesesicht (kein Kassier-Formular).
    arrangeHappyPath();
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });

    render(await KassierenPage(seite("v-1", "z-2")));
    const scrollSpy = vi.spyOn(teilnehmerEintrag("Bernd Beispiel"), "scrollIntoView");
    raf.flush();

    expect(hervorgehobeneNamen()).toEqual(["Bernd Beispiel"]);
    expect(scrollSpy).toHaveBeenCalledWith({ block: "start" });
    expect(screen.queryAllByTestId("kassiere-form")).toHaveLength(0);
    expect(verzehrLinks()[0]).toHaveAttribute("href", "/veranstaltung/v-1/verzehr?zeile=z-2");
  });

  it("should_keepHighlight_when_pageIsRenderedAgainAfterReload", async () => {
    // #308 AK11: der Personenbezug hängt am Aufruf (Query-Parameter), nicht an flüchtigem Zustand.
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });
    const { unmount } = render(await KassierenPage(seite("v-1", "z-c")));
    unmount();

    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
    render(await KassierenPage(seite("v-1", "z-c")));

    expect(hervorgehobeneNamen()).toEqual(["Carla"]);
  });

  it("should_showEmptyStateWithoutError_when_noZeilenButPersonenbezugGiven", async () => {
    // F3: Veranstaltung ohne Teilnehmer – Leer-Hinweis unverändert, kein Fehler.
    arrangeHappyPath();
    listZeilenMock.mockResolvedValue([]);
    listPositionenMock.mockResolvedValue([]);

    render(await KassierenPage(seite("v-1", "z-1")));

    expect(screen.getByText("Noch keine Teilnehmer erfasst.")).toBeInTheDocument();
    expect(verzehrLinks()).toHaveLength(0);
  });

  it("should_denyAccess_when_notVeranstalterEvenWithPersonenbezug", async () => {
    // F4: der Personenbezug verschafft keinen Zugang und keine Information.
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await KassierenPage(seite("v-1", "z-1")));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
    expect(verzehrLinks()).toHaveLength(0);
  });

  it("should_listOffenParticipantsAboveBezahlt_when_rendered", async () => {
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });

    render(await KassierenPage(seite("v-1")));

    // Offen-Gruppe (Bernd, Dora) oben – je Gruppe stabil alphabetisch; bezahlt (Anna, Carla) unten.
    expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);
  });

  it("should_keepKassierteZeileAtItsPosition_when_serverReordersWithinSameSession", async () => {
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });
    const { rerender } = render(await KassierenPage(seite("v-1")));
    expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);

    // Bernd wird kassiert: `revalidatePath` rendert die Server-Komponente neu, deren Sortierung ihn
    // in die Bezahlt-Gruppe schöbe (Dora, Anna, Bernd, Carla) – die eingefrorene Position hält (#253).
    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
    rerender(await KassierenPage(seite("v-1")));

    expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);
    // Nur die Position ist eingefroren – das Badge folgt sofort den aktuellen Server-Daten.
    const berndLi = screen.getByText("Bernd").closest("li")!;
    expect(within(berndLi).getByText("bezahlt")).toBeInTheDocument();
  });

  it("should_keepEveryPosition_when_severalZeilenKassiertInSequence", async () => {
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });
    const { rerender } = render(await KassierenPage(seite("v-1")));

    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
    rerender(await KassierenPage(seite("v-1")));
    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: 250 });
    rerender(await KassierenPage(seite("v-1")));

    // Kein kumulatives Nachrutschen: auch nach dem zweiten Kassieren steht jede Zeile unverändert.
    expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);
  });

  it("should_keepPositionAndEditableForm_when_erhaltenOfKassierteZeileIsCorrected", async () => {
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });
    const { rerender } = render(await KassierenPage(seite("v-1")));

    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
    rerender(await KassierenPage(seite("v-1")));
    expect(
      within(screen.getByText("Bernd").closest("li")!).getByTestId("kassiere-form"),
    ).toHaveAttribute("data-initial-erhalten", "2,50");

    // Korrektur des Erhalten-Betrags derselben, bereits kassierten Zeile (2,50 € → 3,00 €).
    arrangeVierZeilen({ anna: 250, bernd: 300, carla: 250, dora: null });
    rerender(await KassierenPage(seite("v-1")));

    expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);
    // Das Formular bleibt editierbar – keine Umschaltung auf reine Anzeige nach dem Kassieren.
    const berndLi = screen.getByText("Bernd").closest("li")!;
    expect(within(berndLi).getByTestId("kassiere-form")).toHaveTextContent("z-b");
    // …und zeigt den korrigierten Betrag: eingefroren ist nur die Position, nicht der Inhalt.
    expect(within(berndLi).getByTestId("kassiere-form")).toHaveAttribute(
      "data-initial-erhalten",
      "3,00",
    );
  });

  it("should_hideKassiereFormsAndLeaveOrderUntouched_when_veranstaltungIsAbgeschlossenViaStatusToggle", async () => {
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });
    const { rerender } = render(await KassierenPage(seite("v-1")));

    // Bernd kassieren – ab hier weicht die Server-Sortierung ([Dora, Anna, Bernd, Carla]) von der
    // eingefrorenen ab. Ohne diesen Schritt wäre die Reihenfolge-Assertion unten vakuum.
    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
    rerender(await KassierenPage(seite("v-1")));

    // Abschluss über den StatusToggle lädt die Seite neu, ändert aber keinen Bezahlt-Status →
    // unverändertes Sortierverhalten dieser Aktion (nicht Teil von #253); Formulare entfallen.
    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });
    rerender(await KassierenPage(seite("v-1")));

    // Der Statuswechsel darf weder umsortieren noch den Freeze verlieren: ein statusabhängiger
    // `key` an <EingefroreneZeilenListe> würde die Komponente remounten und Bernd nach unten
    // springen lassen – diese Assertion färbt das rot (Server sortierte [Dora, Anna, Bernd, Carla]).
    expect(teilnehmerNamesInOrder()).toEqual(["Bernd", "Dora", "Anna", "Carla"]);
    expect(screen.queryAllByTestId("kassiere-form")).toHaveLength(0);
  });

  it("should_reapplyServerOrder_when_pageIsRenderedAgainAfterReload", async () => {
    arrangeVierZeilen({ anna: 250, bernd: null, carla: 250, dora: null });
    const { unmount } = render(await KassierenPage(seite("v-1")));
    unmount();

    // Reload nach dem Kassieren von Bernd → neue Instanz, die Sortierung aus spec-223 gilt wieder.
    arrangeVierZeilen({ anna: 250, bernd: 250, carla: 250, dora: null });
    render(await KassierenPage(seite("v-1")));

    expect(teilnehmerNamesInOrder()).toEqual(["Dora", "Anna", "Bernd", "Carla"]);
  });

  it("should_sortNullVerzehrParticipantIntoBezahltGroup_when_noConsumptionAndNoErhalten", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listAuslagenMock.mockResolvedValue([]);
    listEreignisseMock.mockResolvedValue([]);
    // Aaron: kein Verzehr + kein Erhalten → abgeleitet bezahlt (0 ≥ 0). Berta: 2,50 € offen.
    listZeilenMock.mockResolvedValue([
      zeile({ id: "z-aa", teilnehmerId: "t-aa", anzeigename: "Aaron", erhaltenCents: null }),
      zeile({ id: "z-be", teilnehmerId: "t-be", anzeigename: "Berta", erhaltenCents: null }),
    ]);
    listPositionenMock.mockResolvedValue([pos({ zeileId: "z-be", menge: 1, priceCents: 250 })]);

    render(await KassierenPage(seite("v-1")));

    // Null-Verzehr sortiert nach unten (bezahlt) – trotz alphabetisch erstem Namen.
    expect(teilnehmerNamesInOrder()).toEqual(["Berta", "Aaron"]);
  });

  it("should_emphasizeVerzehrGesamtWithSemibold_when_rendered", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    const annaLi = screen.getByText("Anna Beispiel").closest("li")!;
    const dt = within(annaLi).getByText("Verzehr-Gesamt");
    const dd = dt.closest("div")!.querySelector("dd")!;
    // Wie „Gesamt" auf der Verzehr-erfassen-Seite: font-semibold + volle Textfarbe (Light+Dark).
    expect(dt).toHaveClass("font-semibold", "text-zinc-900", "dark:text-zinc-100");
    expect(dd).toHaveClass("font-semibold", "tabular-nums", "text-zinc-900", "dark:text-zinc-100");
    expect(dt).not.toHaveClass("font-medium");
    expect(dd).not.toHaveClass("font-medium");
  });

  it("should_keepOtherCategoriesInMutedSecondary_when_rendered", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    const annaLi = screen.getByText("Anna Beispiel").closest("li")!;
    // Gedämpfte Sekundärfarbe auf dem umschließenden dl, in Light und Dark.
    expect(within(annaLi).getByText("Getränke").closest("dl")!).toHaveClass(
      "text-zinc-600",
      "dark:text-zinc-400",
    );
    for (const label of ["Getränke", "Essen", "Kaffee", "Spende"]) {
      const dt = within(annaLi).getByText(label);
      expect(dt).not.toHaveClass("font-semibold");
      expect(dt).not.toHaveClass("font-medium");
    }
  });

  it("should_keepAllAmountsAndStates_when_calledWithPersonenbezug", async () => {
    // #308 AK12: der Personenbezug ist reine Navigation – Zeilenbeträge, Zeilenstatus, Tagessummen
    // und Gesamtabrechnung sind Zeichen für Zeichen dieselben wie beim Aufruf ohne ihn.
    arrangeHappyPath();
    const { unmount } = render(await KassierenPage(seite("v-1")));
    const ohneBezug = betragsrelevanteTexte();
    unmount();

    arrangeHappyPath();
    render(await KassierenPage(seite("v-1", "z-2")));

    expect(betragsrelevanteTexte()).toEqual(ohneBezug);
    // Gegenkontrolle: der Aufruf war wirklich personenbezogen – sonst verglichen wir zwei
    // identische Standardaufrufe und die Gleichheit wäre nichtssagend.
    expect(hervorgehobeneNamen()).toEqual(["Bernd Beispiel"]);
  });

  it("should_showTagessummen_when_rendered", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    expect(screen.getByText("Tagessummen")).toBeInTheDocument();
    // Σ Verzehr-Gesamt = 800 + 250 = 1050 → 10,50 €; genau eine offene Zeile (z-2).
    expect(screen.getByText("10,50 €")).toBeInTheDocument();
    expect(screen.getByText("Offene Zeilen:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    // Kategorie „Sonstige" ist in Getränke · Essen · Kaffee aufgelöst; die Reihenfolge der
    // Summenzeilen bleibt fix (Verzehr-Gesamt hervorgehoben zwischen Kategorien und Erhalten).
    const tagessummen = screen.getByText("Tagessummen").closest("section")!;
    const zeilenLabels = within(tagessummen)
      .getAllByRole("row")
      .map((row) => within(row).getAllByRole("cell")[0]?.textContent);
    expect(zeilenLabels).toEqual([
      "Getränke",
      "Essen",
      "Kaffee",
      "Verzehr-Gesamt",
      "Erhalten",
      "Spende",
    ]);
    expect(within(tagessummen).queryByText("Sonstige")).not.toBeInTheDocument();
  });

  it("should_showGesamtabrechnungForAssignedKasse_when_rendered", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    // Kasse-Bezug im Titel; Kassenveränderung = Σ Erhalten (1000) − Σ erstattete Auslagen (550) = 450.
    expect(screen.getByText("Gesamtabrechnung (Kasse: Montagsrunde)")).toBeInTheDocument();
    expect(screen.getByText("Kassenveränderung")).toBeInTheDocument();
    expect(screen.getByText("4,50 €")).toBeInTheDocument();
    // Auslagenerstattungen je Kategorie als Ausgaben (nur erstattete zählen).
    expect(screen.getByText("Ausgaben – Sonstiges")).toBeInTheDocument();
  });

  it("should_renderProtokoll_when_ereignissePresent", async () => {
    arrangeHappyPath();

    render(await KassierenPage(seite("v-1")));

    expect(screen.getByText("Abgeschlossen")).toBeInTheDocument();
    expect(screen.getByText(/Vera Veranstalter/)).toBeInTheDocument();
    expect(screen.getByText(/14\.07\.2026, 20:00/)).toBeInTheDocument();
  });

  it("should_showFallbackDash_when_akteurNameMissing", async () => {
    arrangeHappyPath();
    listEreignisseMock.mockResolvedValue([{ ...ereignisse[0], akteurName: null }]);

    render(await KassierenPage(seite("v-1")));

    expect(
      screen.getByText(
        (_, element) => element?.textContent === "· —" && element.tagName === "SPAN",
      ),
    ).toBeInTheDocument();
  });

  it("should_showEmptyProtokoll_when_noEreignisse", async () => {
    arrangeHappyPath();
    listEreignisseMock.mockResolvedValue([]);

    render(await KassierenPage(seite("v-1")));

    expect(
      screen.getByText(/Noch kein Abschluss oder Wiederöffnen protokolliert/),
    ).toBeInTheDocument();
  });

  it("should_hideKassiereFormAndShowErhalten_when_abgeschlossen", async () => {
    arrangeHappyPath();
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });

    render(await KassierenPage(seite("v-1")));

    // Schreibgeschützt: kein Erfassungsformular, stattdessen der erhaltene Betrag als Text.
    expect(screen.queryByTestId("kassiere-form")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Erhalten:/).length).toBeGreaterThan(0);
    // Aufschlüsselung bleibt in der Lese-Ansicht je Teilnehmer verfügbar (AC7).
    expect(screen.getAllByText("Verzehr anzeigen").length).toBe(2);
  });

  it("should_showEmptyState_when_noZeilen", async () => {
    arrangeHappyPath();
    listZeilenMock.mockResolvedValue([]);
    listPositionenMock.mockResolvedValue([]);

    render(await KassierenPage(seite("v-1")));

    expect(screen.getByText("Noch keine Teilnehmer erfasst.")).toBeInTheDocument();
  });
});
