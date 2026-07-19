import type { UserRole } from "@/db/schema";
import { hasRole } from "@/lib/authz";

// Ein navigierbarer Funktionsbereich der App. "Abmelden" ist bewusst KEIN NavItem
// (eine Aktion, keine Route) und wird separat über die signOutAction gerendert (ADR-031).
export type NavItem = {
  label: string;
  href: string;
  requiredRole: UserRole;
};

// Kanonische Menü-Definition (ADR-031): die einzige Quelle für die Kopfzeilen-Navigation
// UND den Dashboard-Hub. Sichtbarkeit ist Komfort; die eigentliche Durchsetzung bleibt
// in den Routen/Server Actions (requireRole/requireAnyRole, ADR-016).
export const navItems: readonly NavItem[] = [
  { label: "Veranstaltungen", href: "/veranstaltung", requiredRole: "veranstalter" },
  { label: "Katalog", href: "/verwaltung/katalog", requiredRole: "verwalter" },
  { label: "Teilnehmer", href: "/verwaltung/teilnehmer", requiredRole: "verwalter" },
];

// Reine Filterfunktion (mockfrei testbar): nur Einträge, deren Rolle die Session besitzt.
// Unbekannte, leere oder fehlende Rollen ergeben keine Einträge (fail-closed).
export function visibleNavItems(roles: readonly UserRole[] | undefined | null): NavItem[] {
  return navItems.filter((item) => hasRole(roles, item.requiredRole));
}
