# Task 428: factory-split-t2-factory-lock-einbinden (T2a-4 · Erst-Einbindung)

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Teil-Task T2 des Epics #424: TCH bindet die Factory als versionierte Kopie aus `nothra/dev-factory`
(Ziel **v0.8.0**, Nachtrag 2026-11-15) per `factory.lock` ein. **Geteilt am 2026-10-24 (zweimal):** diese Task ist **T2a-4 (Erst-Einbindung in TCH)**; T2a-1…3 laufen als Tasks in `nothra/dev-factory` ([#22](https://github.com/nothra/dev-factory/issues/22), [#23](https://github.com/nothra/dev-factory/issues/23), [#24](https://github.com/nothra/dev-factory/issues/24)) und gehen voran; **/implement erst nach dem Release der letzten.** Fund-Ablage + Neuprojekt (AK2.7, AK2.9–AK2.13, F8) sind T2b = #441.
Detail-Spec: [spec-428](../docs/specs/spec-428-factory-versioniert-per-factory-lock-einbinden.md);
Technik: [ADR-063](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) D1, D2, D4, D7, D10.

## Akzeptanzkriterien
> Volltext in spec-428 (eine Quelle). **Nur T2a-4**; die übrigen Kriterien gehören den Factory-Tasks.
- [ ] AK2.14a `factory.lock` existiert, `main` besteht alle Gates inkl. `factory-integrity`, jede Datei der Seite `factory` ist durch das Lock gedeckt
- [x] AK2.14b jede Abweichung TCH ↔ eingebundene Version ist Teil der Version oder ins Factory-Repo gegeben; Dateiliste Vorher/Nachher + `git log`-Beleg im PR
- [ ] AK2.14c `protect-main` führt `factory-integrity` als Required Check (nach dem Merge, menschlich); ADR-029-Nachtrag
- [x] AK2.15d TCHs `OWNERSHIP.md` entfernt, kein Text verweist mehr darauf als Quelle der Zuordnung
- [x] AK2.17a (#44) Gruppe „Factory-Lessons" aus `PROJECT-CONTEXT.md` im selben PR wie der Sync entfernt; Import-Deckel aus v0.8.0 grün
- [x] AK2.17b (#47) `start_work.copy_files: [".env.local"]` in `factory.config.yml`; `.env.local` wird weiter kopiert
- [x] AK2.17c (#49) Preflight von `run-pipeline.sh --dry-run 428` besteht; betroffene offene Tasks ohne AK-Spec im PR genannt
- [x] AK2.17d (#45) Routen-Doku-Regel in `CLAUDE.md` gegengeprüft, gilt erkennbar für `/implement` und `/review`
- [x] AK2.17e (#45) `runAtomic`-Regel an projekteigener, dauerhaft geladener Stelle
- [x] AK2.17f (#45) Oberflächentest-Details (Playwright, `e2e/*.spec.ts`, `webServer`, Preview `dev`, `.env.local`) in `PROJECT-CONTEXT.md`
- [x] AK2.17g (#45) `*.tmp.spec.ts`/`*.tmp.spec.tsx` in `.gitignore.project`, per `git check-ignore` belegt
- [ ] AK2.17h (#37, menschlich) `FACTORY_SYNC_TOKEN` als Environment-Secret `factory-update`, kein Repository-Secret
- [x] AK2.18a Generische Lessons aus #443/#444/#447/#448/#412 vor dem Sync ins Factory-Repo gegeben, im PR verlinkt
- [x] AK2.18b Abhängigkeits-Floor-Tests nach `scripts/project/tests/`, Fallzahl gleich, Mutationsbeleg
- [ ] AK2.18c Jede Factory-Seiten-Änderung auf `main` seit der Herauslösung zugeordnet; Liste direkt vor dem Merge neu erzeugt
- [ ] FS-T2.5 Neue Factory-Seiten-Änderung zwischen PR und Merge → zugeordnet, sonst kein Merge
- [ ] AKE.1 Pipeline unverändert, Self-Tests und App-Gates grün, Required-Check-Namen bis auf `factory-integrity` unverändert
- [ ] AKE.2 eigener PR/Issue, beide Repos grün; Reihenfolge Factory-Releases → TCH-PR

## Technische Notizen
Entscheidungen: [ADR-063 Nachtrag 2026-10-24 + „Zweiter Schnitt von T2a“](../docs/factory/adr/063-factory-eigenes-repo-vendored-manifest.md) (Q1–Q9).
- **Reihenfolge:** (1) Factory-Tasks in `nothra/dev-factory`, je ein Release: T2a-1 Konsumenten-Vertrag (Ownership-Modus Q7, Suite-Schnitt Q8; `OWNERSHIP.md` dort projekteigen), T2a-2 `factory-sync.sh` Sync-Modus (atomar, Temp-Dir, Bash 3.2, `shasum -a 256`) + `factory-integrity-check.sh` + CI-Job, T2a-3 `factory-update.yml`. (2) TCH-PR #428 bindet die letzte Version ein: Bootstrap per Tag-Tarball + `FACTORY_DIR` (Q9), `factory.lock`, `OWNERSHIP.md` löschen, Verweise umstellen, Log-Beleg (AK2.14b). (3) Nach Merge: Ruleset-Eintrag (Q4, menschlich), ADR-029-Nachtrag.
- **Messung (2026-10-24):** v0.6.0 hatte 113 Dateien, TCH 111; 37 identisch, 50 nur durch `#nr`-Qualifizierung verschieden, 24 mit Textänderung (Wiederholung gegen v0.6.1: 34 / 47 / 30) (groß: `run-tests.sh` ~1000 Zeilen, `OWNERSHIP.md`, ADR-063, `OPERATING.md`); zusätzlich in v0.6.0: `factory-release-check.sh`, `factory-release-manifest.sh`.
- **Änderungsstopp:** Seite-`factory`-Dateien in TCH nicht mehr ändern; Ausnahme dieser ADR-Nachtrag (wandert mit v0.7.0 ins Factory-Repo). **Verletzt (Prüfung 2026-11-17):** #443, #444, #447, #448, #412 haben Factory-Seiten-Dateien geändert (Lessons, `run-tests.sh` Floor-Tests, `kleinfunde.md`); nichts davon ist in v0.8.0 → AK2.18a–c.
- **Messung (2026-10-24) überholt:** AK2.14b wird gegen **v0.8.0** neu gemessen.
- **Tests (TDD):** Sync-Abbruch per Stub im `PATH` (Messung brechen, Lesson #319); je Gate-Stufe Mutationsbeleg; Fixture-Release offline.

## Offene Fragen
- [x] Q1 Reihenfolge: Factory-PR → v0.7.0 → TCH-PR (ADR-063 Nachtrag Q1); umgesetzt als **v0.8.0**
- [x] Q2 Erst-Einbindung = Wechsel auf v0.7.0, Änderungsstopp, Log-Beleg (Nachtrag Q2/Q9); Ziel jetzt **v0.8.0**
- [ ] Q3 `FACTORY_SYNC_TOKEN` (PAT) anlegen – menschlicher Schritt vor erstem Workflow-Lauf (nach T2a-4); als Environment-Secret `factory-update` (→ AK2.17h)
- [x] Q4 Ruleset `factory-integrity` erst nach dem Merge (Nachtrag Q4)
- [x] Q6 T2 geteilt: T2a #428 / T2b #441
- [x] Q7 Skill-Texte (AK2.12) → T2b

## Umsetzungs-Notizen (/implement, 2026-11-18)
- **Bootstrap (Q9):** Tag-Tarball `v0.8.0` entpackt, `FACTORY_DIR=<worktree> bash <tarball>/scripts/factory-sync.sh v0.8.0 --adopt`; vorher `factory.defaults.yml` aus dem Tarball vorgelegt (das alte TCH-Defaults kennt `upstream.repo` nicht → Abbruch „Quell-Repo nicht ermittelbar"). Ergebnis: 129 Dateien, `factory.lock` geschrieben, `factory-integrity` (lokale Stufe) grün.
- **AK2.14b – Vorher/Nachher (Seite `factory`):** vorher 111 Dateien (TCH), nachher 129 (Lock). **19 neu** (u. a. `factory-update.yml`, `factory-integrity-check.sh`, `factory-update.sh`, `lib/factory-lock.sh`, `customization-points.txt`, ADR-064/065/066, `lessons/INDEX.md`, sechs `factory-lock-*-tests.sh`, `lib/factory-lock-fixtures.sh`, `lib/test-groups.sh`, `factory-release-check.sh`, `factory-release-manifest.sh`), **1 entfallen** (`OWNERSHIP.md`, gehört im Factory-Repo dem Projekt), von 110 gemeinsamen Dateien **29 identisch, 24 nur `#nr`-Qualifizierung, 57 mit Textänderung**. Beleg, dass keine der 57 eine TCH-Änderung verliert: `git log f998473..origin/main -- <Lock-Pfade>` (f998473 = Herauslösung #427) nennt nur #412/#447/#444 (siehe AK2.18c); alle übrigen Textabweichungen stammen aus Factory-Releases (T1b-Bereinigung, v0.7.0, v0.8.0).
- **AK2.18c – Zuordnung (Stand 2026-11-18, vor Merge neu erzeugen, FS-T2.5):** `git log --format='%h %s' f998473..origin/main -- $(jq -r '.files[].path' factory.lock)`
  | Commit | Datei | Zuordnung |
  |---|---|---|
  | 2a4ff8d (#412) | `scripts/checks/tests/run-tests.sh` (Floor-Fall source-map-js) | projekteigen verschoben → `scripts/project/tests/dependency-floor-tests.sh` |
  | 479ba24 (#447) | `run-tests.sh` (undici-Floors, Mutationsbelege) | projekteigen verschoben (ebenda) |
  | 479ba24 (#447) | `docs/factory/lessons/testing.md`, `build-tooling.md` | ins Factory-Repo gegeben: [nothra/dev-factory#60](https://github.com/nothra/dev-factory/issues/60) |
  | 479ba24 (#447) | `docs/factory/kleinfunde.md` (Eintrag „undici-8.x-Vorsorge" entfernt) | bewusst verworfen: der Fall ist mit #447 umgesetzt (`undici|8|…` in den Floor-Fällen), der Eintrag war erledigt |
  | 4d05b02 (#444) | `run-tests.sh` (vite/vitest/@vitest/mocker-Floors) | projekteigen verschoben |
  | 4d05b02 (#444) | `lessons/build-tooling.md` | ins Factory-Repo gegeben: dev-factory#60 |
  #443 und #448 haben keine Datei der Seite `factory` geändert.
- **AK2.18a:** Issue [nothra/dev-factory#60](https://github.com/nothra/dev-factory/issues/60) (Label `lesson-vorschlag` existiert im Factory-Repo noch nicht → T2b #441; Titel trägt das Präfix).
- **AK2.18b:** 400 Zeilen / 44 `assert_true`-Aufrufe (plus die Schleifeniterationen) byte-identisch von `run-tests.sh` nach `dependency-floor-tests.sh` verschoben, in `run-project-tests.sh` gesourct (Suite grün, 334 Fälle). Die Fixtures der Mutationsbelege reisen mit. Einen Live-Mutationsbeleg gegen das echte Lockfile gab es **nicht** (Schreibzugriff auf `pnpm-lock.yaml` in der Session gesperrt); die eingebauten Fixture-Belege (postcss, brace-expansion, undici 6/7/8, vite) laufen weiter grün.
- **AK2.17a:** Gruppe „Factory-Lessons" aus `PROJECT-CONTEXT.md` entfernt. **Abweichung:** der Index der Projekt-Lessons (21,9 KB) sprengte allein den Deckel (38.000 B) → Einzelliste nach `docs/project/lessons/INDEX.md`, in `PROJECT-CONTEXT.md` nur eine Tabelle Datei ↔ „Laden bei"; zusätzlich verdichtet (Katalog-Begriff, Labels-Hinweis, Build/Test/Qualität, Stolpersteine-Intro). Stand 694/750 Zeilen, 37.701/38.000 Bytes. **Reibung mit dem Factory-Vertrag:** `/codify` (v0.8.0) schreibt Projekt-Index-Zeilen nach `PROJECT-CONTEXT.md` – hier steht deshalb ein Hinweis, sie nach `docs/project/lessons/INDEX.md` zu setzen; ein Factory-seitiger Weg für große Projekt-Indizes fehlt (Fund → Factory-Repo, s. u.).
- **AK2.17c:** `bash scripts/run-pipeline.sh --dry-run 428` → „Pre-flight checks passed". Offene TCH-Tasks mit geplantem Lauf, aber ohne Spec mit `## Akzeptanzkriterien`: **#365** und **#88** (keine Spec-Datei).
- **AK2.17d/e:** `CLAUDE.md` → Routen-Doku-Regel um „in `/implement` als Schritt, in `/review` als Prüfpunkt" ergänzt; neue Regel `runAtomic` statt `db.transaction()` (dauerhaft geladen).
- **Offen/menschlich:** AK2.14c (Ruleset + ADR-029-Nachtrag nach dem Merge), AK2.17h (`FACTORY_SYNC_TOKEN` als Environment-Secret `factory-update`), FS-T2.5 (AK2.18c-Liste direkt vor dem Merge neu erzeugen), AKE.1/AKE.2 nach grüner CI beider Repos.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/428-factory-split-t2-factory-lock-einbinden`
Erstellt: 2026-10-24 14:30
