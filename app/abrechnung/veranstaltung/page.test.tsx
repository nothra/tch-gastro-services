import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Veranstaltung } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ listVeranstaltungen: vi.fn() }));

// Server Actions der eingebetteten Client-Komponenten (VeranstaltungForm, ThekeSetup).
vi.mock("./actions", () => ({
  createVeranstaltungAction: vi.fn(),
  ensureThekeAction: vi.fn(),
}));

// useActionState wird von den eingebetteten Client-Komponenten VeranstaltungForm und
// ThekeSetup benötigt. Mock gibt stabilen Leerzustand zurück – die Formulare selbst
// haben eigene Tests; hier zählt nur die RBAC-/Listen-Logik der Page.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

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

import { useActionState } from "react";
import { auth } from "@/auth";
import { listVeranstaltungen } from "@/db/veranstaltung";
import VeranstaltungenPage from "./page";

const authMock = vi.mocked(auth);
const listVeranstaltungenMock = vi.mocked(listVeranstaltungen);
const useActionStateMock = vi.mocked(useActionState);

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

beforeEach(() => {
  vi.clearAllMocks();
  // Stabiler Leerzustand für alle eingebetteten Client-Formulare.
  useActionStateMock.mockReturnValue([undefined, vi.fn(), false] as never);
});

describe("VeranstaltungenPage", () => {
  it("should_denyAccess_when_userIsNotAbrechner", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await VeranstaltungenPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(listVeranstaltungenMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await VeranstaltungenPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });

  it("should_showHeadingAndEmptyMessage_when_abrechnerWithNoVeranstaltungen", async () => {
    authMock.mockResolvedValue(session(["abrechner"]));
    listVeranstaltungenMock.mockResolvedValue([]);

    render(await VeranstaltungenPage());

    expect(
      screen.getByRole("heading", { name: "Veranstaltungen", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Noch keine Veranstaltung angelegt/)).toBeInTheDocument();
    expect(screen.getByText(/Veranstaltungen \(0\)/)).toBeInTheDocument();
  });

  it("should_showVeranstaltungLinkWithMeta_when_dataAvailable", async () => {
    authMock.mockResolvedValue(session(["abrechner"]));
    listVeranstaltungenMock.mockResolvedValue([aVeranstaltung]);

    render(await VeranstaltungenPage());

    const link = screen.getByRole("link", { name: "Montagsrunde Juli" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/abrechnung/veranstaltung/v-1");
    // Datum in der Metazeile ist eindeutig (getByText wäre für "offen"/"Montagsrunde" ambig,
    // da die eingebetteten Formulare Selects mit denselben Worten rendern).
    expect(screen.getByText(/14\.07\.2026/)).toBeInTheDocument();
  });
});
