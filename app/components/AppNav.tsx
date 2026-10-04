"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";
import { KontoMenue } from "./KontoMenue";
import { focusClass, headerClass, iconButtonClass } from "./headerStyles";
import { useNavDrawerFocus } from "./useNavDrawerFocus";

type AppNavProps = {
  // Bereits serverseitig gefilterte Einträge (ADR-031): der Client entscheidet keine Rollen.
  items: NavItem[];
  // E-Mail bzw. „Angemeldet" – seit ADR-056 D2 nur noch im Konto-Menü, nicht im Header.
  label: string;
  signOutAction: () => Promise<void>;
};

const linkClass = `flex min-h-11 items-center rounded-md px-3 py-2 font-medium text-foreground hover:bg-background aria-[current=page]:bg-accent-subtle aria-[current=page]:text-accent ${focusClass}`;

// Rollenbewusste Kopfzeile (ADR-031, ADR-056 D2) in einer Zeile: Hamburger (nur schmal) ·
// Wortmarke als Startlink · Desktop-Inline-Links (ohne JS nutzbar, da serverseitig gerendert) ·
// Konto-Menü rechts. Auf schmalen Viewports öffnet der Hamburger einen Off-Canvas-Drawer
// (Toggle/Escape/Fokus nur clientseitig).
export function AppNav({ items, label, signOutAction }: AppNavProps) {
  const { open, openDrawer, closeDrawer, toggleRef, drawerRef } = useNavDrawerFocus();
  const pathname = usePathname();

  // Cosmetic: aktiver Bereich (exakte Route oder Unterroute) → aria-current="page".
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderLink = (item: NavItem, onNavigate?: () => void) => (
    <Link
      key={item.href}
      href={item.href}
      // Kein Auto-Prefetch geschützter Routen: spart die authentifizierte Hintergrund-RSC-Abfrage
      // (Neon-Last) und ist Defense-in-depth zur #164-Absicherung. Die umfassende Garantie liegt
      // zentral in proxy.ts (RSC/Prefetch rotiert die Session nicht → keine Resurrection).
      prefetch={false}
      aria-current={isActive(item.href) ? "page" : undefined}
      onClick={onNavigate}
      className={linkClass}
    >
      {item.label}
    </Link>
  );

  return (
    <header className={headerClass}>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="app-nav-drawer"
        aria-label="Navigation öffnen"
        onClick={openDrawer}
        className={`${iconButtonClass} md:hidden`}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>

      {/* Darf auf 375 px kürzen (`min-w-0 truncate`), Hamburger und Konto-Knopf nie (AK1.6). */}
      <Link
        href="/"
        prefetch={false}
        className={`min-w-0 truncate rounded-md text-base font-semibold text-foreground hover:text-accent ${focusClass}`}
      >
        TCH Gastro Services
      </Link>

      <nav aria-label="Hauptnavigation" className="hidden md:flex md:items-center md:gap-1">
        {items.map((item) => renderLink(item))}
      </nav>

      <div className="ml-auto flex shrink-0">
        <KontoMenue label={label} signOutAction={signOutAction} />
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-overlay md:hidden"
          />
          <div
            id="app-nav-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col gap-1 bg-surface p-4 pl-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] shadow-xl outline-none md:hidden"
          >
            <button
              type="button"
              aria-label="Navigation schließen"
              onClick={closeDrawer}
              className={`${iconButtonClass} mb-2 self-end`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ✕
              </span>
            </button>
            <nav aria-label="Hauptnavigation" className="flex flex-col gap-1">
              {items.map((item) => renderLink(item, closeDrawer))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
