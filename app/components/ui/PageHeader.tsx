import Link from "next/link";
import type { ReactNode } from "react";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1). Die Größe des Titels kommt aus der Typo-Skala in
// `globals.css` (@layer base), nicht aus einer Utility-Klasse hier.

interface BackLink {
  href: string;
  label: string;
}

interface PageHeaderProps {
  title: string;
  back?: BackLink;
  meta?: ReactNode;
  action?: ReactNode;
  /** Layout des Seitenkopfs (Abstand zum Inhalt) – nicht für Farben (ADR-052 D1). */
  className?: string;
}

/** Seitenkopf: Titel als `h1`, Zurück-Link, Meta-Zeile und Aktion je optional (spec AK2.11). */
export function PageHeader({ title, back, meta, action, className }: PageHeaderProps) {
  return (
    <header className={joinClasses("flex flex-col gap-2", className)}>
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* Der Pfeil ist Dekoration – der zugängliche Name bleibt allein das Label. */}
          <span aria-hidden="true">←</span>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {/* `min-w-0` + `break-words`: sehr lange Titel brechen bei 375 px um, statt die
              Aktion aus dem Bild zu schieben (Fehlerszenario der Spec). */}
          <h1 className="min-w-0 break-words">{title}</h1>
          {meta && <div className="text-sm text-muted">{meta}</div>}
        </div>
        {/* `max-w-full`: unter den Titel umgebrochen, darf die Aktion nicht breiter als die Zeile
            werden – sonst kann eine `flex-wrap`-Aktionsgruppe nie umbrechen (spec-391 AK16). */}
        {action && <div className="max-w-full shrink-0">{action}</div>}
      </div>
    </header>
  );
}
