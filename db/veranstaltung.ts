import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { runAtomic } from "./atomic";
import type { EreignisAkteur } from "./veranstaltung-ereignis";
import {
  catalogItems,
  veranstaltung,
  veranstaltungEreignis,
  veranstaltungZeile,
  verzehrPosition,
  type Kasse,
  type Veranstaltung,
  type VeranstaltungZeile,
} from "./schema";

// Einziger Ort mit Drizzle-Queries auf veranstaltung/veranstaltung_zeile (ADR-023).
// Bewusst rollen-neutral – der RBAC-Guard sitzt in der jeweiligen Action.

const THEKE_BEZEICHNUNG = "Stehende Theke";

export type VeranstaltungData = { bezeichnung: string; datum: Date; kasse: Kasse };

export async function createVeranstaltung(data: VeranstaltungData): Promise<Veranstaltung> {
  const [created] = await db.insert(veranstaltung).values(data).returning();
  return created;
}

// Nur datierte Veranstaltungen, neueste zuerst – für die Veranstalter-Übersicht. Die stehende
// Theke wird nicht mitgelistet (sie wird über getThekeForKasse/Token angesteuert).
export function listVeranstaltungen(): Promise<Veranstaltung[]> {
  return db
    .select()
    .from(veranstaltung)
    .where(eq(veranstaltung.typ, "veranstaltung"))
    .orderBy(desc(veranstaltung.datum), desc(veranstaltung.createdAt));
}

export async function getVeranstaltung(id: string): Promise<Veranstaltung | undefined> {
  const [row] = await db.select().from(veranstaltung).where(eq(veranstaltung.id, id)).limit(1);
  return row;
}

export async function getThekeForKasse(kasse: Kasse): Promise<Veranstaltung | undefined> {
  const [row] = await db
    .select()
    .from(veranstaltung)
    .where(and(eq(veranstaltung.typ, "theke"), eq(veranstaltung.kasse, kasse)))
    .limit(1);
  return row;
}

// Provisioniert die stehende Theke idempotent (ADR-023 D3): existiert bereits eine für die
// Kasse, wird sie zurückgegeben; sonst neu angelegt. Der Partial-Unique-Index
// `veranstaltung_eine_theke_je_kasse` ist die DB-seitige Idempotenz-Garantie (genau eine
// Theke je Kasse), auch bei nebenläufigem Aufruf.
export async function ensureThekeForKasse(kasse: Kasse): Promise<Veranstaltung> {
  const existing = await getThekeForKasse(kasse);
  if (existing) return existing;
  const [created] = await db
    .insert(veranstaltung)
    .values({ typ: "theke", bezeichnung: THEKE_BEZEICHNUNG, kasse, datum: null })
    .returning();
  return created;
}

// Legt eine Zeile mit Namens-Snapshot an (ADR-022/ADR-023 D5): `anzeigename` wird aus
// teilnehmer.name kopiert und bleibt danach stabil.
export async function addZeile(
  veranstaltungId: string,
  teilnehmer: { id: string; name: string },
): Promise<VeranstaltungZeile> {
  const [created] = await db
    .insert(veranstaltungZeile)
    .values({ veranstaltungId, teilnehmerId: teilnehmer.id, anzeigename: teilnehmer.name })
    .returning();
  return created;
}

// Löscht eine Zeile nur, wenn sie zur angegebenen Veranstaltung gehört. Die Bindung an
// veranstaltungId ist der serverseitige Schreibschutz: ohne sie könnte ein manipulierter
// Request über eine offene Veranstaltung eine fremde Zeile (abgeschlossene Veranstaltung
// oder Theke) löschen.
export async function removeZeile(
  zeileId: string,
  veranstaltungId: string,
): Promise<VeranstaltungZeile | undefined> {
  const [removed] = await db
    .delete(veranstaltungZeile)
    .where(
      and(
        eq(veranstaltungZeile.id, zeileId),
        eq(veranstaltungZeile.veranstaltungId, veranstaltungId),
      ),
    )
    .returning();
  return removed;
}

// Lädt eine Zeile nur, wenn sie zur angegebenen Veranstaltung gehört. Die Bindung an
// veranstaltungId ist der IDOR-Schutz an der Verzehr-Action-Grenze (F5, Codify #51/ADR-025 D6):
// ohne sie könnte ein manipulierter Request über eine offene Veranstaltung eine fremde Zeile
// (andere/abgeschlossene Veranstaltung) bespielen.
export async function getZeile(
  zeileId: string,
  veranstaltungId: string,
): Promise<VeranstaltungZeile | undefined> {
  const [row] = await db
    .select()
    .from(veranstaltungZeile)
    .where(
      and(
        eq(veranstaltungZeile.id, zeileId),
        eq(veranstaltungZeile.veranstaltungId, veranstaltungId),
      ),
    )
    .limit(1);
  return row;
}

export function listZeilen(veranstaltungId: string): Promise<VeranstaltungZeile[]> {
  return db
    .select()
    .from(veranstaltungZeile)
    .where(eq(veranstaltungZeile.veranstaltungId, veranstaltungId))
    .orderBy(veranstaltungZeile.anzeigename);
}

// Setzt/löscht den bar kassierten Betrag einer Zeile (F8, #55, ADR-033 D6). `null` = Erhalten
// zurücksetzen (noch nicht kassiert). Bindet veranstaltungId ins WHERE (IDOR-Schutz, Codify #51):
// bei Mismatch kommt `undefined` zurück, nicht die fremde Zeile. Der Zeilenstatus (bezahlt/offen)
// wird NICHT gespeichert – er ist aus erhalten/verzehr abgeleitet (ADR-033 D1).
export async function setErhalten(
  zeileId: string,
  veranstaltungId: string,
  erhaltenCents: number | null,
): Promise<VeranstaltungZeile | undefined> {
  const [updated] = await db
    .update(veranstaltungZeile)
    .set({ erhaltenCents, updatedAt: new Date() })
    .where(
      and(
        eq(veranstaltungZeile.id, zeileId),
        eq(veranstaltungZeile.veranstaltungId, veranstaltungId),
      ),
    )
    .returning();
  return updated;
}

// Alle Positionen dieser Veranstaltung (über ihre Zeilen) als Sub-Select-Filter – für den
// korrelierten Bulk-UPDATE des Preis-Snapshots bzw. dessen Reset.
function positionenDieserVeranstaltung(veranstaltungId: string) {
  return sql`${verzehrPosition.zeileId} in (select ${veranstaltungZeile.id} from ${veranstaltungZeile} where ${veranstaltungZeile.veranstaltungId} = ${veranstaltungId})`;
}

// Schließt eine Veranstaltung transaktional & fail-closed ab (ADR-033 D3): (1) Preis-Snapshot je
// Position (aktueller Katalogpreis → `einzelpreis_cents`, ADR-033 D2), (2) guarded `status`-UPDATE
// (`WHERE status = 'offen'` gegen Doppel-Abschluss), (3) Protokoll-Eintrag – als EINE atomare
// Klammer (runAtomic). Der „alle bezahlt"-Check sitzt vor dem Aufruf in der Action (ADR-033 D6);
// hier wird nur atomar geschrieben. Gibt die aktualisierte Veranstaltung zurück (bzw. `undefined`,
// wenn der guarded UPDATE keine Zeile traf – nebenläufiger Zweit-Abschluss).
export async function abschliessenVeranstaltung(
  veranstaltungId: string,
  akteur: EreignisAkteur,
): Promise<Veranstaltung | undefined> {
  const results = await runAtomic((exec) => [
    exec
      .update(verzehrPosition)
      .set({
        einzelpreisCents: sql`(select ${catalogItems.priceCents} from ${catalogItems} where ${catalogItems.id} = ${verzehrPosition.catalogItemId})`,
        updatedAt: new Date(),
      })
      .where(positionenDieserVeranstaltung(veranstaltungId)),
    exec
      .update(veranstaltung)
      .set({ status: "abgeschlossen", updatedAt: new Date() })
      .where(and(eq(veranstaltung.id, veranstaltungId), eq(veranstaltung.status, "offen")))
      .returning(),
    exec.insert(veranstaltungEreignis).values({
      veranstaltungId,
      art: "abgeschlossen",
      akteurUserId: akteur.userId,
      akteurName: akteur.name,
    }),
  ]);
  const [updated] = results[1] as Veranstaltung[]; // Index 1 = Status-UPDATE (Query-Reihenfolge oben)
  return updated;
}

// Öffnet eine abgeschlossene Veranstaltung transaktional wieder (ADR-033 D3): (1) Preis-Snapshots
// je Position auf `NULL` zurücksetzen (Korrekturen rechnen wieder gegen den Live-Katalog),
// (2) guarded `status`-UPDATE (`WHERE status = 'abgeschlossen'`), (3) Protokoll-Eintrag – atomar.
export async function wiedereroeffnenVeranstaltung(
  veranstaltungId: string,
  akteur: EreignisAkteur,
): Promise<Veranstaltung | undefined> {
  const results = await runAtomic((exec) => [
    exec
      .update(verzehrPosition)
      .set({ einzelpreisCents: null, updatedAt: new Date() })
      .where(positionenDieserVeranstaltung(veranstaltungId)),
    exec
      .update(veranstaltung)
      .set({ status: "offen", updatedAt: new Date() })
      .where(and(eq(veranstaltung.id, veranstaltungId), eq(veranstaltung.status, "abgeschlossen")))
      .returning(),
    exec.insert(veranstaltungEreignis).values({
      veranstaltungId,
      art: "wiedereroeffnet",
      akteurUserId: akteur.userId,
      akteurName: akteur.name,
    }),
  ]);
  const [updated] = results[1] as Veranstaltung[]; // Index 1 = Status-UPDATE (Query-Reihenfolge oben)
  return updated;
}

// Prüft die Teilnehmer-Zugehörigkeit zur Veranstaltung (ADR-028 D1/D5): eine Auslage ist einem
// Teilnehmer zugeordnet, ohne FK auf die Zeile – die Action prüft stattdessen, dass eine Zeile
// für (veranstaltungId, teilnehmerId) existiert, bevor sie die Zuordnung erlaubt.
export async function getZeileByTeilnehmer(
  veranstaltungId: string,
  teilnehmerId: string,
): Promise<VeranstaltungZeile | undefined> {
  const [row] = await db
    .select()
    .from(veranstaltungZeile)
    .where(
      and(
        eq(veranstaltungZeile.veranstaltungId, veranstaltungId),
        eq(veranstaltungZeile.teilnehmerId, teilnehmerId),
      ),
    )
    .limit(1);
  return row;
}
