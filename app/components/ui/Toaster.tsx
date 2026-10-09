"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Toaster as Toasts, resolveValue, toast, type Toast } from "react-hot-toast";
import { IconButton } from "./IconButton";
import { NOTICE_BASE_CLASSES, NOTICE_STYLES } from "./Notice";
import { joinClasses } from "./joinClasses";

// Route-neutraler Baustein (ADR-058 D1): rendert die Erfolgsmeldungen aus `meldeErfolg`. Einmal
// im Root-Layout eingehängt, damit ein Toast eine Client-Navigation überlebt (spec-372 AK13). Das
// Markup ist eigenes – Token-Klassen aus derselben Stil-Tabelle wie `Notice`, kein zweites
// Farbsystem der Bibliothek (ADR-052).

/** Q2: lang genug, dass ein Screenreader die Meldung ansagen kann (AK14). */
const STANDZEIT_MS = 5_000;

// Unten mittig über dem Safe-Area-Rand (Q2, ADR-031): oben verdeckte der Toast auf der
// Verzehr-Seite den fixierten Personen-Block.
const CONTAINER_STYLE = { bottom: "calc(env(safe-area-inset-bottom) + 1rem)" };

export function Toaster() {
  const offenerDialog = useOffenerDialog();
  const toasts = (
    <Toasts
      position="bottom-center"
      toastOptions={{ duration: STANDZEIT_MS }}
      containerStyle={CONTAINER_STYLE}
    >
      {(meldung) => <ToastKarte meldung={meldung} />}
    </Toasts>
  );
  return offenerDialog ? createPortal(toasts, offenerDialog) : toasts;
}

// Ein modaler `<dialog>` macht alles außerhalb inert: ein Toast im `<body>` läge verdeckt unter
// ihm, wäre nicht anklickbar und für Screenreader stumm (spec-372 FS6) – etwa nach „Änderungen
// speichern" in „Einstellungen", der nach dem Erfolg offen bleibt (ADR-056 D3). Deshalb hängt
// sich der Toaster in den zuletzt geöffneten Dialog ein; dort ist er Teil des aktiven Bereichs.
// Alle Dialoge der App sind modal (`Dialog` ruft `showModal`), `[open]` genügt als Erkennung.
function useOffenerDialog(): HTMLDialogElement | null {
  return useSyncExternalStore(beobachteDialoge, obersterOffenerDialog, () => null);
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

function obersterOffenerDialog(): HTMLDialogElement | null {
  const offene = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  return offene.length > 0 ? offene[offene.length - 1] : null;
}

function ToastKarte({ meldung }: { meldung: Toast }) {
  // Nach `dismiss` hält die Bibliothek den Eintrag noch kurz für eine Ausblend-Animation; ohne
  // Animation gibt es dann nichts mehr zu zeigen.
  if (!meldung.visible) return null;

  const { glyph, classes } = NOTICE_STYLES.erfolg;
  return (
    <div
      className={joinClasses(
        NOTICE_BASE_CLASSES,
        classes,
        "w-[calc(100vw-2rem)] max-w-md items-center py-0 pr-0 shadow-md",
      )}
    >
      <span aria-hidden="true" className="font-bold">
        {glyph}
      </span>
      {/* Nur der Text ist Live-Region – der Name der Schaltfläche soll nicht mit angesagt werden. */}
      <span {...meldung.ariaProps} className="min-w-0 flex-1 break-words py-2">
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
