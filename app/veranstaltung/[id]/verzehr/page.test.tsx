import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { stubRequestAnimationFrame } from "@/app/_verzehr/raf-stub";
import type { CatalogItem, Veranstaltung, VeranstaltungZeile } from "@/db/schema";
import type { VerzehrPositionRow } from "@/db/verzehr";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ getVeranstaltung: vi.fn(), listZeilen: vi.fn() }));
vi.mock("@/db/catalog", () => ({ listActiveCatalog: vi.fn() }));
vi.mock("@/db/verzehr", () => ({ listPositionen: vi.fn() }));
vi.mock("../../actions", () => ({ adjustVerzehrAction: vi.fn() }));

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

// MengeControl ist eine Client-Komponente (useActionState); hier durch ein statisches Stub
// ersetzt – die Interaktion hat eigene Tests (MengeControl.test.tsx). Für die Page zählt nur,
// dass die richtigen Daten geladen und weitergereicht werden und der RBAC-/Status-Pfad stimmt.
vi.mock("@/app/_verzehr/MengeControl", () => ({
  MengeControl: ({ menge, editable }: { menge: number; editable: boolean }) => (
    <span data-testid="menge" data-editable={editable}>
      {menge}
    </span>
  ),
}));

import { auth } from "@/auth";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listActiveCatalog } from "@/db/catalog";
import { listPositionen } from "@/db/verzehr";
import VerzehrPage from "./page";

const authMock = vi.mocked(auth);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const listZeilenMock = vi.mocked(listZeilen);
const listActiveCatalogMock = vi.mocked(listActiveCatalog);
const listPositionenMock = vi.mocked(listPositionen);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

// Bewusst NICHT der Standard-Katalog (#346): nur so unterscheidet die Wiring-Assertion unten
// zwischen „lädt die Auswahl aus veranstaltung.catalogId" und „nimmt weiter die Konstante".
// Mit 'standard' als Fixture-Wert wäre sie vor wie nach der Umstellung grün.
const KATALOG_B_ID = "kat-b";

const aVeranstaltung: Veranstaltung = {
  id: "v-1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  kasse: "montagsrunde",
  catalogId: KATALOG_B_ID,
  status: "offen",
  token: "abc123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const aZeile: VeranstaltungZeile = {
  id: "z-1",
  veranstaltungId: "v-1",
  teilnehmerId: "t-1",
  anzeigename: "Anna",
  erhaltenCents: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const bZeile: VeranstaltungZeile = {
  ...aZeile,
  id: "z-2",
  teilnehmerId: "t-2",
  anzeigename: "Bernd",
};

// Soll-Wert als Literal, nicht aus dem Mock gelesen (Testing-Standards). Der Drift-Guard in
// db/catalog.test.ts hält Produktions-Konstante und Migrations-Literal gegeneinander – er liest
// dieses Literal hier nicht mit; es ist unabhängig auf denselben Wert gesetzt. Seit #346 dient es
// hier nur noch als Gegenprobe: die Seite darf gerade NICHT mehr über die Konstante auflösen.
const STANDARD_CATALOG_ID = "standard";

const cola: CatalogItem = {
  id: "c-1",
  catalogId: KATALOG_B_ID,
  name: "Cola",
  size: "0,5l",
  category: "getraenk",
  priceCents: 250,
  sortOrder: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Props eines Seitenaufrufs; `zeile` ist der optionale Personenbezug des Aufrufs (#308).
function seite(id: string, zeile?: string) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(zeile === undefined ? {} : { zeile }),
  };
}

// Chip der sticky Auswahl-Leiste der Einzelansicht.
function chip(name: string) {
  return within(screen.getByRole("group", { name: "Teilnehmer auswählen" })).getByRole("button", {
    name,
  });
}

// Name der aktiven Person im Kopf der Einzelansicht (spec-370 AK1.1).
function aktivePerson() {
  return screen.getByRole("heading", { level: 2 }).textContent;
}

function kassierenLinks() {
  return screen.queryAllByRole("link", { name: /Kassieren/ });
}

// Zwei Teilnehmer (Anna z-1, Bernd z-2) – nötig, um „genau die gemeinte Person" von „irgendeine"
// zu unterscheiden.
function arrangeZweiZeilen() {
  authMock.mockResolvedValue(session(["veranstalter"]));
  getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
  listZeilenMock.mockResolvedValue([aZeile, bZeile]);
  listActiveCatalogMock.mockResolvedValue([cola]);
  listPositionenMock.mockResolvedValue([]);
}

beforeEach(() => {
  vi.resetAllMocks();
  // jsdom implementiert weder scrollIntoView noch scrollTo; die Einzelansicht ruft beide guarded im
  // rAF-Callback auf.
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  stubRequestAnimationFrame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VerzehrPage", () => {
  it("should_denyAccess_when_userIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await VerzehrPage(seite("v-1")));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await VerzehrPage(seite("v-1")));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });

  it("should_notFound_when_veranstaltungMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(undefined);

    await expect(VerzehrPage(seite("v-1"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("should_renderEinzelansichtOfFirstPerson_when_veranstalterAndOpen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage(seite("v-1")));

    // Einzelansicht wie im Link-Weg (spec-370 AK6.1): ohne Personenbezug ist die erste Person
    // aktiv und ihre Erfassung bearbeitbar sichtbar.
    expect(chip("Anna")).toHaveAttribute("aria-pressed", "true");
    expect(aktivePerson()).toBe("Anna");
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "true");
    expect(screen.getByRole("heading", { level: 3, name: "Cola" })).toBeInTheDocument();
    expect(listPositionenMock).toHaveBeenCalledWith("v-1");
    // #346 AK2/AK3: die Erfassung lädt die Auswahl aus dem Katalog DIESER Veranstaltung
    // (ADR-050-Nachtrag zu D3), nicht mehr über die Konstante. Der Fixture-Katalog ist bewusst
    // nicht 'standard' – sonst wäre die Assertion vor wie nach der Umstellung grün.
    expect(listActiveCatalogMock).toHaveBeenCalledWith(KATALOG_B_ID);
    expect(listActiveCatalogMock).not.toHaveBeenCalledWith(STANDARD_CATALOG_ID);
  });

  it("should_switchPersonEditable_when_chipTappedOnOpenVeranstaltung", async () => {
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1")));
    fireEvent.click(chip("Bernd"));

    // Offen → editierbar: das Stub spiegelt die editable-Prop wider.
    expect(aktivePerson()).toBe("Bernd");
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "true");
    expect(screen.getByText("0,5l")).toBeInTheDocument();
    expect(screen.getByText("2,50 €")).toBeInTheDocument();
  });

  it("should_renderReadOnly_when_veranstaltungAbgeschlossen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage(seite("v-1")));

    // Lese-Ansicht (spec-370 AK6.2): sichtbar, nicht bearbeitbar.
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
  });

  it("should_passConsumerBleedToStickyBlock_when_rendered", async () => {
    // spec-370 AK7.4/#205: der Bleed passt zum `p-6` dieses <main> und kommt vom Konsumenten.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1")));

    const block = screen.getByRole("group", { name: "Teilnehmer auswählen" }).parentElement;
    expect(block).toHaveClass("sticky", "-mx-6", "px-6");
    expect(screen.getByRole("main")).toHaveClass("p-6");
  });

  it("should_passConsumerPaddingToFooter_when_rendered", async () => {
    // Lesson #188: Fußleisten-Inhalt fluchtet mit dem `p-6` dieses <main>.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1")));

    const naechste = screen.getByRole("button", { name: "Nächste Person →" });
    expect(naechste.parentElement).toHaveClass("px-6");
  });

  it("should_showPositionMenge_when_positionExists", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    const position: VerzehrPositionRow = {
      zeileId: "z-1",
      catalogItemId: "c-1",
      menge: 3,
      name: "Cola",
      size: "0,5l",
      priceCents: 250,
      category: "getraenk",
      active: true,
    };
    listPositionenMock.mockResolvedValue([position]);

    render(await VerzehrPage(seite("v-1")));

    expect(screen.getByTestId("menge")).toHaveTextContent("3");
  });

  it("should_activateReferencedPerson_when_personenbezugGiven", async () => {
    // #308 AK1/AK6, spec-370 AK1a.5: der Aufruf trägt den Personenbezug → genau diese Person ist
    // aktiv, ohne Chip-Tipp und ohne Umweg über die Detailseite.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-2")));

    expect(aktivePerson()).toBe("Bernd");
    expect(chip("Bernd")).toHaveAttribute("aria-pressed", "true");
    expect(chip("Anna")).toHaveAttribute("aria-pressed", "false");
  });

  it("should_offerKassierenLinkForActivePersonInFooter_when_personenbezugGiven", async () => {
    // #308 AK1/AK8, spec-370 AK5.5: die Fußleiste führt personenbezogen weiter ins Kassieren –
    // auch dann, wenn diese Seite selbst schon personenbezogen aufgerufen wurde.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-2")));

    const links = kassierenLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/veranstaltung/v-1/kassieren?zeile=z-2");
    const fussleiste = screen.getByRole("navigation", { name: "Weiter" });
    expect(fussleiste).toContainElement(links[0]);
    expect(fussleiste).toContainElement(screen.getByRole("button", { name: "Nächste Person →" }));
  });

  it("should_moveKassierenLinkToTappedPerson_when_otherChipTapped", async () => {
    // #308 AK7: Die Aktion gehört immer zur aktiven Person.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-2")));
    fireEvent.click(chip("Anna"));

    const links = kassierenLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/veranstaltung/v-1/kassieren?zeile=z-1");
  });

  it("should_offerKassierenLinkForFirstPerson_when_noPersonenbezug", async () => {
    // spec-370 AK1a.5/AK5.5: es gibt keinen Zustand „keine Person aktiv" mehr (ADR-054 D2) – ohne
    // Personenbezug ist die erste Person aktiv und bietet ihren Kassieren-Weg an.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1")));

    const links = kassierenLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/veranstaltung/v-1/kassieren?zeile=z-1");
  });

  it("should_activateFirstPerson_when_personenbezugIsUnknown", async () => {
    // F1, spec-370 AK1a.5: Zufallswert / getilgte Zeile / Zeile einer anderen Veranstaltung →
    // erste Person, keine Fehlermeldung, kein notFound, keine Aussage über den unbekannten Wert.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-fremd")));

    expect(aktivePerson()).toBe("Anna");
    expect(kassierenLinks()[0]).toHaveAttribute("href", "/veranstaltung/v-1/kassieren?zeile=z-1");
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/z-fremd/)).not.toBeInTheDocument();
  });

  it("should_keepPersonenbezug_when_pageIsRenderedAgainAfterReload", async () => {
    // #308 AK11: der Personenbezug hängt am Aufruf (Query-Parameter), nicht an flüchtigem Zustand.
    arrangeZweiZeilen();
    const { unmount } = render(await VerzehrPage(seite("v-1", "z-2")));
    unmount();

    arrangeZweiZeilen();
    render(await VerzehrPage(seite("v-1", "z-2")));

    expect(aktivePerson()).toBe("Bernd");
  });

  it("should_keepReadOnlyButOfferWechsel_when_abgeschlossenWithPersonenbezug", async () => {
    // #308 AK10: Lesesicht bleibt Lesesicht – der Wechsel-Link bleibt, weil er reine Navigation ist.
    arrangeZweiZeilen();
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });

    render(await VerzehrPage(seite("v-1", "z-2")));

    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
    expect(kassierenLinks()[0]).toHaveAttribute("href", "/veranstaltung/v-1/kassieren?zeile=z-2");
  });

  it("should_showEmptyHintWithoutError_when_noZeilenButPersonenbezugGiven", async () => {
    // F3: Veranstaltung ohne Teilnehmer – Leer-Hinweis unverändert, kein Fehler.
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage(seite("v-1", "z-1")));

    expect(screen.getByText(/Noch keine Teilnehmer erfasst/)).toBeInTheDocument();
    expect(kassierenLinks()).toHaveLength(0);
  });

  it("should_denyAccess_when_notVeranstalterEvenWithPersonenbezug", async () => {
    // F4: der Personenbezug verschafft keinen Zugang und keine Information.
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await VerzehrPage(seite("v-1", "z-1")));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
    expect(kassierenLinks()).toHaveLength(0);
  });

  it("should_showEmptyHint_when_noZeilen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage(seite("v-1")));

    expect(screen.getByText(/Noch keine Teilnehmer erfasst/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Teilnehmer auswählen" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });
});
