import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
// zeileId aus, damit sich Vorhandensein (offen) und Fehlen (abgeschlossen) prüfen lassen.
vi.mock("../../StatusToggle", () => ({ StatusToggle: () => null }));
vi.mock("../../KassiereZeileForm", () => ({
  KassiereZeileForm: ({ zeileId }: { zeileId: string }) => (
    <div data-testid="kassiere-form">{zeileId}</div>
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

function params(id: string) {
  return Promise.resolve({ id });
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

beforeEach(() => {
  vi.resetAllMocks();
});

describe("KassierenPage", () => {
  it("should_denyAccess_when_userIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await KassierenPage({ params: params("v-1") }));

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

    await expect(KassierenPage({ params: params("v-1") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("should_linkBackToDetail_when_rendered", async () => {
    arrangeHappyPath();

    render(await KassierenPage({ params: params("v-1") }));

    expect(screen.getByRole("link", { name: /Zur Veranstaltung/ })).toHaveAttribute(
      "href",
      "/veranstaltung/v-1",
    );
  });

  it("should_renderResolvedCategoriesPerZeile_when_positionsPresent", async () => {
    arrangeHappyPath();

    render(await KassierenPage({ params: params("v-1") }));

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

    render(await KassierenPage({ params: params("v-1") }));

    // Bernd hat nur ein Getränk (2,50 €) → Essen und Kaffee dennoch sichtbar mit 0,00 €.
    const berndLi = screen.getByText("Bernd Beispiel").closest("li")!;
    const essen = within(berndLi).getByText("Essen").closest("div")!;
    const kaffee = within(berndLi).getByText("Kaffee").closest("div")!;
    expect(within(essen).getByText("0,00 €")).toBeInTheDocument();
    expect(within(kaffee).getByText("0,00 €")).toBeInTheDocument();
  });

  it("should_renderCollapsedVerzehrBreakdownPerZeile_when_rendered", async () => {
    arrangeHappyPath();

    const { container } = render(await KassierenPage({ params: params("v-1") }));

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

    const { container } = render(await KassierenPage({ params: params("v-1") }));

    // Positionsbeträge der z-1 aufsummiert = Verzehr-Gesamt (800): Cola 2×250 + Schnitzel 1×300.
    const annaDetails = container.querySelector("li details")!;
    const summeCents = within(annaDetails as HTMLElement)
      .getAllByRole("row")
      .filter((row) => row.querySelector("td"))
      .reduce((sum, row) => {
        const cells = within(row).getAllByRole("cell");
        return sum + centsFromEuroText(cells[cells.length - 1].textContent ?? "");
      }, 0);
    expect(summeCents).toBe(800);
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

    render(await KassierenPage({ params: params("v-1") }));

    // Soft-gelöschter Artikel (COALESCE-Name/-Preis) bleibt in der Aufschlüsselung sichtbar.
    const annaLi = screen.getByText("Anna Beispiel").closest("li")!;
    expect(within(annaLi).getByText("Altes Gericht")).toBeInTheDocument();
  });

  it("should_markPaidLineAsBezahlt_when_erhaltenCoversVerzehr", async () => {
    arrangeHappyPath();

    render(await KassierenPage({ params: params("v-1") }));

    expect(screen.getByText("bezahlt")).toBeInTheDocument();
  });

  it("should_renderKassiereForm_forEachZeile_when_offen", async () => {
    arrangeHappyPath();

    render(await KassierenPage({ params: params("v-1") }));

    const forms = screen.getAllByTestId("kassiere-form");
    expect(forms.map((form) => form.textContent)).toEqual(["z-1", "z-2"]);
  });

  it("should_showTagessummen_when_rendered", async () => {
    arrangeHappyPath();

    render(await KassierenPage({ params: params("v-1") }));

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

    render(await KassierenPage({ params: params("v-1") }));

    // Kasse-Bezug im Titel; Kassenveränderung = Σ Erhalten (1000) − Σ erstattete Auslagen (550) = 450.
    expect(screen.getByText("Gesamtabrechnung (Kasse: Montagsrunde)")).toBeInTheDocument();
    expect(screen.getByText("Kassenveränderung")).toBeInTheDocument();
    expect(screen.getByText("4,50 €")).toBeInTheDocument();
    // Auslagenerstattungen je Kategorie als Ausgaben (nur erstattete zählen).
    expect(screen.getByText("Ausgaben – Sonstiges")).toBeInTheDocument();
  });

  it("should_renderProtokoll_when_ereignissePresent", async () => {
    arrangeHappyPath();

    render(await KassierenPage({ params: params("v-1") }));

    expect(screen.getByText("Abgeschlossen")).toBeInTheDocument();
    expect(screen.getByText(/Vera Veranstalter/)).toBeInTheDocument();
    expect(screen.getByText(/14\.07\.2026, 20:00/)).toBeInTheDocument();
  });

  it("should_showFallbackDash_when_akteurNameMissing", async () => {
    arrangeHappyPath();
    listEreignisseMock.mockResolvedValue([{ ...ereignisse[0], akteurName: null }]);

    render(await KassierenPage({ params: params("v-1") }));

    expect(
      screen.getByText(
        (_, element) => element?.textContent === "· —" && element.tagName === "SPAN",
      ),
    ).toBeInTheDocument();
  });

  it("should_showEmptyProtokoll_when_noEreignisse", async () => {
    arrangeHappyPath();
    listEreignisseMock.mockResolvedValue([]);

    render(await KassierenPage({ params: params("v-1") }));

    expect(
      screen.getByText(/Noch kein Abschluss oder Wiederöffnen protokolliert/),
    ).toBeInTheDocument();
  });

  it("should_hideKassiereFormAndShowErhalten_when_abgeschlossen", async () => {
    arrangeHappyPath();
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });

    render(await KassierenPage({ params: params("v-1") }));

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

    render(await KassierenPage({ params: params("v-1") }));

    expect(screen.getByText("Noch keine Teilnehmer erfasst.")).toBeInTheDocument();
  });
});
