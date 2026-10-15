# Security Review: Task 406

Diff-Scope: `git diff origin/main...HEAD` (33 Dateien, reine UI-Umstellung der Auslagen-Seite
plus neuer Baustein `AktionsMenue`). Geprüft 2026-10-16.

**Server-Grenze unverändert:** `app/veranstaltung/actions.ts`, `db/`, `lib/`, `proxy.ts`,
`package.json` und `pnpm-lock.yaml` tauchen im Diff nicht auf. Alle drei Auslagen-Mutationen
behalten `requireRole("veranstalter")` und das Status-Gate `ziel.status !== "offen"`
(`createAuslageAction`, `updateAuslageAction`, `setAuslageStatusAction` über `offeneAuslageAus`);
`removeAuslageAction` ist nicht angefasst.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [x] [AuthZ / F2] Die Nur-lesen-Darstellung der abgeschlossenen Veranstaltung (`AuslageAnzeige`
  statt `ListenZeile`, kein „+ Neu") ist reine UI. Durchgesetzt wird sie weiterhin serverseitig
  über das Status-Gate jeder Action – das Ausblenden ist kein Schutz, aber auch nicht der einzige.
  Kein Handlungsbedarf.
- [x] [IDOR] `veranstaltungId`/`auslageId` sind weiter per `.bind` serverseitig gebunden
  (Erfassen, Bearbeiten) bzw. als Hidden im WHERE (Erstatten, Löschen); der Umbau ändert das
  Bindungsmuster nicht (`AuslageRow.tsx` `editAction`, `HiddenIds`).
- [x] [XSS] Kein `dangerouslySetInnerHTML`/`innerHTML`; Anzeigename, Zweck und Betrag werden als
  React-Text gerendert (escaped). `aria-label={`Aktionen für ${anzeigename}`}` ist ein
  Attributwert, ebenfalls escaped.
- [x] [Input-Validierung] Die Formularfelder sind nur umgestellt (`Field`/`SelectField`);
  `maxLength={200}` am Zweck bleibt clientseitige Bequemlichkeit, die Zod-Prüfung in der Action
  ist die Grenze (unverändert).
- [x] [Secrets] Die neue Opt-in-E2E-Spec `e2e/auslagen.spec.ts` liest Zugangsdaten aus
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (Env), nichts hartkodiert.
- [x] [Fehlerbehandlung] Ablehnungen erscheinen als `Notice` mit der Action-Meldung
  (`state.error`); keine Stack-Traces, keine neuen Fehlerpfade.
- [ ] [Hygiene, kein Sicherheitsrisiko] Gitignorte Wegwerf-Dateien liegen noch im Worktree
  (`scripts/e2e406.tmp.sh`, `scripts/cov406.tmp.sh`, `playwright-406.tmp.config.ts`,
  `e2e406-*.tmp.log`, `tasks/telemetry-raw-406-*.tmp.txt`). Nicht committet, aber vor dem
  Worktree-Abbau löschen (Lesson #372); bereits als Review-Nitpick Iteration 3 vermerkt, daher
  kein neuer `kleinfunde.md`-Eintrag.

## Dependencies

Keine neuen oder geänderten Dependencies.

## Ergebnis

PASSED
