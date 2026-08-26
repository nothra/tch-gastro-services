# Review: Task 310

Grundlage: `git diff origin/main...HEAD` (10 Dateien, +1115/−39),
`docs/specs/spec-310-report-guard-frische-pruefung.md`,
`tasks/task-310-report-guard-stale-verdict-within-run.md`, ADR-019 §4.

**Runde 3** – Anlass ist der Nitpick-Nachlauf-Commit `904d635` nach dem `APPROVED` der Runde 2.
Er enthält den einzigen Code-Fix seit der Freigabe (`interrupt-check.sh` im Stale-Zweig) und
wurde damit noch von keiner Review-Runde geprüft. Verlauf der Runden 1 und 2 steht unten unter
„Historie". Gate-Nachlauf in dieser Session: `bash scripts/checks/tests/run-tests.sh` →
**1127 grün, 0 rot** (davon 65 #310-Assertions, gezählt), `git status` sauber, PR #311 trägt
`Closes #310`.

> **Circuit Breaker:** Formal ist dies die dritte Review-Anwendung. Der Abbruch-Fall aus
> `.claude/commands/review.md` (Review↔Implement konvergiert nicht) liegt **nicht** vor – Runde 2
> endete mit `APPROVED`, Runde 3 prüft nur den danach entstandenen Nachlauf-Commit. Keine
> Eskalation nötig.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._ Der Nachlauf-Commit ist an allen drei Prüfachsen sauber:

- **Logik/Korrektheit:** `run-pipeline.sh:290` stellt genau die Stopp-Bedingung wieder her, die
  vor #310 über den (damals erfolgreichen) Verdict-Zweig griff. Der Zweig bleibt ein
  Fehlversuch (kein `return 0`), `interrupt-check.sh` liefert bei fehlendem Sentinel Exit 0 und
  ändert am Retry-Pfad nichts – AK6 (`exit 1` nach 3 Versuchen, nie `exit 2`) ist durch
  `run-tests.sh:5919-5928` weiterhin behavioral gepinnt und grün.
- **Kein neuer Fail-open-Pfad:** `interrupt-check.sh` kann nur 0 (kein Sentinel) oder 1
  (Sentinel, nach Blocker-Eintrag) liefern; Exit 2 setzt eine leere Task-ID voraus, die hier
  nicht auftreten kann. Der Sentinel wird nicht konsumiert, der Blocker-Eintrag ist idempotent
  (`grep -qF`) – ein Aufruf pro Fehlversuch erzeugt keine Doppel-Einträge.
- **Testqualität:** Der neue E2E-Test nutzt den echten `raise-interrupt.sh`-Aufruf im Stub statt
  eines nachgebauten Sentinels (divergenzerzeugende Aktion, Lesson #253) und assertiert
  pfadspezifisch – `[INTERRUPT] ADR: …`, Abwesenheit von „failed after 3 attempts" **und** der
  Blocker-Eintrag in der Task-Datei. Der Mutant entfernt gezielt nur diese eine Aufrufzeile;
  beide Aussagen kippen. `assert_contains_286`/`assert_absent` arbeiten mit `grep -qF`, das
  Literal `[INTERRUPT]` wird also nicht als Zeichenklasse gelesen (kein vakuum-grüner
  Abwesenheits-Guard).
- **Mutationsbeleg kausal:** Der Wirksamkeits-Guard zählt dieselbe exakte Zeichenkette
  (`IC_CALL_310`), die die Mutation löscht – die im Codify-Kandidaten beschriebene
  Fragment-Falle (#114, siebtes Vorkommnis) ist damit tatsächlich geschlossen und nicht nur
  beschrieben.
- **Doku im Gleichschritt:** Spec-Fehlerpfad-Bullet, ADR-019 §4 und die Task-Notizen sind im
  **selben** Commit nachgezogen (Lesson #253: die im selben PR entstandene Spec bekommt denselben
  Drift-Check). Code und Spec-Prosa decken sich wörtlich.
- **`kleinfunde.md`-Drift (#291-Lesson):** Die in Runde 1 angelegten `Datei:Zeile`-Anker
  (`run-tests.sh:241`, `:1379`, `:3675`/`:3681`, `:3966`, `:4012`) sind nach dem Nachlauf-Commit
  erneut nachgeprüft und alle noch exakt – der Commit hängt ausschließlich unterhalb an.
- **Zahlendrift:** Die korrigierte Gates-Notiz („1127 grün, 65 #310-Assertions") stimmt mit dem
  Lauf dieser Session überein (68 `#310`-Zeilen minus 3 Abschnitts-Überschriften).

## Nitpicks (optional)

- [ ] `scripts/run-pipeline.sh:283-291` – die neue Ausnahme ist **asymmetrisch**:
      `interrupt-check.sh` läuft im Fehlversuch nur, wenn ein Verdict vorliegt. Der WHY-Kommentar
      begründet sie aber allgemein („Auch ein Fehlversuch darf einen signalisierten Interrupt
      nicht verschlucken") – und genau dieses Argument gilt wortgleich für den Fall *ohne*
      Verdict (fehlender/unvollständiger Report, und für jedes nicht report-erzeugende Skill,
      also auch `/implement`, das nach ADR-004 der wahrscheinlichste Interrupt-Auslöser ist).
      Dort folgen weiterhin zwei zusätzliche Heavy-Versuche ohne Blocker-Eintrag. Das ist ein
      **vorbestehender** Zustand, kein Regress dieses PRs – die Label-Vergabe bleibt korrekt
      (`factory-poll.sh` hängt am Sentinel), und den Aufruf aus dem `if [ -n "$verdict" ]`
      herauszuziehen wäre eine Verhaltensänderung jenseits des Spec-Scopes. Vorschlag für diesen
      PR: den Kommentar auf den Stale-Fall verengen (statt allgemein zu argumentieren), damit die
      Begründung nicht mehr weiter trägt als die Implementierung.
- [ ] `scripts/run-pipeline.sh:265,280,290` – die identische Zeile
      `bash "$FACTORY_DIR/scripts/checks/interrupt-check.sh" "$task_id" || exit $?` steht jetzt
      **dreimal** in `run_skill()`. Kandidat für `/refactor` (ein Einzeiler-Helper; `exit` wirkt
      aus einer Funktion heraus weiterhin auf das Skript, da keine Subshell). **Wichtig für den
      Refactor-Schritt:** `run-tests.sh:6114-6132` ankert auf genau diesem Literal (`IC_CALL_310`)
      und vergleicht Vorkommens-**Zahlen** – eine Extraktion muss den Mutations-Guard im selben
      Commit mitziehen, sonst wird er lautlos wirkungslos (#114-Klasse).
- [ ] `docs/adr/019-stage3-commit-seam-report-guard.md:82-84` und `:92-94` – die Interrupt-
      Ausnahme steht in §4 **zweimal** („Ein im Versuch signalisierter Interrupt stoppt … der
      Stale-Zweig ruft `interrupt-check.sh` ebenso auf" und zwei Absätze später „Nach dem
      als-Erfolg-gewerteten Abbruch – und ebenso im Stale-Zweig – läuft `interrupt-check.sh`").
      Beide Sätze sind korrekt, aber eine spätere Änderung an der Mechanik muss beide finden –
      genau die Doku-Drift-Klasse, die dieses Projekt wiederholt getroffen hat. Eine der beiden
      Stellen genügt (die zweite ist der ältere, allgemeinere Satz).

Aus Runde 2 bewusst offen gelassen und in dieser Runde bestätigt: die doppelte Verneinung in
`run-tests.sh:5799`. Der Mutationsbeleg soll denselben Assert-Ausdruck negiert ausführen
(Lesson `testing.md`, #286); `[ -n … ]` wäre ein anderer Operator und damit ein schwächerer
Kausalbeleg. Kein Handlungsbedarf – der Nitpick gilt als abgeschlossen, nicht als offen.

## Positives

- **Der Nachlauf hat einen echten Verhaltensverlust abgefangen, nicht nur einen Kommentar.**
  Der Nitpick der Runde 2 war ausdrücklich als „kein Merge-Blocker" markiert; trotzdem wurde er
  mit E2E-Test **und** Mutant umgesetzt, statt ihn als akzeptiertes Restrisiko zu notieren. Ohne
  ihn hätte #310 eine vor dem PR bestehende Stopp-Bedingung stillschweigend entfernt – die
  unangenehmste Regressionsklasse, weil sie erst im nächsten unbeaufsichtigten Lauf auffällt.
- **Der Selbstfund im Mutations-`awk` ist der wertvollste Teil dieses Commits.** Der erste Anlauf
  ankerte auf dem Dateinamen und löschte damit die Erwähnung im eigenen, im selben Commit
  geschriebenen WHY-Kommentar – der echte Aufruf blieb stehen, und der Wirksamkeits-Guard war nur
  deshalb grün, weil er dieselbe Fragment-Zählung nutzte. Dass das **vor** dem Review bemerkt,
  behoben und als Codify-Kandidat mit konkreter Regelverschärfung („Anker = vollständige
  Aufrufzeile, Zählung = dieselbe Zeichenkette wie die Mutation") festgehalten wurde, ist genau
  die Selbstkorrektur, die die Lesson-Serie #114/#284 einfordert.
- **Der Doku-Nachzug ist diesmal Teil desselben Commits, nicht eines Nachläufers.** Spec, ADR-019
  und Task-Datei ändern sich zusammen mit der Codezeile – die Ausnahme ist damit dokumentiert
  statt implizit, und ein späterer Leser findet die Begründung an der kanonischen Stelle.
- **Die Gesamtlösung bleibt an der Ursache.** Kein Eingriff in `circuit_breaker_check()`,
  `MAX_REVIEW_ITERATIONS` oder das Turn-Budget; der Snapshot sitzt einmal pro `run_skill`-Aufruf
  oberhalb der Retry-Schleife und hinter dem `--dry-run`-Return; die Skill→Datei-Zuordnung liegt
  an einem Ort und ist über beide Seiten des Kopplungs-Guards abgesichert.
- Keine Routen-Änderung (`app/**` unberührt) → `docs/routes.md` korrekt nicht angefasst; keine
  `.claude/**`-Änderung (kein Patch-Workflow nötig); kein ADR-Trigger, mit Begründung gegen alle
  vier Kategorien in der Task-Notiz.
- Kein neuer Out-of-Scope-Fund oberhalb der ADR-043-Schwelle in dieser Runde. Der einzige
  Kandidat (Interrupt-Asymmetrie) betrifft Code, den dieser PR angefasst hat, und bleibt daher
  als In-Scope-Nitpick hier stehen statt als Issue/`kleinfunde.md`-Eintrag. Der Out-of-Scope-Fund
  der Runde 1 (Issue **#312**) besteht unverändert und ist korrekt ausgelagert.

## Historie

- **Runde 1** (`NEEDS_REWORK`): keine kritischen, drei wichtige Findings (W1 Redirection-
  Reihenfolge in `report_fingerprint`, W2 ungetesteter `UNREADABLE`-Zweig, W3 paralleles
  Scaffolding statt `_mk_pipe_repo`) und vier Nitpicks. Rework in `aac62bc`; die Subshell in
  `report_verdict` blieb bewusst unangetastet. Out-of-Scope-Fund: Issue **#312**.
- **Runde 2** (`APPROVED`): W1–W3 belegbar behoben, keine kritischen und keine wichtigen
  Findings; fünf Nitpicks. Vier davon im Nachlauf-Commit `904d635` umgesetzt (ADR-019-
  Artefaktliste, `interrupt-check.sh` im Stale-Zweig, totes `raise-interrupt.sh`-Scaffolding,
  Zahlendrift), einer mit Begründung offen gelassen (doppelte Verneinung `:5799`).
- **Runde 3** (diese Runde): prüft `904d635`. Keine kritischen, keine wichtigen Findings; drei
  Nitpicks, alle rein kosmetisch bzw. für `/refactor` vorgemerkt.

## Empfehlung
APPROVED
