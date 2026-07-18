# Review: Task 53 – Auslagenerstattung

Multi-Persona-Review (Backend/Logik · Code-Qualität · Architektur), je Read-only.

**Runde 2 (2026-07-18): APPROVED.** Alle drei Personas bestätigen unabhängig, dass die
Runde-1-Blocker **K1**, **W1** und **W2** echt behoben sind (Commit `5481e47`). Kein neuer
kritischer oder wichtiger Defekt. Nur optionale Nitpicks bleiben offen.

## Kritische Findings (müssen behoben werden)

- [x] **BEHOBEN [2026-07-18] (K1):** `listAuslagen` auf **INNER JOIN** `teilnehmer` + **LEFT JOIN**
      `veranstaltung_zeile` mit `anzeigename = coalesce(zeile.anzeigename, teilnehmer.name)`
      umgestellt (`db/auslage.ts:49-70`). Verwaiste Auslagen bleiben nach Zeilen-Löschen
      sichtbar/summenwirksam (kein stiller Kassen-Datenverlust in Übersicht/Summen/F8) und
      lösch-/status-bar. Runde-2-Verifikation Backend: Die Kante „INNER JOIN teilnehmer lässt die
      Auslage wieder verschwinden" greift **nicht** – `teilnehmerId` ist restrict, Teilnehmer werden
      nur soft-gelöscht (`active=false`, Zeile bleibt) → Fallback-Name immer vorhanden, kohärent mit
      ADR-028 D1. Integrationstest `should_keepAuslageVisibleWithFallbackName_when_zeileDeleted`
      (`db/auslage.test.ts:96`, DB-Integration – ohne DB skipped). ADR-028 D5 + Konsequenzen
      nachgezogen; Architektur bestätigt Konsistenz (kein Widerspruch mehr zu D1 „kein FK auf Zeile").

## Wichtige Findings (sollten behoben werden)

- [x] **BEHOBEN [2026-07-18] (W1):** Key-basierter Remount durch `formRef.current?.reset()` im
      `useCallback`-Wrapper ersetzt (`AuslageForm.tsx:50-60`, nur `!isEditing`). Leert die Felder bei
      **jeder** erfolgreichen Neu-Erfassung (nicht nur der ersten); kein `useEffect`-setState-Anti-
      Pattern (Codify #49). Tests `should_clearFields_when_createSucceeds` /
      `should_notResetFields_when_editSucceeds` (`AuslageForm.test.tsx:135-170`) rendern das echte
      Formular und prüfen den realen DOM-Node – kein Mock-Bypass.
- [x] **BEHOBEN [2026-07-18] (W2):** Drei separate `firstIssueMessage`-Assertions für die
      Betrag-Meldungen (Format / `>0` / int4-Obergrenze) gegen unabhängige Literale, getrennt von den
      Ablehnungs-Tests (`schema.test.ts:183-207`, Codify #116/#117).

## Nitpicks (optional)

- [ ] `app/veranstaltung/AuslageRow.tsx:75-92` – Status-Toggle- und Löschen-`<form>` wiederholen
      dasselbe Hidden-Input-Paar (`veranstaltungId`/`id`); eine kleine `HiddenIds`-Teilkomponente
      entfernt die Duplikation.
- [ ] `app/veranstaltung/schema.ts:58` – Magic Number `2_147_483_647` als benannte Konstante
      (z. B. `INT4_MAX` im money-Seam) wäre sprechender und wiederverwendbar.
- [ ] `app/veranstaltung/AuslagenSummary.tsx:8` – Flag-Parameter `bold?: boolean` in `SummenRow`
      (clean-code rät von Styling-Flags ab; rein präsentational, YAGNI greift teilweise).
- [ ] `lib/money.ts:38-45` – `centsToEuroInput` behandelt negative Cents nicht; durch DB-CHECK `> 0`
      domänen-unerreichbar, aber ein Guard/Kommentar wäre konsistent zu `formatCents`.
- [ ] `db/schema.ts:269` vs. `db/migrations/0010_spotty_the_call.sql:17` – Kommentar/ADR-028 D1 sagen
      „restrict", die Migration erzeugt `ON DELETE no action` (Drizzle-Default). Funktional gleich
      (beide verhindern Hard-Delete eines referenzierten Teilnehmers), aber Postgres `NO ACTION` ≠
      `RESTRICT` – Formulierung angleichen (z. B. „no action (Default, restriktiv)").
- [ ] `app/veranstaltung/actions.ts:311,326` – `setAuslageStatusAction`/`removeAuslageAction` werten
      den `undefined`-Rückgabewert bei IDOR-Mismatch nicht aus (kein Nutzer-Feedback). Fail-closed
      gewahrt (No-op); konsistent mit `setStatusAction`/`removeZeileAction`.
- [ ] `docs/adr/028-auslagen-datenmodell.md:256-257` – ADR bezeichnet den Orphan (Zeile gelöscht) als
      „korrigier-/lösch-/status-bar". Faktisch ist die **Korrektur** an eine Neuzuordnung gekoppelt:
      `updateAuslageAction` ruft `assertTeilnehmerInVeranstaltung` mit der Orphan-`teilnehmerId` → ohne
      Zeile abgelehnt, bis auf einen anwesenden Teilnehmer umgeordnet wird. Fachlich vertretbar; der
      finanzielle K1-Kern (Summen/F8, Löschen/Status) ist **nicht** betroffen. Optional ADR präzisieren.
- [ ] `factory.config.yml:45-58` – Prozess-/Tooling-Änderung (implement `tier: light→heavy`,
      `max_turns 40→50`) im Feature-Diff; als Task-53-Meta dokumentiert und als `chore:`-Commits
      eingecheckt. Ideal wäre ein separater Config-PR (Trennung Feature/Infra, ADR-019/#91). Nur zur
      Kenntnis.

## Positives

- **Alle Runde-1-Blocker dreifach unabhängig als behoben bestätigt** (Backend/Logik, Code-Qualität,
  Architektur) – der Diff ist ansonsten durchgängig ADR-treu.
- **K1-Fix architektonisch sauber & finanziell korrekt:** Orphan bleibt summen-/F8-wirksam;
  `teilnehmerId` restrict garantiert den Fallback-Namen; WHY-Kommentar begründet die Entscheidung.
- **IDOR durchgängig (Codify #51):** `update`/`setStatus`/`remove` binden `id AND veranstaltungId`
  im WHERE; Mismatch → `undefined`/No-op; Integrationstest vorhanden.
- **`.returning()`-Typen korrekt (Codify #50):** `Promise<Auslage>` für insert, `Promise<T|undefined>`
  für update/status/delete.
- **Zod-Grenze vollständig:** Betrag `> 0` + ≤2 NKS + int4-Obergrenze (Codify #49), `zweck.max(200)` +
  Null-Normalisierung (Codify #50), Status-Enum eigenständig; doppelt via DB-CHECK `betrag_cents > 0`.
- **Fail-closed-Reihenfolge** (RBAC → Zod → offen → Teilnehmer-`active`/Zuordnung) spiegelt ADR-028 D5;
  Guard-Duplikation in `assertTeilnehmerInVeranstaltung` extrahiert, beide Branches getestet.
- **Abschluss-Sperre** greift in allen vier Operationen (create/update/setStatus/remove).
- **D4 mustergültig:** Route unter dem von `proxy.ts` geschützten Bereich (kein Public-Endpoint,
  Codify #63); **kein** `app/_auslagen/`; DB-freies `auslagenSummen.ts` mit Domänennamen (Codify #105)
  inkl. getestetem `never`-Exhaustiveness-Guard; Anzeige über `formatCents`.
- **Schichtgrenzen dicht:** alle `auslage`-Queries nur in `db/auslage.ts`, keine rohen SQL-Strings in
  Actions/UI; `centsToEuroInput`-Seam sauber vom Anzeige-`formatCents` getrennt (Round-Trip-parsebar).
- **Cents-Summen exakt ganzzahlig** – kein Rundungs-/Off-by-One-Risiko.
- **Migration 0010** reine Neuanlage (2 Enums + Tabelle + CHECK `> 0` + 2 FKs); Journal/Snapshot
  konsistent fortgeschrieben.

## Empfehlung

APPROVED

Begründung: Der kritische Finanz-/Korrektheits-Defekt K1 sowie W1 und W2 aus Runde 1 sind belegbar
behoben und von allen drei Personas unabhängig bestätigt (Backend, Code-Qualität, Architektur je
APPROVED). Kein neuer kritischer oder wichtiger Fund. Die verbleibenden Nitpicks sind optional und
kein Merge-Blocker – alle im Task-Scope, keine Out-of-Scope-Issues angelegt. Offene Verifikations-
Reste (Migrations-Smoke-Test gegen Wegwerf-DB, E2E) sind Session-Umgebungs-Blocker und in
`/test`/`/post-merge-verify` nachzuziehen (siehe Task-Datei).

## Verlauf

- **Runde 1 (NEEDS_REWORK):** K1 (verwaiste Auslage bei Zeilen-Löschung → stiller Kassen-Datenverlust),
  W1 (Formular-Reset nur einmalig), W2 (Betrag-Meldungsinhalt ungetestet). Rework in Commit `5481e47`.
- **Runde 2 (APPROVED):** alle drei Blocker verifiziert behoben; nur Nitpicks offen.
