"use client";

import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Toaster as Toasts,
  resolveValue,
  toast,
  useToaster,
  type DefaultToastOptions,
  type Toast,
} from "react-hot-toast";
import { IconButton } from "./IconButton";
import { NOTICE_STYLES } from "./Notice";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-058 D1): rendert die Erfolgsmeldungen aus `meldeErfolg`. Einmal
// im Root-Layout eingehängt, damit ein Toast eine Client-Navigation überlebt (spec-372 AK13). Das
// Markup ist eigenes – Token-Klassen aus derselben Stil-Tabelle wie `Notice`, kein zweites
// Farbsystem der Bibliothek (ADR-052).

/** Q2: lang genug, dass ein Screenreader die Meldung ansagen kann (AK14). */
const STANDZEIT_MS = 5_000;

// `useToaster` unten plant die Standzeit ein zweites Mal ein – mit anderen Optionen griffe dort
// die Bibliotheks-Vorgabe für `success` (2 s). Beide teilen deshalb dieses Objekt.
const TOAST_OPTIONEN: DefaultToastOptions = { duration: STANDZEIT_MS };

// Unten mittig über dem Safe-Area-Rand (Q2, ADR-031): oben verdeckte der Toast auf der
// Verzehr-Seite den fixierten Personen-Block.
const CONTAINER_STYLE = { bottom: "calc(env(safe-area-inset-bottom) + 1rem)" };

interface Pause {
  startPause: () => void;
  endPause: () => void;
}

export function Toaster() {
  const offenerDialog = useOffenerDialog();
  // Die Bibliothek pausiert nur bei Hover; für Fokus (Tastatur auf „×") gibt es keinen eigenen
  // Weg, wohl aber ihre Pause-Handler (Review-372 W2).
  const { handlers } = useToaster(TOAST_OPTIONEN);
  const toasts = (
    <Toasts position="bottom-center" toastOptions={TOAST_OPTIONEN} containerStyle={CONTAINER_STYLE}>
      {(meldung) => <ToastKarte meldung={meldung} pause={handlers} />}
    </Toasts>
  );
  return offenerDialog ? createPortal(toasts, offenerDialog) : toasts;
}

// Ein modaler `<dialog>` macht alles außerhalb inert: ein Toast im `<body>` läge verdeckt unter
// ihm, wäre nicht anklickbar und für Screenreader stumm (spec-372 FS6) – etwa nach „Änderungen
// speichern" in „Einstellungen", der nach dem Erfolg offen bleibt (ADR-056 D3). Deshalb hängt
// sich der Toaster in einen offenen Dialog ein; dort ist er Teil des aktiven Bereichs. Alle
// Dialoge der App sind modal (`Dialog` ruft `showModal`), `[open]` genügt als Erkennung.
function useOffenerDialog(): HTMLDialogElement | null {
  return useSyncExternalStore(beobachteDialoge, letzterOffenerDialog, () => null);
}

function beobachteDialoge(onChange: () => void): () => void {
  const beobachter = new MutationObserver(onChange);
  beobachter.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["open"],
  });
  return () => beobachter.disconnect();
}

// Der letzte offene Dialog in Dokumentreihenfolge – bei verschachtelten Dialogen der innerste.
// Zwei offene, nicht verschachtelte Dialoge gibt es in der App nicht.
function letzterOffenerDialog(): HTMLDialogElement | null {
  const offene = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  return offene.length > 0 ? offene[offene.length - 1] : null;
}

// Fokus in der Karte hält die Standzeit an. Freigegeben wird beim Verlassen der Karte – und auch,
// wenn sie verschwindet, während sie den Fokus hat: ein ausgehängter Knopf meldet kein `blur`, die
// Pause gälte sonst für alle späteren Toasts weiter.
function useFokusPause(sichtbar: boolean, { startPause, endPause }: Pause) {
  const hatFokusRef = useRef(false);
  const endPauseRef = useRef(endPause);
  useEffect(() => {
    endPauseRef.current = endPause;
  });

  const freigeben = useCallback(() => {
    if (!hatFokusRef.current) return;
    hatFokusRef.current = false;
    endPauseRef.current();
  }, []);

  useEffect(() => {
    if (!sichtbar) freigeben();
  }, [sichtbar, freigeben]);
  // Aushängen: der Portalwechsel in einen Dialog oder zurück montiert alle Karten neu.
  useEffect(() => freigeben, [freigeben]);

  return {
    onFocus: () => {
      hatFokusRef.current = true;
      startPause();
    },
    // „×" ist das einzige fokussierbare Element der Karte: jedes `blur` verlässt sie.
    onBlur: freigeben,
  };
}

function ToastKarte({ meldung, pause }: { meldung: Toast; pause: Pause }) {
  const textId = useId();
  const fokusPause = useFokusPause(meldung.visible, pause);
  // Nach `dismiss` hält die Bibliothek den Eintrag noch kurz für eine Ausblend-Animation; ohne
  // Animation gibt es dann nichts mehr zu zeigen.
  if (!meldung.visible) return null;

  const { glyph, classes } = NOTICE_STYLES.erfolg;
  return (
    // Die Gruppe gibt „Meldung schließen" seinen Zusammenhang: welche Meldung geschlossen wird.
    <div
      role="group"
      aria-labelledby={textId}
      {...fokusPause}
      className={joinClasses(
        "flex w-[calc(100vw-2rem)] max-w-md items-center gap-2 rounded-md border pl-3 text-sm shadow-md",
        classes,
      )}
    >
      <span aria-hidden="true" className="font-bold">
        {glyph}
      </span>
      {/* Nur der Text ist Live-Region – der Name der Schaltfläche soll nicht mit angesagt werden. */}
      <span id={textId} {...meldung.ariaProps} className="min-w-0 flex-1 break-words py-2">
        {resolveValue(meldung.message, meldung)}
      </span>
      <IconButton
        label="Meldung schließen"
        icon={<span aria-hidden="true">×</span>}
        onClick={() => toast.dismiss(meldung.id)}
      />
    </div>
  );
}
