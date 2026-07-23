# Spec: Unbeaufsichtigte Pipeline meldet keinen Erfolg ohne verifizierten Endzustand

## Kontext

Beim Lauf `PR_SHEPHERD=true bash scripts/run-pipeline.sh 209` (unbeaufsichtigt, kein
Mensch im Loop) traf Phase 7 (`/pr-shepherd`) auf ein getracktes Artefakt
(`.coverage-tmp209/coverage-summary.json`), das den Prettier-Teil des pre-push-Gates
blockierte. Der Skill **stellte daraufhin eine interaktive Freigabefrage** im Transkript
(„May I run `git rm -r --cached .coverage-tmp209`?") – statt über
`scripts/raise-interrupt.sh` einen deterministischen Stopp zu signalisieren (ADR-004).
Da niemand antwortete, endete der `claude --print`-Aufruf dennoch mit **Exit 0**.

Zwei unabhängige Bruchstellen ließen den Lauf trotzdem als Erfolg durchgehen:

1. **Agenten-Seite:** `/pr-shepherd` fragte interaktiv, obwohl `FACTORY_STAGE=3` den
   nicht-interaktiven Modus signalisiert. Der vorgesehene Pfad (Blocker erkannt →
   `raise-interrupt.sh` → Sentinel → `interrupt-check.sh` stoppt hart) wurde nie
   betreten. Verstoß gegen die bestehende Regel „Agenten-Blockerverhalten"
   (`lessons/factory-workflow.md`, aus Task 002).

2. **Pipeline-Seite:** `run_skill()` protokolliert `✓ /pr-shepherd abgeschlossen` allein
   aufgrund des Exit-0 des Sub-Aufrufs (`run-pipeline.sh:250`). `interrupt-check.sh`
   fand kein Sentinel. `pipeline_summary()` (`run-pipeline.sh:319`) liest ausschließlich
   die Report-Dateien (task/review/security/codify) und **verifiziert den realen
   Endzustand nie** – nicht den PR-Status, nicht ungepushte Commits. Anschließend druckte
   die Pipeline „Pipeline erfolgreich abgeschlossen" / „Task 209 ist fertig".

Tatsächlicher Endzustand: PR #210 war noch **Draft** und **nicht gemergt**, es lagen
**2 lokal committete, aber ungepushte Commits** (`f6c1150`, `a177fc4`) vor, und die
Task-Datei hatte trotzdem alle Checkboxen (inkl. „Fertig / PR erstellt") abgehakt. Der
reale Zustand kam erst auf manuelle Nachfrage ans Licht.

Verwandt, aber allgemeiner als **#211** (dort las die Verdict-Erkennung Fließtext statt
der Anker-Zeile; Symptom identisch: „Erfolg trotz Draft-PR"). #212 zieht die
**verifizierte Endzustands-Prüfung** als generellen Backstop ein und schließt zugleich
die Ursache auf der Agenten-Seite.

**Ziel:** Ein unbeaufsichtigter Pipeline-Lauf darf sich nur dann als „erfolgreich
abgeschlossen" verbuchen, wenn der **real verifizierte** Endzustand dem beabsichtigten
Terminalzustand entspricht. Und: `/pr-shepherd` fragt im Stage-3-Modus nie interaktiv,
sondern eskaliert deterministisch.

## Scope

**Inbegriffen:**

- **Endzustands-Verifikation in `scripts/run-pipeline.sh`** vor der Erfolgs-Ausgabe
  („Pipeline erfolgreich abgeschlossen" / „Task N ist fertig"). Prüft den realen
  Zustand über `git`/`gh`, nicht nur Report-Dateitext:
  - **Beide Modi:** Working Tree sauber (keine uncommitteten Änderungen) **und** keine
    ungepushten Commits (`git rev-list origin/<branch>..HEAD` leer).
  - **Zusätzlich bei `PR_SHEPHERD=true`:** PR **nicht** mehr Draft **und** PR entweder
    bereits gemergt **oder** Auto-Merge scharfgeschaltet (`autoMergeRequest` gesetzt).
- **Fail-closed-Verhalten:** Ist der Endzustand nicht verifizierbar oder nicht erfüllt,
  wird die Erfolgs-Ausgabe **nicht** gedruckt; stattdessen der konkrete reale Zustand
  (welche Invariante verletzt ist) gemeldet und der Lauf mit **Non-Zero-Exit** als
  BLOCKED/nicht-erfolgreich beendet (konsistent mit dem ADR-004-Stopp-Prinzip).
- **Agenten-Seite (`/pr-shepherd`, `.claude/commands/pr-shepherd.md`):** Unter
  `FACTORY_STAGE=3` keine interaktive Freigabefrage; ein nicht autonom auflösbarer
  Blocker (z. B. ein fremdes, den Push-Gate blockierendes getracktes Artefakt) führt zu
  `raise-interrupt.sh` mit actionable Nachricht. Der Skill führt **keine** nicht in
  seinen dokumentierten Schritten vorgesehenen, index-/history-mutierenden
  Git-Operationen (`git rm --cached`) autonom aus.
- **`.gitignore`-Härtung (Nebenbefund aus #212):** Das Muster deckt Coverage-Temp-
  Verzeichnisse mit beliebigem Task-ID-Suffix generisch ab (`.coverage-tmp*/`,
  regressionsgesichert). Prüfung, ob ein Factory-Skript/Skill Coverage-Artefakte in
  einen **nicht** ignorierten Pfad schreibt; falls ja → auf einen ignorierten Pfad
  umleiten.
- **Shell-Tests** (`scripts/checks/tests/run-tests.sh`) für die neue Verifikation und
  die `.gitignore`-Regression.

**Nicht inbegriffen:**

- Aktives Warten der Pipeline auf CI-/Merge-Abschluss. „Auto-Merge scharfgeschaltet"
  zählt bewusst als Erfolg (die Pipeline kann nicht beliebig auf server-seitige Checks
  warten). Strikt „gemergt-only" ist ausdrücklich **nicht** gefordert.
- Prosa-/Transkript-Parsing des Skill-Outputs auf „offene Freigabefragen" (brüchig).
  Die Ursache wird agenten-seitig (Interrupt) und die Wirkung pipeline-seitig
  (Endzustands-Verifikation) abgesichert – nicht durch Textmustererkennung.
- Änderungen an der Interrupt-Mechanik selbst (`raise-interrupt.sh`,
  `interrupt-check.sh`) – sie funktionieren; sie wurden nur nicht ausgelöst.
- Ein laufender Kassen-/Task-übergreifender Zustand o. Ä. (fachfremd).
- Nachträgliche Reparatur bereits gemergter Läufe.

## Akzeptanzkriterien

- [ ] **AK1 – Ungepushte Commits blockieren den Erfolg:** GIVEN ein Pipeline-Lauf, an
  dessen Ende auf dem Feature-Branch ungepushte Commits liegen
  (`git rev-list origin/<branch>..HEAD` nicht leer)
  WHEN `run-pipeline.sh` die Abschluss-Verifikation ausführt
  THEN wird **nicht** „Pipeline erfolgreich abgeschlossen" gedruckt, sondern der reale
  Zustand (ungepushte Commits) gemeldet, und der Lauf endet mit Non-Zero-Exit.

- [ ] **AK2 – Sauberer, gepushter Stand meldet Erfolg (PR_SHEPHERD=false):** GIVEN ein
  Lauf ohne `PR_SHEPHERD` mit sauberem Working Tree und ohne ungepushte Commits
  WHEN die Abschluss-Verifikation ausführt
  THEN wird „Pipeline erfolgreich abgeschlossen" gedruckt (Exit 0).

- [ ] **AK3 – Draft-PR blockiert den Erfolg (PR_SHEPHERD=true):** GIVEN einen Lauf mit
  `PR_SHEPHERD=true`, bei dem der PR am Ende noch Draft ist
  WHEN die Abschluss-Verifikation ausführt
  THEN wird **nicht** „erfolgreich abgeschlossen" gedruckt, sondern „PR noch Draft"
  gemeldet, und der Lauf endet mit Non-Zero-Exit.

- [ ] **AK4 – Weder gemergt noch Auto-Merge scharf blockiert den Erfolg
  (PR_SHEPHERD=true):** GIVEN einen Lauf mit `PR_SHEPHERD=true`, PR nicht Draft, aber
  **weder** gemergt **noch** Auto-Merge scharfgeschaltet (`autoMergeRequest` leer)
  WHEN die Abschluss-Verifikation ausführt
  THEN wird **nicht** „erfolgreich abgeschlossen" gedruckt, sondern der reale Zustand
  gemeldet, und der Lauf endet mit Non-Zero-Exit.

- [ ] **AK5 – Merge-ready zählt als Erfolg (PR_SHEPHERD=true):** GIVEN einen Lauf mit
  `PR_SHEPHERD=true`, sauberem/gepushtem Stand, PR nicht Draft und Auto-Merge
  scharfgeschaltet (CI darf server-seitig noch laufen)
  WHEN die Abschluss-Verifikation ausführt
  THEN wird „Pipeline erfolgreich abgeschlossen" gedruckt (Exit 0).

- [ ] **AK6 – Gemergt zählt als Erfolg (PR_SHEPHERD=true):** GIVEN einen Lauf mit
  `PR_SHEPHERD=true`, bei dem der PR bereits `MERGED` ist
  WHEN die Abschluss-Verifikation ausführt
  THEN wird „Pipeline erfolgreich abgeschlossen" gedruckt (Exit 0).

- [ ] **AK7 – Stage-3-Interrupt statt Frage (pr-shepherd):** GIVEN `/pr-shepherd` läuft
  unter `FACTORY_STAGE=3` und trifft auf einen nicht autonom auflösbaren Blocker
  (z. B. ein fremdes, den Push-Gate blockierendes getracktes Artefakt)
  WHEN der Skill diesen Zustand erreicht
  THEN weist die Skill-Anweisung an, `scripts/raise-interrupt.sh` mit actionable
  Nachricht aufzurufen (deterministischer Stopp) – **nicht** eine interaktive
  Freigabefrage zu stellen und **nicht** autonom `git rm --cached` o. Ä. auszuführen.

- [ ] **AK8 – Interrupt stoppt die Pipeline vor der Erfolgs-Ausgabe:** GIVEN ein
  Sentinel `tasks/INTERRUPT-<id>.md` nach einem Skill-Schritt (z. B. von pr-shepherd
  gesetzt)
  WHEN `run-pipeline.sh` weiterläuft
  THEN stoppt der Lauf hart (Non-Zero-Exit, ADR-004) und erreicht die
  Erfolgs-Ausgabe/Endzustands-Verifikation nicht (Regressions-Guard für den
  bestehenden `interrupt-check.sh`-Pfad).

- [ ] **AK9 – `.gitignore` deckt Coverage-Temp generisch ab:** GIVEN ein
  Coverage-Temp-Verzeichnis mit beliebigem Task-ID-Suffix (`.coverage-tmp<id>/`, egal
  welche id)
  WHEN `git check-ignore` bzw. der `.gitignore`-Regressionstest läuft
  THEN ist das Verzeichnis ignoriert; ein Test sichert das Muster (`.coverage-tmp*/`),
  sodass ein späteres Entfernen auffällt.

- [ ] **AK10 – Kein Factory-Pfad schreibt Coverage in einen getrackten Ort:** GIVEN die
  Factory-Skripte/-Skills, die Coverage-Artefakte erzeugen (z. B. `/test`, `/review`,
  `run-tests.sh`)
  WHEN geprüft wird, wohin Coverage-Ausgaben/-Zusammenfassungen geschrieben werden
  THEN zielen sie auf einen von `.gitignore` abgedeckten Pfad (`coverage/` oder
  `.coverage-tmp*/`); die dokumentierte Konvention benennt einen ignorierten
  Temp-Pfad-Präfix.

## Fehlerszenarien

- [ ] **F1 – `gh`/`git`-Verifikation schlägt fehl (fail-closed):** GIVEN die
  Endzustands-Verifikation, bei der ein `gh pr view`/`git`-Aufruf fehlschlägt oder
  keinen verwertbaren Wert liefert
  WHEN die Verifikation ausführt
  THEN wird der Zustand als **nicht verifiziert** behandelt → keine Erfolgs-Ausgabe,
  Non-Zero-Exit (nie stilles „Erfolg" bei unklarer Lage).

- [ ] **F2 – Kein Upstream / Branch ohne origin-Tracking:** GIVEN ein Branch ohne
  konfiguriertes Upstream (`origin/<branch>` existiert nicht)
  WHEN die Verifikation die ungepushten Commits prüft
  THEN wird fail-closed als „nicht gepusht/nicht verifiziert" behandelt (keine
  Erfolgs-Ausgabe), nicht als „nichts zu pushen".

- [ ] **F3 – uncommittete Änderungen am Ende:** GIVEN einen Working Tree mit
  uncommitteten Änderungen am Laufende
  WHEN die Verifikation ausführt
  THEN keine Erfolgs-Ausgabe, Non-Zero-Exit (der reale Zustand wird gemeldet).

- [ ] **F4 – `--dry-run` bleibt grün:** GIVEN `run-pipeline.sh <id> --dry-run`
  WHEN der Lauf ausführt
  THEN wird die Endzustands-Verifikation übersprungen bzw. als DRY-RUN markiert und
  bricht den Dry-Run nicht ab (bestehende Dry-Run-Integrationstests bleiben grün).

## Offene Fragen

_Mit dem Entwickler geklärt (2026-07-23):_
- _Scope: **beide** Bruchstellen (Pipeline-Verifikation + Agenten-Interrupt) — defense in depth._
- _Erfolg bei `PR_SHEPHERD=true`: **merge-ready ODER gemergt** (Auto-Merge-scharf zählt);
  nicht strikt „gemergt-only"._
- _`.gitignore`-Nebenbefund: in #212 mitgenommen._

_Durch `/architecture` (2026-07-23) entschieden – siehe
[ADR-040](../adr/040-pipeline-endzustands-verifikation.md):_
- [x] BLOCKED-Abschluss wird **über `raise-interrupt.sh`** (Typ `INCOMPLETE_OUTCOME`)
  geloggt, damit `/daily-metrics` die Autonomie-Rate korrekt zählt (ADR-006). Der Stopp
  läuft damit über denselben Mechanismus wie ADR-004.

_Nicht Teil des Fixes (ggf. eigenes Issue):_
- [ ] `pipeline_summary()` liest `tasks/task-${id}.md` **ohne** den `-<name>`-Suffix
  (`run-pipeline.sh:322`) und findet die reale `task-<id>-<name>.md` daher nicht –
  latenter Anzeigefehler im Summary-Titel, unabhängig von #212.
