# Security Review: Task 53 – Auslagenerstattung

Reviewer: Security-Agent (Persona `docs/factory/agents/security-agent.md`)
Datum: 2026-07-18
Scope: `git diff main...HEAD` (F6 – Auslagenerstattung, #53)
Geprüfte Produktionsdateien: `app/veranstaltung/actions.ts`, `db/auslage.ts`,
`db/veranstaltung.ts`, `app/veranstaltung/schema.ts`, `app/veranstaltung/AuslageForm.tsx`,
`app/veranstaltung/AuslageRow.tsx`, `app/veranstaltung/[id]/auslagen/page.tsx`,
`db/schema.ts`, `db/migrations/0010_spotty_the_call.sql`, `lib/money.ts`.

## Kritische Findings (Blocker)
- Keine.

## Wichtige Findings
- Keine.

## Hinweise

- [Info · AuthZ/IDOR] **`setAuslageStatusAction` / `removeAuslageAction` lesen `veranstaltungId`
  aus dem `FormData` (client-kontrolliert)** – anders als `createAuslageAction`/`updateAuslageAction`,
  die die `veranstaltungId` serverseitig binden (`.bind(null, id)`). **Kein Vuln:** Die Data-Layer
  bindet `veranstaltungId` zusätzlich ins `WHERE` (`and(eq(id, …), eq(veranstaltungId, …))`,
  Codify #51), sodass eine gefälschte `veranstaltungId` nur ins Leere läuft (kein Match → `undefined`,
  No-Op). Auch die Lifecycle-Sperre (`offen`-Check auf der übergebenen `veranstaltungId`) ist nicht
  umgehbar: Passt die übergebene ID nicht zur echten Auslage, matcht die Mutation nicht; passt sie,
  gilt der Check für die richtige Veranstaltung. Verhalten ist konsistent mit dem bestehenden
  `setStatusAction`/`removeZeileAction`-Muster. Optionale Härtung (nicht erforderlich): den
  `undefined`-Rückgabewert der Data-Layer auch in den `void`-Actions auswerten, um No-Op-Requests
  zu erkennen/loggen – wurde in den Refactoring-Notizen bewusst als „keine Verhaltensänderung im
  Scope" zurückgestellt.

- [Info · Injection] **Kein SQL-Injection-Vektor.** Alle Queries laufen über die Drizzle-Data-Layer
  mit parametrisierten Bindungen; das einzige `sql`-Template (`coalesce(${veranstaltungZeile.anzeigename},
  ${teilnehmer.name})` in `listAuslagen`) interpoliert ausschließlich Drizzle-Spaltenreferenzen
  (Identifier), keine Nutzer-Eingaben. Kein `sql.raw`, kein `.execute()` mit String-Konkatenation.

- [Info · XSS] **Output-Encoding korrekt.** `anzeigename` und `zweck` (die einzigen frei
  eingebbaren Textwerte) werden als JSX-Textknoten gerendert (`{auslage.zweck}`), React escaped
  automatisch. Kein `dangerouslySetInnerHTML`.

- [Info · Input-Validierung] **Vollständig fail-closed.** `auslageSchema` erzwingt: Kategorie-Enum,
  Betrag als EUR > 0 mit ≤ 2 Nachkommastellen **und** int4-Obergrenze (`INT4_MAX`, Codify #49 –
  verhindert den generischen Postgres-Overflow-500), `teilnehmerId` gesetzt, `zweck` `.max(200)`
  (Codify #50). DB-seitig zusätzlich CHECK `betrag_cents > 0` (Defense-in-Depth). `parseEuroToCents`
  kann bei Extremwerten Präzision verlieren, aber die `<= INT4_MAX`-Refine greift davor – kein
  DB-Overflow.

- [Info · Data Integrity] **Soft-Delete/Aktiv-Prüfung + Zuordnung** über
  `assertTeilnehmerInVeranstaltung` (Zeile existiert für `(veranstaltungId, teilnehmerId)` **und**
  Teilnehmer `active`) bei create/update – ein manipulierter Request kann keinen fremden/inaktiven
  Teilnehmer zuordnen (Codify #51). FK `teilnehmer_id` ist `ON DELETE no action` (Teilnehmer werden
  nie hart gelöscht) → Namensauflösung per LEFT-JOIN/COALESCE bleibt immer stabil.

- [Info · Error Handling] Keine Stack-Traces oder internen Details in Nutzer-Meldungen; alle
  `error`-Strings sind Konsumenten-Meldungen (Konstanten). Kein Logging von PII/Secrets im Diff.

- [Info · Dependencies] Keine neuen Dependencies (`package.json`/`pnpm-lock.yaml` unverändert).

- [Info · Secrets/Krypto] Keine hartkodierten Credentials/Secrets. ID-Generierung via
  `globalThis.crypto.randomUUID()` (kein `Math.random()` im Security-Pfad).

## Nicht abgedeckt (Umgebungs-Blocker, kein Security-Defizit)
- Migrations-Smoke-Test gegen Wegwerf-DB (Docker-Grant fehlt in dieser Session) – reine Neuanlage
  (Tabelle + 2 Enums + CHECK + FKs), Schema/Snapshot durch `tsc --noEmit` gedeckt. Nachziehen via
  `/post-merge-verify`. Für die Security-Bewertung nicht relevant.

## Ergebnis
PASSED

Keine kritischen oder wichtigen Findings. Das Feature ist durchgängig fail-closed
(RBAC → Zod → Lifecycle-Sperre → IDOR-Bindung → Aktiv-/Zuordnungs-Guard) und deckt die relevanten
OWASP-Kategorien (Injection, Broken Access Control/IDOR, XSS, Input-Validierung, Error-Handling) ab.
Merge aus Security-Sicht freigegeben.
