# Security Review: Task 310

**Scope:** `git diff origin/main...HEAD` (10 Dateien, +1138/−41) – Produktionscode sind
ausschließlich zwei Shell-Skripte: `scripts/lib/report-verdict.sh` (+`report_file`,
+`report_fingerprint`) und `scripts/run-pipeline.sh` (`stop_if_interrupted()`,
Frische-Bedingung im Report-Guard, Report-Pfade aus der Lib). Rest: `run-tests.sh`, ADR-019,
Spec, Lessons, `kleinfunde.md`, Task-/Review-Datei.

**Threat Surface:** Orchestrator-Shell der Factory (Stage 3). Läuft lokal bzw. in CI mit den
Rechten des Entwicklers/Runners; verarbeitet als Eingaben eine Task-ID (CLI-Argument bzw.
Issue-Nummer aus `factory-poll.sh`) und agenten-erzeugte Report-Dateien im Repo. Kein
Netzwerk-, Auth- oder Datenbank-Bezug; keine Dependency-Änderung (kein `package.json`/
Lockfile-Diff). Relevante Kategorien daher: Command-/Path-Injection über die Task-ID,
Integrität des Verdict-Gates (Security-Gate der Pipeline), Information Disclosure im Log.

---

## Kritische Findings (Blocker)

_Keine._

---

## Wichtige Findings

- [ ] **[Security-Gate / Fail-open, außerhalb dieses PR-Scopes → Issue #312]**
  Der Guard in `run_skill()` ist mit diesem PR frisch geprüft – der **Verdict-Konsum** in
  Phase 5 (`scripts/run-pipeline.sh:504`) ist es nicht. Endet `claude` beim
  `security-review` mit **Exit 0**, ohne `tasks/security-<id>.md` zu schreiben, liefert
  `report_verdict` einen leeren String; der Vergleich `= "NEEDS_FIXES"` greift dann nicht und
  die Pipeline läuft weiter (Codify, optional `pr-shepherd`/Auto-Merge). Dasselbe gilt für
  einen committeten Report eines früheren Laufs mit `PASSED`. Ein Backstop existiert dafür
  nicht: `scripts/lib/verify-final-state.sh` (ADR-040) prüft weder Report-Existenz noch
  Verdict (verifiziert per Grep – keine Treffer auf `security`/`report`/`verdict`).
  **Einordnung:** Fail-open **eines Sicherheits-Gates**, aber **vorbestehend** – dieser PR
  verschlechtert nichts, er verbessert die Nachbarmechanik (siehe „Positive Befunde"). Kein
  Merge-Blocker für #310, weil der Fix die Konsumenten in Phase 2/5 betrifft (eigene Spec
  nötig, Scope-Regel „Nur implementieren was in der Task-Datei steht").
  **Lösung (im Folge-Issue):** Verdict-Konsum an dieselbe Frische-Bedingung koppeln, die
  `run_skill()` jetzt kennt (`report_fingerprint` vor/nach dem Aufruf), und das Gate
  fail-closed umdrehen: nur ein **frisches, eindeutiges** `PASSED` passieren lassen, alles
  andere (leer, stale, mehrdeutig) blockiert.
  **Tracking:** bereits als **#312** offen („Verdict-Konsum in Phase 2/5 gegen stale Report
  absichern (exit-0-Pfad ohne Frische-Pruefung)"). Kein Duplikat angelegt; das fehlende
  Aspekt-Label **`security`** wurde in dieser Review ergänzt (vorher nur `bug` +
  `tech-debt`) – die Fail-open-Richtung auf dem Security-Gate ist der Grund.

---

## Hinweise

- [ ] **[Kryptographie / bewusste Wahl] `cksum` (CRC32) ist keine Manipulationssicherung –
  Annahme ist im Code dokumentiert und trägt hier.**
  `report_fingerprint` (`scripts/lib/report-verdict.sh:75`) nutzt POSIX-`cksum`; eine
  Kollision ist konstruierbar. Das ist **kein** Finding: der Fingerprint erkennt
  *Veränderung* in einem nicht-adversarialen Ablauf (einziger Schreiber ist der Agent
  desselben Aufrufs), und der Gewinn einer Kollision wäre lediglich ein zusätzlich
  verbrauchter Fehlversuch – der Verdict müsste weiterhin als gültiges Token unter dem
  Anker stehen. Die Begründung samt Portabilitäts-Argument (macOS/BSD/GNU/busybox, keine
  neue Capability-Prüfung) steht als WHY-Kommentar direkt darüber. Sollte der Fingerprint
  jemals zur Integritäts- statt Frische-Prüfung aufgewertet werden, ist auf SHA-256 nach dem
  Muster aus `scripts/install-yq.sh` (gepinnt + verifiziert) zu wechseln.

- [ ] **[Path Injection / vorbestehend, wirksam eingegrenzt] `report_file` interpoliert die
  Task-ID in einen Pfad – ohne eigene Validierung.**
  `"$tasks_dir/review-${task_id}.md"` (`report-verdict.sh:42-43`) übernimmt das Muster
  1:1 aus dem alten Inline-Code in `run-pipeline.sh`; die Auslagerung ändert die
  Angriffsfläche nicht. Ein `task_id` mit `../` würde einen Pfad außerhalb von `tasks/`
  erzeugen. **Praktisch nicht erreichbar:** `run-pipeline.sh:70` akzeptiert nur eine ID,
  für die `find … -name "task-${TASK_ID}-*.md"` eine Datei findet, und `-name` matcht keine
  Slashes → ein traversierender Wert bricht vorher mit Exit 1 ab. Zusätzlich sind alle
  Verwendungen korrekt gequotet (kein Word-Splitting, kein `eval`, keine
  Command-Substitution auf Fremdinhalt). Keine Änderung empfohlen; falls die ID künftig aus
  einer weiteren Quelle stammt, gehört ein Integer-Guard (`case "$id" in ''|*[!0-9]*)`) an
  die Argument-Auswertung, nicht in die Lib.

- [ ] **[Robustheit / Testcode] `rm -rf "$TMP_*310"` nach `mktemp -d`.**
  Die neuen `run-tests.sh`-Blöcke räumen ihre Wegwerf-Repos mit `rm -rf` auf
  Variablen auf, die aus `mktemp -d` stammen. Schlüge `mktemp` fehl, wäre die Variable leer
  und `rm -rf ""` ein folgenloser Fehler – kein Löschrisiko außerhalb von `$TMPDIR`. Alle
  Schreibziele der neuen Tests liegen in `mktemp`-Verzeichnissen (verifiziert: kein
  hinzugefügter Schreibzugriff auf `$HOME`/`$FACTORY_DIR`/`$REPO_ROOT`). Der `chmod 000`-Block
  ist explizit auf `id -u != 0` beschränkt und meldet sonst einen Skip.

---

## Positive Befunde (Härtung durch diesen PR)

- **Fail-open im Report-Guard geschlossen (#91/#310).** Vor diesem PR konnte ein
  **committeter** `tasks/security-<id>.md` mit `PASSED` aus einem früheren Lauf einen
  abgebrochenen `security-review`-Aufruf als Erfolg werten – die Pipeline lief mit einem
  Security-Verdict weiter, das nie zu diesem Codestand entstanden ist. Die Frische-Bedingung
  beseitigt genau diese Richtung; die Fehlrichtung der neuen Prüfung ist durchgehend
  fail-closed (ein zusätzlicher Versuch, nie ein falscher Erfolg).
- **Fail-closed-Marker statt stillem Erfolg.** `ABSENT` und `UNREADABLE`
  (`report-verdict.sh:69/76`) sind so gewählt, dass ein fortbestehender Lesefehler zu
  identischen Fingerprints → stale → Fehlversuch führt, statt eine Prüfsumme vorzutäuschen.
  `NO_REPORT_SKILL` verhindert, dass ein nicht report-erzeugender Skill in den Zweig gerät.
- **Stopp-Bedingung erhalten statt verloren.** Der neue Stale-Zweig ruft
  `stop_if_interrupted()` auf (`run-pipeline.sh:300`). Ohne diese Zeile hätte der PR eine vor
  #310 bestehende harte Stopp-Bedingung verloren (Interrupt signalisiert + non-zero Exit →
  zwei weitere Heavy-Versuche ohne Blocker-Eintrag). `interrupt-check.sh` ist idempotent
  (`grep -qF` vor dem Append), der Mehrfachaufruf pro Versuch erzeugt also keine
  Duplikat-Einträge.
- **Keine Information Disclosure im neuen Log-Pfad.** Die neue Warnmeldung
  (`run-pipeline.sh:291`) gibt nur Skill-Name und `${verdict}` aus – und `report_verdict`
  druckt ausschließlich die vier **Literale** `APPROVED`/`NEEDS_REWORK`/`PASSED`/`NEEDS_FIXES`
  (awk `print pass` / `print fail`), nie Report-Inhalt. Damit erreicht kein agenten-erzeugter
  Text das `echo -e` – wichtig, weil `echo -e` Backslash-/ANSI-Sequenzen interpretieren würde.
  Ebenso schluckt `cksum 2>/dev/null` Pfad-/Permission-Meldungen aus dem Pipeline-Log
  (Log-Hygiene, Review-Finding W1).
- **Keine Secrets, keine Dependencies.** Secret-Scan über den vollen Diff
  (`password|secret|api_key|token|PRIVATE KEY|AUTH_SECRET|DATABASE_URL|ghp_|sk-`): nur
  Fehltreffer auf deutsche Prosa und die Variablennamen `pass_token`/`fail_token`. Kein
  `package.json`-/Lockfile-Diff → keine neue Angriffsfläche über Abhängigkeiten. Das temporäre
  `.issue-body-310.tmp.md` ist im Rework der Review-Runde 1 entfernt worden.
- **Kein `eval`, kein ungequotetes Wort-Splitting, keine dynamische Kommandokonstruktion** in
  den beiden geänderten Produktions-Skripten (zeilenweise über den Diff geprüft).

---

## Geprüfter Katalog

| Bereich | Ergebnis |
|---------|----------|
| Input-Validierung / Injection (Command, Path) | OK – siehe Hinweis 2; keine `eval`/unquoted-Expansion |
| SQL / XSS / XML-JSON-Injection | N/A – reine Shell-Orchestrierung, keine App-Schicht berührt |
| AuthN / AuthZ / IDOR | N/A – kein Auth-, Rollen- oder Routen-Code im Diff |
| Hardkodierte Credentials, Secrets im Log | Keine (Scan über den vollen Diff) |
| Krypto / Zufall | Kein Zufall; `cksum` als Änderungserkennung – siehe Hinweis 1 |
| Dependencies | Keine Änderung (kein Lockfile-/`package.json`-Diff) |
| Error Handling / Information Disclosure | OK – nur Literale im Log, stderr des Lesefehlers unterdrückt |
| Integrität der Gate-Logik | Verbessert (Guard), Restrisiko beim Konsum → #312 |

---

## Ergebnis

PASSED

Keine kritischen und keine im Scope dieses PR zu behebenden Findings. Das einzige wichtige
Finding ist ein **vorbestehendes** Fail-open des Verdict-Konsums außerhalb dieses PR-Scopes und
wird in **#312** (jetzt mit Aspekt-Label `security`) weiterverfolgt.
