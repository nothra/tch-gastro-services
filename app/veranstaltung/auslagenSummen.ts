import type { AuslageKategorie, AuslageStatus } from "@/db/schema";

// Reine, DB-freie Summen-Logik der Auslagenerstattung (F6, #53, ADR-028 D4). Bewusst ohne
// Drizzle/DOM, damit sie zu 100 % unit-testbar ist. Beträge sind ganzzahlige Cent (ADR-021)
// → Summen sind exakt ganzzahlig, keine Rundung nötig; Anzeige über `formatCents` (lib/money).

export type AuslageSumEntry = {
  kategorie: AuslageKategorie;
  betragCents: number;
  status: AuslageStatus;
};

export type KategorieSummen = { offenCents: number; erstattetCents: number };

export type AuslagenSummen = {
  getraenke: KategorieSummen;
  essen: KategorieSummen;
  sonstiges: KategorieSummen;
  gesamt: KategorieSummen;
};

function leereKategorieSummen(): KategorieSummen {
  return { offenCents: 0, erstattetCents: 0 };
}

function addiere(summen: KategorieSummen, betragCents: number, status: AuslageStatus): void {
  if (status === "offen") {
    summen.offenCents += betragCents;
  } else {
    summen.erstattetCents += betragCents;
  }
}

// Summen je Kategorie (Getränke/Essen/Sonstiges) und gesamt, getrennt nach offen/erstattet
// (Spec-AC „Übersicht"). Gelöschte Einträge gehen hier nie ein – sie sind hart gelöscht
// (ADR-028 D2) und erreichen diese Funktion gar nicht erst.
export function auslagenSummen(eintraege: readonly AuslageSumEntry[]): AuslagenSummen {
  const summen: AuslagenSummen = {
    getraenke: leereKategorieSummen(),
    essen: leereKategorieSummen(),
    sonstiges: leereKategorieSummen(),
    gesamt: leereKategorieSummen(),
  };

  for (const eintrag of eintraege) {
    if (eintrag.kategorie === "getraenke") {
      addiere(summen.getraenke, eintrag.betragCents, eintrag.status);
    } else if (eintrag.kategorie === "essen") {
      addiere(summen.essen, eintrag.betragCents, eintrag.status);
    } else if (eintrag.kategorie === "sonstiges") {
      addiere(summen.sonstiges, eintrag.betragCents, eintrag.status);
    } else {
      // Exhaustiveness-Guard: löst einen Compile-Fehler aus, sobald `AuslageKategorie` um
      // einen vierten Wert erweitert wird, statt ihn hier still zu ignorieren.
      const _exhaustive: never = eintrag.kategorie;
      throw new Error(`Unbekannte Kategorie: ${String(_exhaustive)}`);
    }
    addiere(summen.gesamt, eintrag.betragCents, eintrag.status);
  }

  return summen;
}
