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

function params(id: string) {
  return Promise.resolve({ id });
}

// Chip der sticky Auswahl-Leiste (kein aria-expanded; der Karten-Kopf trägt aria-expanded).
function chip(name: string) {
  const button = screen
    .getAllByRole("button", { name: new RegExp(name) })
    .find((candidate) => !candidate.hasAttribute("aria-expanded"));
  if (!button) throw new Error(`Kein Chip für ${name}`);
  return button;
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

    render(await VerzehrPage({ params: params("v-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await VerzehrPage({ params: params("v-1") }));

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });

  it("should_notFound_when_veranstaltungMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(undefined);

    await expect(VerzehrPage({ params: params("v-1") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("should_renderCollapsedAccordionWithChipBar_when_veranstalterAndOpen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([aZeile]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage({ params: params("v-1") }));

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

    render(await VerzehrPage({ params: params("v-1") }));
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

    render(await VerzehrPage({ params: params("v-1") }));
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

    render(await VerzehrPage({ params: params("v-1") }));
    fireEvent.click(chip("Anna"));

    expect(screen.getByTestId("menge")).toHaveTextContent("3");
  });

  it("should_showEmptyHint_when_noZeilen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(aVeranstaltung);
    listZeilenMock.mockResolvedValue([]);
    listActiveCatalogMock.mockResolvedValue([cola]);
    listPositionenMock.mockResolvedValue([]);

    render(await VerzehrPage({ params: params("v-1") }));

    expect(screen.getByText(/Noch keine Teilnehmer erfasst/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Teilnehmer auswählen" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });
});
