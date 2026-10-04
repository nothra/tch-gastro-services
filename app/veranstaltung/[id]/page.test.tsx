import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Veranstaltung } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ getVeranstaltung: vi.fn(), listZeilen: vi.fn() }));
vi.mock("@/db/teilnehmer", () => ({ listActiveTeilnehmer: vi.fn() }));
vi.mock("@/db/catalog", () => ({ listCatalogs: vi.fn() }));
vi.mock("@/db/verzehr", () => ({ listPositionen: vi.fn() }));
vi.mock("@/db/auslage", () => ({ listAuslagen: vi.fn() }));

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

// Eingebettete Client-Komponenten sind hier durch Stubs ersetzt – sie haben eigene Tests. Für die
// Detailseite zählen RBAC, der Aufbau, OB ein Baustein erscheint und mit welchen Daten – deshalb
// Stubs, die ihre Props sichtbar machen statt sie zu verschlucken.
vi.mock("../KatalogWechsel", () => ({
  KatalogWechsel: ({ catalogId, kataloge }: { catalogId: string; kataloge: { id: string }[] }) => (
    <div data-testid="katalog-wechsel" data-catalog-id={catalogId}>
      {kataloge.map((k) => k.id).join(",")}
    </div>
  ),
}));
vi.mock("./VeranstaltungMetaForm", () => ({
  VeranstaltungMetaForm: ({
    bezeichnung,
    datum,
    kasse,
  }: {
    bezeichnung: string;
    datum: Date | null;
    kasse: string;
  }) => (
    <div
      data-testid="meta-form"
      data-bezeichnung={bezeichnung}
      data-kasse={kasse}
      data-datum={datum?.toISOString().slice(0, 10)}
    />
  ),
}));
vi.mock("./VeranstaltungLoeschen", () => ({
  VeranstaltungLoeschen: ({ id, bezeichnung }: { id: string; bezeichnung: string }) => (
    <button type="button" data-id={id} data-bezeichnung={bezeichnung}>
      Veranstaltung löschen
    </button>
  ),
}));
vi.mock("./ZugangTeilen", () => ({
  ZugangTeilen: ({ token }: { token: string }) => <div data-testid="zugang-teilen">{token}</div>,
}));
// Der Stub zeigt Auslöser UND Inhalt dauerhaft: geprüft wird hier, WELCHE Inhalte in welchem
// Kopf-Dialog landen – das Öffnen/Schließen deckt `KopfDialog.test.tsx` ab.
vi.mock("./KopfDialog", () => ({
  KopfDialog: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div data-kopf-dialog={label}>
      <button type="button">{label}</button>
      <div data-testid={`inhalt ${label}`}>{children}</div>
    </div>
  ),
}));
vi.mock("../TeilnehmerHinzufuegenDialog", () => ({
  TeilnehmerHinzufuegenDialog: ({ verfuegbar }: { verfuegbar: { id: string }[] }) => (
    <button type="button" data-testid="teilnehmer-dialog">
      + Teilnehmer ({verfuegbar.map((t) => t.id).join(",")})
    </button>
  ),
}));
vi.mock("./AbschlussAktion", () => ({
  AbschlussAktion: ({
    status,
    offeneZeilen,
    offenerBetragCents,
  }: {
    status: string;
    offeneZeilen?: number;
    offenerBetragCents?: number;
  }) => (
    <button
      type="button"
      data-testid="abschluss-aktion"
      data-status={status}
      data-offene-zeilen={offeneZeilen}
      data-offener-betrag={offenerBetragCents}
    >
      Abschluss-Aktion
    </button>
  ),
}));
vi.mock("../ZeileRow", () => ({
  ZeileRow: ({ zeile, editable }: { zeile: { anzeigename: string }; editable: boolean }) => (
    <li data-editable={String(editable)}>{zeile.anzeigename}</li>
  ),
}));

import { auth } from "@/auth";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listActiveTeilnehmer } from "@/db/teilnehmer";
import { listCatalogs } from "@/db/catalog";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import type { Catalog, Teilnehmer, VeranstaltungZeile } from "@/db/schema";
import VeranstaltungDetailPage from "./page";

const authMock = vi.mocked(auth);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const listZeilenMock = vi.mocked(listZeilen);
const listActiveTeilnehmerMock = vi.mocked(listActiveTeilnehmer);
const listCatalogsMock = vi.mocked(listCatalogs);
const listPositionenMock = vi.mocked(listPositionen);
const listAuslagenMock = vi.mocked(listAuslagen);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

const aVeranstaltung: Veranstaltung = {
  id: "v-1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  kasse: "montagsrunde",
  catalogId: "kat-b",
  status: "offen",
  token: "abc123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const abgeschlossen: Veranstaltung = { ...aVeranstaltung, status: "abgeschlossen" };

const theke: Veranstaltung = {
  ...aVeranstaltung,
  typ: "theke",
  datum: null,
  bezeichnung: "Stehende Theke",
};

function katalog(id: string, name: string, active = true): Catalog {
  return {
    id,
    name,
    active,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function zeile(id: string, anzeigename: string, erhaltenCents: number | null = null) {
  return {
    id,
    veranstaltungId: "v-1",
    teilnehmerId: `t-${id}`,
    anzeigename,
    erhaltenCents,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies VeranstaltungZeile;
}

function teilnehmer(id: string, name: string) {
  return {
    id,
    name,
    typ: "person",
    mitglied: false,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Teilnehmer;
}

function params(id: string) {
  return Promise.resolve({ id });
}

async function renderSeite(veranstaltung: Veranstaltung = aVeranstaltung) {
  authMock.mockResolvedValue(session(["veranstalter"]));
  getVeranstaltungMock.mockResolvedValue(veranstaltung);
  render(await VeranstaltungDetailPage({ params: params("v-1") }));
}

function einstellungen() {
  return within(screen.getByTestId("inhalt Einstellungen"));
}

// Die Kopfaktionen in DOM-Reihenfolge: Badge-Text bzw. zugänglicher Name der Schaltfläche.
function kopfAktionen() {
  const badge = within(screen.getByRole("banner")).getByText(/^(offen|abgeschlossen)$/);
  return Array.from(badge.parentElement!.children).map((element) =>
    element === badge ? "Badge" : (element.querySelector("button") ?? element).textContent,
  );
}

function kachel(name: RegExp) {
  return within(screen.getByRole("navigation", { name: "Arbeitsschritte" })).getByRole("link", {
    name,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  listZeilenMock.mockResolvedValue([]);
  listActiveTeilnehmerMock.mockResolvedValue([]);
  listPositionenMock.mockResolvedValue([]);
  listAuslagenMock.mockResolvedValue([]);
  listCatalogsMock.mockResolvedValue([katalog("kat-b", "Dorfmeisterschaften")]);
});

describe("VeranstaltungDetailPage – Zugriff", () => {
  it("should_denyAccess_when_userIsNotVeranstalter", async () => {
    // FS4: unveränderte Meldung, keine Daten geladen.
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await VeranstaltungDetailPage({ params: params("v-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_notFound_when_veranstaltungMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(undefined);

    await expect(VeranstaltungDetailPage({ params: params("v-1") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});

describe("VeranstaltungDetailPage – Aufbau und Kopf (AK1, AK2)", () => {
  it("should_orderHeaderKachelnTeilnehmer_when_veranstaltungOffen", async () => {
    // spec-391 AK1: von oben nach unten Kopf, Kacheln, Teilnehmerliste – und darunter kein
    // Bereich „Einstellungen" mehr (ersetzt spec-369 AK1).
    await renderSeite();

    const bloecke = Array.from(screen.getByRole("main").children);
    expect(bloecke).toHaveLength(3);
    expect(bloecke[0].tagName).toBe("HEADER");
    expect(bloecke[1]).toBe(screen.getByRole("navigation", { name: "Arbeitsschritte" }));
    expect(bloecke[2]).toBe(screen.getByRole("region", { name: /Teilnehmer/ }));
    expect(document.querySelector("details")).toBeNull();
  });

  it("should_showTitleMetaStatusBadgeAndBackLink_when_rendered", async () => {
    // AK2
    await renderSeite();

    const kopf = within(screen.getByRole("banner"));
    expect(kopf.getByRole("heading", { level: 1 })).toHaveTextContent("Montagsrunde Juli");
    expect(kopf.getByText("14.07.2026 · Montagsrunde")).toBeInTheDocument();
    expect(kopf.getByText("offen")).toHaveClass("rounded-full");
    expect(kopf.getByRole("link", { name: "Alle Veranstaltungen" })).toHaveAttribute(
      "href",
      "/veranstaltung",
    );
  });

  it("should_showAbgeschlossenBadge_when_veranstaltungAbgeschlossen", async () => {
    await renderSeite(abgeschlossen);

    expect(within(screen.getByRole("banner")).getByText("abgeschlossen")).toHaveClass(
      "rounded-full",
    );
  });
});

// spec-371 AK18/AK22–AK24, ADR-055 D3: Abschließen/Wieder öffnen sitzt im Kopf neben dem Badge.
describe("VeranstaltungDetailPage – Abschluss im Kopf (spec-371)", () => {
  function abschlussAktion() {
    return within(screen.getByRole("banner")).getByTestId("abschluss-aktion");
  }

  it("should_offerAbschliessenNextToBadge_when_veranstaltungOffen", async () => {
    await renderSeite();

    expect(abschlussAktion()).toHaveAttribute("data-status", "offen");
    // AK24: Badge und Aktion bilden eine umbrechende Gruppe – bei 375 px weicht die Aktion in
    // die nächste Zeile aus, statt Titel oder Badge zu überlappen.
    const gruppe = abschlussAktion().parentElement!;
    expect(gruppe).toContainElement(within(screen.getByRole("banner")).getByText("offen"));
    expect(gruppe).toHaveClass("flex", "flex-wrap");
  });

  it("should_passOffeneZeilenAndBetragFromKassierSummen_when_veranstaltungOffen", async () => {
    // AK20/ADR-055 D3: Anna 2 × 2,50 € mit 3,00 € angezahlt (Rest 2,00 €), Bernd 1 × 4,00 € ohne
    // Zahlung (Rest 4,00 €), Carla 1 × 2,50 € mit 5,00 € überzahlt (bezahlt, trägt 0 bei).
    listZeilenMock.mockResolvedValue([
      zeile("z-1", "Anna", 300),
      zeile("z-2", "Bernd"),
      zeile("z-3", "Carla", 500),
    ]);
    listPositionenMock.mockResolvedValue([
      { zeileId: "z-1", menge: 2, priceCents: 250, category: "getraenk" },
      { zeileId: "z-2", menge: 1, priceCents: 400, category: "essen" },
      { zeileId: "z-3", menge: 1, priceCents: 250, category: "getraenk" },
    ] as never);

    await renderSeite();

    expect(abschlussAktion()).toHaveAttribute("data-offene-zeilen", "2");
    expect(abschlussAktion()).toHaveAttribute("data-offener-betrag", "600");
  });

  it("should_offerWiederOeffnenWithoutLoadingPositionen_when_veranstaltungAbgeschlossen", async () => {
    // AK22: Wieder öffnen braucht keinen Offen-Hinweis – die abgeschlossene Variante lädt weiterhin
    // keine Positionen (ADR-053 D4).
    await renderSeite(abgeschlossen);

    expect(abschlussAktion()).toHaveAttribute("data-status", "abgeschlossen");
    expect(abschlussAktion()).not.toHaveAttribute("data-offene-zeilen");
    expect(listPositionenMock).not.toHaveBeenCalled();
  });

  it("should_offerNoAbschluss_when_typTheke", async () => {
    // AK23: die stehende Theke ist nicht abschließbar (spec-51); das Badge bleibt.
    await renderSeite(theke);

    expect(within(screen.getByRole("banner")).queryByTestId("abschluss-aktion")).toBeNull();
    expect(within(screen.getByRole("banner")).getByText("offen")).toBeInTheDocument();
  });
});

describe("VeranstaltungDetailPage – Kacheln (AK3–AK7)", () => {
  it("should_linkThreeKachelnToSubpages_when_veranstaltungOffen", async () => {
    // AK3
    await renderSeite();

    const links = within(screen.getByRole("navigation", { name: "Arbeitsschritte" })).getAllByRole(
      "link",
    );
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/veranstaltung/v-1/verzehr",
      "/veranstaltung/v-1/auslagen",
      "/veranstaltung/v-1/kassieren",
    ]);
  });

  it("should_showKennzahlenFromSummen_when_verzehrAndAuslagenErfasst", async () => {
    // AK4: Anna hat 2 × 2,50 € und hat bezahlt, Bernd 1 × 4,00 € offen; eine Auslage von 12,50 €
    // (offen) plus 3,00 € (erstattet). Soll-Werte von Hand gerechnet.
    listZeilenMock.mockResolvedValue([zeile("z-1", "Anna", 500), zeile("z-2", "Bernd")]);
    listPositionenMock.mockResolvedValue([
      { zeileId: "z-1", menge: 2, priceCents: 250, category: "getraenk" },
      { zeileId: "z-2", menge: 1, priceCents: 400, category: "essen" },
    ] as never);
    listAuslagenMock.mockResolvedValue([
      { kategorie: "essen", betragCents: 1250, status: "offen" },
      { kategorie: "sonstiges", betragCents: 300, status: "erstattet" },
    ] as never);

    await renderSeite();

    expect(kachel(/Verzehr/)).toHaveTextContent(/9,00\s€/);
    expect(kachel(/Auslagen/)).toHaveTextContent(/15,50\s€/);
    expect(kachel(/Kassieren/)).toHaveTextContent("1 von 2 bezahlt");
    expect(listPositionenMock).toHaveBeenCalledWith("v-1");
    expect(listAuslagenMock).toHaveBeenCalledWith("v-1");
  });

  it("should_showZeroValues_when_nothingErfasst", async () => {
    // AK5
    await renderSeite();

    expect(kachel(/Verzehr/)).toHaveTextContent(/0,00\s€/);
    expect(kachel(/Auslagen/)).toHaveTextContent(/0,00\s€/);
    expect(kachel(/Kassieren/)).toHaveTextContent("0 von 0 bezahlt");
  });

  it("should_showBerichtBetweenHeaderAndKachelnWithoutKennzahlen_when_abgeschlossen", async () => {
    // AK6: Bericht zwischen Kopf und Kacheln; Kacheln bleiben Links, aber ohne Kennzahl – und
    // die Kennzahl-Daten werden gar nicht erst geladen (ADR-053 D4).
    await renderSeite(abgeschlossen);

    const bloecke = Array.from(screen.getByRole("main").children);
    // Ein benannter Bereich (`aria-labelledby`), damit er als Landmarke angesprungen werden kann.
    const bericht = screen.getByRole("region", { name: "Abschlussbericht" });
    expect(bloecke[1]).toContainElement(bericht);
    expect(bloecke[2]).toBe(screen.getByRole("navigation", { name: "Arbeitsschritte" }));
    expect(kachel(/Kassieren/)).toHaveTextContent(/^Kassieren$/);
    expect(kachel(/Verzehr/)).toHaveTextContent(/^Verzehr$/);
    expect(listPositionenMock).not.toHaveBeenCalled();
    expect(listAuslagenMock).not.toHaveBeenCalled();
  });

  it("should_linkKassierenAndDropEinstellungen_when_abgeschlossen", async () => {
    // AK7
    await renderSeite(abgeschlossen);

    expect(kachel(/Kassieren/)).toHaveAttribute("href", "/veranstaltung/v-1/kassieren");
    expect(screen.queryByText("Einstellungen")).not.toBeInTheDocument();
    expect(screen.queryByTestId("katalog-wechsel")).not.toBeInTheDocument();
  });

  it("should_showBerichtDownloads_when_veranstaltungAbgeschlossen", async () => {
    // spec-324 AC14 / spec-369 AK6: Links unverändert.
    await renderSeite(abgeschlossen);

    const vollstaendig = within(screen.getByRole("group", { name: "Vollständig" }));
    expect(vollstaendig.getByRole("link", { name: /Excel .* herunterladen/ })).toHaveAttribute(
      "href",
      "/api/veranstaltung/v-1/bericht?format=xlsx",
    );
    expect(vollstaendig.getByRole("link", { name: /PDF herunterladen/ })).toHaveAttribute(
      "href",
      "/api/veranstaltung/v-1/bericht?format=pdf",
    );
    const nurGetraenke = within(screen.getByRole("group", { name: "Nur Getränke" }));
    expect(nurGetraenke.getByRole("link", { name: /Excel .* herunterladen/ })).toHaveAttribute(
      "href",
      "/api/veranstaltung/v-1/bericht?format=xlsx&umfang=getraenke",
    );
    expect(nurGetraenke.getByRole("link", { name: /PDF herunterladen/ })).toHaveAttribute(
      "href",
      "/api/veranstaltung/v-1/bericht?format=pdf&umfang=getraenke",
    );
  });

  it("should_groupBothBerichtVariantsUnderOneSection_when_veranstaltungAbgeschlossen", async () => {
    await renderSeite(abgeschlossen);

    const sektion = screen.getByRole("heading", { name: "Abschlussbericht" }).closest("section")!;
    expect(within(sektion).getAllByRole("group")).toHaveLength(2);
    expect(within(sektion).getAllByRole("link", { name: /herunterladen/ })).toHaveLength(4);
  });

  it("should_hideBerichtDownloads_when_veranstaltungOffen", async () => {
    await renderSeite();

    expect(screen.queryByRole("link", { name: /herunterladen/ })).not.toBeInTheDocument();
  });
});

describe("VeranstaltungDetailPage – Teilnehmerliste (AK8, AK9)", () => {
  it("should_showCountHeadingWithDialogInSameRow_when_veranstaltungOffen", async () => {
    // AK8: Überschrift und „+ Teilnehmer" in derselben Zeile; nur noch nicht erfasste aktive
    // Stammteilnehmer stehen zur Wahl.
    listZeilenMock.mockResolvedValue([zeile("z-1", "Anna")]);
    listActiveTeilnehmerMock.mockResolvedValue([
      teilnehmer("t-z-1", "Anna"),
      teilnehmer("t-9", "Bernd"),
    ]);

    await renderSeite();

    const ueberschrift = screen.getByRole("heading", { name: "Teilnehmer (1)" });
    const knopf = screen.getByTestId("teilnehmer-dialog");
    expect(ueberschrift.parentElement).toBe(knopf.parentElement);
    expect(knopf).toHaveTextContent("+ Teilnehmer (t-9)");
  });

  it("should_renderRowsEditable_when_veranstaltungOffen", async () => {
    listZeilenMock.mockResolvedValue([zeile("z-1", "Anna Beispiel")]);

    await renderSeite();

    expect(screen.getByText("Anna Beispiel")).toHaveAttribute("data-editable", "true");
  });

  it("should_renderRowsReadOnlyWithoutDialog_when_veranstaltungAbgeschlossen", async () => {
    // AK9 / AK6: Liste schreibgeschützt sichtbar, kein „+ Teilnehmer", kein Zeilenmenü.
    listZeilenMock.mockResolvedValue([zeile("z-1", "Anna Beispiel")]);

    await renderSeite(abgeschlossen);

    expect(screen.getByText("Anna Beispiel")).toHaveAttribute("data-editable", "false");
    expect(screen.queryByTestId("teilnehmer-dialog")).not.toBeInTheDocument();
  });

  it("should_showEmptyState_when_noZeilen", async () => {
    await renderSeite();

    expect(screen.getByText("Noch keine Teilnehmer erfasst.")).toBeInTheDocument();
  });
});

describe("VeranstaltungDetailPage – Kopfaktionen (spec-391 AK2, AK10, AK13, AK14)", () => {
  it("should_orderBadgeTeilenEinstellungenPapierkorb_when_datedVeranstaltungOffen", async () => {
    // AK2: von links nach rechts – die zerstörerische Aktion zuletzt (#352 AK4/AK8). AK10:
    // „Link & QR teilen" liegt direkt im Kopf, ohne vorher etwas anderes zu öffnen.
    await renderSeite();

    expect(kopfAktionen()).toEqual([
      "Badge",
      "Link & QR teilen",
      "Einstellungen",
      "Veranstaltung löschen",
    ]);
  });

  it("should_passIdAndBezeichnungToPapierkorb_when_datedVeranstaltungOffen", async () => {
    await renderSeite();

    const papierkorb = screen.getByRole("button", { name: "Veranstaltung löschen" });
    expect(papierkorb).toHaveAttribute("data-id", "v-1");
    expect(papierkorb).toHaveAttribute("data-bezeichnung", "Montagsrunde Juli");
  });

  it("should_offerTeilenAndEinstellungenWithoutPapierkorb_when_typTheke", async () => {
    // AK13: stehende Theke – Löschen nur für datierte Veranstaltungen (#352).
    await renderSeite(theke);

    expect(kopfAktionen()).toEqual(["Badge", "Link & QR teilen", "Einstellungen"]);
  });

  it("should_showOnlyBadge_when_veranstaltungAbgeschlossen", async () => {
    // AK14: weder Teilen, Zahnrad noch Papierkorb.
    await renderSeite(abgeschlossen);

    expect(kopfAktionen()).toEqual(["Badge"]);
    expect(screen.queryByRole("button", { name: "Veranstaltung löschen" })).toBeNull();
  });
});

describe("VeranstaltungDetailPage – Dialog „Einstellungen“ (spec-391 AK5, AK6)", () => {
  it("should_containKatalogThenBearbeiten_when_datedVeranstaltungOffen", async () => {
    // AK5: in dieser Reihenfolge Katalog wechseln, Bezeichnung/Datum/Kasse bearbeiten.
    await renderSeite();

    const katalogWechsel = einstellungen().getByTestId("katalog-wechsel");
    const meta = einstellungen().getByTestId("meta-form");
    expect(katalogWechsel).toHaveAttribute("data-catalog-id", "kat-b");
    expect(meta).toHaveAttribute("data-bezeichnung", "Montagsrunde Juli");
    expect(meta).toHaveAttribute("data-kasse", "montagsrunde");
    expect(meta).toHaveAttribute("data-datum", "2026-07-14");
    const inhalt = Array.from(screen.getByTestId("inhalt Einstellungen").children);
    expect(inhalt).toEqual([katalogWechsel, meta]);
  });

  it("should_notContainTeilenOrLoeschen_when_datedVeranstaltungOffen", async () => {
    // AK5, zweite Hälfte: Teilen und Löschen sind eigene Kopfaktionen, nicht im Dialog.
    await renderSeite();

    expect(einstellungen().queryByTestId("zugang-teilen")).not.toBeInTheDocument();
    expect(einstellungen().queryByText("Link & QR teilen")).not.toBeInTheDocument();
    expect(einstellungen().queryByText("Veranstaltung löschen")).not.toBeInTheDocument();
  });

  it("should_passOnlyActiveKatalogeToKatalogWechsel_when_veranstaltungOffen", async () => {
    // #346 AK6: ein deaktivierter Katalog ist kein Wechselziel.
    listCatalogsMock.mockResolvedValue([
      katalog("kat-b", "Dorfmeisterschaften"),
      katalog("kat-alt", "Sommerfest 2024", false),
    ]);

    await renderSeite();

    expect(screen.getByTestId("katalog-wechsel")).toHaveTextContent("kat-b");
    expect(screen.getByTestId("katalog-wechsel")).not.toHaveTextContent("kat-alt");
  });

  it("should_containOnlyKatalogWechsel_when_typTheke", async () => {
    // AK6: stehende Theke – nur „Katalog wechseln", kein Bearbeiten (#352); die Kacheln bleiben.
    await renderSeite(theke);

    const inhalt = Array.from(screen.getByTestId("inhalt Einstellungen").children);
    expect(inhalt).toEqual([einstellungen().getByTestId("katalog-wechsel")]);
    expect(screen.queryByTestId("meta-form")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Arbeitsschritte" })).toBeInTheDocument();
  });
});

describe("VeranstaltungDetailPage – Dialog „Link & QR teilen“ (spec-391 AK9)", () => {
  it("should_putServerRenderedZugangIntoTeilenDialog_when_veranstaltungOffen", async () => {
    // AK9: Link und QR nur im Dialog, serverseitig gerendert und mit dem Token gespeist.
    await renderSeite();

    const inhalt = within(screen.getByTestId("inhalt Link & QR teilen"));
    expect(inhalt.getByTestId("zugang-teilen")).toHaveTextContent("abc123");
  });

  it("should_loadNoKataloge_when_abgeschlossen", async () => {
    await renderSeite(abgeschlossen);

    expect(listCatalogsMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("zugang-teilen")).not.toBeInTheDocument();
  });
});
