import type { ReactNode } from "react";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1).

export const BADGE_TONES = ["neutral", "akzent", "erfolg", "warnung", "gefahr"] as const;

export type BadgeTone = (typeof BADGE_TONES)[number];

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-line-subtle bg-background text-muted",
  akzent: "border-accent bg-accent-subtle text-accent",
  erfolg: "border-success bg-success-subtle text-success",
  warnung: "border-warning bg-warning-subtle text-warning",
  gefahr: "border-danger bg-danger-subtle text-danger",
};

const BASE_CLASSES = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

interface BadgeProps {
  tone?: BadgeTone;
  /** Layout des Badges (Abstand, Ausrichtung) – nicht für Farben (ADR-052 D1). */
  className?: string;
  /**
   * Der Status als Text. Pflicht, weil die Information nie allein über die Farbe transportiert
   * werden darf (spec AK2.9).
   */
  children: ReactNode;
}

/** Status-Kennzeichnung: Ton an der Farbe erkennbar, Status zusätzlich als Text. */
export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span className={joinClasses(BASE_CLASSES, TONE_CLASSES[tone], className)}>{children}</span>
  );
}
