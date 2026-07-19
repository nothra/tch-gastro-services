import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import type { UserRole } from "@/db/schema";
import { auth } from "@/auth";
import { AppHeader } from "@/app/components/AppHeader";
import Home from "@/app/page";

// Regressionsschutz #164: Nav-Links zu geschützten Routen dürfen NICHT automatisch
// geprefetcht werden. Auto-Prefetch feuert authentifizierte RSC-Requests, deren Antworten
// das Auth.js-JWT-Session-Cookie rotieren (Rolling Session). Beim Abmelden landen solche
// noch fliegenden Prefetch-Antworten nach dem signOut-Clear und setzen das Cookie neu →
// die Session wird wiederbelebt, das Logout "hält nicht" (flaky, Deploy-Gate INT).
// prefetch={false} entfernt diese Race-Quelle.
vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

// Transparenter next/link-Mock: spiegelt den prefetch-Prop als data-prefetch, damit die
// Prefetch-Entscheidung testbar ist (das echte <Link> rendert prefetch nicht ins DOM).
vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

const AREA_HREFS = ["/veranstaltung", "/verwaltung/katalog", "/verwaltung/teilnehmer"];

function loginWithRoles(roles: UserRole[]) {
  authMock.mockResolvedValue({
    user: { email: "person@tch.de", roles },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session);
}

function areaLinks(container: HTMLElement): HTMLAnchorElement[] {
  return within(container)
    .queryAllByRole("link")
    .filter((link): link is HTMLAnchorElement =>
      AREA_HREFS.includes(link.getAttribute("href") ?? ""),
    );
}

describe("Geschützte Nav-Links werden nicht geprefetcht (#164)", () => {
  // resetAllMocks (nicht clearAllMocks): jeder Test setzt eine eigene authMock-Implementierung (#51).
  beforeEach(() => vi.resetAllMocks());

  it("should_disablePrefetch_when_headerRendersAreaLinks", async () => {
    loginWithRoles(["verwalter", "veranstalter"]);
    const links = areaLinks(render(await AppHeader()).container);
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("data-prefetch", "false"));
  });

  it("should_disablePrefetch_when_dashboardRendersAreaLinks", async () => {
    loginWithRoles(["verwalter", "veranstalter"]);
    const links = areaLinks(render(await Home()).container);
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("data-prefetch", "false"));
  });
});
