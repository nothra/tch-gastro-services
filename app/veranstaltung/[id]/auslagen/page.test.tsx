import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
vi.mock("../../AuslageForm", () => ({
  AuslageForm: ({ submitLabel, teilnehmer }: { submitLabel: string; teilnehmer: unknown[] }) => (
    <div data-testid="create-form" data-teilnehmer={teilnehmer.length}>
      {submitLabel}
    </div>
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

  it("should_renderSummaryFormAndRows_when_veranstalterAndOpen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([aAuslage]);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(listAuslagenMock).toHaveBeenCalledWith("v-1");
    // Übersicht (Summe Essen offen = 12,50 €, zusätzlich in der Gesamt-Zeile)
    expect(screen.getByText("Übersicht")).toBeInTheDocument();
    expect(screen.getAllByText("12,50 €").length).toBeGreaterThanOrEqual(1);
    // Erfassungsformular offen → sichtbar, Teilnehmer aus den Zeilen abgeleitet
    const form = screen.getByTestId("create-form");
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute("data-teilnehmer", "1");
    // Zeile editierbar, weil Veranstaltung offen
    expect(screen.getByTestId("auslage-row")).toHaveAttribute("data-editable", "true");
  });

  it("should_hideCreateFormAndMarkRowsReadonly_when_abgeschlossen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue({ ...aVeranstaltung, status: "abgeschlossen" });
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([aAuslage]);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(screen.queryByTestId("create-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("auslage-row")).toHaveAttribute("data-editable", "false");
  });

  it("should_showEmptyHint_when_noAuslagen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listAuslagenMock.mockResolvedValue([]);

    render(await AuslagenPage({ params: params("v-1") }));

    expect(screen.getByText(/Noch keine Auslagen/i)).toBeInTheDocument();
    expect(screen.queryByTestId("auslage-row")).not.toBeInTheDocument();
  });
});
