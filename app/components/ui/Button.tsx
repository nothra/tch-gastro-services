import Link from "next/link";
import type { ComponentProps } from "react";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1): keine Feature-Imports, kein Auth-/DB-Wissen.
// Farben ausschließlich über die semantischen Tokens aus `app/globals.css`.

export const BUTTON_VARIANTS = ["primary", "secondary", "danger", "ghost"] as const;
export const BUTTON_SIZES = ["md", "sm"] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonSize = (typeof BUTTON_SIZES)[number];

// Hover nur, solange nicht deaktiviert (spec AK2.2). `not-disabled:` statt `enabled:`, weil
// `:enabled` auf dem `<a>` von `ButtonLink` nie zutrifft und dort den Hover abschalten würde.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent not-disabled:hover:bg-accent-hover",
  secondary: "border border-line bg-surface text-foreground not-disabled:hover:bg-background",
  danger: "bg-danger text-on-danger not-disabled:hover:bg-danger-hover",
  ghost: "text-accent not-disabled:hover:bg-accent-subtle",
};

// Beide Größen halten die Touch-Mindesthöhe von 44 px (spec AK2.1); sie unterscheiden sich
// nur in Innenabstand und Schriftgröße.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-base",
  sm: "min-h-11 px-3 text-sm",
};

/** Form, Fokus und Disabled-Optik – geteilt mit `IconButton` statt kopiert (ADR-055 D2). */
export const BUTTON_BASE_CLASSES = [
  "inline-flex items-center justify-center gap-2 rounded-md font-medium",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Der eine Klassenstring für Button-Optik – geteilt von `Button` und `ButtonLink`, damit ein
 * navigierender Button semantisch ein Link bleiben kann (spec AK2.3), ohne dass eine zweite
 * Kopie der Klassen entsteht. `className` ist für Layout gedacht (Abstand, Breite), nicht für
 * Farben (ADR-052 D1).
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps = {}): string {
  return joinClasses(BUTTON_BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}

type ButtonProps = ComponentProps<"button"> & ButtonStyleProps;

/**
 * Standard-Button. Ohne `type` ist er bewusst `"button"` – ein Absenden-Button muss
 * `type="submit"` explizit tragen (spec AK2.4).
 */
export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps;

/** Navigation im Button-Stil – semantisch ein Link (spec AK2.3). */
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...rest} />;
}
