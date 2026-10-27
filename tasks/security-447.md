# Security Review: Task 447

**Datum:** 2026-10-27 · **Diff-Scope:** `git diff origin/main...HEAD` (7 Dateien: `pnpm-workspace.yaml`,
`pnpm-lock.yaml`, `scripts/checks/tests/run-tests.sh`, `docs/factory/kleinfunde.md`, Spec, Review, Task-Datei)

**Angriffsfläche:** Kein Anwendungscode berührt (`app/`, `db/`, `lib/` unverändert). Geändert werden nur
die Override-Konfiguration, das Lockfile (eine Paketversion), Floor-Guard-Testfälle und Doku. undici
kommt ausschließlich über jsdom (Vitest-Environment, dev-Scope) in den Baum – nicht ins Produktions-Bundle.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] [Hygiene] Sechs gitignorte Wegwerf-Dateien liegen noch in `scripts/`:
  `advisory447.tmp.sh`, `advisory447b.tmp.sh`, `floor447.tmp.sh`, `pnpm447.tmp.sh`, `runtests447.tmp.log`
  und die Probe dieses Reviews `sec447.tmp.sh` (`git status --ignored`). Keine Secrets darin, nicht
  getrackt, also kein Leck im PR – aber `runtests447.tmp.log` macht lokal den Content-Scan-Guard rot
  (Lesson #312/#339). Das Löschen per `rm` war in dieser Session nicht freigegeben → **vor dem Merge
  von Hand entfernen.** Kein Issue/Kleinfund: Arbeitsbaum-Zustand, kein Repo-Befund.

## Geprüft (Prüfkatalog)

**Input-Validierung & Injection / AuthN/AuthZ / Kryptographie / Error Handling:** nicht berührt – der
Diff enthält keinen Anwendungscode, keine Eingabepfade, keine Auth-Logik, keine Fehlerausgaben.

**Secrets:** Diff enthält keine Credentials, Tokens oder URLs mit Zugangsdaten (nur GHSA-IDs,
Versionsnummern, ein öffentlicher Integrity-Hash).

**Dependencies (Schwerpunkt):**
- **Keine neue Abhängigkeit** – nur undici 7.30.0 → 7.30.1 (Patch-Level, gleiche Major-Linie); Lockfile
  enthält genau eine undici-Kopie.
- **Integrität unabhängig geprüft:** Lockfile-Hash `sha512-03KrMbjI…az+nLYxg==` ist identisch mit
  `dist.integrity` der npm-Registry für `undici@7.30.1`; das Release trägt eine Provenance-Attestation.
- **Advisory-Lage unabhängig gemessen** (npm-Bulk-Advisory-API, `pnpm audit` ist in dieser Sandbox defekt):
  `undici@7.30.1` → **keine** Treffer. Gegenprobe `undici@7.30.0` → GHSA-xjj6-f33q-929c (high),
  GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472 (moderate). Das deckt sich mit den Messwerten aus /implement.
- **Override-Form:** Caret innerhalb der Major-Linie (`^7.30.1`), Selektor unten auf `>=7.0.0`
  begrenzt – entspricht der Lesson zu Override-Ziel-Ranges (#291/#339); keine Anhebung über eine
  Major-Grenze möglich.
- **Fail-closed-Deckung der Nachbarlinien:** 6.x und 8.x haben keinen Override-Selektor, werden aber
  vom Floor-Guard mit Floors 6.29.1 / 8.12.2 abgedeckt. Jeder Fall hat einen Mutationsbeleg samt
  Diskriminierungs-Kontrolle: Major 6 mit 6.29.0, Major 7 mit 7.30.0, Major 8 mit 8.12.1 und
  7.x-Nachbarzeile. Der Guard wird also rot, sobald eine verwundbare Kopie einzieht. Die
  Floor-Werte stimmen mit den Advisory-Ranges überein, die in /implement je Linie gemessen wurden.
- **Restliche Treffer im Baum** (vite, @vitest/mocker) liegen außerhalb dieses Scopes und sind bereits
  in #444 erfasst – kein neues Issue nötig.

**Nach-Merge (AK12):** Ob Dependabot-Alert #100 geschlossen ist, lässt sich erst prüfen, nachdem
der Default-Branch aktualisiert wurde (Lesson #390). Das ist kein Merge-Blocker.

## Ergebnis
PASSED
