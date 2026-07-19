# Spec: format:check-Drift beheben + Format-Gate

## Kontext

`pnpm format:check` (`prettier --check .`) meldet aktuell **38 Dateien** als nicht
Prettier-konform (Produktionscode + Tests unter `app/`, `db/`, `lib/`). Der Drift ist
rein kosmetisch (Zeilenumbrüche/Whitespace, kein Verhaltensunterschied).

**Ursache:** `format:check` ist an **keiner Stelle** als Gate verdrahtet – weder in
`scripts/checks/pre-commit.sh`, noch in `scripts/checks/pre-push.sh`, noch in einem
CI-Workflow. Nichts erzwingt Prettier-Konformität, deshalb konnte der Drift unbemerkt
über viele PRs anwachsen. Ein reiner `pnpm format` behebt nur das Symptom; ohne Gate
kehrt der Drift zurück.

Analog zu #137 (Typecheck-Gate nachgerüstet, nachdem ein Build-Break durch die Gates
rutschte) wird der Fix zur Regel: Format-Prüfung als fail-closed-Gate in `pre-push.sh`.

## Scope

**Inbegriffen:**
- Alle 38 gemeldeten Dateien durch `pnpm format` Prettier-konform machen (nur Whitespace/
  Umbrüche, kein Verhalten).
- `format:check` als eigenen fail-closed-Check in `scripts/checks/pre-push.sh` ergänzen –
  Muster identisch zum bestehenden Typecheck-Gate (Check 2), inkl. Env-Override
  `FACTORY_FORMAT_COMMAND` (Default `pnpm format:check`).
- Struktur-Selbsttest in `scripts/checks/tests/run-tests.sh`, der das Format-Gate absichert
  (analog zu den #101-Gate-Assertions).

**Nicht inbegriffen:**
- Änderung der Prettier-Konfiguration oder von `.prettierignore` (Factory-Inhalte unter
  `docs/`, `tasks/`, `scripts/` bleiben bewusst ungeprüft – nicht anfassen).
- Format-Gate zusätzlich in `pre-commit.sh` oder in einem CI-Workflow (bewusst nur
  `pre-push` – ein Ort, konsistent mit Typecheck). Kein Gold-Plating.
- Jede inhaltliche/logische Code-Änderung an den 38 Dateien.

## Akzeptanzkriterien

- [ ] **AC1 – Drift behoben:** GIVEN 38 nicht-konforme Dateien, WHEN `pnpm format`
  ausgeführt wird, THEN `pnpm format:check` endet mit Exit 0 („All matched files use
  Prettier code style!").
- [ ] **AC2 – Nur Formatierung:** GIVEN der Diff dieser Task, WHEN er geprüft wird, THEN
  enthalten die Änderungen an `app/`/`db/`/`lib/`-Dateien ausschließlich Whitespace-/
  Umbruch-Änderungen (kein geänderter Identifier, keine geänderte Logik).
- [ ] **AC3 – Gate greift fail-closed:** GIVEN eine Datei mit Prettier-Drift im Arbeitsbaum,
  WHEN `scripts/checks/pre-push.sh` läuft, THEN blockiert der Format-Check den Push (Exit 1,
  rote Meldung), analog zum Typecheck-Gate.
- [ ] **AC4 – Env-Override:** GIVEN `FACTORY_FORMAT_COMMAND` ist gesetzt, WHEN `pre-push.sh`
  läuft, THEN wird dieser Befehl statt des Defaults `pnpm format:check` ausgeführt.
- [ ] **AC5 – Selbsttest:** GIVEN `scripts/checks/tests/run-tests.sh`, WHEN es läuft, THEN
  prüft es strukturell, dass `pre-push.sh` das Format-Gate (`FACTORY_FORMAT_COMMAND` +
  `format:check`) enthält – Positiv-Assertion, konsistent mit den #101-Gate-Tests.

## Fehlerszenarien

- [ ] **Leerer Format-Befehl:** GIVEN `FACTORY_FORMAT_COMMAND=""` (bewusst deaktiviert),
  WHEN `pre-push.sh` läuft, THEN gibt der Check eine Warnung aus und lässt den Push zu
  (nicht blockierend) – exakt wie Typecheck/Test-Gate bei fehlender Konfiguration.
- [ ] **Prettier nicht installiert / Aufruf schlägt hart fehl:** WHEN der Format-Befehl
  einen Non-Zero-Exit liefert, THEN wird der Push blockiert (fail-closed) – kein stilles
  Durchwinken.

## Offene Fragen

- [ ] Keine. Scope in Rücksprache mit dem Entwickler bestätigt (Drift + Gate, nicht nur Drift).
