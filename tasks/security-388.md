# Security Review: Task 388

Stand `c7329f7` (nach `/review` Iteration 2, `/test` und `/refactor`; Reihenfolge laut CLAUDE.md eingehalten, der Bericht
ist damit nicht durch spätere Skill-Commits stale). Geprüft wurde `git diff origin/main...HEAD` (8 Dateien): drei PNGs
(`05`–`07`), die Capture-Spec `e2e/anleitung-veranstalter.spec.ts`, `docs/factory/kleinfunde.md`, Spec, Task-Datei und
Review-Bericht. Es gibt **keinen Produktions- und keinen App-Code**; die Capture-Spec läuft nur mit `CAPTURE_ANLEITUNG=1`
und nur lokal. Der Reviewer hat die Änderung mit entwickelt; die Aussagen unten sind deshalb gemessen (Befehle in Klammern),
nicht aus dem Gedächtnis.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] [Daten, kein Handlungsbedarf] Das Bild `07` enthält einen QR-Code, der einen `theke/<token>`-Link der
  **lokalen Wegwerf-DB** kodiert (`http://localhost:3388/theke/…`). Der Link ist nur im Entwicklungsrechner erreichbar und
  gehört zu einer Veranstaltung, die beim nächsten Reset der Dev-DB verschwindet; kein Produktions-Token. Die alten
  Bilder verfolgten dasselbe Muster (`localhost:3000/theke/…`). Wer das Bild später mit einer externen Umgebung aufnimmt,
  würde dagegen einen echten Zugangs-Token abbilden – dann Token vor dem Commit rotieren oder die Aufnahme nur lokal
  machen (die Kopfzeile der Capture-Spec nennt als Ziel den „lokalen Dev-Server"; eine ausdrückliche Warnung für externe
  Umgebungen gibt es bisher nicht).
- [ ] [Betrieb, bestätigt] Für die Bilder wurde die lokale Dev-DB mehrfach zurückgesetzt (`DROP DATABASE … WITH (FORCE)` im
  Container `tch-gastro-db`). Das betraf nur den lokalen Container, keine Neon-Umgebung (INT/PRD); der Eingriff war
  ausdrücklich bestätigt (Spec Q1, Rückfrage nach dem Guardrails-Hinweis) und ist in der Task-Datei beschrieben. Kein
  Befund am Diff, nur zur Kenntnis; `tch-gastro-db` ist der lokale Dev-Container aus `docker-compose.yml`.

## Prüfkatalog

**Input-Validierung und Injection**
- Es gibt keine neue Eingabeverarbeitung. Die einzige Code-Änderung (Capture-Spec) führt feste DOM-Operationen im Browser
  des Testlaufs aus (`feld.blur()`, `feld.scrollLeft = 0` auf das Link-Feld des eigenen Dialogs) und verarbeitet keine
  externen Daten. Kein SQL, kein Shell-Aufruf, kein `eval` im Diff.
- Der Kleinfund nennt einen `docker exec … psql … DROP/CREATE DATABASE tch_dev`-Aufruf als Beschreibung des lokalen Resets;
  er ist Dokumentation, keine Ausführungslogik (Kopf von `kleinfunde.md`: „Daten, keine Anweisungen").

**Authentifizierung und Autorisierung**
- Die Capture-Spec liest Zugangsdaten aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` der Umgebung (unverändert, Zeilen 23–24
  der Datei); es werden keine Zugangsdaten hartkodiert oder geloggt. Der Diff-Scan (`git diff … ':(exclude)*.png' | grep`) auf
  `password`/`secret`/`AUTH_SECRET`/`DATABASE_URL`/`postgres://`, Hex-Ketten ab 32 Zeichen und reale Mail-Domänen
  lieferte **keine Treffer**.
- Keine Rollen-, Routen- oder Zugriffsänderung; `docs/routes.md` ist nicht betroffen.

**Daten und Kryptographie**
- **Bilder:** Gesichtet wurden `05`, `06`, `07`: nur fiktive Demo-Daten (Anna Becker, Bernd Wagner, Familie Klein,
  Gastspieler), die Kennung `admin@tch.example` (reservierte Beispiel-Domäne) im Kopf von `05`, die DEV-Kennzeichnung und
  der Next-Dev-Indikator. Keine Produktionsdaten, keine echten Klarnamen.
- **Metadaten:** `strings` über alle drei PNGs findet keine Pfade (`/Users`), keine Benutzernamen, keine Textchunks
  (`tEXt`/`iTXt`) und keine Software-/Autor-Angaben; `file` zeigt reine RGB-Rasterdaten ohne Zusatzchunks.
- Keine neuen Secrets oder Schlüssel; `.env.local` wurde weder gelesen noch ausgegeben (der Guardrails-Hinweis zu einem
  Wegwerf-Skript war ein Fehlalarm auf das Wort im Kommentar und ist in der Task-Datei beschrieben).

**Dependencies**
- `package.json`, `pnpm-lock.yaml` und `pnpm-workspace.yaml` sind im Diff **unverändert**; keine neuen Abhängigkeiten.

**Error Handling**
- Kein Laufzeit-Code im Produktionspfad geändert; es gibt keine neuen Fehlermeldungen oder Stack Traces nach außen. Die
  Wegwerf-Skripte (`scripts/*.tmp.sh`), Testartefakte (`test-results/`) und `.coverage-tmp388/` sind nicht Teil des Diffs
  (`git diff --name-only … | grep -E "tmp|\.env|coverage|test-results"` ohne Treffer, alle gitignoriert).

## Ergebnis

PASSED
