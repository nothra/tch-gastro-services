"use client";

import { useCallback, useRef, useState } from "react";
import type { VerzehrPositionRow } from "@/db/verzehr";
import {
  ZeileKarte,
  type VerzehrArtikel,
  type VerzehrZeile,
} from "@/app/_verzehr/VerzehrErfassung";
import type { VerzehrFormAction } from "@/app/_verzehr/types";
import { writeZielId } from "./erfasser-ziel-storage";

// Fokus-Akkordeon der Selbstbedienung (F7, #183, ADR-035 D2/D3): rendert dieselbe route-neutrale
// `ZeileKarte` collapsible und hält den Akkordeon-Zustand – genau EINE Karte offen (= Ziel-
// Teilnehmer) oder keine. Oben eine sticky, horizontal scrollbare Chip-Leiste zum schnellen
// Wechsel auf Handy/Tablet. Ein Wechsel merkt das Ziel geräte-lokal (nur wenn `editable`, D5) und
// bringt die Karte per scrollIntoView in den Sichtbereich (guarded – jsdom hat keine
// Implementierung). Import-Richtung app/theke → app/_verzehr ist regelkonform (Codify #52).
export function FokusListe({
  token,
  zeilen,
  artikel,
  positionen,
  action,
  editable,
  initialOpenId,
}: {
  token: string;
  zeilen: readonly VerzehrZeile[];
  artikel: readonly VerzehrArtikel[];
  positionen: readonly VerzehrPositionRow[];
  action: VerzehrFormAction;
  editable: boolean;
  initialOpenId: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const kartenRefs = useRef(new Map<string, HTMLLIElement>());

  // Ziel wählen: Karte öffnen (andere zu), geräte-lokal merken (nur editable) und in den
  // Sichtbereich holen. Vom Chip UND vom Aufklappen einer eingeklappten Karte genutzt.
  const waehleZiel = useCallback(
    (id: string) => {
      setOpenId(id);
      if (editable) writeZielId(token, id);
      kartenRefs.current.get(id)?.scrollIntoView?.({ block: "start" });
    },
    [editable, token],
  );

  // Kopf-Tipp: offene Karte zuklappen, sonst als Ziel öffnen (höchstens eine offen).
  const toggle = useCallback(
    (id: string) => {
      setOpenId((current) => {
        if (current === id) return null;
        if (editable) writeZielId(token, id);
        kartenRefs.current.get(id)?.scrollIntoView?.({ block: "start" });
        return id;
      });
    },
    [editable, token],
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
            open={openId === zeile.id}
            onToggle={() => toggle(zeile.id)}
          />
        ))}
      </ul>
    </div>
  );
}
