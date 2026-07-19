import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import type { UserRole } from "@/db/schema";
import { auth } from "@/auth";
import { AppHeader } from "@/app/components/AppHeader";
import Home from "@/app/page";

// Guard #164: Die prominenten Nav-Links (Kopfzeile + Dashboard-Hub) opten aus dem
// Auto-Prefetch aus – spart die authentifizierte Hintergrund-RSC-Abfrage (Neon-Last) und ist
// Defense-in-depth gegen die Session-Resurrection. Die UMFASSENDE Absicherung für ALLE
// geschützten Links liegt zentral in proxy.ts / lib/prefetch-session (RSC/Prefetch-Requests
// rotieren das Session-Cookie nicht → keine Wiederbelebung nach signOut). Getestet dort.
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
