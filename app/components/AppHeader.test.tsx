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

  // „Abmelden" steht seit spec-374 im (geschlossenen) Konto-Menü – für die Rollen-Abfrage verborgen.
  it("should_offerSignOutInKontoMenu_when_userLoggedIn", async () => {
    loginWithRoles(["verwalter"]);

    render(await AppHeader());

    expect(screen.getByRole("button", { name: "Konto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abmelden", hidden: true })).toBeInTheDocument();
    expect(screen.getByText(/person@tch\.de/)).toBeInTheDocument();
  });

  it("should_showAngemeldetInKontoMenu_when_emailMissing", async () => {
    // Fehlerszenario „leere E-Mail": bestehender Fallback.
    authMock.mockResolvedValue({
      user: { roles: ["verwalter"] },
      expires: "2099-01-01T00:00:00.000Z",
    } as unknown as Session);

    render(await AppHeader());

    expect(document.getElementById("konto-menue")).toHaveTextContent("Angemeldet");
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
    // spec-373 AK3.4: ohne `verwalter` kein Theke-Eintrag.
    expect(screen.queryByRole("link", { name: "Theke" })).not.toBeInTheDocument();
  });

  it("should_showKatalogTeilnehmerAndTheke_when_roleIsVerwalter", async () => {
    loginWithRoles(["verwalter"]);

    render(await AppHeader());

    expect(screen.getByRole("link", { name: "Katalog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teilnehmer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Theke" })).toHaveAttribute("href", "/verwaltung/theke");
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
    expect(screen.getByRole("button", { name: "Abmelden", hidden: true })).toBeInTheDocument();
  });
});
