import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const cola: CatalogItem = {
  id: "c-1",
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

// Chip der sticky Auswahl-Leiste (kein aria-expanded; der Karten-Kopf trägt aria-expanded).
function chip(name: string) {
  const button = screen
    .getAllByRole("button", { name: new RegExp(name) })
    .find((candidate) => !candidate.hasAttribute("aria-expanded"));
  if (!button) throw new Error(`Kein Chip für ${name}`);
  return button;
}

// Karten-Kopf (trägt aria-expanded) – zeigt, welche Teilnehmer-Karte geöffnet ist.
function karte(name: string) {
  const head = screen
    .getAllByRole("button", { name: new RegExp(name) })
    .find((candidate) => candidate.hasAttribute("aria-expanded"));
  if (!head) throw new Error(`Kein Karten-Kopf für ${name}`);
  return head;
}

function kassierenLinks() {
  return screen.queryAllByRole("link", { name: /Kassieren/ });
}

// Zwei Teilnehmer (Anna z-1, Bernd z-2) – nötig, um „genau die gemeinte Karte" von „irgendeine"
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
  // jsdom implementiert scrollIntoView nicht; FokusListe ruft es guarded im rAF-Callback auf.
  Element.prototype.scrollIntoView = vi.fn();
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

  it("should_renderCollapsedAccordionWithChipBar_when_veranstalterAndOpen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage(seite("v-1")));

    // Sticky Chip-Leiste wie im Link-Weg, Teilnehmer als Chip sichtbar …
    expect(screen.getByRole("group", { name: "Teilnehmer auswählen" })).toBeInTheDocument();
    expect(chip("Anna")).toBeInTheDocument();
    // … aber initial keine Karte offen → keine MengeControl gerendert.
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
    expect(listPositionenMock).toHaveBeenCalledWith("v-1");
  });

  it("should_openCardEditable_when_chipTappedOnOpenVeranstaltung", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage(seite("v-1")));
    fireEvent.click(chip("Anna"));

    // Offen → editierbar: das Stub spiegelt die editable-Prop wider.
    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "true");
    expect(screen.getByText("Cola · 0,5l · 2,50 €")).toBeInTheDocument();
  });

  it("should_renderReadOnly_when_veranstaltungAbgeschlossen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage(seite("v-1")));
    // Read-only: ebenfalls Akkordeon, initial eingeklappt.
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
    fireEvent.click(chip("Anna"));

    expect(screen.getByTestId("menge")).toHaveAttribute("data-editable", "false");
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
    fireEvent.click(chip("Anna"));

    expect(screen.getByTestId("menge")).toHaveTextContent("3");
  });

  it("should_openReferencedCard_when_personenbezugGiven", async () => {
    // #308 AK1/AK6: der Aufruf trägt den Personenbezug → genau die Karte dieser Person ist offen,
    // ohne Chip-Tipp und ohne Umweg über die Detailseite.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-2")));

    expect(karte("Bernd")).toHaveAttribute("aria-expanded", "true");
    expect(karte("Anna")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByTestId("menge")).toHaveLength(1);
  });

  it("should_offerKassierenLinkForOpenPerson_when_personenbezugGiven", async () => {
    // #308 AK1/AK8: die geöffnete Karte führt personenbezogen weiter ins Kassieren – auch dann,
    // wenn diese Seite selbst schon personenbezogen aufgerufen wurde (Wechsel beliebig oft).
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-2")));

    const links = kassierenLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/veranstaltung/v-1/kassieren?zeile=z-2");
    expect(karte("Bernd").closest("li")).toContainElement(links[0]);
  });

  it("should_moveKassierenLinkToTappedPerson_when_otherChipTapped", async () => {
    // #308 AK7: Die Aktion sitzt immer in der geöffneten Karte – nie in einer eingeklappten.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-2")));
    fireEvent.click(chip("Anna"));

    const links = kassierenLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/veranstaltung/v-1/kassieren?zeile=z-1");
  });

  it("should_showNoKassierenLink_when_noCardIsOpen", async () => {
    // #308 AK7: ohne geöffnete Karte (Aufruf ohne Personenbezug) ist keine Aktion sichtbar.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1")));

    expect(kassierenLinks()).toHaveLength(0);
  });

  it("should_openNoCard_when_personenbezugIsUnknown", async () => {
    // F1: Zufallswert / getilgte Zeile / Zeile einer anderen Veranstaltung → Standardzustand,
    // keine Fehlermeldung, kein notFound, keine Aussage über den unbekannten Wert.
    arrangeZweiZeilen();

    render(await VerzehrPage(seite("v-1", "z-fremd")));

    expect(karte("Anna")).toHaveAttribute("aria-expanded", "false");
    expect(karte("Bernd")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
    expect(kassierenLinks()).toHaveLength(0);
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

    expect(karte("Bernd")).toHaveAttribute("aria-expanded", "true");
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
