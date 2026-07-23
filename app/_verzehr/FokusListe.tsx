"use client";

import { useCallback, useRef, useState } from "react";
import type { VerzehrPositionRow } from "@/db/verzehr";
import { ZeileKarte, type VerzehrArtikel, type VerzehrZeile } from "./VerzehrErfassung";
import type { VerzehrFormAction } from "./types";

// Route-neutrales Fokus-Akkordeon der Verzehrerfassung (#183/#187, ADR-035 D2/D3, ADR-039):
// rendert dieselbe route-neutrale `ZeileKarte` collapsible und hält den Akkordeon-Zustand – genau
// EINE Karte offen oder keine. Oben eine sticky, horizontal scrollbare Chip-Leiste zum schnellen
// Wechsel auf Handy/Tablet. Beide Zugangswege nutzen sie: F7 (Link/Selbstbedienung) und F5
// (Veranstalter). Sie kennt weder Token noch localStorage noch die Erfasser/Ziel-Semantik
// (ADR-025 D5, ADR-039 D1): wird eine Karte zur fokussierten (Chip ODER Aufklappen), ruft sie den
// optionalen `onFokusWechsel`-Callback – F7 hängt daran seine geräte-lokale Ziel-Merkung, F5 lässt
// ihn weg. Die Karte kommt per scrollIntoView in den Sichtbereich (guarded – jsdom hat keine
// Implementierung). Import-Richtung app/theke bzw. app/veranstaltung → app/_verzehr ist regelkonform
// (Codify #52).
export function FokusListe({
  zeilen,
  artikel,
  positionen,
  action,
  editable,
  initialOpenId,
  onFokusWechsel,
}: {
  zeilen: readonly VerzehrZeile[];
  artikel: readonly VerzehrArtikel[];
  positionen: readonly VerzehrPositionRow[];
  action: VerzehrFormAction;
  editable: boolean;
  initialOpenId: string | null;
  onFokusWechsel?: (zeileId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const kartenRefs = useRef(new Map<string, HTMLLIElement>());

  // Fokus wählen: Karte öffnen (andere zu), den Konsumenten benachrichtigen (onFokusWechsel) und in
  // den Sichtbereich holen. Vom Chip UND vom Aufklappen einer eingeklappten Karte genutzt.
  // scrollIntoView erst im nächsten Frame (requestAnimationFrame), NACHDEM setOpenId den Reflow
  // ausgelöst hat (andere Karte zu, Ziel auf) – sonst scrollt es gegen das alte Layout und die
  // Karte landet außerhalb des Sichtbereichs (#188, Screenshot 2). Das scroll-margin-top der
  // Karte (ZeileKarte, collapsible) hält den Kopf frei von der sticky Chip-Leiste (Screenshot 1).
  const waehleZiel = useCallback(
    (id: string) => {
      setOpenId(id);
      onFokusWechsel?.(id);
      requestAnimationFrame(() => {
        kartenRefs.current.get(id)?.scrollIntoView?.({ block: "start" });
      });
    },
    [onFokusWechsel],
  );

  // Kopf-Tipp: offene Karte zuklappen, sonst als Fokus öffnen (höchstens eine offen).
  // Delegiert an `waehleZiel`, damit Seiteneffekte (onFokusWechsel/scrollIntoView) außerhalb der
  // setState-Updater-Funktion laufen – Updater müssen rein sein (React-Reinheit, StrictMode).
  const toggle = useCallback(
    (id: string) => (openId === id ? setOpenId(null) : waehleZiel(id)),
    [openId, waehleZiel],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Teilnehmer auswählen"
        className="sticky top-0 z-10 -mx-6 flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white/90 px-6 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90"
      >
        {zeilen.map((zeile) => {
          const aktiv = openId === zeile.id;
          return (
            <button
              key={zeile.id}
              type="button"
              onClick={() => waehleZiel(zeile.id)}
              aria-current={aktiv ? "true" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
                aktiv
                  ? "border-cyan-600 bg-cyan-600 text-white dark:border-cyan-500 dark:bg-cyan-500"
                  : "border-zinc-300 hover:bg-cyan-50 dark:border-zinc-700 dark:hover:bg-cyan-950"
              }`}
            >
              {zeile.anzeigename}
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-4">
        {zeilen.map((zeile) => (
          <ZeileKarte
            key={zeile.id}
            ref={(el) => {
              if (el) kartenRefs.current.set(zeile.id, el);
              else kartenRefs.current.delete(zeile.id);
            }}
            zeile={zeile}
            artikel={artikel}
            positionen={positionen.filter((position) => position.zeileId === zeile.id)}
            action={action}
            editable={editable}
            collapsible
            // scroll-margin-top in Höhe der sticky Chip-Leiste oben (`sticky top-0 … py-2`):
            // hält beim scrollIntoView den Kartenkopf (Name) frei, sonst verdeckt die Leiste ihn
            // (#188, Screenshot 1). Das Offset gehört zu diesem Layout, daher hier – nicht in der
            // route-neutralen ZeileKarte.
            className="scroll-mt-16"
            open={openId === zeile.id}
            onToggle={() => toggle(zeile.id)}
          />
        ))}
      </ul>
    </div>
  );
}
