# Security Review: Task 55

Scope: `git diff origin/main...HEAD` (Codify #161 – kein Fremd-PR-Bleed). Geprüft: Server Actions
(`app/veranstaltung/actions.ts`), Zod-Grenze (`schema.ts`), Data-Layer (`db/veranstaltung.ts`,
`db/atomic.ts`, `db/veranstaltung-ereignis.ts`, `db/verzehr.ts`), Schema/Migration (`db/schema.ts`,
`0011_red_ronan.sql`), Route/Seite (`app/veranstaltung/[id]/kassieren/page.tsx`), Session-Claim
(`auth.config.ts`, `types/next-auth.d.ts`), Summenlogik (`kassierSummen.ts`).

## Kritische Findings (Blocker)
- [ ] _Keine._

## Wichtige Findings
- [ ] _Keine._

## Hinweise
- [ ] **[Audit-Integrity / TOCTOU] Phantom-Ereignis bei nebenläufigem Doppel-Abschluss/-Wiederöffnen.**
  In `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung` (`db/veranstaltung.ts:162`,`:193`)
  laufen Preis-Snapshot, guarded `status`-UPDATE (`WHERE status = …`) und der Ereignis-INSERT in
  **einer** atomaren Klammer (`runAtomic`). Der Ereignis-INSERT ist aber **nicht** an das
  Treffen des guarded UPDATE gekoppelt: Trifft der `status`-UPDATE bei einem nebenläufigen
  Zweitaufruf 0 Zeilen (Zustandswechsel schon vollzogen), wird der Ereignis-Eintrag trotzdem
  geschrieben – im Kassen-Audit-Log (D4) entsteht ein Protokolleintrag ohne zugehörigen realen
  Zustandswechsel. Die Action (`setStatusAction`) meldet dem Nutzer korrekt „bereits abgeschlossen/
  offen" (`app/veranstaltung/actions.ts:197`,`:201`), der Log-Nebeneffekt bleibt aber bestehen.
  → **Bereits als akzeptierter Trade-off dokumentiert** (ADR-033 D3, Task-Review-Runde 1 W1): im
  Single-Veranstalter-MVP praktisch unerreichbar, kein Escalation-/Integritätsverlust an den echten
  Kassendaten (Betrag/Status bleiben korrekt). **Empfehlung (Backlog #57, optional):** den
  Ereignis-INSERT konditional an den Statuswechsel binden (`INSERT … SELECT … WHERE EXISTS/NOT
  EXISTS` bzw. CTE auf das `RETURNING` des guarded UPDATE), sobald der Umbau gegen eine echte
  Postgres-Instanz verifizierbar ist. Kein Merge-Blocker.

- [ ] **[Append-only nur konventionell durchgesetzt.]** `veranstaltung_ereignis` wird ausschließlich
  über den Data-Layer geschrieben; verifiziert: nur INSERTs, kein UPDATE/DELETE
  (`db/veranstaltung.ts:179`,`:207`; `db/veranstaltung-ereignis.ts` nur `listEreignisse`). Es gibt
  keine DB-seitige Append-only-Erzwingung (z. B. Revoke UPDATE/DELETE, Trigger). Für das
  Bedrohungsmodell dieses Projekts (kein externer Schreibpfad, nur die App-Data-Layer berührt die
  Tabelle) ausreichend – als Hinweis für ein künftiges Kassenbuch (#57) festgehalten.

- [ ] **[Sensitive Data – Session-Claim D7]** `session.user.id = token.sub ?? ""` (`auth.config.ts:31`,
  `types/next-auth.d.ts:12`) exponiert die eigene User-ID (UUID-`text`) in der eigenen Session. Das
  ist Standard und risikoarm (kein fremder Bezug, keine PII über die eigene ID hinaus). `token.sub`
  wird von NextAuth signiert gesetzt und ist client-seitig nicht manipulierbar; der Akteur-Snapshot
  (`akteurUserId`/`akteurName`) stammt serverseitig aus der Session, nicht aus dem Formular
  (`app/veranstaltung/actions.ts:184`). Kein Handlungsbedarf.

## Positiv verifiziert (keine Findings)
- **AuthN/AuthZ fail-closed, defense in depth:** Jede zustandsverändernde Action ruft `requireRole
  ("veranstalter")` als erste Zeile (`actions.ts:168`,`:219`); `requireAnyRole` ist fail-closed
  (`lib/authz.ts:35` – wirft `ForbiddenError` bei fehlender Session/Rolle). Wiederöffnen erfordert
  dieselbe `veranstalter`-Rolle wie der Abschluss (gemeinsamer `requireRole` in `setStatusAction`,
  AC „Wiederöffnen ohne Veranstalter-Rolle → abgelehnt" erfüllt). Die Route
  (`kassieren/page.tsx:35`) prüft zusätzlich serverseitig `hasRole(...,"veranstalter")` und lädt bei
  fehlender Rolle keine Daten; sie liegt im bereits von `proxy.ts` geschützten Bereich (Codify #63).
- **IDOR / BOLA (Codify #51):** Alle Zeilen-Zugriffe binden den Parent-Key `veranstaltungId` ins
  `WHERE`: `getZeile` (`db/veranstaltung.ts:103`), `setErhalten` (`:132`), sowie der korrelierte
  Preis-Snapshot/Reset über `positionenDieserVeranstaltung` (`:152`). `kassiereZeileAction` bindet
  `veranstaltungId` serverseitig (`page.tsx:66`, `.bind(null,id)`) – der Client sendet sie nie.
  Vor jedem Schreiben Existenz- und `status === "offen"`-Prüfung (`actions.ts:228-233`).
- **Kassenkritische Write-Sperre:** Kassieren/Abschluss auf abgeschlossener Veranstaltung
  fail-closed abgelehnt (`ziel.status !== "offen"` → `NOT_OFFEN`, `actions.ts:229`); Abschluss bei
  ≥1 offener Zeile über die Single-Source-Summenlogik abgelehnt (`actions.ts:192-195`); Theke schließt
  nie (`actions.ts:190`); guarded `status`-UPDATE gegen Doppel-Abschluss (`db/veranstaltung.ts:177`,
  `:205`).
- **Input-Validierung / Injection:** `kassiereSchema` validiert `erhalten` über den Money-Seam mit
  Format-Refine (`EURO_INPUT_RE`, keine Negativwerte) und `INT4_MAX`-Obergrenze nach dem Transform
  (`schema.ts:82-92`, Codify #49) – kein int4-Overflow-Bypass; leere Eingabe → `null`. DB-CHECKs
  (`erhalten_cents/einzelpreis_cents IS NULL OR >= 0`, `0011_red_ronan.sql:15-16`) sichern zusätzlich
  fail-closed ab. Alle SQL über Drizzle parametrisiert; die `sql``-Templates interpolieren nur
  Spalten-Refs und gebundene Parameter (`db/veranstaltung.ts:153`,`:170`) – keine String-Konkatenation.
- **XSS:** Alle dynamischen Werte (Anzeigename, Akteur-Snapshot, Beträge) über React-JSX
  ausgegeben (auto-escaped); kein `dangerouslySetInnerHTML` im Diff. `akteurName ?? "—"`-Fallback
  (`page.tsx:210`) für `onDelete: set null`.
- **Atomarität:** `runAtomic` (`db/atomic.ts`) klammert Preis-Snapshot + Status + Protokoll als
  eine Batch/Transaktion – kein Teilzustand bei Fehler.
- **Sonstiges:** Keine neuen Dependencies (`package.json`/Lockfile unverändert im Diff); keine
  Secrets im Code; kein `Math.random()` für Security-Zwecke (`crypto.randomUUID()` nur als DB-PK);
  Fehlermeldungen ohne Stacktraces/DB-Interna (`isUniqueViolation`-Mapping, `actions.ts:53`); keine
  PII in Logs (`lib/authz.ts:39` loggt nur Rollennamen).

## Ergebnis
PASSED
