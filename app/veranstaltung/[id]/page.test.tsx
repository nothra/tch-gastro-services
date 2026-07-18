import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Veranstaltung } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ getVeranstaltung: vi.fn(), listZeilen: vi.fn() }));
vi.mock("@/db/teilnehmer", () => ({ listActiveTeilnehmer: vi.fn() }));

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

// Eingebettete Client-Komponenten sind hier durch leere Stubs ersetzt – sie haben eigene Tests.
// Für die Detailseite zählen RBAC, die Teilnehmerliste und der Verzehr-Link.
vi.mock("../AddTeilnehmerForm", () => ({ AddTeilnehmerForm: () => null }));
vi.mock("../WalkInForm", () => ({ WalkInForm: () => null }));
vi.mock("../StatusToggle", () => ({ StatusToggle: () => null }));
vi.mock("../ZeileRow", () => ({
  ZeileRow: ({ zeile }: { zeile: { anzeigename: string } }) => <li>{zeile.anzeigename}</li>,
}));

import { auth } from "@/auth";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listActiveTeilnehmer } from "@/db/teilnehmer";
import type { VeranstaltungZeile } from "@/db/schema";
import VeranstaltungDetailPage from "./page";

const authMock = vi.mocked(auth);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const listZeilenMock = vi.mocked(listZeilen);
const listActiveTeilnehmerMock = vi.mocked(listActiveTeilnehmer);

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

function params(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("VeranstaltungDetailPage", () => {
  it("should_denyAccess_when_userIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await VeranstaltungDetailPage({ params: params("v-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_notFound_when_veranstaltungMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(undefined);
    listZeilenMock.mockResolvedValue([]);
    listActiveTeilnehmerMock.mockResolvedValue([]);

    await expect(VeranstaltungDetailPage({ params: params("v-1") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("should_linkToVerzehrPage_when_veranstalter", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([]);
    listActiveTeilnehmerMock.mockResolvedValue([]);

    render(await VeranstaltungDetailPage({ params: params("v-1") }));

    const link = screen.getByRole("link", { name: /Verzehr erfassen/ });
    expect(link).toHaveAttribute("href", "/veranstaltung/v-1/verzehr");
  });

  it("should_linkToAuslagenPage_when_veranstalter", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([]);
    listActiveTeilnehmerMock.mockResolvedValue([]);

    render(await VeranstaltungDetailPage({ params: params("v-1") }));

    const link = screen.getByRole("link", { name: /Auslagen erstatten/ });
    expect(link).toHaveAttribute("href", "/veranstaltung/v-1/auslagen");
  });

  it("should_renderZeileRow_when_zeilenPresent", async () => {
    const aZeile: VeranstaltungZeile = {
      id: "z-1",
      veranstaltungId: "v-1",
      teilnehmerId: "t-1",
      anzeigename: "Anna Beispiel",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveTeilnehmerMock.mockResolvedValue([]);

    render(await VeranstaltungDetailPage({ params: params("v-1") }));

    expect(screen.getByText("Anna Beispiel")).toBeInTheDocument();
  });
});
