import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import type { UserRole, Veranstaltung } from "@/db/schema";
import { auth } from "@/auth";
import { listOffeneVeranstaltungen } from "@/db/veranstaltung";
import Home from "./page";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ listOffeneVeranstaltungen: vi.fn() }));
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
const listOffeneMock = vi.mocked(listOffeneVeranstaltungen);

function loginWithRoles(roles: UserRole[]) {
  authMock.mockResolvedValue({
    user: { email: "person@tch.de", roles },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session);
}

const MONTAGSRUNDE = {
  id: "v-1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde 13.07.",
  datum: new Date("2026-07-13"),
  kasse: "montagsrunde",
  status: "offen",
} as Veranstaltung;

function offeneVeranstaltungenAbschnitt() {
  return screen.queryByRole("region", { name: "Offene Veranstaltungen" });
}

function bereiche() {
  return screen.getByRole("navigation", { name: "Bereiche" });
}

describe("Home (Dashboard-Hub)", () => {
  // resetAllMocks (nicht clearAllMocks): jeder Test setzt eine eigene authMock-Implementierung
  // (mockResolvedValue) – die muss zwischen Tests zurückgesetzt werden, sonst leakt sie (#51).
  beforeEach(() => {
    vi.resetAllMocks();
    listOffeneMock.mockResolvedValue([]);
  });

  it("zeigt den Projekttitel als Überschrift", async () => {
    loginWithRoles(["verwalter"]);
    render(await Home());
    expect(screen.getByRole("heading", { name: /TCH Gastro Services/i })).toBeInTheDocument();
  });

  it("should_showAllTiles_when_bothRoles", async () => {
    loginWithRoles(["verwalter", "veranstalter"]);
    render(await Home());
    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toHaveAttribute(
      "href",
      "/veranstaltung",
    );
    expect(screen.getByRole("link", { name: "Katalog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teilnehmer" })).toBeInTheDocument();
  });

  it("should_showOnlyVeranstalterTile_when_roleIsVeranstalter", async () => {
    loginWithRoles(["veranstalter"]);
    render(await Home());
    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Katalog" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teilnehmer" })).not.toBeInTheDocument();
  });

  it("should_showNoTiles_when_rolesEmpty", async () => {
    loginWithRoles([]);
    render(await Home());
    expect(screen.queryByRole("link", { name: "Veranstaltungen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Katalog" })).not.toBeInTheDocument();
  });
});

describe("Home – offene Veranstaltungen (spec-374 AK2)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listOffeneMock.mockResolvedValue([]);
  });

  it("should_listOffeneVeranstaltungenAboveTiles_when_veranstalterWithOffene", async () => {
    // AK2.1/AK2.5: Liste über den Bereichs-Kacheln, je Zeile ein Link auf die Detailseite.
    loginWithRoles(["veranstalter"]);
    listOffeneMock.mockResolvedValue([MONTAGSRUNDE]);

    render(await Home());

    const abschnitt = offeneVeranstaltungenAbschnitt();
    expect(abschnitt).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Montagsrunde 13\.07\./ })).toHaveAttribute(
      "href",
      "/veranstaltung/v-1",
    );
    expect(abschnitt!.compareDocumentPosition(bereiche())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("should_showEmptyHintAboveTiles_when_veranstalterWithoutOffene", async () => {
    // AK2.3/AK2.5: Leer-Hinweis mit Button, die Kacheln folgen darunter.
    loginWithRoles(["veranstalter"]);

    render(await Home());

    expect(screen.getByRole("link", { name: "Veranstaltung anlegen" })).toHaveAttribute(
      "href",
      "/veranstaltung",
    );
    expect(offeneVeranstaltungenAbschnitt()!.compareDocumentPosition(bereiche())).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("should_neitherLoadNorShowOffene_when_userIsOnlyVerwalter", async () => {
    // AK2.4: ohne Rolle `veranstalter` wird nichts geladen und nichts angezeigt.
    loginWithRoles(["verwalter"]);

    render(await Home());

    expect(listOffeneMock).not.toHaveBeenCalled();
    expect(offeneVeranstaltungenAbschnitt()).not.toBeInTheDocument();
  });

  it("should_neitherLoadNorShowOffene_when_noSession", async () => {
    authMock.mockResolvedValue(null);

    render(await Home());

    expect(listOffeneMock).not.toHaveBeenCalled();
    expect(offeneVeranstaltungenAbschnitt()).not.toBeInTheDocument();
  });

  it("should_loadOffeneOnce_when_veranstalter", async () => {
    loginWithRoles(["verwalter", "veranstalter"]);

    render(await Home());

    expect(listOffeneMock).toHaveBeenCalledTimes(1);
  });

  it("should_showErrorHintAndKeepTiles_when_loadingOffeneFails", async () => {
    // Fehlerszenario: DB-Fehler → Hinweis + Kacheln statt Seitenabsturz.
    loginWithRoles(["veranstalter"]);
    listOffeneMock.mockRejectedValue(new Error("db down"));

    render(await Home());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Veranstaltungen konnten nicht geladen werden",
    );
    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Veranstaltung anlegen" })).not.toBeInTheDocument();
  });
});
