import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { veranstaltungEreignis, type VeranstaltungEreignis } from "./schema";

// Data-Layer des Abschluss-/Wiederöffnungs-Protokolls (F8, #55, ADR-033 D4). Einziger Ort mit
// Drizzle-Queries auf `veranstaltung_ereignis` – append-only, kein Update/Delete (die Historie
// bleibt vollständig). Rollen-neutral; der RBAC-Guard sitzt in der Action. Der Ereignis-INSERT
// selbst wird bewusst inline in der Abschluss-/Wiederöffnungs-Transaktion geschrieben
// (`abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung` in db/veranstaltung.ts), damit er
// atomar mit Status-Wechsel und Preis-Snapshot läuft (ADR-033 D3) – hier steht nur die Lese-Query.

// Akteur des Vorgangs aus der Session (ADR-033 D7): `userId` FK auf den User (nullable, `set null`
// bei Löschung), `name` als display-ready Snapshot – so übersteht der Eintrag eine spätere
// User-Löschung und bleibt ohne Join anzeigbar.
export type EreignisAkteur = { userId: string | null; name: string | null };

// Alle Ereignisse einer Veranstaltung, neueste zuerst (für die Protokoll-Anzeige).
export function listEreignisse(veranstaltungId: string): Promise<VeranstaltungEreignis[]> {
  return db
    .select()
    .from(veranstaltungEreignis)
    .where(eq(veranstaltungEreignis.veranstaltungId, veranstaltungId))
    .orderBy(desc(veranstaltungEreignis.createdAt));
}
