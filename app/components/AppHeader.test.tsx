import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import type { UserRole } from "@/db/schema";
import { auth } from "@/auth";
import { AppHeader } from "./AppHeader";

// auth() liefert die Session; signOut wird nur beim Klick genutzt (hier nicht ausgelöst).
// auth ist überladen → auf die reine Session-Resolver-Signatur casten.
vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);

// AppNav ist ein Client-Teil (usePathname); die aktive Markierung ist hier irrelevant.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

function loginWithRoles(roles: UserRole[]) {
  authMock.mockResolvedValue({
    user: { email: "person@tch.de", roles },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session);
}

describe("AppHeader", () => {
  // resetAllMocks (nicht clearAllMocks): jeder Test setzt eine eigene authMock-Implementierung
  // (mockResolvedValue) – die muss zwischen Tests zurückgesetzt werden, sonst leakt sie (#51).
  beforeEach(() => vi.resetAllMocks());

  it("should_showSignOutButton_when_userLoggedIn", async () => {
    loginWithRoles(["verwalter"]);

    render(await AppHeader());

    expect(screen.getByRole("button", { name: /Abmelden/i })).toBeInTheDocument();
    expect(screen.getByText(/person@tch\.de/)).toBeInTheDocument();
  });

  it("should_renderNothing_when_visitorNotLoggedIn", async () => {
    authMock.mockResolvedValue(null);

    const { container } = render((await AppHeader()) ?? <></>);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: /Abmelden/i })).not.toBeInTheDocument();
  });

  it("should_showOnlyVeranstaltungen_when_roleIsVeranstalter", async () => {
    loginWithRoles(["veranstalter"]);

    render(await AppHeader());

    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Katalog" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teilnehmer" })).not.toBeInTheDocument();
  });

  it("should_showKatalogAndTeilnehmer_when_roleIsVerwalter", async () => {
    loginWithRoles(["verwalter"]);

    render(await AppHeader());

    expect(screen.getByRole("link", { name: "Katalog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teilnehmer" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Veranstaltungen" })).not.toBeInTheDocument();
  });

  it("should_showAllThreeAreas_when_bothRoles", async () => {
    loginWithRoles(["verwalter", "veranstalter"]);

    render(await AppHeader());

    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Katalog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teilnehmer" })).toBeInTheDocument();
  });

  it("should_showNoAreaLinksButKeepSignOut_when_rolesEmpty", async () => {
    // fail-closed: leeres Rollen-Array → kein Bereichs-Link, aber Abmelden bleibt.
    loginWithRoles([]);

    render(await AppHeader());

    expect(screen.queryByRole("link", { name: "Veranstaltungen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Katalog" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abmelden/i })).toBeInTheDocument();
  });
});
