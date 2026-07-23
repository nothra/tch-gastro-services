"use client";

import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { VerzehrPositionRow } from "@/db/verzehr";
import {
  VerzehrErfassung,
  type VerzehrArtikel,
  type VerzehrZeile,
} from "@/app/_verzehr/VerzehrErfassung";
import type { VerzehrFormAction } from "@/app/_verzehr/types";
import { FokusListe } from "@/app/_verzehr/FokusListe";
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

  // Ab hier ist erfasserId gesetzt (obiger Guard) – einmal auflösen, in beiden Folge-Branches genutzt.
  const erfasser = zeilen.find((zeile) => zeile.id === erfasserId);

  // Schritt 2 – Erfasser gesetzt, Ziel fehlt: „Für wen …?" mit „Für mich" als erster Option.
  if (zielId === null) {
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
        zeilen={zeilen}
        artikel={artikel}
        positionen={positionen}
        action={action}
        editable
        initialOpenId={zielId}
        // Geräte-lokale Ziel-Merkung (ADR-035 D1) lebt jetzt im route-gebundenen Konsumenten
        // (ADR-039 D1): FokusListe kennt weder Token noch Storage-Schema.
        onFokusWechsel={(id) => writeZielId(token, id)}
      />
    </div>
  );
}

const selectClass =
  "w-full rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const PLATZHALTER_LABEL = "Bitte wählen…";

// Auto-Weiter + Platzhalter (spec-194): der Platzhalter feuert bewusst kein `onWaehle`, damit die
// Wahl jeder echten Option ein change-Ereignis auslöst – auch wenn dieselbe Option erneut gewählt
// wird, wäre sie ohne Platzhalter bereits vorausgewählt und würde kein Ereignis feuern.
function handleAuswahl(
  event: React.ChangeEvent<HTMLSelectElement>,
  onWaehle: (id: string) => void,
) {
  const id = event.target.value;
  if (id) onWaehle(id);
}

// Select-Hülle beider Auswahl-Schritte (spec-194): Platzhalter + Auto-Weiter-`onChange`, dahinter
// die schrittspezifischen `<option>`-Einträge als Children. Geteilt zwischen `ErfasserPicker` und
// `ZielPicker`, die sich zuvor nur in den Optionen selbst unterschieden (Review-Finding #194).
function PlatzhalterSelect({
  headingId,
  onWaehle,
  selectRef,
  children,
}: {
  headingId: string;
  onWaehle: (id: string) => void;
  selectRef?: React.Ref<HTMLSelectElement>;
  children: React.ReactNode;
}) {
  return (
    <select
      ref={selectRef}
      aria-labelledby={headingId}
      defaultValue=""
      onChange={(event) => handleAuswahl(event, onWaehle)}
      className={selectClass}
    >
      <option value="" disabled>
        {PLATZHALTER_LABEL}
      </option>
      {children}
    </select>
  );
}

// „Wer bist du?" – Auswahl des Erfassers aus der Teilnehmerliste (ADR-035 D1). Bewusst KEIN Anlegen
// neuer Teilnehmer über den Link (spec-54 B4) – nur Auswahl. Leere Liste fängt der Aufrufer ab.
// Natives Dropdown statt Button-Liste (spec-194): kompakter bei vielen Teilnehmern, von Haus aus
// per Tastatur/Screenreader bedienbar.
function ErfasserPicker({
  zeilen,
  onWaehle,
}: {
  zeilen: readonly VerzehrZeile[];
  onWaehle: (id: string) => void;
}) {
  const headingId = useId();
  return (
    <section className="flex flex-col gap-3">
      <h2 id={headingId} className="font-semibold">
        Wer bist du?
      </h2>
      <PlatzhalterSelect headingId={headingId} onWaehle={onWaehle}>
        {zeilen.map((zeile) => (
          <option key={zeile.id} value={zeile.id}>
            {zeile.anzeigename}
          </option>
        ))}
      </PlatzhalterSelect>
    </section>
  );
}

// „Für wen möchtest du einen Verzehr erfassen?" (ADR-035 D1). Erste echte Option „Für mich"
// übernimmt den Erfasser als Ziel (häufigster Fall, ohne erneute Suche); darunter die übrigen
// Teilnehmer. Natives Dropdown statt Button-Liste (spec-194).
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
  const headingId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);

  // Fokus erst im nächsten Frame (requestAnimationFrame), NACHDEM der Wechsel vom Erfasser- zum
  // Ziel-Schritt den Reflow ausgelöst hat – sonst zielt der Fokus noch auf das alte Layout (#188).
  // So kommt der Ziel-Schritt ohne manuelles Scrollen in den Sichtbereich (spec-194).
  useEffect(() => {
    const raf = requestAnimationFrame(() => selectRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  const uebrige = zeilen.filter((zeile) => zeile.id !== erfasserId);
  return (
    <section className="flex flex-col gap-3">
      <h2 id={headingId} className="font-semibold">
        Für wen möchtest du einen Verzehr erfassen?
      </h2>
      <PlatzhalterSelect headingId={headingId} onWaehle={onWaehle} selectRef={selectRef}>
        <option value={erfasserId}>Für mich{erfasserName ? ` (${erfasserName})` : ""}</option>
        {uebrige.map((zeile) => (
          <option key={zeile.id} value={zeile.id}>
            {zeile.anzeigename}
          </option>
        ))}
      </PlatzhalterSelect>
    </section>
  );
}
