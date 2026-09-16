# Task 339: brace-expansion-5x-override

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Dritter, konditionaler `brace-expansion`-Override (4.x/5.x-Linie, Selektor
`>=4.0.0 <5.0.9`, Ziel-Range als Caret innerhalb der 5er-Linie) gegen zwei neue
High-Advisories (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895), gefunden in der Security-Review
von Task 337. Betroffen: `brace-expansion@5.0.7` im Lockfile (dev-only, via
`minimatch@10.2.5` → `@typescript-eslint/typescript-estree`). Details: Spec-339.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
Siehe [`docs/specs/spec-339-brace-expansion-5x-override.md`](../docs/specs/spec-339-brace-expansion-5x-override.md).
- [x] Dritter Override-Eintrag in `pnpm-workspace.yaml` (`brace-expansion@>=4.0.0 <5.0.9` → Caret-Range)
- [x] Keine aufgelöste `brace-expansion`-4.x/5.x-Kopie unter 5.0.9 im Lockfile
- [x] No-op-Kriterium gemessen (Override entfernen, neu auflösen, tatsächliche Version dokumentieren)
- [x] Floor-Guard in `scripts/checks/tests/run-tests.sh` (`floor_cases_291`) um dritten Fall erweitert
- [x] Bestehende 1.x/2.x-Overrides und -Guards unverändert
- [x] Pre-Push-Checks (Lint, Tests, Typecheck, Format) grün

## Technische Notizen

**Messungen (nicht vermutet):**
- Registry-Stand zum Implementierungszeitpunkt: höchste 5er-Patch = `5.0.12`, Floor der beiden
  Advisories = `5.0.9` → Ziel-Range `^5.0.9`.
- **No-op-Kriterium: kein No-op.** Der Zustand *ohne* den Eintrag ist das Lockfile vor dieser
  Task: aufgelöst war `brace-expansion@5.0.7` (zwei Snapshot-Schlüssel, Kante an
  `minimatch@10.2.5`) – unter beiden Floors. Mit dem Eintrag löst der Baum `5.0.12` auf.
  Lockfile-Diff ist minimal (nur diese eine Version, `5.0.7 → 5.0.12`).
- Volle Advisory-Liste per GitHub-Advisory-API gegengeprüft (Lesson `build-tooling.md`, #231/#337):
  `GHSA-rgw5-rvv9-x895` trägt vier Range-Gruppen (`<1.1.18`, `>=2.0.0 <2.1.4`,
  `>=3.0.0 <3.0.6`, `>=4.0.0 <5.0.9`), `GHSA-mh99-v99m-4gvg` deren Vorläufer-Floors.
  Die untere Schranke `>=4.0.0` (statt `>=5.0.0`) folgt daraus, dass die 4er-Linie keinen
  eigenen Fix hat, sondern in der 5er-Linie gepatcht wird.

**Abweichung von Spec-AK4 (bewusst, mit Beleg):** Die Spec nennt „einen dritten
`brace-expansion`-Fall (Major `4`, Floor `5.0.9`)". Ein solcher Einzelfall hätte die real
aufgelöste `5.0.7` **nie gesehen** – `lock_versions_291` filtert je Major-Linie
(`grep "^  <paket>@<major>\."`). Im RED-Lauf war der Major-4-Fall prompt grün, während erst der
Major-5-Fall anschlug (`gefunden: 5.0.7`). Eingetragen sind daher **zwei** Fälle (Major 4 und
Major 5, beide Floor `5.0.9`) für den einen Selektor; Spec-AK2 („keine 4.x- *oder* 5.x-Kopie
unter 5.0.9") ist damit vollständig erfüllt, AK4s „schlägt bei einer künftigen Regression real
an" ebenfalls. Begründung steht als Kommentar direkt über den beiden Tabellenzeilen.

**Zusätzliche Assertion für AK1:** Der projektweite Konditionalitäts-Guard prüft nur die
**obere** Schranke, der Caret-Guard nur die Ziel-Range – ein versehentliches
`brace-expansion@<5.0.9` (das auch 1.x/2.x über die Major-Grenze höbe) käme dort unauffällig
durch. Deshalb eine exakte Zeilen-Assertion analog zu den 1.x/2.x-Pendants, plus Mutationsbeleg:
mit der mutierten Selektor-Zeile war genau diese eine Assertion rot, der Konditionalitäts-Guard
blieb grün – die behauptete Blindheit ist gemessen, nicht angenommen.

**3.x-Linie bewusst offen:** `brace-expansion` pflegt parallel eine 3er-Linie mit eigenen Floors
(`3.0.6` / `3.0.3`). Der Baum löst heute keine 3.x-Kopie auf, deshalb kein vierter Selektor und
kein Floor-Fall – dokumentiert im Kommentarblock von `pnpm-workspace.yaml`, damit ein künftiges
Hereinziehen nicht unbemerkt bleibt.

**Keine UI-Berührung:** reine Dependency-/Gate-Änderung, kein `app/`-Diff → keine
Oberflächentests und keine Routen-Doku-Pflege nötig (Routen-Drift-Check lief grün).

**Gates:** `bash scripts/checks/pre-push.sh` vollständig grün (Lint, 803 Vitest-Tests,
Typecheck, Format, Routen-Doku, Hooks, @import-Limit). Bash-Suite: 1555 grün / 0 rot.

## Offene Fragen
_Keine._

## Out-of-Scope-Funde (nicht in diesem PR behoben)
- **`run-tests.sh` #334-Kostensummen-Test ist locale-abhängig rot.** In einer `de_DE.UTF-8`-Shell
  (`LC_NUMERIC`) liest `awk` die CSV-Werte `0.05`/`0.08` als 0 und formatiert mit Dezimalkomma →
  der Vergleich gegen `"0.13"` schlägt fehl (`war: 0,00`). Repro isoliert bestätigt:
  ambiente Locale `0,00`, `LC_ALL=C` `0.05`. Mit `LC_ALL=C` ist die Suite 1555/0 grün.
  Nicht Teil des Push-Gates (die Bash-Suite läuft in CI, dort C-Locale) und außerhalb des
  Task-339-Scopes – Kandidat für einen eigenen Fix (`LC_ALL=C` vor dem `awk`-Aufruf).
- **Wegwerf-Skript `scripts/measure-339.tmp.sh`** (gitignoret über `*.tmp.sh`, daher nicht im
  Diff) liegt geleert auf der Platte; `rm` war in dieser Session nicht freigegeben. Manuell
  entfernen: `rm scripts/measure-339.tmp.sh`.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/339-brace-expansion-5x-override`
Erstellt: 2026-09-16 11:54
