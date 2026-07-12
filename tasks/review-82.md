# Review: Task 82

Multi-Persona-Review (3 Runden: Logik/Korrektheit, Code-Qualität, Architektur/Konsistenz) des
zentralen Issue-Seams `scripts/lib/create-issue.sh` + Aufrufer + Doku. Findings unten sind mit
ihrem Bearbeitungsstand markiert; kritische/wichtige wurden im selben Zyklus behoben (Rework),
alle Regressionen mit Tests abgesichert (197 grün).

## Kritische Findings (müssen behoben werden)
- [x] [scripts/lib/create-issue.sh:72,81,90] **Unguarded `"${repo_args[@]}"` → „unbound variable"
      unter `set -u` auf bash 3.2 (macOS-Default), wenn kein Repo gesetzt ist.** Genau der
      dokumentierte gh-Auto-Erkennungs-Pfad (ADR-018 §4), den die Skills nutzen (sourcen ohne
      `REPO`/`FACTORY_REPO`). `set -u` gilt auch innerhalb `$(create_issue …)`. **Reproduziert**
      (bash 3.2.57, `RESULT` fehlte, exit 1). **Behoben:** Refactor zieht die gh-Anlage in
      `_cri_try_create` und expandiert `repo_args` set-u-sicher (`${repo_args[@]+"…"}`) über die
      gemeinsame `common`-Arg-Liste. **Regression-Test:** no-repo-Fall läuft jetzt unter
      `set -euo pipefail` und prüft Nummer + exit 0.

## Wichtige Findings (sollten behoben werden)
- [x] [scripts/lib/create-issue.sh] **3-fache interne Duplikation** des Blocks „gh aufrufen →
      Nummer extrahieren → bei Erfolg drucken/return" (Code-Qualität W1). **Behoben:** privater
      Helfer `_cri_try_create <gh-args…>` – ein Ort für gh-/Extraktions-Semantik; die drei Stufen
      sind jetzt `if num=$(_cri_try_create …); then …`.
- [x] [scripts/lib/create-issue.sh] **`set -e`-Härtung des bloßen (nicht via `$()` gefangenen)
      Aufrufs** (Architektur #1). errexit wird innerhalb `$(create_issue …)` zwar ohnehin
      suspendiert (darum bei den realen Aufrufern start-work/sync kein Bug), aber ein bare
      `create_issue …` unter `set -e` – das Muster der Skill-Docs – hätte die Degradation abbrechen
      können. **Behoben:** `_cri_try_create` nutzt `|| …` intern; Stufen über `if num=$(…)`.
      **Regression-Test:** bare-Aufruf unter `set -euo pipefail` mit fehlendem Aspekt-Label.
- [x] [scripts/start-work.sh:62] **`--labels` als letztes Argument ohne Wert → wortloser
      `set -e`-Abbruch** via `shift 2` (Logik F2 / Architektur #4). **Behoben:** Guard
      `[[ $# -ge 2 ]] || usage "--labels erwartet einen Wert (CSV …)"`. **Regression-Test** ergänzt.
- [x] [scripts/checks/tests/run-tests.sh] **Test-Blindstellen** um die neuen Konfig-Pfade
      (W2/W3). **Behoben:** Tests für Leerfeld-CSV (`"a,,b"` → genau 3 `--label`),
      Mehr-Aspekt-Degradation (eines von zwei fehlt → nur Art), `FACTORY_ISSUE_LABEL`-Override in
      sync, `--labels`/`FACTORY_ASPECT_LABELS`-Durchreichung, no-repo/bare unter `set -euo pipefail`.

## Nitpicks (optional)
- [x] [scripts/lib/create-issue.sh:59] `local -a … a` deklarierte die Schleifen-Skalar-Variable
      fälschlich als Array (N1). **Behoben:** eigene `local label`-Zeile, sprechender Name.
- [x] [scripts/lib/create-issue.sh] Stufe-2-Warnung schob die Schuld pauschal auf die Aspekte
      (F5) – `gh` verrät das abgelehnte Label nicht. **Behoben:** neutrale Formulierung
      („mind. ein Label wurde abgelehnt … Aspekte fallen weg").
- [x] [scripts/lib/create-issue.sh] Leeres Art-Label legte stumm an (F4, Spec verlangt Warnung).
      **Behoben:** stderr-Hinweis bei leerem Art-Label.
- [x] [scripts/lib/create-issue.sh:31] `_cri_issue_number` bei mehrzeiliger gh-Ausgabe (F7).
      **Behoben:** `| tail -n1` in `_cri_try_create`.
- [x] [scripts/start-work.sh] Erfolgsmeldung behauptete evtl. degradierte Labels als gesetzt
      (Architektur #3). **Behoben:** Wortlaut „Labels angefragt – …" (Seam meldet Degradation
      auf stderr).
- [ ] [scripts/lib/create-issue.sh:51-56] Aspekt-Felder werden nicht getrimmt
      (`"security, test"` → ` test` wird von gh abgelehnt → unnötige Degradation) (F6). **Bewusst
      offen:** Konvention ist CSV ohne Leerzeichen; niedrige Priorität, kein Codefix in dieser
      Task (YAGNI). Bei Bedarf eigener Folge-Task.
- [ ] Magic-String-Streuung der Art-Labels (`enhancement`/`bug`/`documentation`) in
      start-work/sync (N4) – **pre-existing** (#80), bewusst nicht im Seam dupliziert (ADR §3,
      kanonische Liste bleibt in git-workflow.md). Kein Handlungsbedarf in dieser Task.

## Positives
- ADR-018 §1–§5 strukturell sauber eingehalten: sourcebare Lib statt Subprozess; stdout=Nummer /
  stderr=Diagnostik; fail-open aufs Label ohne Allowlist; Repo-Bezug nicht selbst abgeleitet;
  Skills legen autonom an.
- Der bekannte Stolperstein „kanonische Quellen driften" wird vermieden: der Seam führt **keine**
  eigene Label-Liste; ADR, Spec, git-workflow.md und alle drei Skill-Docs verweisen konsistent auf
  die eine Quelle. Der Self-Test verankert den Verweis.
- #80-Logik **echt extrahiert, nicht kopiert**; die Aufrufer entfernen ihr eigenes
  `gh issue create` (per Test asserted).
- Portabilität gewahrt (gh-Stub echtes POSIX-`sh`, `grep -oE`, `grep -q --`, `tail -n1`);
  gestufte Degradation korrekt (Art-Label überlebt fehlendes Aspekt-Label).
- Behavior-Tests (stdout/stderr/exit/GH_LOG) statt Implementierungsdetails; deterministisch,
  isoliert (`mktemp` + Cleanup), scharfe Positiv-/Negativ-Kontrollen.
- Rückwärtskompatibilität: `FACTORY_ISSUE_LABEL`, ID-Modus, exists-check unberührt; einzige
  gewollte Verhaltensänderung (sync legt nicht mehr label-los an) ist Spec-Ziel.

## Empfehlung
APPROVED – nach Rework (kritisches F1 + wichtige Findings behoben, 197 Tests grün, pre-commit grün).
Zwei bewusst offene Nitpicks (F6 Whitespace-Trim, N4 Magic-Strings) sind dokumentiert und nicht
scope-relevant.
