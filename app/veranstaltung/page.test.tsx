import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Catalog, Veranstaltung } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ listVeranstaltungen: vi.fn() }));
vi.mock("@/db/catalog", () => ({ listCatalogs: vi.fn() }));

// Server Action des eingebetteten Anlege-Dialogs.
vi.mock("./actions", () => ({ createVeranstaltungAction: vi.fn() }));

// next/link rendert im App-Router-Kontext; in JSDOM ohne Router als einfaches Anchor-Element.
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

import { auth } from "@/auth";
import { listVeranstaltungen } from "@/db/veranstaltung";
import { listCatalogs } from "@/db/catalog";
import VeranstaltungenPage from "./page";

const authMock = vi.mocked(auth);
const listVeranstaltungenMock = vi.mocked(listVeranstaltungen);
const listCatalogsMock = vi.mocked(listCatalogs);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

function veranstaltung(overrides: Partial<Veranstaltung>): Veranstaltung {
  return {
    id: "v-1",
    typ: "veranstaltung",
    bezeichnung: "Montagsrunde Juli",
    datum: new Date("2026-07-14"),
    kasse: "montagsrunde",
    catalogId: "standard",
    status: "offen",
    token: "abc123",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

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

const standardKatalog = katalog("standard", "Montagsrunde");
const aktiverKatalog = katalog("kat-b", "Dorfmeisterschaften");
const inaktiverKatalog = katalog("kat-alt", "Sommerfest 2024", false);

beforeEach(() => {
  vi.resetAllMocks();
  listCatalogsMock.mockResolvedValue([standardKatalog, aktiverKatalog, inaktiverKatalog]);
  listVeranstaltungenMock.mockResolvedValue([]);
});

async function renderAlsVeranstalter() {
  authMock.mockResolvedValue(session(["veranstalter"]));
  render(await VeranstaltungenPage());
}

function seitenkopf() {
  return screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
}

function abschnitt(name: RegExp) {
  return screen.getByRole("region", { name });
}

describe("VeranstaltungenPage – Zugriff (AK1.6)", () => {
  it("should_denyAccessWithoutNeuButton_when_userIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await VeranstaltungenPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Neu" })).not.toBeInTheDocument();
    expect(listVeranstaltungenMock).not.toHaveBeenCalled();
    expect(listCatalogsMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await VeranstaltungenPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });
});

describe("VeranstaltungenPage – Seitenkopf (AK1.1, AK3.1)", () => {
  it("should_showNeuButtonInHeaderWithoutBackLink_when_veranstalter", async () => {
    // spec-374 AK4.2: Top-Level-Bereich – Seitenkopf ohne Zurück-Link.
    await renderAlsVeranstalter();

    const kopf = seitenkopf();
    expect(within(kopf).getByRole("heading", { name: "Veranstaltungen" })).toBeInTheDocument();
    expect(within(kopf).getByRole("button", { name: "+ Neu" })).toBeInTheDocument();
    expect(within(kopf).queryByRole("link")).not.toBeInTheDocument();
  });

  it("should_notRenderAnlegeFormular_when_loaded", async () => {
    await renderAlsVeranstalter();

    expect(screen.queryByLabelText("Bezeichnung")).not.toBeInTheDocument();
  });

  it("should_notMentionStehendeTheke_when_rendered", async () => {
    // AK3.1: die Theke zieht nach /verwaltung/theke um.
    listVeranstaltungenMock.mockResolvedValue([veranstaltung({})]);
    await renderAlsVeranstalter();

    expect(screen.queryByText(/Stehende Theke/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Einrichten" })).not.toBeInTheDocument();
  });

  it("should_offerOnlyActiveKatalogeInDialog_when_opened", async () => {
    // #346 AK6: ein deaktivierter Katalog ist nicht neu wählbar.
    await renderAlsVeranstalter();

    fireEvent.click(within(seitenkopf()).getByRole("button", { name: "+ Neu" }));

    const select = screen.getByLabelText("Katalog");
    expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Montagsrunde",
      "Dorfmeisterschaften",
    ]);
  });
});

describe("VeranstaltungenPage – Gruppen (AK2)", () => {
  const offenNeu = veranstaltung({ id: "o-1", bezeichnung: "Montagsrunde Oktober" });
  const offenAlt = veranstaltung({ id: "o-2", bezeichnung: "Montagsrunde September" });
  const abgeschlossen = veranstaltung({
    id: "a-1",
    bezeichnung: "Montagsrunde August",
    status: "abgeschlossen",
  });

  it("should_listOffenBeforeAbgeschlossenWithCounts_when_bothExist", async () => {
    // AK2.1 – die Liste kommt gemischt aus `listVeranstaltungen`; die Seite gruppiert nur.
    listVeranstaltungenMock.mockResolvedValue([offenNeu, abgeschlossen, offenAlt]);
    await renderAlsVeranstalter();

    const ueberschriften = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(ueberschriften).toEqual(["Offen (2)", "Abgeschlossen (1)"]);
  });

  it("should_keepOrderFromListVeranstaltungen_when_grouped", async () => {
    // AK2.3: keine neue Sortierlogik.
    listVeranstaltungenMock.mockResolvedValue([offenNeu, abgeschlossen, offenAlt]);
    await renderAlsVeranstalter();

    const links = within(abschnitt(/^Offen/)).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/veranstaltung/o-1",
      "/veranstaltung/o-2",
    ]);
  });

  it("should_collapseAbgeschlossenWithAllEntries_when_loaded", async () => {
    // AK2.2: eingeklappt, per Tipp/Tastatur aufklappbar (natives <details>/<summary>), alle drin.
    const weitere = veranstaltung({ id: "a-2", bezeichnung: "Grillfest", status: "abgeschlossen" });
    listVeranstaltungenMock.mockResolvedValue([offenNeu, abgeschlossen, weitere]);
    await renderAlsVeranstalter();

    const details = abschnitt(/^Abgeschlossen/).querySelector("details") as HTMLDetailsElement;
    expect(details).not.toHaveAttribute("open");
    expect(details.querySelector("summary")).toHaveTextContent("Abgeschlossen (2)");
    const links = within(details).getAllByRole("link", { hidden: true });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/veranstaltung/a-1",
      "/veranstaltung/a-2",
    ]);
  });

  it("should_renderBothGroupsAsAufklapperWithOffenExpanded_when_bothExist", async () => {
    // spec-403 AK3.1/AK3.2: beide Gruppen sind Aufklapper (Pfeil + Hinweis), „Offen" auf.
    listVeranstaltungenMock.mockResolvedValue([offenNeu, abgeschlossen]);
    await renderAlsVeranstalter();

    const offenDetails = abschnitt(/^Offen/).querySelector("details")!;
    const abgeschlossenDetails = abschnitt(/^Abgeschlossen/).querySelector("details")!;
    expect(offenDetails).toHaveAttribute("open");
    expect(abgeschlossenDetails).not.toHaveAttribute("open");
    for (const details of [offenDetails, abgeschlossenDetails]) {
      const summary = details.querySelector("summary")!;
      expect(summary.querySelector("svg")).not.toBeNull();
      expect(summary).toHaveTextContent("Anzeigen");
    }
  });

  it("should_dimAbgeschlosseneRowsWithBadge_when_rendered", async () => {
    // spec-403 AK3.3: verblasst + Badge „abgeschlossen"; offene Zeilen ohne beides.
    listVeranstaltungenMock.mockResolvedValue([offenNeu, abgeschlossen]);
    await renderAlsVeranstalter();

    const abgeschlosseneZeile = within(abschnitt(/^Abgeschlossen/)).getByRole("listitem", {
      hidden: true,
    });
    expect(within(abgeschlosseneZeile).getByText("abgeschlossen")).toBeInTheDocument();
    expect(abgeschlosseneZeile.querySelector(".opacity-60")).not.toBeNull();

    const offeneZeile = within(abschnitt(/^Offen/)).getByRole("listitem");
    expect(offeneZeile).not.toHaveTextContent("abgeschlossen");
    expect(offeneZeile.querySelector(".opacity-60")).toBeNull();
  });

  it("should_useListenZeileCardStyle_when_rowsRendered", async () => {
    // spec-403 AK4.4: einheitliche Karten-Optik aus dem Baustein, kein eigenes Zeilen-Styling.
    listVeranstaltungenMock.mockResolvedValue([offenNeu]);
    await renderAlsVeranstalter();

    expect(within(abschnitt(/^Offen/)).getByRole("listitem")).toHaveClass(
      "border-line-subtle",
      "bg-surface",
      "hover:bg-accent-subtle",
    );
  });

  it("should_showOffenEmptyStateWithAnlegenAndKeepAbgeschlossen_when_noOpenVeranstaltung", async () => {
    // AK2.4
    listVeranstaltungenMock.mockResolvedValue([abgeschlossen]);
    await renderAlsVeranstalter();

    const offen = abschnitt(/^Offen/);
    expect(within(offen).getByRole("heading", { name: "Offen (0)" })).toBeInTheDocument();
    // spec-403 AK3.4: der Leerzustand steht im aufgeklappten Aufklapper.
    expect(offen.querySelector("details")).toHaveAttribute("open");
    expect(offen.querySelector("details")).toContainElement(
      within(offen).getByText(/Keine offene Veranstaltung/),
    );
    fireEvent.click(within(offen).getByRole("button", { name: "Veranstaltung anlegen" }));
    expect(screen.getByRole("dialog", { name: "Veranstaltung anlegen" })).toBeInTheDocument();
    expect(abschnitt(/^Abgeschlossen/)).toBeInTheDocument();
  });

  it("should_omitAbgeschlossenSection_when_noneClosed", async () => {
    listVeranstaltungenMock.mockResolvedValue([offenNeu]);
    await renderAlsVeranstalter();

    expect(screen.queryByRole("region", { name: /^Abgeschlossen/ })).not.toBeInTheDocument();
  });

  it("should_showEmptyStateWithAnlegenButton_when_noVeranstaltungAtAll", async () => {
    // AK6.1: Hinweistext und ein Button, der den Anlege-Dialog öffnet – keine leeren Gruppen.
    await renderAlsVeranstalter();

    expect(screen.getByText(/Noch keine Veranstaltung angelegt/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Veranstaltung anlegen" }));
    expect(screen.getByRole("dialog", { name: "Veranstaltung anlegen" })).toBeInTheDocument();
  });
});

describe("VeranstaltungenPage – Zeile (AK7)", () => {
  // Die ganze Zeile ist der Link (wie der Schnellzugriff der Startseite, #374) – ihr zugänglicher
  // Name beginnt mit der Bezeichnung und enthält die Metazeile.
  function zeile(bezeichnung: string) {
    return screen.getByRole("link", { name: new RegExp(`^${bezeichnung}`) });
  }

  it("should_showLinkDatumKatalogAndKasseWithoutStatus_when_rendered", async () => {
    // AK7.1
    listVeranstaltungenMock.mockResolvedValue([
      veranstaltung({ catalogId: "kat-b", kasse: "vereinskasse" }),
    ]);
    await renderAlsVeranstalter();

    const inhalt = zeile("Montagsrunde Juli");
    expect(inhalt).toHaveAttribute("href", "/veranstaltung/v-1");
    expect(inhalt).toHaveTextContent("14.07.2026");
    expect(inhalt).toHaveTextContent("Dorfmeisterschaften");
    expect(inhalt).toHaveTextContent("Vereinskasse");
    expect(inhalt).not.toHaveTextContent(/offen/i);
  });

  it("should_distinguishSameBezeichnungByKatalog_when_listed", async () => {
    // AK7.2
    listVeranstaltungenMock.mockResolvedValue([
      veranstaltung({ id: "v-1", catalogId: "standard" }),
      veranstaltung({ id: "v-2", catalogId: "kat-b" }),
    ]);
    await renderAlsVeranstalter();

    const zeilen = within(abschnitt(/^Offen/)).getAllByRole("listitem");
    // Kasse und Standard-Katalog heißen beide „Montagsrunde" – unterschieden wird an der Zeile,
    // die den anderen Katalog trägt.
    expect(zeilen[0]).not.toHaveTextContent("Dorfmeisterschaften");
    expect(zeilen[1]).toHaveTextContent("Dorfmeisterschaften");
  });

  it("should_showNameOfInactiveKatalog_when_katalogDeactivated", async () => {
    // AK7.3, erste Hälfte: deaktiviert, aber auflösbar → Name.
    listVeranstaltungenMock.mockResolvedValue([veranstaltung({ catalogId: "kat-alt" })]);
    await renderAlsVeranstalter();

    expect(zeile("Montagsrunde Juli")).toHaveTextContent("Sommerfest 2024");
  });

  it("should_showNeutralPlaceholder_when_katalogNotResolvable", async () => {
    // AK7.3, zweite Hälfte: kein Absturz, neutraler Platzhalter.
    listVeranstaltungenMock.mockResolvedValue([veranstaltung({ catalogId: "verschwunden" })]);
    await renderAlsVeranstalter();

    expect(zeile("Montagsrunde Juli")).toHaveTextContent("Katalog unbekannt");
  });
});
