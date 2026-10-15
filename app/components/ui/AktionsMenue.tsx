"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "./Button";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-052 D1, ADR-061 D1): das ⋯-Menü einer Listenzeile. Er trägt den
// Verhaltensvertrag aller Zeilenmenüs an einer Stelle (Lesson #369) – Öffnen/Schließen, Escape,
// Außenklick, Fokus auf den ersten Eintrag und zurück zum Auslöser – und kennt weder Server
// Actions noch Bestätigungsdialoge. Die Einträge liefert der Konsument als Render-Funktion, weil
// ein Eintrag auch ein Formular samt `Notice` sein kann (ADR-061 D3).

export interface MenueSteuerung {
  /** Schließt das Menü und gibt den Fokus an den Auslöser zurück. */
  schliessen: () => void;
}

interface AktionsMenueProps {
  /** Zugänglicher Name von Auslöser und Menü, z. B. „Aktionen für Anna". */
  label: string;
  /**
   * Ref auf den Auslöser – für Konsumenten, deren Bestätigung den Fokus dorthin zurückgibt.
   * Ohne Angabe hält der Baustein einen eigenen.
   */
  ausloeserRef?: RefObject<HTMLButtonElement | null>;
  /** Mountet erst beim Öffnen: jedes Öffnen beginnt ohne den Zustand des letzten. */
  children: (steuerung: MenueSteuerung) => ReactNode;
}

/** ⋯-Auslöser mit Popup-Menü; die Einträge sind `MenueEintrag`e. */
export function AktionsMenue({ label, ausloeserRef, children }: AktionsMenueProps) {
  const [offen, setOffen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const eigenerAusloeserRef = useRef<HTMLButtonElement>(null);
  const triggerRef = ausloeserRef ?? eigenerAusloeserRef;

  // Fokus auf den ersten Eintrag; Außenklick schließt – ein Listener am Dokument ist ein externes
  // System. Der erste Eintrag wird im Popup gesucht, damit der Konsument keine Ref verdrahten muss.
  useEffect(() => {
    if (!offen) return;
    popupRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function schliessenBeiAussenklick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOffen(false);
    }
    document.addEventListener("pointerdown", schliessenBeiAussenklick);
    return () => document.removeEventListener("pointerdown", schliessenBeiAussenklick);
  }, [offen]);

  function schliessen() {
    setOffen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="min-w-11 text-lg"
        aria-haspopup="menu"
        aria-expanded={offen}
        aria-label={label}
        onClick={() => setOffen((bisher) => !bisher)}
      >
        <span aria-hidden="true">⋯</span>
      </Button>

      {offen && (
        <div
          ref={popupRef}
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === "Escape") schliessen();
          }}
          className="absolute right-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-md border border-line-subtle bg-surface p-1 shadow-md"
        >
          <MenueEintraege eintraege={children} steuerung={{ schliessen }} />
        </div>
      )}
    </div>
  );
}

/**
 * Ruft die Render-Funktion als eigene Komponente auf: `schliessen` fasst die Auslöser-Ref an und
 * darf deshalb nicht während des Renderns von `AktionsMenue` übergeben werden (`react-hooks/refs`).
 */
function MenueEintraege({
  eintraege,
  steuerung,
}: {
  eintraege: AktionsMenueProps["children"];
  steuerung: MenueSteuerung;
}) {
  return eintraege(steuerung);
}

const EINTRAG_CLASS =
  "flex min-h-11 w-full items-center rounded px-3 text-left disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent";

type MenueEintragProps = Omit<ComponentProps<"button">, "className" | "role" | "type"> & {
  /** Zerstörende Aktion (z. B. „Löschen") – roter Text statt Vordergrundfarbe. */
  gefahr?: boolean;
  /** `submit`, wenn der Eintrag ein Formular im Popup absendet (ADR-061 D3). */
  type?: "button" | "submit";
};

/** Ein Eintrag im `AktionsMenue`. */
export function MenueEintrag({ gefahr = false, type = "button", ...rest }: MenueEintragProps) {
  return (
    <button
      {...rest}
      type={type}
      role="menuitem"
      className={joinClasses(
        EINTRAG_CLASS,
        gefahr ? "text-danger hover:bg-danger-subtle" : "text-foreground hover:bg-accent-subtle",
      )}
    />
  );
}
