# Security Review: Task 420

Scope: `git diff origin/main...HEAD` (16 Dateien). Produktionscode: `app/components/FormularDialog.tsx`,
`app/veranstaltung/AuslageErfassen.tsx`, `app/veranstaltung/AuslageForm.tsx`,
`app/veranstaltung/[id]/auslagen/page.tsx`; dazu Tests, E2E-Helfer und Doku (Spec, Glossar, Task, Review).

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] [Autorisierung] Der neue `deaktiviert`-Zustand von `DialogAktionen` ist eine reine UI-Sperre. Ohne
  Teilnehmer gibt es außerdem kein `<form>` mehr, also nichts zum Absenden. Die serverseitige Grenze bleibt
  unverändert `createAuslageAction` / `updateAuslageAction` (Rollen-Guard, Zod, Teilnehmer-Bezug); der Diff
  berührt sie nicht. Es wurde keine Prüfung vom Server auf den Client verlagert. Kein Handlungsbedarf.
- [x] [Autorisierung] Die Seite gibt den Auslöser weiterhin nur bei `offen` aus. Die Veranstaltungs-ID wird
  wie bisher serverseitig per `bind` gebunden. Entfernt wurde nur der zweite Auslöser im Leerzustand, damit gibt
  es eine Angriffsfläche weniger, keine neue.
- [x] [XSS] Alle neuen Texte sind statische Literale („Erfassen“, „Speichern“, „+ Neu“) und werden über React
  gerendert. Kein `dangerouslySetInnerHTML`, keine Nutzereingabe im Markup.
- [x] [Dependencies] `package.json` und `pnpm-lock.yaml` sind unverändert.
- [x] [Secrets/Logs] Keine Secrets, kein Logging, keine Fehlerausgaben neu.

## Out-of-Scope-Funde
_Keine._ (Die Nicht-Bearbeitbarkeit einer Auslage ohne Teilnehmer ist bereits als Issue #423 erfasst und
fachlich, nicht sicherheitsrelevant.)

## Ergebnis
PASSED
