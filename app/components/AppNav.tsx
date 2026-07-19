"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/navigation";
import { useNavDrawerFocus } from "./useNavDrawerFocus";

type AppNavProps = {
  // Bereits serverseitig gefilterte Einträge (ADR-031): der Client entscheidet keine Rollen.
  items: NavItem[];
  label: string;
  signOutAction: () => Promise<void>;
};

const linkClass =
  "flex min-h-[44px] items-center rounded px-3 py-2 font-medium text-zinc-700 hover:bg-zinc-100 aria-[current=page]:bg-zinc-100 aria-[current=page]:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:aria-[current=page]:bg-zinc-800 dark:aria-[current=page]:text-zinc-50";

// Rollenbewusste Kopfzeilen-Navigation (ADR-031): Desktop-Inline-Links (ohne JS nutzbar,
// da serverseitig gerendert) + "Abmelden" als Form-Action; auf schmalen Viewports ein
// Off-Canvas-Drawer über den Hamburger-Button (Toggle/Escape/Fokus nur clientseitig).
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
    <header className="flex items-center gap-3 border-b border-zinc-200 px-[max(1rem,env(safe-area-inset-left))] py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm dark:border-zinc-800">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="app-nav-drawer"
        aria-label="Navigation öffnen"
        onClick={openDrawer}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 md:hidden dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>

      <nav aria-label="Hauptnavigation" className="hidden md:flex md:items-center md:gap-1">
        {items.map((item) => renderLink(item))}
      </nav>

      <span className="ml-auto truncate text-zinc-600 dark:text-zinc-400">{label}</span>

      <form action={signOutAction}>
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center rounded border border-zinc-300 px-3 py-1 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Abmelden
        </button>
      </form>

      {open && (
        <>
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
          />
          <div
            id="app-nav-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col gap-1 bg-white p-4 pl-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] shadow-xl outline-none md:hidden dark:bg-zinc-900"
          >
            <button
              type="button"
              aria-label="Navigation schließen"
              onClick={closeDrawer}
              className="mb-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center self-end rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
