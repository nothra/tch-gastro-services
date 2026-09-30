"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

// Route-neutraler Baustein (ADR-052 D1). `"use client"`, weil `useId` ein Hook ist und die
// Label-/Hinweis-Verknüpfung ohne übergebene `id` eine generierte, kollisionsfreie braucht.

/** Der eine Klassenstring für Eingabe-Steuerelemente – kein Copy-Paste mehr je Formular. */
const CONTROL_CLASSES = [
  "min-h-11 w-full rounded-md border bg-surface px-3 py-2 text-foreground",
  "placeholder:text-muted",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
].join(" ");

interface FieldLabelling {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  /** Layout des Feld-Blocks (Breite, Spalten) – nicht für Farben (ADR-052 D1). */
  className?: string;
}

/** Die Attribute, die das Steuerelement von der Hülle bekommt. */
interface ControlBinding {
  id: string;
  className: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FieldShellProps extends FieldLabelling {
  children: (control: ControlBinding) => ReactNode;
}

/**
 * Label + Steuerelement + Hinweis/Fehler. Verknüpft alle drei über `id` und
 * `aria-describedby` (spec AK2.5) und markiert nur im Fehlerfall `aria-invalid` (AK2.6).
 */
function FieldShell({ label, id, hint, error, className, children }: FieldShellProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={["flex flex-col gap-1", className].filter(Boolean).join(" ")}>
      <label htmlFor={controlId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children({
        id: controlId,
        className: `${CONTROL_CLASSES} ${error ? "border-danger" : "border-line"}`,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type FieldProps = Omit<ComponentProps<"input">, "id" | "className"> & FieldLabelling;

/** Text-, Passwort- oder Zahlenfeld. Native Attribute werden unverändert durchgereicht. */
export function Field({ label, id, hint, error, className, ...inputProps }: FieldProps) {
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} className={className}>
      {(control) => <input {...inputProps} {...control} />}
    </FieldShell>
  );
}

type SelectFieldProps = Omit<ComponentProps<"select">, "id" | "className"> & FieldLabelling;

/** Auswahlfeld. Die `<option>`s kommen als Kinder. */
export function SelectField({
  label,
  id,
  hint,
  error,
  className,
  children,
  ...selectProps
}: SelectFieldProps) {
  return (
    <FieldShell label={label} id={id} hint={hint} error={error} className={className}>
      {(control) => (
        <select {...selectProps} {...control}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}
