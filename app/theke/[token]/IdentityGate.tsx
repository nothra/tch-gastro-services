"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { VerzehrPositionRow } from "@/db/verzehr";
import {
  VerzehrErfassung,
  type VerzehrArtikel,
  type VerzehrZeile,
} from "@/app/_verzehr/VerzehrErfassung";
import type { VerzehrFormAction } from "@/app/_verzehr/types";
import { FokusListe } from "./FokusListe";
import {
  IDENTITAET_CHANGED_EVENT,
  adoptLegacyErfasser,
  clearIdentitaet,
  readErfasserId,
  readZielId,
  writeErfasserId,
  writeZielId,
} from "./erfasser-ziel-storage";

// Identitäts-Gate der Selbstbedienung (F7, #183, ADR-035 D1): eine kleine Zustandsmaschine über
// zwei geräte-lokal gemerkte Zeilen-IDs pro Token – den ERFASSER (wer bedient) und den ZIEL-
// Teilnehmer (für wen gebucht wird). Geführter Zweischritt beim erstmaligen Öffnen:
//   1. „Wer bist du?"  → Erfasser wählen (gemerkt).
//   2. „Für wen …?"    → Ziel wählen; erste Option „Für mich" übernimmt den Erfasser (gemerkt).
// Sind beide gesetzt (auch bei Wiederkehr), erscheint die Fokus-Ansicht (FokusListe) mit der Ziel-
// Karte offen; „Erfasser wechseln" ist unauffällig erreichbar. Alles REIN clientseitig – nichts
// wird server-seitig gespeichert, die Erfassung bleibt anonym (spec-52). Read-only (abgeschlossen)
// überspringt den Flow: dieselbe FokusListe, nicht bearbeitbar, kein Gate (D5).
//
// Vor der Namenswahl bleiben Teilnehmerliste + laufende Summen sichtbar (spec-54 AC B, Codify #54):
// die Erfassung darunter ist nur nicht bearbeitbar, nicht verborgen.

// Liest Erfasser + Ziel geräte-lokal über useSyncExternalStore (kein set-state-in-effect, Codify
// #49): Server-Snapshot ist `null`, der Client-Snapshot der localStorage-Wert. Nach jedem Schreiben
// feuert IDENTITAET_CHANGED_EVENT und gleicht denselben Tab ab (`storage` feuert nur in anderen).
function useIdentitaet(token: string, zeilen: readonly VerzehrZeile[]) {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(IDENTITAET_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(IDENTITAET_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const erfasserId = useSyncExternalStore(
    subscribe,
    () => readErfasserId(token, zeilen),
    () => null,
  );
  const zielId = useSyncExternalStore(
    subscribe,
    () => readZielId(token, zeilen),
    () => null,
  );
  return { erfasserId, zielId };
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
  const { erfasserId, zielId } = useIdentitaet(token, zeilen);

  // Einmalige Adoption des #54-Alt-Schlüssels (D6): kein setState im Effekt – adoptLegacyErfasser
  // schreibt nur localStorage + feuert das Event, das useIdentitaet ohnehin abonniert. Idempotent.
  useEffect(() => {
    if (editable) adoptLegacyErfasser(token, zeilen);
  }, [editable, token, zeilen]);

  if (zeilen.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Teilnehmer erfasst – bitte an den Veranstalter wenden.
      </p>
    );
  }

  // Read-only (abgeschlossen): kein Gate, kein Flow – Akkordeon nicht bearbeitbar, alle Karten zu.
  if (!editable) {
    return (
      <FokusListe
        token={token}
        zeilen={zeilen}
        artikel={artikel}
        positionen={positionen}
        action={action}
        editable={false}
        initialOpenId={null}
      />
    );
  }

  // Read-only-Liste, die während der Fragen sichtbar bleibt (spec-54 AC B): Namen + Summen sichtbar,
  // Erfassung nicht bearbeitbar.
  const readOnlyListe = (
    <VerzehrErfassung
      zeilen={zeilen}
      artikel={artikel}
      positionen={positionen}
      action={action}
      editable={false}
    />
  );

  // Schritt 1 – Erfasser fehlt (oder gemerkte ID stale): „Wer bist du?".
  if (erfasserId === null) {
    return (
      <div className="flex flex-col gap-4">
        <ErfasserPicker zeilen={zeilen} onWaehle={(id) => writeErfasserId(token, id)} />
        {readOnlyListe}
      </div>
    );
  }

  // Schritt 2 – Erfasser gesetzt, Ziel fehlt: „Für wen …?" mit „Für mich" als erster Option.
  if (zielId === null) {
    const erfasser = zeilen.find((zeile) => zeile.id === erfasserId);
    return (
      <div className="flex flex-col gap-4">
        <ZielPicker
          zeilen={zeilen}
          erfasserId={erfasserId}
          erfasserName={erfasser?.anzeigename ?? ""}
          onWaehle={(id) => writeZielId(token, id)}
        />
        {readOnlyListe}
      </div>
    );
  }

  // Beide gesetzt: Fokus-Ansicht. „Erfasser wechseln" verwirft beide Werte → Zweischritt erneut.
  const erfasser = zeilen.find((zeile) => zeile.id === erfasserId);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-sm">
          Erfassung durch <strong>{erfasser?.anzeigename}</strong>
        </span>
        <button
          type="button"
          onClick={() => clearIdentitaet(token)}
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Erfasser wechseln
        </button>
      </div>
      <FokusListe
        token={token}
        zeilen={zeilen}
        artikel={artikel}
        positionen={positionen}
        action={action}
        editable
        initialOpenId={zielId}
      />
    </div>
  );
}

// „Wer bist du?" – Auswahl des Erfassers aus der Teilnehmerliste (ADR-035 D1). Bewusst KEIN Anlegen
// neuer Teilnehmer über den Link (spec-54 B4) – nur Auswahl. Leere Liste fängt der Aufrufer ab.
function ErfasserPicker({
  zeilen,
  onWaehle,
}: {
  zeilen: readonly VerzehrZeile[];
  onWaehle: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Wer bist du?</h2>
      <ul className="flex flex-col gap-2">
        {zeilen.map((zeile) => (
          <li key={zeile.id}>
            <button
              type="button"
              onClick={() => onWaehle(zeile.id)}
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

// „Für wen möchtest du einen Verzehr erfassen?" (ADR-035 D1). Erste Option „Für mich" übernimmt den
// Erfasser als Ziel (häufigster Fall, ohne erneute Suche); darunter die übrigen Teilnehmer.
function ZielPicker({
  zeilen,
  erfasserId,
  erfasserName,
  onWaehle,
}: {
  zeilen: readonly VerzehrZeile[];
  erfasserId: string;
  erfasserName: string;
  onWaehle: (id: string) => void;
}) {
  const uebrige = zeilen.filter((zeile) => zeile.id !== erfasserId);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Für wen möchtest du einen Verzehr erfassen?</h2>
      <ul className="flex flex-col gap-2">
        <li>
          <button
            type="button"
            onClick={() => onWaehle(erfasserId)}
            className="w-full rounded border border-cyan-600 px-4 py-2 text-left text-sm font-medium hover:bg-cyan-50 dark:border-cyan-500 dark:hover:bg-cyan-950"
          >
            Für mich{erfasserName ? ` (${erfasserName})` : ""}
          </button>
        </li>
        {uebrige.map((zeile) => (
          <li key={zeile.id}>
            <button
              type="button"
              onClick={() => onWaehle(zeile.id)}
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
