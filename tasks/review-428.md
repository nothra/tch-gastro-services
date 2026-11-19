# Review: Task #428

Geprüft: `git diff origin/main...HEAD` (120 Dateien; 129 vendorte Factory-Dateien nur über Integritäts-Gate und Stichproben, Projekt-Anteil ~38 Dateien vollständig), Spec-AK T2a-4, CI-Stand PR #440.

## Kritische Findings (müssen behoben werden)
- [x] `scripts/project/tests/run-project-tests.sh:454-459` – Der Test „#431 AK-F4" liest `docs/factory/OWNERSHIP.md`, die dieser PR löscht (AK2.17a). In CI: `grep` auf nicht lesbare Datei → Required Check `test` rot („330 grün, 2 rot": deploy-gate.yml, deploy-freeze-release.yml). Verletzt AKE.1 (App-Gates grün). Fix: Prüfung auf die Lock-Seite umstellen – beide Workflows dürfen **nicht** in `factory.lock` unter `files[].path` stehen (Seite `project`), Testtext „…ist als project in OWNERSHIP.md geführt" entsprechend anpassen. Der Vorbericht „Projekt-Suite 334 grün" stammte offenbar aus einem Lauf vor dem Löschen von OWNERSHIP.md – vor Re-Push Suite erneut vollständig laufen lassen.
- [x] CI `factory-self-test` rot: `#49 AK1: Spec mit 5 AK → /implement mit max 20 turns` (vendorte `scripts/checks/tests/run-tests.sh:3709`, `printf '%s' "$OUT_49" | grep -qE …` unter `pipefail` → `printf: Broken pipe`). Lokal 2555 grün, in CI rot: bekannte SIGPIPE-Race-Klasse (Lesson „`printf | grep -q` auf größere Haystacks"). Die Datei gehört der Factory und ist durch `factory-integrity` gegen lokale Änderung gesperrt → Fix gehört nach `nothra/dev-factory` (Helfer-Aufruf bzw. Here-String), nicht in diesen PR. Vorgehen: Job neu starten; bleibt er rot/flackert er, Issue in dev-factory anlegen (oberhalb der Schwelle: funktionaler Defekt mit reproduzierbarem CI-Auslöser) und Bump auf den Fix-Release statt lokalem Patch. Menschliche Freigabe für den Issue nötig (außenwirksam).

## Wichtige Findings (sollten behoben werden)
- [x] `scripts/checks/ownership-check.sh:29,167` – Skript (vendort) verweist im Nicht-Lock-Modus noch auf `docs/factory/OWNERSHIP.md`. Im Lock-Modus unkritisch (lokal/CI-Pfad grün), aber jeder Test/Aufruf mit erzwungenem Tabellenmodus bricht. Nach Fix von Finding 1 per `git grep -n "OWNERSHIP" -- scripts/project` bestätigen, dass kein Projekt-Konsument mehr daran hängt.
- [x] `tasks/task-428-…md` – Umsetzungs-Notiz „Gates grün" nach dem Fix präzisieren: Projekt-Suite-Lauf **nach** Löschen der OWNERSHIP.md nachweisen, nicht den Alt-Lauf zitieren.
- [x] Offene Pflichtschritte vor Merge (Stand Iteration 2: Token vorhanden, Drift-Liste neu erzeugt; Ruleset nach Merge) (kein Code, aber merge-blockierend): AK2.17h (`FACTORY_SYNC_TOKEN`, Environment `factory-update`), AK2.18c/FS-T2.5 (Drift-Liste direkt vor Merge neu erzeugen), AK2.14a/AKE.1/AKE.2 abhaken erst bei grüner CI beider Repos.

## Nitpicks (optional)
- [ ] `docs/project/lessons/INDEX.md:8-9` – Abweichung vom v0.8.0-`/codify`-Skilltext (Index-Zeilen sollen nach `PROJECT-CONTEXT.md`) ist dokumentiert, aber nur als Prosa; ein Folge-Issue in dev-factory („großer Projekt-Index vs. 750-Zeilen-Deckel") wäre sinnvoll (außenwirksam → Freigabe).
- [ ] `docs/factory/PROJECT-CONTEXT.md` – 37.701/38.000 Bytes: nur 299 Bytes Luft; jedes neue Learning-Commit dort reißt den Deckel. Kern-Kurzregeln ggf. weiter auslagern.

## Positives
- Floor-Tests (#291…#448) byte-identisch in `dependency-floor-tests.sh` verschoben (Diff gegen Altbestand: nur Leerzeilen-Offset), in der Projekt-Suite verdrahtet; keine Testabdeckung verloren.
- `factory-integrity` lokal (129 Dateien, v0.8.0) und in CI grün; `config-validation`, `issue-sync`, `pr-closes-issue`, `lint`, CodeQL grün.
- Import-Deckel eingehalten (694/750 Zeilen); Lesson-Index vollständig überführt (93 Einträge alt = 93 neu).
- Projekt-Besonderheiten sauber gesichert: `copy_files`, `*.tmp.spec.ts(x)` in `.gitignore.project`, `runAtomic`- und Routen-Doku-Regel in `CLAUDE.md`.
- Drift/Änderungsstopp je Commit zugeordnet und dokumentiert; Factory-Lessons als dev-factory#60 an den Besitzer übergeben.

## Empfehlung (Iteration 1)
Rework angefordert – siehe Iteration 2

## Iteration 2 (nach Rework a63670f, Stand 4ce0481)
- Kritisch 1 behoben: AK-F4 prüft gegen `factory.lock` (Mutationsbeleg), AK-D3 entfernt; Projekt-Suite 349 grün, CI `test` grün.
- Kritisch 2: `factory-self-test` ist ein Flake in vendortem Factory-Code (zwei verschiedene Tests, gleiche SIGPIPE-Klasse); nach Job-Neustart grün, Issue [nothra/dev-factory#61](https://github.com/nothra/dev-factory/issues/61) angelegt. Nicht in diesem PR behebbar (Integritäts-Gate).
- Wichtig: `ownership-check.sh`-Verweis nur im Nicht-Lock-Modus, `git grep OWNERSHIP -- scripts/project` ohne Treffer; Task-Notiz korrigiert.
- Offen bleiben nur die menschlichen Pflichtschritte (Token vorhanden, Ruleset nach Merge).

## Empfehlung
APPROVED
