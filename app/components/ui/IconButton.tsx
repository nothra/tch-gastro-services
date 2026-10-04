import type { ComponentProps, ReactNode } from "react";
import { BUTTON_BASE_CLASSES } from "./Button";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-056 D2): Schaltfläche, die nur ein Symbol zeigt. Ohne sichtbaren
// Text ist das `label` der einzige zugängliche Name – deshalb Pflicht-Prop statt optionalem
// `aria-label`: eine Symbol-Schaltfläche ohne Namen wird so zum Typfehler.

export type IconButtonTone = "neutral" | "danger";

// Bewusst keine gefüllte Gefahr-Fläche: im Seitenkopf stünde sonst ein roter Block neben dem
// Status, lauter als die eigentliche Arbeit (ADR-056 D2). Der Ton färbt nur das Symbol. Neutral
// hebt beim Hover auf `line-subtle` ab, weil der Seitenkopf selbst auf `background` steht.
const TONE_CLASSES: Record<IconButtonTone, string> = {
  neutral: "text-foreground not-disabled:hover:bg-line-subtle",
  danger: "text-danger not-disabled:hover:bg-danger-subtle",
};

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label" | "title"> & {
  /** Zugänglicher Name und Tooltip – Pflicht, weil kein sichtbarer Text da ist. */
  label: string;
  icon: ReactNode;
  tone?: IconButtonTone;
};

/** Quadratische Symbol-Schaltfläche mit 44 × 44 px Tippfläche (spec-391 AK3). */
export function IconButton({
  label,
  icon,
  tone = "neutral",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={joinClasses(
        BUTTON_BASE_CLASSES,
        "size-11 shrink-0",
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
