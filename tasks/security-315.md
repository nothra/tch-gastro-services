# Security Review: Task 315

**Scope:** `git diff origin/main...HEAD` (11 Dateien, +838/−14) – Doku-Konvention +
Test-Guard, kein Applikations-Laufzeitcode.
**Durchgeführt:** 2026-08-27 · Persona `docs/factory/agents/security-agent.md`

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [x] **[Kontroll-Plane] Der neue Label-Name weicht die `factory::`-Eintrittstür nicht auf.**
      Geprüft, weil `factory-pipeline` und `factory::run` denselben Wortstamm teilen und ein
      Präfix-Match beide vermischen würde – `factory::run` ist die Eintrittstür des autonomen
      Auto-Triggers (ADR-008). Ergebnis: kein Match auf beiden Seiten.
      `_cri_is_reserved_label` (`scripts/lib/create-issue.sh:48-50`) prüft per Glob
      `factory::*` – `factory-pipeline` fällt nicht darunter und wird korrekt als normales
      Aspekt-Label durchgereicht (nicht fälschlich verworfen, aber auch nicht privilegiert).
      `scripts/factory-poll.sh:63` sucht exakt `label:"$1"` mit dem Literal `factory::run`
      (GitHub-Search `label:` ist Exact-Match, kein Präfix) – über das neue Label lässt sich
      kein Pipeline-Lauf auslösen. `.github/workflows/` referenziert keinen Label-Namen, der
      Rename bricht also keine Automatisierung.

- [x] **[Stored Prompt Injection] Keine neue Ableitungsregel für Labels aus Fremdinhalt.**
      Geprüft gegen die Lesson „Neuer Freitext-Ablage-Mechanismus … braucht dieselbe ‚Daten,
      keine Anweisungen'-Absicherung" (#286) und ADR-018. Die drei Skill-Dokus
      (`codify.md`, `review.md`, `security-review.md`) nennen `factory-pipeline` als **festes
      Literal** in einer Aufzählung; der neue Konditionalsatz in `security-review.md`
      („dazu `factory-pipeline`, wenn der Fund den Factory-Harness und nicht die App trifft")
      ist eine Ermessensregel für den Agenten, keine Ableitung aus Diff-/Finding-Inhalt. Die
      Warnung „Labels sind **feste Literale** – niemals aus Finding-/Diff-/Fremdinhalt
      ableiten" steht unverändert im selben Dokument. Die PR führt keinen neuen
      Freitext-Ablagekanal ein.

- [x] **[Command Injection / Shell-Hygiene] Der neue `run-tests.sh`-Block ist sauber.**
      `name_hits_315()` ruft `git grep -lI -F -e "$2" -- ':(exclude)…'` – der variable
      Suchwert steht hinter `-e`, die Pathspecs hinter `--`; ein Wert mit führendem `-` wird
      damit als Daten, nicht als Option gelesen (`clean-code.md` → „Config-/nutzerkontrollierte
      Werte als Daten behandeln"). Kein `eval`, keine ungequoteten Expansions, keine
      Pattern-Interpolation in eine Shell-Zeile. Fixtures liegen unter `mktemp -d` (Modus
      0700), `tracked_repo_315()` setzt die Git-Identität **lokal** (`git -C … config`) und
      verändert keine globale Konfiguration.

- [x] **[Fail-open] `TMP_315="$(mktemp -d)"` ist nicht auf Erfolg geprüft – aber abgefangen.**
      Die Suite läuft unter `set -uo pipefail` (ohne `-e`), ein leeres `TMP_315` würde die
      Fixture-Pfade auf `/…` kollabieren lassen. Kein Löschrisiko (`rm -rf ""` löscht nichts),
      und der in dieser Task neu eingeführte Helfer `assert_scan_clean_315` prüft vor jeder
      Abwesenheits-Assertion, dass die Fixture-Datei wirklich getrackt ist – ein still
      gescheitertes Scaffolding wird damit **rot**, nicht grün. **Kein Handlungsbedarf**; das
      ungeprüfte `mktemp` ist zudem die durchgängige Konvention der Datei (20+ Fundstellen)
      und nicht von dieser PR eingeführt.

- [x] **[Dependencies / Secrets] Nichts zu prüfen.** Kein `package.json`/`pnpm-lock.yaml` im
      Diff, keine neue Fremd-Binary, kein Download-Seam berührt. Keine Credentials, Tokens
      oder Endpunkte im Diff; die geänderten Dateien enthalten ausschließlich Konventionstext
      und Testcode. Kein `Math.random()`, keine Krypto, kein Logging von Nutzerdaten.

- [x] **[Nicht anwendbar]** Input-Validierung/Injection (SQL/XSS/Command) in der App,
      AuthN/AuthZ, IDOR/BOLA, Error-Handling/Stack-Traces: Die PR berührt weder `app/`,
      `db/`, `lib/` noch einen Route-Handler oder eine Server Action. Keine Angriffsfläche der
      Applikation verändert.

## Verifikations-Notizen

- `gh label list` bestätigt den Zielzustand: `factory-pipeline` existiert, ein
  `factory_pipeline` gibt es nicht mehr; die fünf `factory::`-Labels sind unverändert.
- `tasks/patch-315.diff` ist nicht mehr vorhanden – kein Patch-Artefakt bleibt als von Agenten
  lesbare Datei zurück (Lesson #212: geprüft wurde der Endzustand der committeten Live-Dateien
  in `.claude/commands/`, nicht das Patch-Artefakt).
- Die AK10-Regressions-Assertion (kein alter Label-Name in getrackten Dateien) wurde **nicht**
  erneut ausgeführt – ein direkter `git grep` war in dieser Session nicht freigegeben. Beleg
  bleibt der in der Task-Datei dokumentierte Suite-Lauf (1246 grün, 0 rot). Für die
  Security-Bewertung ist die Frage ohnehin nicht sicherheitsrelevant, sondern eine
  Konsistenz-Invariante.

## Out-of-Scope-Findings

_Keine._ Kein Fund oberhalb der ADR-043-Schwelle (kein ausnutzbares Risiko, kein funktionaler
Defekt mit reproduzierbarem Auslöser) – entsprechend weder ein Issue über
`scripts/lib/create-issue.sh` noch ein Eintrag in `docs/factory/kleinfunde.md`.

## Ergebnis

PASSED
