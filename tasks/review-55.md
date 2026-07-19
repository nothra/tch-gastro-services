# Review: Task 55

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur/Patterns), Diff-Scope
`git diff origin/main...HEAD` (nach `git fetch`, Codify #161). Alle Findings am Code verifiziert.

> **Runde 2.** Die fünf Runde-1-Findings (W1 Audit-/`{ok:true}`-Race, W2 tote `setStatus`,
> W3 tote `logEreignis`, W4 NOT_FOUND-Test, W5 Ablehnungs-Assertion) sind alle am Code
> verifiziert behoben (Details siehe `tasks/task-55-kassieren-abschluss.md` → „Review-Findings").
> Backend/Logik und Architektur/Patterns geben in Runde 2 **APPROVED**; Code-Qualität findet
> ein neues, in-Scope Doku-Drift-Finding aus dem Rework selbst.

## Kritische Findings (müssen behoben werden)
_Keine._ Kernlogik ist fail-closed, IDOR-gebunden, ADR-033-treu und integrationsgetestet;
alle 11 ACs + 3 Fehlerszenarien der Spec erfüllt.

## Wichtige Findings (sollten behoben werden)

- [x] **[docs/adr/033-kassieren-abschluss-datenmodell.md:177-178, 181] Kanonische ADR driftet nach dem Rework – beschreibt zwei bewusst gelöschte Funktionen als „bestehend".**
  Die Runde-1-Fixes W2/W3 hatten `setStatus` (roh) und `logEreignis` **entfernt** (per Grep verifiziert:
  0 Prod-Vorkommen im Baum), aber die kanonische Architektur-Quelle ADR-033 war nicht nachgezogen:
  Zeile 177-178 behauptete, `setStatus` (roh) bleibe für Theke/Sonderfälle bestehen; Zeile 181 nannte
  noch `logEreignis(...)` als Teil des Ereignis-Log-Moduls. Beides verstieß gegen CLAUDE.md Prinzip 4
  („Entscheidungen dokumentieren") und die Codify-Regel „Kanonische Quellen synchronisieren".
  **Behoben (2026-07-20):** die beiden Sätze in ADR-033 D6 auf die Ist-Architektur gezogen (kein roher
  `setStatus` – die beiden Actions sind der einzige Weg, den Status zu ändern; Ereignis-Insert läuft
  inline in der atomaren Abschluss-/Wiederöffnungs-Klammer, kein separates `logEreignis`).

## Nitpicks (optional)

- [ ] [docs/adr/023-veranstaltung-datenmodell.md:133] listet `setStatus(id, status)` weiter als
  Data-Layer-Funktion – jetzt ebenfalls stale (Funktion global entfernt), aber ADR-023 dokumentiert
  den F2-Ursprungszustand und liegt außerhalb des #55-Diff-Scopes. Nur bei einem bewussten Sweep.
- [ ] [db/veranstaltung.ts:186, 214] Positionaler Cast `results[1] as Veranstaltung[]` koppelt implizit
  an die Build-Reihenfolge in `runAtomic` (Index 1 = Status-UPDATE, Type-Erasure-Preis des Treiber-Seams).
  Ein Ein-Wort-Kommentar würde die Kopplung sichtbar machen. Runde-1-Nitpick, weiter offen.
- [ ] [app/veranstaltung/actions.ts:189] Die einzige inline-interpolierte Fehlermeldung
  („Abschluss nicht möglich: N Zeile(n) noch offen.") ist nicht als Modul-Konstante geführt (wegen
  Interpolation vertretbar, aber inkonsistent zum Rest). Runde-1-Nitpick.
- [ ] [app/veranstaltung/actions.ts:202-204] `setStatusAction` revalidiert `detailPath`/`kassierenPath`/
  `LIST_PATH`, aber nicht `verzehrPath`/`auslagenPath` – nach dem Abschluss zeigt der Client-Router-Cache
  dort kurzzeitig noch die „offen"-UI. Keine Datenkorruption (alle Schreib-Actions guarden serverseitig
  `status !== "offen"`), konsistent mit der bestehenden Revalidate-Konvention. Kosmetisch.
- [ ] [KassiereZeileForm.test.tsx:23, StatusToggle.test.tsx:25] `vi.clearAllMocks()` statt
  `resetAllMocks()` (Codify #51) – hier faktisch sicher, da `beforeEach` den Return-Wert neu setzt.
  Reine Konsistenz. Runde-1-Nitpick.
- [ ] [app/veranstaltung/[id]/kassieren/page.test.tsx:209] `getAllByText("2,50 €").length === 2` prüft
  eine exakte Vorkommenszahl eines formatierten Strings über das ganze Dokument – etwas brüchig; der
  Zeilenwert selbst ist in `kassierSummen.test.ts` sauber unit-getestet, daher tolerierbar.

## Positives
- **Alle fünf Runde-1-Findings am Code verifiziert behoben** – von allen drei Perspektiven bestätigt.
  W1 wertet den `undefined`-Rückgabewert des guarded UPDATE aus (`BEREITS_ABGESCHLOSSEN`/`BEREITS_OFFEN`
  statt fälschlich `{ok:true}`); die DB-Doppelaufruf-Tests dokumentieren die **Ist-Semantik** ehrlich
  (`listEreignisse` Länge 2 bzw. 1) statt sie zu kaschieren.
- **Single-Source-Design (ADR-033 D5):** `kassierZeilen`/`kassierTagessummen` speisen Zeilenanzeige,
  Tagessummen **und** das Abschluss-Gate (`offeneZeilenCount`) über denselben DB-freien Pfad.
- **Preis-Einfrieren konsistent (ADR-033 D2):** `COALESCE(einzelpreis_cents, price_cents)` in
  `listPositionen`; Snapshot beim Abschluss, Reset-auf-NULL beim Wiederöffnen – integrationsgetestet
  gegen spätere Katalog-Preisänderung.
- **Schreibschutz vollständig:** alle mutierenden Actions guarden `status !== "offen"` fail-closed →
  „Tagessummen fixiert" gilt tatsächlich. IDOR-Bindung (`veranstaltungId` im WHERE, Codify #51) mit
  Mismatch-Integrationstest; Zod-Grenze mit `INT4_MAX` (Codify #49); DB-CHECKs fail-closed.
- **Migration 0011 rein additiv & datensicher** (2 nullable Spalten, neues Enum/Tabelle, FKs
  cascade/set null, 2 `CHECK … IS NULL OR >= 0`) – kein Backfill; Snapshot + `_journal` mitgeneriert.
- **`kassierSummen.ts`** wirklich DB-/DOM-frei, domänenspezifisch benannt (Codify #105), 100 %
  unit-testbar (Null-Verzehr=bezahlt, Spende-0-Grenze, offeneZeilen-Zählung, negative Kassenveränderung).
- **Auth (Codify #48):** `types/next-auth.d.ts` korrekt augmentiert; FK-Schutz beim Akteur (`"" → null`);
  Client-Komponenten auf `useActionState` ohne `useEffect` (Codify #49).
- **Schichtung strikt:** alle Drizzle-Queries in `db/*`, `sql`-Tag mit gebundenen Parametern; RBAC
  serverseitig (`requireRole("veranstalter")`); Routen-Doku `docs/routes.md` (#145) gepflegt; route-neutrale
  Module `app/_verzehr/*` unangetastet (Codify #52).

## Empfehlung
APPROVED

> Keine kritischen Findings; das eine wichtige Doku-Finding (ADR-033 widersprach nach dem Rework dem
> Code – gelöschte `setStatus`/`logEreignis` als „bestehend" beschrieben) ist oben als behoben markiert
> und der Fix wurde per `git grep` gegen den Commit-Verlauf verifiziert (Commit `03bde81`, keine
> stale Referenzen mehr im Baum). Keine Runde 3 durchgeführt – der Mensch hat die Verifikation am
> 2026-07-20 explizit bestätigt (kein Code-Risiko, reine 2-Zeilen-Doku-Korrektur), siehe
> `tasks/task-55-kassieren-abschluss.md` → „Review-Findings" für die Begründung. Keine
> Out-of-Scope-Findings → kein neues Issue.
