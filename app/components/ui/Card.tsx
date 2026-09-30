import type { ComponentProps } from "react";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1). Der Kartenrand ist rein dekorativ und nutzt deshalb
// `line-subtle`; Rahmen von Bedienelementen nutzen `line` (ADR-052 D2, WCAG 1.4.11).

/** Abgegrenzte Inhaltsfläche – in hell und dunkel, ohne `dark:`-Variante (spec AK2.8). */
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={joinClasses(
        "rounded-lg border border-line-subtle bg-surface p-4 text-foreground",
        className,
      )}
      {...rest}
    />
  );
}
