import type { ReactNode } from "react";

// Route-neutraler Baustein (ADR-052 D1).

interface LeerzustandProps {
  text: string;
  /** Die Anlege-Aktion unter dem Text (spec-373 AK6). */
  aktion: ReactNode;
}

/** Leere Liste: ein Satz und darunter die Aktion, die sie füllt. */
export function Leerzustand({ text, aktion }: LeerzustandProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted">{text}</p>
      {aktion}
    </div>
  );
}
