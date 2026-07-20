"use client";

import { useCallback, useSyncExternalStore } from "react";

// Identitäts-Gate der Selbstbedienung (F7, #54, ADR-034 D4): ein Client-Wrapper um die
// server-gerenderte VerzehrErfassung (als `children`). Merkt die gewählte Person je Gerät in
// localStorage (Schlüssel pro Token). Die Auswahl ist REIN clientseitig (UX-Wiedererkennung) –
// nichts wird server-seitig gespeichert, die Erfassung bleibt anonym (spec-52); der Name dient
// nur der Wiedererkennung am Gerät. Ist die Erfassung nicht editierbar (abgeschlossene
// Veranstaltung), gibt es KEIN Gate – die `children` werden direkt gerendert (Read-only-Ansicht).

const STORAGE_PREFIX = "tch:sb:name:";
// Eigenes Event, um denselben Tab nach setItem/removeItem neu zu rendern: das native
// `storage`-Event feuert nur in ANDEREN Tabs, nicht im schreibenden Dokument.
const NAME_CHANGED_EVENT = "tch:sb:name-changed";

export type IdentityZeile = { id: string; anzeigename: string };

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
  editable,
  children,
}: {
  token: string;
  zeilen: readonly IdentityZeile[];
  editable: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `${STORAGE_PREFIX}${token}`;
  const selected = useRememberedName(storageKey);

  // Read-only (abgeschlossen): kein Gate – Liste + Summen direkt sichtbar (ADR-034 D1/D4).
  if (!editable) return <>{children}</>;

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

  if (!bekannt) {
    return <NamensPicker zeilen={zeilen} onWaehlen={waehlen} />;
  }

  return (
    <div className="flex flex-col gap-4">
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
      {children}
    </div>
  );
}

// Namenswahl aus der bestehenden Teilnehmerliste (ADR-034 D4). Bewusst KEIN Anlegen neuer
// Teilnehmer über den Link (spec-54 B4) – nur Auswahl; Walk-in bleibt beim Veranstalter (F3/F4).
function NamensPicker({
  zeilen,
  onWaehlen,
}: {
  zeilen: readonly IdentityZeile[];
  onWaehlen: (name: string) => void;
}) {
  if (zeilen.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Teilnehmer erfasst – bitte an den Veranstalter wenden.
      </p>
    );
  }

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
