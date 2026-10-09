"use client";

import { useEffect, useRef } from "react";

// Gemeinsamer Erfolgs-Fokus-Vertrag von `useBestaetigung` und `useFormularDialog` (Lesson #371,
// #373): Hängt ein Erfolg den Auslöser aus, fällt der Fokus auf `<body>` – dann wird er auf ein
// Ersatzziel gelenkt.

/**
 * Läuft beim Aushängen, nach dem DOM-Umbau: ein entfernter fokussierter Knoten lässt den Fokus
 * auf `<body>` fallen. Nur dann – und nur nach einem Erfolg – wird umgelenkt, damit ein Nutzer,
 * der inzwischen woanders steht, nicht weggezogen wird. Ob React zuerst den Dialog schließt
 * oder gleich den ganzen Zweig tauscht, ist dabei gleich. Die Erfolgsmarke wird bewusst erst im
 * Cleanup gelesen: gefragt ist ihr Stand beim Aushängen, nicht beim Einhängen.
 */
export function useErsatzFokus(ersatzFokusId: string | undefined) {
  const erfolgsmarke = useRef(false);
  useEffect(() => {
    if (!ersatzFokusId) return;
    const marke = erfolgsmarke;
    return () => {
      const fokusVerloren = document.activeElement === document.body;
      if (marke.current && fokusVerloren) document.getElementById(ersatzFokusId)?.focus();
    };
  }, [ersatzFokusId]);

  return {
    /** Jedes Öffnen beginnt ohne die Erfolgsmarke des letzten Versuchs. */
    zuruecksetzen: () => {
      erfolgsmarke.current = false;
    },
    markiereErfolg: () => {
      erfolgsmarke.current = true;
    },
  };
}
