import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { teilnehmer, type NewTeilnehmer, type Teilnehmer } from "./schema";

// Data-Layer der Teilnehmer-Stammdaten (F3, #50, ADR-022). Einziger Ort mit
// Drizzle-Queries auf die teilnehmer-Tabelle – Actions/UI greifen nie direkt zu
// (PROJECT-CONTEXT, Separation of Concerns). Die Funktionen sind bewusst rollen-neutral;
// der RBAC-Guard sitzt in der jeweiligen Action, damit F4 dieselbe createTeilnehmer-
// Funktion für den Walk-in (requireRole("veranstalter")) wiederverwenden kann (ADR-022).

const teilnehmerOrder = [asc(teilnehmer.name)];

// Vollständige Liste inkl. deaktivierter Teilnehmer – für die Verwalter-Pflegeansicht.
export function listTeilnehmer(): Promise<Teilnehmer[]> {
  return db
    .select()
    .from(teilnehmer)
    .orderBy(...teilnehmerOrder);
}

// Nur aktive Teilnehmer – für die Auswahl beim Anlegen eines Abends (F4).
export function listActiveTeilnehmer(): Promise<Teilnehmer[]> {
  return db
    .select()
    .from(teilnehmer)
    .where(eq(teilnehmer.active, true))
    .orderBy(...teilnehmerOrder);
}

// Einzelner Teilnehmer per id – u. a. für den Namens-Snapshot beim Anlegen einer
// Veranstaltungszeile (F4, ADR-022/ADR-023 D5): die Zeile kopiert den autoritativen Namen
// serverseitig, nicht den client-gelieferten.
export async function getTeilnehmer(id: string): Promise<Teilnehmer | undefined> {
  const [row] = await db.select().from(teilnehmer).where(eq(teilnehmer.id, id)).limit(1);
  return row;
}

export type TeilnehmerData = Omit<NewTeilnehmer, "id" | "createdAt" | "updatedAt" | "active">;

export async function createTeilnehmer(data: TeilnehmerData): Promise<Teilnehmer> {
  const [created] = await db.insert(teilnehmer).values(data).returning();
  return created;
}

export async function updateTeilnehmer(
  id: string,
  data: TeilnehmerData,
): Promise<Teilnehmer | undefined> {
  const [updated] = await db
    .update(teilnehmer)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teilnehmer.id, id))
    .returning();
  return updated;
}

// Deaktivieren/Reaktivieren statt hartem Löschen (spec-50): historische Abende behalten
// den Teilnehmer, neue Abende sehen nur aktive.
export async function setTeilnehmerActive(
  id: string,
  active: boolean,
): Promise<Teilnehmer | undefined> {
  const [updated] = await db
    .update(teilnehmer)
    .set({ active, updatedAt: new Date() })
    .where(eq(teilnehmer.id, id))
    .returning();
  return updated;
}

// Stützt die nicht-blockierende Duplikat-Warnung (ADR-022): kein DB-Unique auf `name`,
// stattdessen prüft die Action vor dem Anlegen auf einen gleichnamigen aktiven Teilnehmer.
export async function findActiveByName(name: string): Promise<Teilnehmer | undefined> {
  const [match] = await db
    .select()
    .from(teilnehmer)
    .where(and(eq(teilnehmer.name, name), eq(teilnehmer.active, true)))
    .limit(1);
  return match;
}
