import { describe, it, expect, vi } from "vitest";
import { navItems, visibleNavItems } from "./navigation";
import type { UserRole } from "@/db/schema";

// navigation.ts nutzt hasRole aus lib/authz, das transitiv @/auth (next-auth) lädt.
// visibleNavItems selbst ist rein – die Session-Abhängigkeit wird nur gemockt, damit
// next-auth im Node-Test nicht geladen wird (analog authz.test.ts).
vi.mock("@/auth", () => ({ auth: vi.fn() }));

describe("visibleNavItems", () => {
  it("should_showOnlyVeranstaltungen_when_roleIsVeranstalter", () => {
    const hrefs = visibleNavItems(["veranstalter"]).map((item) => item.href);
    expect(hrefs).toEqual(["/veranstaltung"]);
  });

  it("should_showKatalogAndTeilnehmer_when_roleIsVerwalter", () => {
    const hrefs = visibleNavItems(["verwalter"]).map((item) => item.href);
    expect(hrefs).toEqual(["/verwaltung/katalog", "/verwaltung/teilnehmer"]);
  });

  it("should_showAllThreeAreas_when_bothRoles", () => {
    const hrefs = visibleNavItems(["verwalter", "veranstalter"]).map((item) => item.href);
    expect(hrefs).toEqual(["/veranstaltung", "/verwaltung/katalog", "/verwaltung/teilnehmer"]);
  });

  it("should_showNoAreas_when_rolesEmpty", () => {
    // fail-closed: leeres Rollen-Array → kein Bereichs-Eintrag.
    expect(visibleNavItems([])).toEqual([]);
  });

  it("should_showNoAreas_when_rolesUndefinedOrNull", () => {
    expect(visibleNavItems(undefined)).toEqual([]);
    expect(visibleNavItems(null)).toEqual([]);
  });

  it("should_showNoAreas_when_roleIsUnknownOrLegacy", () => {
    // Unbekannte/zukünftige oder Legacy-Rolle (z. B. 'abrechner' vor ADR-024) darf keinen
    // Eintrag ergeben (fail-closed, kein Absturz).
    expect(visibleNavItems(["abrechner" as unknown as UserRole])).toEqual([]);
  });

  it("should_haveConsistentRequiredRoleAndHref_forEachItem", () => {
    // Kanonische Definition: jeder Eintrag trägt Label, Route und genau eine Rolle.
    expect(navItems).toEqual([
      { label: "Veranstaltungen", href: "/veranstaltung", requiredRole: "veranstalter" },
      { label: "Katalog", href: "/verwaltung/katalog", requiredRole: "verwalter" },
      { label: "Teilnehmer", href: "/verwaltung/teilnehmer", requiredRole: "verwalter" },
    ]);
  });
});
