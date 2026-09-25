"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole, requireRole } from "@/lib/authz";
import { firstIssueMessage } from "@/lib/form-errors";
import { selfServiceVerzehrRateLimiter } from "@/lib/rate-limit";
import { createTeilnehmer, getTeilnehmer } from "@/db/teilnehmer";
import { getCatalogById, getCatalogItem } from "@/db/catalog";
import { teilnehmerSchema } from "@/app/verwaltung/teilnehmer/schema";
import { KASSEN, veranstaltungStatus, type Kasse, type Veranstaltung } from "@/db/schema";
import {
  abschliessenVeranstaltung,
  addZeile,
  createVeranstaltung,
  deleteVeranstaltung,
  ensureThekeForKasse,
  getVeranstaltung,
  getVeranstaltungByToken,
  getZeile,
  getZeileByTeilnehmer,
  listZeilen,
  removeZeile,
  setErhalten,
  setVeranstaltungCatalog,
  updateVeranstaltungMeta,
  wiedereroeffnenVeranstaltung,
} from "@/db/veranstaltung";
import { adjustMenge, getPosition, listPositionen } from "@/db/verzehr";
import {
  createAuslage,
  listAuslagen,
  removeAuslage,
  setAuslageStatus,
  updateAuslage,
} from "@/db/auslage";
import type { VerzehrActionState } from "@/app/_verzehr/types";
import { kassierTagessummen, kassierZeilen } from "./kassierSummen";
import {
  auslageSchema,
  auslageStatusSchema,
  kassiereSchema,
  katalogWechselSchema,
  veranstaltungMetaSchema,
  veranstaltungSchema,
  verzehrAdjustSchema,
} from "./schema";

const LIST_PATH = "/veranstaltung";
const detailPath = (id: string) => `${LIST_PATH}/${id}`;
const verzehrPath = (id: string) => `${detailPath(id)}/verzehr`;
const auslagenPath = (id: string) => `${detailPath(id)}/auslagen`;
const kassierenPath = (id: string) => `${detailPath(id)}/kassieren`;
const thekePath = (token: string) => `/theke/${token}`;

const NOT_FOUND = "Veranstaltung nicht gefunden.";
const NOT_OFFEN = "Die Veranstaltung ist abgeschlossen und schreibgeschützt.";
const DUPLICATE_ZEILE = "Dieser Teilnehmer ist bereits erfasst.";
const ZEILE_NOT_FOUND = "Teilnehmerzeile nicht gefunden.";
const ITEM_NOT_FOUND = "Artikel nicht gefunden.";
const TEILNEHMER_NOT_IN_VERANSTALTUNG = "Teilnehmer gehört nicht zu dieser Veranstaltung.";
const TEILNEHMER_INACTIVE = "Teilnehmer nicht gefunden.";
const AUSLAGE_NOT_FOUND = "Auslage nicht gefunden.";
const TOO_MANY_REQUESTS = "Zu viele Anfragen – bitte kurz warten.";
const CATALOG_NOT_FOUND = "Katalog nicht gefunden.";
const CATALOG_INACTIVE = "Der Katalog ist nicht aktiv.";
const VERZEHR_BEREITS_ERFASST =
  "Katalogwechsel nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.";
const KEINE_VERANSTALTUNG = "Keine Veranstaltung angegeben.";
const THEKE_NICHT_AENDERBAR = "Die stehende Theke kann nicht bearbeitet oder gelöscht werden.";
// Eigene Meldungen fürs Löschen (#352 AK5/AK6): die Sperre ist dieselbe Bedingung wie beim
// Katalogwechsel, der Vorgang aber ein anderer – `VERZEHR_BEREITS_ERFASST` spräche hier vom
// Wechsel und wäre für den Thekenwart schlicht falsch.
const LOESCHEN_VERZEHR_ERFASST =
  "Löschen nicht möglich: für diese Veranstaltung ist bereits Verzehr erfasst.";
const LOESCHEN_AUSLAGE_ERFASST =
  "Löschen nicht möglich: für diese Veranstaltung ist bereits eine Auslage erstattet oder erfasst.";
const LOESCHEN_KASSIERT_ERFASST =
  "Löschen nicht möglich: für diese Veranstaltung ist bereits Geld kassiert.";

export type VeranstaltungFormState = { ok?: boolean; error?: string };

// Postgres unique_violation (SQLSTATE 23505) – unterscheidet den Duplikat-Fall von einem echten Fehler.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

// Serverseitige Durchsetzung der Katalogwahl (#346 FS1/AK6): eine Katalog-Id aus FormData ist
// client-gesteuert, die Dropdown-Optionsliste also keine Grenze. Ein unbekannter oder
// deaktivierter Katalog wird hier abgelehnt – dieselbe Prüfung für Anlage und Wechsel, damit
// beide Wege nicht auseinanderlaufen. Gibt die Fehlermeldung zurück bzw. `undefined` bei OK
// (Muster von `assertTeilnehmerInVeranstaltung` unten).
async function assertKatalogWaehlbar(catalogId: string): Promise<string | undefined> {
  const katalog = await getCatalogById(catalogId);
  if (!katalog) return CATALOG_NOT_FOUND;
  if (!katalog.active) return CATALOG_INACTIVE;
  return undefined;
}

// Ist für diese Veranstaltung tatsächlich Verzehr erfasst? Gefiltert wird auf `menge > 0` statt
// auf bloße Zeilen-Existenz: `verzehr_position` löscht seine Zeile bei `menge = 0` nicht (Upsert
// mit `GREATEST(0, …)`, db/verzehr.ts), eine hoch- und wieder runtergezählte Position ist also
// kein tatsächlicher Verzehr (#346 AK4, #352 FS1). Geteilt von Katalogwechsel und Löschen –
// zwei Kopien derselben Bedingung würden lautlos divergieren; die Meldung bleibt beim Aufrufer,
// weil sie den jeweiligen Vorgang benennt.
async function hatErfasstenVerzehr(veranstaltungId: string): Promise<boolean> {
  const positionen = await listPositionen(veranstaltungId);
  return positionen.some((position) => position.menge > 0);
}

// Gemeinsame Guard-Sequenz für Bearbeiten und Löschen (#352): Existenz (FS4) → Typ (AK10, die
// stehende Theke ist nicht Teil dieses Features) → Status (AK3), erweitert um den Typ-Check
// gegenüber `setVeranstaltungCatalogAction` – die Schwester-Action bleibt bewusst ohne Typ-Check,
// weil er dort den Katalogwechsel für die Theke verbieten würde (#346-Verhaltensänderung außerhalb
// dieses Scopes). Gibt die Fehlermeldung zurück bzw. `undefined` bei OK (Muster von
// `assertKatalogWaehlbar` oben). Sie ist ein Vor-Check: die verbindliche Grenze bleibt die
// guarded WHERE-Bedingung der Data-Layer, deren `undefined` der Aufrufer auswertet.
async function assertVeranstaltungAenderbar(id: string): Promise<string | undefined> {
  const ziel = await getVeranstaltung(id);
  if (!ziel) return NOT_FOUND;
  if (ziel.typ !== "veranstaltung") return THEKE_NICHT_AENDERBAR;
  if (ziel.status !== "offen") return NOT_OFFEN;
  return undefined;
}

export async function createVeranstaltungAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
  const parsed = veranstaltungSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const katalogError = await assertKatalogWaehlbar(parsed.data.catalogId);
  if (katalogError) return { error: katalogError };

  await createVeranstaltung(parsed.data);
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// Wechselt die Preisliste einer noch offenen Veranstaltung (F4, #346 AK3). Fail-closed in dieser
// Reihenfolge: Veranstalter-Rolle (AK8) → Veranstaltung existiert & ist offen (AK5) → Zielkatalog
// wählbar (AK6/FS1) → noch kein Verzehr erfasst (AK4) → guarded UPDATE. Die Verzehr-Sperre prüft
// `menge > 0` statt bloßer Zeilen-Existenz: eine auf 0 zurückgesetzte Position (Strich hoch, dann
// wieder runter) ist kein tatsächlicher Verzehr – konsistent mit der `menge > 0`-Filterung in
// `verzehrPositionen`. Sie läuft zum Zeitpunkt der Action, nicht beim Rendern, und greift damit
// auch im Race (FS2).
export async function setVeranstaltungCatalogAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Keine Veranstaltung angegeben." };

  const parsed = katalogWechselSchema.safeParse({ catalogId: formData.get("catalogId") ?? "" });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const ziel = await getVeranstaltung(id);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  const katalogError = await assertKatalogWaehlbar(parsed.data.catalogId);
  if (katalogError) return { error: katalogError };

  if (await hatErfasstenVerzehr(id)) return { error: VERZEHR_BEREITS_ERFASST };

  // Guarded UPDATE (`WHERE status = 'offen'`): `undefined` heißt, dass eine nebenläufige Anfrage
  // die Veranstaltung nach dem Vor-Check oben abgeschlossen hat (TOCTOU) – oder dass die Id
  // inzwischen verschwunden ist (FS4). Beides ist ein Fehler, kein stiller Erfolg.
  const updated = await setVeranstaltungCatalog(id, parsed.data.catalogId);
  if (!updated) return { error: NOT_OFFEN };

  revalidatePath(detailPath(id));
  revalidatePath(verzehrPath(id));
  return { ok: true };
}

// Ändert Bezeichnung, Datum und Kasse einer noch offenen, datierten Veranstaltung (#352 AK1).
// Fail-closed in dieser Reihenfolge: Veranstalter-Rolle (AK11) → Pflichtfelder (AK2) →
// Veranstaltung existiert, ist datiert und offen (AK3/AK10/FS4) → guarded UPDATE. Der Katalog
// ist bewusst NICHT Teil der Eingabe: `veranstaltungMetaSchema` streift ein mitgeschicktes
// `catalogId` ab, damit dieser Weg die Verzehr-Sperre des Katalogwechsels (#346 AK4) nicht
// umgeht. Kein Verzehr-Check hier – Metadaten zu korrigieren bleibt auch mit erfasstem Verzehr
// erlaubt (anders als der Katalogwechsel, der die Preis-Grundlage unter den Strichen austauschte);
// dasselbe gilt ausdrücklich auch für `kasse`, obwohl sie – anders als Bezeichnung und
// Datum – ein Geldtopf und kein reines Etikett ist: AK1 nennt sie namentlich als bearbeitbares
// Feld, eine Sperre widerspräche also der Spec (Review-Runde 3, Wichtig-Finding 2; Entscheidung
// des Product Owners, nicht nachträglich am Code korrigiert). Ein Wechsel trotz bereits
// kassiertem Betrag (`erhaltenCents` gesetzt) wird bewusst zugelassen und nicht protokolliert –
// die Kassenzuordnung ist über `kassierSummen.ts` je Veranstaltung, nicht je Zeile ausgewertet,
// ein Audit-Trail für Kassenwechsel ist kein Teil dieser Task (#352).
export async function updateVeranstaltungMetaAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: KEINE_VERANSTALTUNG };

  const parsed = veranstaltungMetaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const guardError = await assertVeranstaltungAenderbar(id);
  if (guardError) return { error: guardError };

  // `undefined` = der guarded UPDATE traf keine Zeile: eine nebenläufige Anfrage hat die
  // Veranstaltung nach dem Vor-Check abgeschlossen oder gelöscht (TOCTOU, FS3/FS5). Ein Fehler,
  // kein stiller Erfolg (Kern-Kurzregel „guarded UPDATE").
  const updated = await updateVeranstaltungMeta(id, parsed.data);
  if (!updated) return { error: NOT_OFFEN };

  // Jede Route, deren gerenderter Inhalt sich ändert, wird revalidiert – dieselbe Regel, nach der
  // der Katalogwechsel `verzehrPath` und der Statuswechsel `kassierenPath` mitnimmt. Die drei
  // Unterseiten tragen die Bezeichnung in ihrer Überschrift, die Übersicht zusätzlich Datum und
  // Kasse. `/theke/<token>` rendert alle drei geänderten Felder und wiegt am schwersten: sie ist
  // die einzige betroffene Route ohne Auth-Gate und damit full-route-cache-fähig, während
  // `/veranstaltung/**` über den Session-Zugriff ohnehin dynamisch rendert. Den Token liefert die
  // `.returning()`-Zeile des UPDATE – derselbe Präzedenzfall, nach dem `adjustVerzehrByTokenAction`
  // bereits revalidiert (dort kommt der Token allerdings als gebundenes Routen-Argument, nicht
  // aus `.returning()`).
  revalidatePath(detailPath(id));
  revalidatePath(verzehrPath(id));
  revalidatePath(auslagenPath(id));
  revalidatePath(kassierenPath(id));
  revalidatePath(thekePath(updated.token));
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// Entfernt eine noch offene, datierte Veranstaltung endgültig (#352 AK4, Hard-Delete). Fail-closed
// in dieser Reihenfolge: Veranstalter-Rolle (AK11) → Veranstaltung existiert, ist datiert und offen
// (AK3/AK10/FS4) → kein Verzehr erfasst (AK5) → nichts kassiert (AK12) → keine Auslage erfasst
// (AK6) → guarded DELETE. Teilnehmer-Zeilen ohne Fachdaten sperren NICHT (AK7) – sie verschwinden
// per Cascade. Alle drei Fachsperren laufen zum Zeitpunkt der Action, nicht
// beim Rendern des Bestätigungsdialogs, und greifen damit auch im Race (FS3). Bei Erfolg
// `redirect` statt `revalidatePath(detailPath)`: die Detailseite existiert danach nicht mehr (AK9).
//
// Restrisiko (bewusst akzeptiert, Review-Runde 3, Wichtig-Finding 3; Genauigkeit der Begründung
// korrigiert in Security-Review): Die drei Sperren oben sind Vor-Checks, nicht Teil der
// `WHERE`-Bedingung des guarded DELETE selbst – zwischen letzter Prüfung und
// `deleteVeranstaltung` kann ein nebenläufiger, unauthentifizierter Schreiber
// (`adjustVerzehrByTokenAction` über den Theke-Link, kein `requireRole`) noch Verzehr eintragen
// – der Hard-Delete lässt sich dann nicht rückgängig machen. `kassiereZeileAction` ist davon
// AUSGENOMMEN: sie verlangt selbst `requireRole("veranstalter")` und ist nicht über den
// öffentlichen Theke-Link erreichbar, kann die Kassiert-Sperre also nicht im Race unterlaufen.
// Das Fenster ist trotzdem hingenommen und nicht per `NOT EXISTS` im DELETE geschlossen: die
// vier Abfragen liefen unter `neon-http` bereits als vier serielle Roundtrips, ein fünfter, in
// das DELETE verschachtelter Existenz-Check würde die Unumkehrbarkeit nicht aufheben, nur das
// bereits enge Fenster (grobe Schätzung, nicht gemessen: deutlich unter 1 s zwischen
// Löschbestätigung und Ausführung) weiter verkleinern. Ein Treffer setzt außerdem voraus, den
// exakten Lösch-Moment zu kennen – das hat ein externer Angreifer nicht, der Rate-Limiter aus
// ADR-044 begrenzt zusätzlich das Volumen (nicht das Timing). Verweis auf die UPDATE-Konsistenz
// zu #346 trägt hier bewusst NICHT als Begründung – jenes UPDATE ist reversibel, dieses DELETE
// nicht.
export async function deleteVeranstaltungAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: KEINE_VERANSTALTUNG };

  const guardError = await assertVeranstaltungAenderbar(id);
  if (guardError) return { error: guardError };

  if (await hatErfasstenVerzehr(id)) return { error: LOESCHEN_VERZEHR_ERFASST };

  // Bar kassiertes Geld sperrt ebenfalls (AK12) – und zwar unabhängig vom Verzehr: `kassiereZeile`
  // verlangt keinen Verzehr, eine reine Spende ist ein erstklassiger Fall (`kassierSummen.ts`).
  // Ohne diese Sperre verschwände ein `Σ Erhalten`-Datensatz – die eine Hälfte der
  // Kassenveränderung (PROJECT-CONTEXT) – unwiederbringlich im Cascade. `erhaltenCents === null`
  // heißt „noch nicht kassiert"; `setErhalten(null)` nimmt ein Kassieren vollständig zurück und
  // gibt das Löschen wieder frei (FS6, analog zur Auslagen-Rücknahme unten).
  const zeilen = await listZeilen(id);
  if (zeilen.some((zeile) => zeile.erhaltenCents !== null)) {
    return { error: LOESCHEN_KASSIERT_ERFASST };
  }

  // Anders als beim Verzehr zählt hier die reine Zeilen-Existenz: `removeAuslage` ist ein echtes
  // DELETE (ADR-028 D2), eine zurückgenommene Auslage hinterlässt also keine Zeile (FS2). Der
  // Status (offen/erstattet) spielt keine Rolle – beide sperren (AK6).
  const auslagen = await listAuslagen(id);
  if (auslagen.length > 0) return { error: LOESCHEN_AUSLAGE_ERFASST };

  // `undefined` = der guarded DELETE traf keine Zeile (nebenläufiger Abschluss oder
  // Zweit-Löschung, FS3/FS4) – kein Weiterleiten nach einem Löschvorgang, der nie stattfand.
  const removed = await deleteVeranstaltung(id);
  if (!removed) return { error: NOT_OFFEN };

  // Der geteilte QR-Link überlebt den Hard-Delete: ohne Revalidierung liefert die auth-freie
  // Teilnehmer-Route die gelöschte Veranstaltung weiter aus, und ein Strich darauf läuft in
  // „Veranstaltung nicht gefunden." statt in die 404-Seite. Der Token kommt aus der
  // `.returning()`-Zeile des guarded DELETE, also aus dem tatsächlich entfernten Datensatz.
  // Beide Revalidierungen müssen VOR dem `redirect` stehen – der wirft NEXT_REDIRECT.
  revalidatePath(thekePath(removed.token));
  revalidatePath(LIST_PATH);
  redirect(LIST_PATH);
}

// Anzeigename-Snapshot wird serverseitig aus den Stammdaten geholt (nicht vom Client),
// damit die Zeile den autoritativen Namen konserviert.
export async function addZeileAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const teilnehmerId = String(formData.get("teilnehmerId") ?? "");
  if (!veranstaltungId || !teilnehmerId) return { error: "Teilnehmer und Veranstaltung nötig." };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  // getTeilnehmer selektiert unabhängig von `active` – hier explizit prüfen, damit ein
  // manipulierter Request keinen soft-gelöschten Teilnehmer erfassen kann (ADR-022).
  const person = await getTeilnehmer(teilnehmerId);
  if (!person || !person.active) return { error: "Teilnehmer nicht gefunden." };

  try {
    await addZeile(veranstaltungId, person);
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_ZEILE };
    throw error;
  }
  revalidatePath(detailPath(veranstaltungId));
  return { ok: true };
}

// Walk-in durch den Veranstalter (ADR-022): der Walk-in bleibt beim Veranstalter, nicht beim Gast.
export async function createWalkInAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  if (!veranstaltungId) return { error: "Keine Veranstaltung angegeben." };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  const parsed = teilnehmerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const person = await createTeilnehmer(parsed.data);
  await addZeile(veranstaltungId, person);
  revalidatePath(detailPath(veranstaltungId));
  return { ok: true };
}

// Noch keine erfassten Positionen (F5/ADR-023 D7) – das Entfernen ist bedingungslos.
export async function removeZeileAction(formData: FormData): Promise<void> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const zeileId = String(formData.get("zeileId") ?? "");
  if (!veranstaltungId || !zeileId) return;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel || ziel.status !== "offen") return;

  await removeZeile(zeileId, veranstaltungId);
  revalidatePath(detailPath(veranstaltungId));
}

const THEKE_NICHT_ABSCHLIESSBAR = "Die Theke wird nicht abgeschlossen.";
const BEREITS_ABGESCHLOSSEN = "Die Veranstaltung ist bereits abgeschlossen.";
const BEREITS_OFFEN = "Die Veranstaltung ist bereits offen.";
const INVALID_STATUS = "Ungültiger Status.";
const offeneZeilenFehler = (offeneZeilen: number) =>
  `Abschluss nicht möglich: ${offeneZeilen} Zeile(n) noch offen.`;

// Zählt die noch offenen Zeilen (`Verzehr-Gesamt > Erhalten`) einer Veranstaltung über die
// SINGLE-SOURCE-Kassierlogik (ADR-033 D5) – dieselbe Berechnung wie die Anzeige. Speist das
// fail-closed Abschluss-Gate (ADR-033 D3).
async function offeneZeilenCount(veranstaltungId: string): Promise<number> {
  const [zeilen, positionen] = await Promise.all([
    listZeilen(veranstaltungId),
    listPositionen(veranstaltungId),
  ]);
  return kassierTagessummen(kassierZeilen(zeilen, positionen)).offeneZeilen;
}

// Schließt eine Veranstaltung ab bzw. öffnet sie wieder (F8, #55, ADR-033 D3/D6). Erweitert die
// frühere fire-and-forget-Variante auf einen Rückgabe-State (`useActionState`, Codify #49), damit
// die Abschluss-Ablehnung „N Zeile(n) offen" sichtbar wird. Abschluss ist fail-closed: die Theke
// schließt nie (ADR-023 D4), und solange eine Zeile offen ist, wird abgelehnt. Abschluss/
// Wiederöffnung laufen transaktional (Preis-Snapshot + Status + Protokoll) in der Data-Layer.
export async function setStatusAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  const session = await requireRole("veranstalter");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return { error: "Keine Veranstaltung angegeben." };
  if (
    !veranstaltungStatus.enumValues.includes(
      status as (typeof veranstaltungStatus.enumValues)[number],
    )
  ) {
    return { error: INVALID_STATUS };
  }

  const ziel = await getVeranstaltung(id);
  if (!ziel) return { error: NOT_FOUND };

  // Akteur-Snapshot für das Protokoll (ADR-033 D4/D7): id aus der Session, Name display-ready.
  const akteur = { userId: session.user.id || null, name: session.user.name ?? null };

  // Der guarded UPDATE der Data-Layer (`WHERE status = …`, ADR-033 D3) liefert `undefined`, wenn
  // eine nebenläufige Anfrage den Wechsel schon vollzogen hat (TOCTOU nach diesem Vor-Check).
  // Diesen No-op als „bereits …"-Fehler ausweisen, statt fälschlich `{ ok: true }` zu melden.
  if (status === "abgeschlossen") {
    if (ziel.typ === "theke") return { error: THEKE_NICHT_ABSCHLIESSBAR };
    if (ziel.status !== "offen") return { error: BEREITS_ABGESCHLOSSEN };
    const offene = await offeneZeilenCount(id);
    if (offene > 0) {
      return { error: offeneZeilenFehler(offene) };
    }
    const closed = await abschliessenVeranstaltung(id, akteur);
    if (!closed) return { error: BEREITS_ABGESCHLOSSEN };
  } else {
    if (ziel.status !== "abgeschlossen") return { error: BEREITS_OFFEN };
    const reopened = await wiedereroeffnenVeranstaltung(id, akteur);
    if (!reopened) return { error: BEREITS_OFFEN };
  }

  revalidatePath(detailPath(id));
  revalidatePath(kassierenPath(id));
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// Erfasst den bar kassierten Betrag (`Erhalten`) einer Zeile (F8, #55, ADR-033 D6). `veranstaltungId`
// ist serverseitig gebunden (`.bind(null, id)`, analog `adjustVerzehrAction`). Fail-closed:
// Veranstalter-Rolle, offene Veranstaltung, IDOR-Bindung der Zeile (Codify #51). Der Zeilenstatus
// (bezahlt/offen) und die Spende werden NICHT gespeichert – sie sind abgeleitet (ADR-033 D1).
export async function kassiereZeileAction(
  veranstaltungId: string,
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireRole("veranstalter");

  const zeileId = String(formData.get("zeileId") ?? "");
  if (!zeileId) return { error: ZEILE_NOT_FOUND };

  const parsed = kassiereSchema.safeParse({ erhalten: formData.get("erhalten") ?? "" });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  // IDOR-Bindung (Codify #51): die Zeile muss zu genau dieser Veranstaltung gehören.
  const zeile = await getZeile(zeileId, veranstaltungId);
  if (!zeile) return { error: ZEILE_NOT_FOUND };

  await setErhalten(zeileId, veranstaltungId, parsed.data.erhalten);
  revalidatePath(kassierenPath(veranstaltungId));
  return { ok: true };
}

// Gemeinsamer Kern der Verzehr-Erfassung (ADR-034 D3), von beiden Actions genutzt (DRY):
// Zod-Parse → Status `offen` → IDOR-Bindung → Soft-Delete-Prüfung → atomarer Delta-Upsert →
// autoritative Menge. Erwartet die bereits aufgelöste UND autorisierte Veranstaltung; die
// Auflösung + Autorisierung (Rolle bei F5 bzw. Token bei F7) und das `revalidatePath` (Pfad je
// Aufrufweg) liegen bewusst bei der jeweiligen Action, nicht hier. Fail-closed in der
// ADR-025-D6-Reihenfolge; jeder Guard hat einen eigenen Test (Codify #51).
async function applyVerzehrAdjust(
  ziel: Veranstaltung,
  formData: FormData,
): Promise<VerzehrActionState> {
  const parsed = verzehrAdjustSchema.safeParse({
    zeileId: formData.get("zeileId"),
    catalogItemId: formData.get("catalogItemId"),
    delta: formData.get("delta"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };
  const { zeileId, catalogItemId, delta } = parsed.data;

  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  // IDOR-Bindung (Codify #51): die Zeile muss zu genau dieser Veranstaltung gehören.
  const zeile = await getZeile(zeileId, ziel.id);
  if (!zeile) return { error: ZEILE_NOT_FOUND };

  // Soft-Delete-Prüfung nach Laden by id (Codify #51, gelockert durch ADR-026 D2): ein
  // inaktiver Artikel ist nur anpassbar, wenn auf dieser Zeile bereits eine Position dafür
  // existiert (Korrektur eines bereits erfassten Verzehrs) – Neu-Erfassung bleibt blockiert.
  // Katalog-gebundene Abfrage (ADR-050 D4): ein Artikel aus einem fremden Katalog ist kein
  // Treffer und läuft in dieselbe bestehende Meldung wie ein unbekannter (spec-59 FS2).
  // Seit #346 ist die Bindung `veranstaltung.catalogId` statt der Konstante (ADR-050-Nachtrag
  // zu D3) – damit gilt an dieser gemeinsamen Grenze automatisch für F5 die Preisliste DIESER
  // Veranstaltung (AK2/FS3) und für die Theke weiter der Standard-Katalog, den sie über den
  // Spalten-Default trägt (AK7). Der Wert stammt aus der geladenen Zeile, nicht vom Client.
  const item = await getCatalogItem(catalogItemId, ziel.catalogId);
  if (!item) return { error: ITEM_NOT_FOUND };
  if (!item.active) {
    const existing = await getPosition(zeileId, catalogItemId);
    if (!existing) return { error: ITEM_NOT_FOUND };
  }

  const position = await adjustMenge(zeileId, catalogItemId, delta);
  return { ok: true, menge: position?.menge };
}

// Erfasst einen Strich (Delta ±1) auf einer (Zeile, Katalogartikel)-Position (F5, ADR-025 D6).
// `veranstaltungId` ist ein serverseitig gebundenes Argument (route-neutral, ADR-025 D5) – der
// Client liefert es nicht. Nur Veranstalter (requireRole). Gibt die autoritative neue Menge
// zurück (ADR-025 D3): schlägt die Action fehl, bleibt der alte, server-gerenderte Wert stehen
// und der Fehler wird sichtbar (FS3).
export async function adjustVerzehrAction(
  veranstaltungId: string,
  _prevState: VerzehrActionState | undefined,
  formData: FormData,
): Promise<VerzehrActionState> {
  await requireRole("veranstalter");

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };

  const result = await applyVerzehrAdjust(ziel, formData);
  if (result.ok) revalidatePath(verzehrPath(veranstaltungId));
  return result;
}

// Token-scoped Selbstbedienungs-Erfassung ohne Login (F7, #54, ADR-034 D3): der gültige Token
// einer OFFENEN Veranstaltung IST die Autorisierung – bewusst KEIN requireRole (capability-based).
// Die `veranstaltungId` wird aus dem Token abgeleitet (self-scoping); die IDOR-Bindung in
// `applyVerzehrAdjust` erzwingt, dass Schreibvorgänge diese Veranstaltung nicht verlassen. Ein
// unbekannter Token liefert einen neutralen Fehler (keine Preisgabe fremder Veranstaltungen).
// Als einzige öffentliche Schreib-Grenze ist sie zusätzlich rate-limitiert (#182, ADR-044 D3):
// der Guard steht VOR dem Token-Lookup, damit eine gedrosselte Anfrage gar keinen DB-Zugriff
// auslöst (FS-3) – Schlüssel ist der rohe Token, der laut ADR-034 D2 stabil bleibt.
export async function adjustVerzehrByTokenAction(
  token: string,
  _prevState: VerzehrActionState | undefined,
  formData: FormData,
): Promise<VerzehrActionState> {
  if (!selfServiceVerzehrRateLimiter.tryAcquire(token)) return { error: TOO_MANY_REQUESTS };

  const ziel = await getVeranstaltungByToken(token);
  if (!ziel) return { error: NOT_FOUND };

  const result = await applyVerzehrAdjust(ziel, formData);
  if (result.ok) revalidatePath(thekePath(token));
  return result;
}

// Idempotent (ADR-023 D3) – die DB-Idempotenz garantiert der Partial-Unique-Index.
export async function ensureThekeAction(
  _prevState: VeranstaltungFormState | undefined,
  formData: FormData,
): Promise<VeranstaltungFormState> {
  await requireAnyRole(["verwalter", "veranstalter"]);
  const kasse = String(formData.get("kasse") ?? "");
  if (!KASSEN.includes(kasse as Kasse)) return { error: "Bitte eine gültige Kasse wählen." };

  try {
    await ensureThekeForKasse(kasse as Kasse);
  } catch (error) {
    // Race mit einem parallelen Einrichten: die Theke existiert nun – ebenfalls Erfolg.
    if (!isUniqueViolation(error)) throw error;
  }
  revalidatePath(LIST_PATH);
  return { ok: true };
}

export type AuslageFormState = { ok?: boolean; error?: string };

// Gemeinsame Guard-Sequenz für create/update (ADR-028 D5 Schritt 5): der Teilnehmer muss eine
// Zeile in dieser Veranstaltung haben (IDOR-artige Zuordnungsprüfung) und aktiv sein
// (Soft-Delete-Prüfung nach Laden by id, Codify #51).
async function assertTeilnehmerInVeranstaltung(
  veranstaltungId: string,
  teilnehmerId: string,
): Promise<string | undefined> {
  const zeile = await getZeileByTeilnehmer(veranstaltungId, teilnehmerId);
  if (!zeile) return TEILNEHMER_NOT_IN_VERANSTALTUNG;

  const person = await getTeilnehmer(teilnehmerId);
  if (!person || !person.active) return TEILNEHMER_INACTIVE;

  return undefined;
}

// Erfasst eine Auslage (F6, #53, ADR-028 D5). `veranstaltungId` ist serverseitig gebunden
// (die Seite curryt sie über `.bind(null, id)`, analog `adjustVerzehrAction`) – der Client
// liefert sie nicht.
export async function createAuslageAction(
  veranstaltungId: string,
  _prevState: AuslageFormState | undefined,
  formData: FormData,
): Promise<AuslageFormState> {
  await requireRole("veranstalter");

  const parsed = auslageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  const guardError = await assertTeilnehmerInVeranstaltung(
    veranstaltungId,
    parsed.data.teilnehmerId,
  );
  if (guardError) return { error: guardError };

  await createAuslage({
    veranstaltungId,
    teilnehmerId: parsed.data.teilnehmerId,
    kategorie: parsed.data.kategorie,
    betragCents: parsed.data.betrag,
    zweck: parsed.data.zweck,
  });
  revalidatePath(auslagenPath(veranstaltungId));
  return { ok: true };
}

// Korrigiert eine bestehende Auslage, solange die Veranstaltung offen ist. `veranstaltungId`
// und `auslageId` sind serverseitig gebunden (`.bind(null, veranstaltungId, auslage.id)`); die
// Data-Layer bindet `veranstaltungId` zusätzlich ins WHERE (IDOR-Schutz, Codify #51).
export async function updateAuslageAction(
  veranstaltungId: string,
  auslageId: string,
  _prevState: AuslageFormState | undefined,
  formData: FormData,
): Promise<AuslageFormState> {
  await requireRole("veranstalter");

  const parsed = auslageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel) return { error: NOT_FOUND };
  if (ziel.status !== "offen") return { error: NOT_OFFEN };

  const guardError = await assertTeilnehmerInVeranstaltung(
    veranstaltungId,
    parsed.data.teilnehmerId,
  );
  if (guardError) return { error: guardError };

  const updated = await updateAuslage(auslageId, veranstaltungId, {
    teilnehmerId: parsed.data.teilnehmerId,
    kategorie: parsed.data.kategorie,
    betragCents: parsed.data.betrag,
    zweck: parsed.data.zweck,
  });
  if (!updated) return { error: AUSLAGE_NOT_FOUND };

  revalidatePath(auslagenPath(veranstaltungId));
  return { ok: true };
}

// Bestätigt oder nimmt eine Erstattung zurück (ADR-028 D3 – ein Weg, beide Richtungen).
export async function setAuslageStatusAction(formData: FormData): Promise<void> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!veranstaltungId || !id) return;

  const parsed = auslageStatusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) return;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel || ziel.status !== "offen") return;

  await setAuslageStatus(id, veranstaltungId, parsed.data.status);
  revalidatePath(auslagenPath(veranstaltungId));
}

// Hard-Delete (ADR-028 D2, Leaf-Entität ohne Referenzen/Audit-Bedarf) – nur solange die
// Veranstaltung offen ist.
export async function removeAuslageAction(formData: FormData): Promise<void> {
  await requireRole("veranstalter");
  const veranstaltungId = String(formData.get("veranstaltungId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!veranstaltungId || !id) return;

  const ziel = await getVeranstaltung(veranstaltungId);
  if (!ziel || ziel.status !== "offen") return;

  await removeAuslage(id, veranstaltungId);
  revalidatePath(auslagenPath(veranstaltungId));
}
