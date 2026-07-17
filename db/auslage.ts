import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  auslage,
  veranstaltungZeile,
  type Auslage,
  type AuslageKategorie,
  type AuslageStatus,
} from "./schema";

// Data-Layer der Auslagenerstattung (F6, #53, ADR-028 D5). Einziger Ort mit Drizzle-Queries
// auf `auslage` – Actions/UI greifen nie direkt zu (Separation of Concerns). Rollen-neutral;
// der RBAC-Guard sitzt in der Action.

// Eine Auslage mit aufgelöstem Anzeigenamen (Snapshot der Teilnehmerzeile, ADR-022-Vertrag).
export type AuslageRow = {
  id: string;
  teilnehmerId: string;
  anzeigename: string;
  kategorie: AuslageKategorie;
  betragCents: number;
  zweck: string | null;
  status: AuslageStatus;
};

export type AuslageData = {
  veranstaltungId: string;
  teilnehmerId: string;
  kategorie: AuslageKategorie;
  betragCents: number;
  zweck: string | null;
};

// INSERT ist nach Erfolg garantiert vorhanden (Codify #50) → Promise<Auslage>, nicht optional.
export async function createAuslage(data: AuslageData): Promise<Auslage> {
  const [created] = await db.insert(auslage).values(data).returning();
  return created;
}

// Alle Auslagen einer Veranstaltung mit aufgelöstem Anzeigenamen (Join auf die eindeutige
// Zeile für (veranstaltungId, teilnehmerId), ADR-023 D5-Unique). Gefiltert über veranstaltungId.
export function listAuslagen(veranstaltungId: string): Promise<AuslageRow[]> {
  return db
    .select({
      id: auslage.id,
      teilnehmerId: auslage.teilnehmerId,
      anzeigename: veranstaltungZeile.anzeigename,
      kategorie: auslage.kategorie,
      betragCents: auslage.betragCents,
      zweck: auslage.zweck,
      status: auslage.status,
    })
    .from(auslage)
    .innerJoin(
      veranstaltungZeile,
      and(
        eq(auslage.veranstaltungId, veranstaltungZeile.veranstaltungId),
        eq(auslage.teilnehmerId, veranstaltungZeile.teilnehmerId),
      ),
    )
    .where(eq(auslage.veranstaltungId, veranstaltungId));
}

export type AuslageUpdateData = {
  teilnehmerId: string;
  kategorie: AuslageKategorie;
  betragCents: number;
  zweck: string | null;
};

// Bindet veranstaltungId ins WHERE (IDOR-Schutz, Codify #51): bei Mismatch kommt `undefined`
// zurück, nicht die fremde Zeile.
export async function updateAuslage(
  id: string,
  veranstaltungId: string,
  data: AuslageUpdateData,
): Promise<Auslage | undefined> {
  const [updated] = await db
    .update(auslage)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(auslage.id, id), eq(auslage.veranstaltungId, veranstaltungId)))
    .returning();
  return updated;
}

// Deckt beide Richtungen ab (offen→erstattet und erstattet→offen, ADR-028 D3).
export async function setAuslageStatus(
  id: string,
  veranstaltungId: string,
  status: AuslageStatus,
): Promise<Auslage | undefined> {
  const [updated] = await db
    .update(auslage)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(auslage.id, id), eq(auslage.veranstaltungId, veranstaltungId)))
    .returning();
  return updated;
}

// Hard-Delete (ADR-028 D2, Leaf-Entität ohne Referenzen/Audit-Bedarf).
export async function removeAuslage(
  id: string,
  veranstaltungId: string,
): Promise<Auslage | undefined> {
  const [removed] = await db
    .delete(auslage)
    .where(and(eq(auslage.id, id), eq(auslage.veranstaltungId, veranstaltungId)))
    .returning();
  return removed;
}
