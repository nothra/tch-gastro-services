import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, within } from "@testing-library/react";
import type { Session } from "next-auth";
import type { UserRole } from "@/db/schema";
import { auth } from "@/auth";
import { AppHeader } from "@/app/components/AppHeader";
import Home from "@/app/page";

// Beide Ansichten leiten ihre Bereiche aus derselben Menü-Definition ab (ADR-031);
// dieser Test belegt, dass Kopfzeile und Dashboard je Rolle dieselbe Bereichsmenge zeigen.
vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

function loginWithRoles(roles: UserRole[]) {
  authMock.mockResolvedValue({
    user: { email: "person@tch.de", roles },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session);
}

const AREA_HREFS = ["/veranstaltung", "/verwaltung/katalog", "/verwaltung/teilnehmer"];

function areaHrefsWithin(container: HTMLElement): string[] {
  return within(container)
    .queryAllByRole("link")
    .map((link) => link.getAttribute("href"))
    .filter((href): href is string => href !== null && AREA_HREFS.includes(href))
    .sort();
}

describe.each<{ label: string; roles: UserRole[] }>([
  { label: "veranstalter", roles: ["veranstalter"] },
  { label: "verwalter", roles: ["verwalter"] },
  { label: "beide Rollen", roles: ["verwalter", "veranstalter"] },
  { label: "leeres Rollen-Array", roles: [] },
])("Header und Dashboard nutzen dieselbe Definition ($label)", ({ roles }) => {
  // resetAllMocks (nicht clearAllMocks): jeder Test setzt eine eigene authMock-Implementierung
  // (mockResolvedValue) – die muss zwischen Tests zurückgesetzt werden, sonst leakt sie (#51).
  beforeEach(() => vi.resetAllMocks());

  it("should_showIdenticalAreaSet_when_sameRoles", async () => {
    loginWithRoles(roles);
    const header = render(await AppHeader());
    const headerHrefs = areaHrefsWithin(header.container);
    header.unmount();

    loginWithRoles(roles);
    const home = render(await Home());
    const homeHrefs = areaHrefsWithin(home.container);

    expect(headerHrefs).toEqual(homeHrefs);
  });
});
