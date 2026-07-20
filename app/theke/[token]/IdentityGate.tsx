"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { VerzehrPositionRow } from "@/db/verzehr";
import {
  VerzehrErfassung,
  type VerzehrArtikel,
  type VerzehrZeile,
} from "@/app/_verzehr/VerzehrErfassung";
import type { VerzehrFormAction } from "@/app/_verzehr/types";

// Identitäts-Gate der Selbstbedienung (F7, #54, ADR-034 D4): ein Client-Wrapper um die
// route-neutrale VerzehrErfassung. Merkt die gewählte Person je Gerät in localStorage
// (Schlüssel pro Token). Die Auswahl ist REIN clientseitig (UX-Wiedererkennung) – nichts wird
// server-seitig gespeichert, die Erfassung bleibt anonym (spec-52); der Name dient nur der
// Wiedererkennung am Gerät.
//
// Teilnehmerliste + laufende Summen sind IMMER sichtbar (spec-54 AC B: „…sieht die
// Teilnehmerliste und die laufenden Summen" bereits beim Öffnen, vor der Namenswahl). Nur die
// Erfassungs-Controls (±) stehen hinter dem Gate: editierbar erst nach der Namenswahl. Ist die
// Veranstaltung abgeschlossen, gibt es kein Gate – die Ansicht ist read-only (ADR-034 D1/D4).

const STORAGE_PREFIX = "tch:sb:name:";
// Eigenes Event, um denselben Tab nach setItem/removeItem neu zu rendern: das native
// `storage`-Event feuert nur in ANDEREN Tabs, nicht im schreibenden Dokument.
const NAME_CHANGED_EVENT = "tch:sb:name-changed";

// Liest die gemerkte Person über useSyncExternalStore statt über einen Effekt: der Server-Snapshot
// ist `null` (Picker), der Client-Snapshot der localStorage-Wert – React gleicht die Hydration
// mismatch-frei ab, ohne setState im Effekt (Codify: react-hooks/set-state-in-effect).
function useRememberedName(storageKey: string): string | null {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(NAME_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(NAME_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const getSnapshot = useCallback(() => window.localStorage.getItem(storageKey), [storageKey]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function IdentityGate({
  token,
  zeilen,
  artikel,
  positionen,
  action,
  editable,
}: {
  token: string;
  zeilen: readonly VerzehrZeile[];
  artikel: readonly VerzehrArtikel[];
  positionen: readonly VerzehrPositionRow[];
  action: VerzehrFormAction;
  editable: boolean;
}) {
  const storageKey = `${STORAGE_PREFIX}${token}`;
  const selected = useRememberedName(storageKey);

  if (zeilen.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Teilnehmer erfasst – bitte an den Veranstalter wenden.
      </p>
    );
  }

  const erfassung = (erfassbar: boolean) => (
    <VerzehrErfassung
      zeilen={zeilen}
      artikel={artikel}
      positionen={positionen}
      action={action}
      editable={erfassbar}
    />
  );

  // Read-only (abgeschlossen): kein Gate, keine Namenswahl – nur Liste + Summen.
  if (!editable) return erfassung(false);

  const waehlen = (name: string) => {
    window.localStorage.setItem(storageKey, name);
    window.dispatchEvent(new Event(NAME_CHANGED_EVENT));
  };

  const wechseln = () => {
    window.localStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(NAME_CHANGED_EVENT));
  };

  // Stale-Fallback (ADR-034 D4): ein gemerkter Name, der nicht (mehr) in der Liste steht, führt
  // zurück zum Picker (auf dem Server ist `selected` null → ebenfalls Picker).
  const bekannt = selected !== null && zeilen.some((zeile) => zeile.anzeigename === selected);

  return (
    <div className="flex flex-col gap-4">
      {bekannt ? (
        <div className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-sm">
            Erfassung als <strong>{selected}</strong>
          </span>
          <button
            type="button"
            onClick={wechseln}
            className="text-sm text-cyan-700 hover:underline dark:text-cyan-400"
          >
            Person wechseln
          </button>
        </div>
      ) : (
        <NamensPicker zeilen={zeilen} onWaehlen={waehlen} />
      )}
      {erfassung(bekannt)}
    </div>
  );
}

// Namenswahl aus der bestehenden Teilnehmerliste (ADR-034 D4). Bewusst KEIN Anlegen neuer
// Teilnehmer über den Link (spec-54 B4) – nur Auswahl; Walk-in bleibt beim Veranstalter (F3/F4).
// Die leere Liste fängt der Aufrufer ab (neutraler Hinweis), daher hier immer >= 1 Zeile.
function NamensPicker({
  zeilen,
  onWaehlen,
}: {
  zeilen: readonly VerzehrZeile[];
  onWaehlen: (name: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Wer bist du?</h2>
      <ul className="flex flex-col gap-2">
        {zeilen.map((zeile) => (
          <li key={zeile.id}>
            <button
              type="button"
              onClick={() => onWaehlen(zeile.anzeigename)}
              className="w-full rounded border border-zinc-300 px-4 py-2 text-left text-sm hover:bg-cyan-50 dark:border-zinc-700 dark:hover:bg-cyan-950"
            >
              {zeile.anzeigename}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
