"use client";

import {
  createContext,
  useContext,
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
// Außenklick, Sperre während eines Laufs, Fokus auf den ersten Eintrag und zurück zum Auslöser –
// und kennt weder Server Actions noch Bestätigungsdialoge. Die Einträge liefert der Konsument als
// Render-Funktion, weil ein Eintrag auch ein Formular samt `Notice` sein kann (ADR-061 D3).

export interface MenueSteuerung {
  /** Schließt das Menü und gibt den Fokus an den Auslöser zurück. */
  schliessen: () => void;
  /**
   * Meldet Start und Ende einer Action im Popup (`onLaeuftChange`). Solange sie läuft, schließen
   * Außenklick, Escape und Auslöser nicht, und alle `MenueEintrag`e sind gesperrt – sonst hinge
   * das Formular aus und eine Ablehnung verpuffte stumm (spec-406 AK3.4). `schliessen` selbst
   * sperrt nicht, damit der Erfolg der Action das Menü schließen kann; ein anderer Weg darf es
   * während des Laufs nicht rufen.
   */
  meldeLauf: (laeuft: boolean) => void;
}

// Trägt die Sperre an jeden `MenueEintrag`, ohne dass der Konsument `disabled` verdrahten muss.
const LaufKontext = createContext(false);

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
  const [laeuft, setLaeuft] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const eigenerAusloeserRef = useRef<HTMLButtonElement>(null);
  const triggerRef = ausloeserRef ?? eigenerAusloeserRef;

  // Fokus auf den ersten Eintrag – nur beim Öffnen. Der erste Eintrag wird im Popup gesucht, damit
  // der Konsument keine Ref verdrahten muss.
  useEffect(() => {
    if (offen) popupRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [offen]);

  // Außenklick und Escape am Dokument – externe Systeme. Escape lauscht am Dokument, weil ein
  // während des Laufs deaktivierter Eintrag den Fokus aus dem Popup verliert.
  useEffect(() => {
    if (!offen || laeuft) return;
    function schliessenBeiAussenklick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOffen(false);
    }
    function schliessenBeiEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOffen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", schliessenBeiAussenklick);
    document.addEventListener("keydown", schliessenBeiEscape);
    return () => {
      document.removeEventListener("pointerdown", schliessenBeiAussenklick);
      document.removeEventListener("keydown", schliessenBeiEscape);
    };
  }, [offen, laeuft, triggerRef]);

  // Schließt auch einen laufenden Zustand: nach einem Erfolg meldet die Action ihr Ende erst
  // nach `schliessen`, das nächste Öffnen soll trotzdem ungesperrt beginnen.
  function schliessen() {
    setOffen(false);
    setLaeuft(false);
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
        onClick={() => {
          if (!laeuft) setOffen((bisher) => !bisher);
        }}
      >
        <span aria-hidden="true">⋯</span>
      </Button>

      {offen && (
        <div
          ref={popupRef}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-md border border-line-subtle bg-surface p-1 shadow-md"
        >
          <LaufKontext value={laeuft}>
            <MenueEintraege eintraege={children} steuerung={{ schliessen, meldeLauf: setLaeuft }} />
          </LaufKontext>
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

/** Ein Eintrag im `AktionsMenue`; während eines gemeldeten Laufs gesperrt. */
export function MenueEintrag({
  gefahr = false,
  type = "button",
  disabled = false,
  ...rest
}: MenueEintragProps) {
  const laeuft = useContext(LaufKontext);
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || laeuft}
      role="menuitem"
      className={joinClasses(
        EINTRAG_CLASS,
        gefahr ? "text-danger hover:bg-danger-subtle" : "text-foreground hover:bg-accent-subtle",
      )}
    />
  );
}
