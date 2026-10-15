import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Veranstaltung, VeranstaltungZeile } from "@/db/schema";
import type { AuslageRow as AuslageRowData } from "@/db/auslage";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ getVeranstaltung: vi.fn(), listZeilen: vi.fn() }));
vi.mock("@/db/auslage", () => ({ listAuslagen: vi.fn() }));
vi.mock("../../actions", () => ({ createAuslageAction: vi.fn() }));

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Client-Komponenten (eigene Tests) durch Stubs ersetzen, die die relevanten Props spiegeln.
vi.mock("../../AuslageErfassen", () => ({
  AuslageErfassen: ({
    ausloeser,
    teilnehmer,
    imLeerzustand,
  }: {
    ausloeser: string;
    teilnehmer: unknown[];
    imLeerzustand?: boolean;
  }) => (
    <button
      type="button"
      data-testid="auslage-erfassen"
      data-teilnehmer={teilnehmer.length}
      data-leerzustand={String(Boolean(imLeerzustand))}
    >
      {ausloeser}
    </button>
  ),
}));
vi.mock("../../AuslageRow", () => ({
  AuslageRow: ({ auslage, editable }: { auslage: AuslageRowData; editable: boolean }) => (
    <li data-testid="auslage-row" data-editable={editable}>
      {auslage.anzeigename}
    </li>
  ),
}));

import { auth } from "@/auth";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listAuslagen } from "@/db/auslage";
import AuslagenPage from "./page";

const authMock = vi.mocked(auth);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const listZeilenMock = vi.mocked(listZeilen);
const listAuslagenMock = vi.mocked(listAuslagen);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

const aVeranstaltung: Veranstaltung = {
  id: "v-1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  // #346: Pflichtfeld der Entität. Die Auslagen-Ansicht liest es nicht – Auslagen sind
  // katalog-unabhängig (freier Betrag, keine Artikelbindung).
  catalogId: "standard",
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

const aAuslage: AuslageRowData = {
  id: "a-1",
  teilnehmerId: "t-1",
  anzeigename: "Anna",
  kategorie: "essen",
  betragCents: 1250,
  zweck: "Grillfleisch",
  status: "offen",
};

function params(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("AuslagenPage", () => {
  it("should_denyAccess_when_userIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await AuslagenPage({ params: params("v-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });

  it("should_notFound_when_veranstaltungMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(undefined);

    await expect(AuslagenPage({ params: params("v-1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("should_showGlossaryNoAccessText_when_userIsNotVeranstalter", async () => {
    // spec-406 AK6.4 (Q1): „erfassen" statt „erstatten".
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await AuslagenPage({ params: params("v-1") }));

    expect(
      screen.getByText("Kein Zugriff – nur Veranstalter dürfen Auslagen erfassen."),
    ).toHaveClass("text-muted");
  });

  it("should_renderSummaryThenListWithoutForm_when_veranstalterAndOpen", async () => {
    // spec-406 AK1.1: Übersicht über der Liste, kein Erfassen-Formular auf der Seite.
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([aAuslage]);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(listAuslagenMock).toHaveBeenCalledWith("v-1");
    const uebersicht = screen.getByRole("heading", { name: "Übersicht" });
    const liste = screen.getByRole("heading", { name: "Auslagen (1)" });
    expect(uebersicht.compareDocumentPosition(liste)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getAllByText("12,50 €").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("auslage-row")).toHaveAttribute("data-editable", "true");
  });

  it("should_offerNeuInPageHeader_when_open", async () => {
    // spec-406 AK1.2: „+ Neu" rechts im Seitenkopf; Teilnehmer aus den Zeilen abgeleitet.
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([aAuslage]);

    render(await AuslagenPage({ params: params("v-1") }));

    const kopf = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    const neu = within(kopf).getByRole("button", { name: "+ Neu" });
    expect(neu).toHaveAttribute("data-teilnehmer", "1");
    expect(neu).toHaveAttribute("data-leerzustand", "false");
  });

  it("should_offerNoNeuAndMarkRowsReadonly_when_abgeschlossen", async () => {
    // spec-406 F2: nur lesen.
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([aAuslage]);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(screen.queryByTestId("auslage-erfassen")).not.toBeInTheDocument();
    expect(screen.getByTestId("auslage-row")).toHaveAttribute("data-editable", "false");
  });

  it("should_showLeerzustandWithErfassenAction_when_noAuslagenAndOpen", async () => {
    // spec-406 AK1.8: Leerzustand mit „Auslage erfassen", derselbe Dialog (imLeerzustand).
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([]);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(screen.getByText("Noch keine Auslagen erfasst.")).toHaveClass("text-muted");
    expect(screen.getByRole("button", { name: "Auslage erfassen" })).toHaveAttribute(
      "data-leerzustand",
      "true",
    );
    expect(screen.queryByTestId("auslage-row")).not.toBeInTheDocument();
  });

  it("should_showLeerzustandWithoutAction_when_noAuslagenAndAbgeschlossen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([]);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(screen.getByText("Noch keine Auslagen erfasst.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should_keepListHeadingAsFocusTarget_when_rendered", async () => {
    // spec-406 AK4.4: Ersatz-Fokusziel nach dem Löschen bleibt die Listen-Überschrift.
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([aAuslage]);

    render(await AuslagenPage({ params: params("v-1") }));

    const ueberschrift = screen.getByRole("heading", { name: "Auslagen (1)" });
    expect(ueberschrift).toHaveAttribute("id", "auslagen-liste");
    expect(ueberschrift).toHaveAttribute("tabindex", "-1");
  });
});

describe("AuslagenPage – Seitenkopf (spec-374 AK4)", () => {
  function seitenkopf() {
    return screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
  }

  it("should_showBackLinkTitleAndMetaInPageHeader_when_rendered", async () => {
    // AK4.1: Zurück-Link „Zur Veranstaltung", Titel und Meta im `PageHeader`.
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([]);

    render(await AuslagenPage({ params: params("v-1") }));

    const zurueck = within(seitenkopf()).getByRole("link", { name: "Zur Veranstaltung" });
    expect(zurueck).toHaveAttribute("href", "/veranstaltung/v-1");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Auslagen · Montagsrunde Juli",
    );
    expect(seitenkopf()).toHaveTextContent("14.07.2026 · Montagsrunde · offen");
  });
});
