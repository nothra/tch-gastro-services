import type { ReactNode } from "react";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1).

export type NoticeKind = "erfolg" | "fehler" | "warnung";

interface NoticeStyle {
  role: "status" | "alert";
  /** Sichtbares Zeichen je Art – die Unterscheidung hängt damit nicht allein an der Farbe. */
  glyph: string;
  classes: string;
}

/** Geteilt mit `Toaster`: Erfolg sieht als Toast aus wie als Inline-Meldung (ADR-058 D1). */
export const NOTICE_STYLES: Record<NoticeKind, NoticeStyle> = {
  erfolg: {
    role: "status",
    glyph: "✓",
    classes: "border-success bg-success-subtle text-success",
  },
  fehler: {
    role: "alert",
    glyph: "!",
    classes: "border-danger bg-danger-subtle text-danger",
  },
  // Nicht unterbrechend: eine Warnung (z. B. Duplikat, ADR-022) lässt sich überstimmen und ist
  // keine Ablehnung (ADR-060 D2).
  warnung: {
    role: "status",
    glyph: "⚠",
    classes: "border-warning bg-warning-subtle text-warning",
  },
};

const NOTICE_BASE_CLASSES = "flex items-start gap-2 rounded-md border px-3 py-2 text-sm";

interface NoticeProps {
  kind: NoticeKind;
  /** Layout der Rückmeldung (Abstand, Breite) – nicht für Farben (ADR-052 D1). */
  className?: string;
  children?: ReactNode;
}

/**
 * Rückmeldung an den Nutzer. Erfolg und Warnung werden als `role="status"` angesagt, ein Fehler
 * als `role="alert"` (spec AK2.10, spec-405 AK4.1).
 *
 * Ohne Inhalt entsteht bewusst KEIN Element: ein leerer Live-Bereich würde vom Screenreader
 * beim Einfügen angesagt, obwohl nichts zu melden ist (Fehlerszenario der Spec). Konsumenten
 * können deshalb `{state?.error}` direkt durchreichen, statt selbst zu verzweigen.
 */
export function Notice({ kind, className, children }: NoticeProps) {
  if (!children) return null;

  const { role, glyph, classes } = NOTICE_STYLES[kind];
  return (
    <p role={role} className={joinClasses(NOTICE_BASE_CLASSES, classes, className)}>
      <span aria-hidden="true" className="font-bold">
        {glyph}
      </span>
      <span>{children}</span>
    </p>
  );
}
