// Gemeinsame Token-Klassen der Kopfzeilen (AppNav, KontoMenue, PublicHeader): eine Quelle, damit
// App- und öffentlicher Header optisch nicht auseinanderdriften (ADR-056).

export const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const headerClass =
  "flex items-center gap-3 border-b border-line-subtle bg-surface px-[max(1rem,env(safe-area-inset-left))] py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm text-foreground";

export const iconButtonClass = `inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-foreground hover:bg-background ${focusClass}`;
