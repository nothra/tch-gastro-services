# Security Review: Task 404

Geprüft: `git diff origin/main...HEAD` (33 Dateien) am 2026-10-09. Serverseitig relevant sind nur
`createWalkInAction` (`app/veranstaltung/actions.ts:397–421`), `createTeilnehmerAction`
(`app/verwaltung/teilnehmer/actions.ts`, nur Konstante ausgelagert) und `schema.ts` (neue
Text-Konstante). Der Rest ist Client-UI, Tests, E2E und Doku. Keine neuen Dependencies
(`package.json`/`pnpm-lock.yaml` unverändert).

## Kritische Findings (Blocker)

Keine.

## Wichtige Findings

Keine.

## Hinweise

- [x] [Autorisierung] `createWalkInAction` prüft weiterhin zuerst die Rolle (`requireRole("veranstalter")`),
  dann Existenz und Status `offen` der Veranstaltung, dann die Eingabe per Zod
  (`teilnehmerSchema`, Name getrimmt, max. 200 Zeichen) – Reihenfolge fail-closed. Neu ist nur die
  Duplikat-Prüfung davor; sie fügt eine Hürde hinzu und entfernt keine. Kein Handlungsbedarf.
- [x] [Input-Validierung] `confirmDuplicate` kommt aus einem versteckten Feld und ist damit
  clientkontrolliert. Das ist eine fachliche Warnung (ADR-022), keine Sicherheitskontrolle – ein
  Veranstalter darf ein Duplikat bewusst anlegen; das Verhalten ist identisch mit der Verwaltung.
  Dass die Bestätigung nicht an den gewarnten Namen gebunden ist, ist bereits als Issue #416
  erfasst (UX-/Daten-Defekt, kein Sicherheitsrisiko). Kein neues Issue.
- [x] [Datenintegrität] `createTeilnehmer` + `addZeile` laufen nicht atomar (vorbestehend, in diesem
  PR nur um die Duplikat-Prüfung ergänzt). Folge im Fehlerfall: ein angelegter Teilnehmer ohne
  Zeile – kein Rechte- oder Datenleck. Bereits in `docs/factory/kleinfunde.md` („`createWalkInAction`:
  Anlegen und Hinzufügen nicht atomar", Fix über `runAtomic`). Kein neuer Eintrag.
- [x] [Information Disclosure] Die Duplikat-Warnung verrät, dass ein aktiver Teilnehmer mit dem
  Namen existiert. Der Veranstalter sieht die aktiven Teilnehmer ohnehin in der Auswahl; kein
  neuer Informationsabfluss. Fehlermeldungen kommen aus Zod-Custom-Messages bzw. festen
  Konstanten, keine Stack Traces nach außen.
- [x] [XSS] Suchtext und Namensvorschlag (`„<Suchtext>" als Teilnehmer anlegen`, Feld-Vorbelegung
  per `defaultValue`) werden ausschließlich über JSX gerendert und damit escaped; kein
  `dangerouslySetInnerHTML`/`innerHTML` im Diff.
- [x] [Injection] DB-Zugriff nur über die Drizzle-Data-Layer (`findActiveByName`,
  `createTeilnehmer`, `addZeile`), keine rohen SQL-Strings.
- [x] [Secrets] Keine Credentials im Code. `e2e/teilnehmer-anlegen.spec.ts` liest Login-Daten aus
  `SEED_ADMIN_*`-Env-Vars und überspringt ohne sie – gleiches Muster wie die bestehenden Specs.

## Ergebnis

PASSED
