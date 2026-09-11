# Review: Task 334

## Kritische Findings (müssen behoben werden)

- [x] [scripts/run-pipeline.sh:187] Zwei der drei Fail-Open-Zweige in `persist_telemetry()`
  löschen die bereits geerntete CSV-Datei **nicht** von der Platte, obwohl sie den
  Commit/Push abbrechen. Betroffen: der „Index nicht leer"-Zweig (`scripts/run-pipeline.sh:176-179`,
  gar kein `rm -f`) und der „add/commit fehlgeschlagen"-Zweig (`scripts/run-pipeline.sh:183-189`,
  nur `git reset -- "$TELEMETRY_CSV"` – das unstaged nur, löscht die Datei nicht). Nur der
  dritte Zweig (Push fehlgeschlagen, `:194-199`) macht es richtig (`rm -f` nach dem Reset).
  Empirisch reproduziert (Standalone-Repro, exakt der Code aus diesen zwei Zweigen):
  ```
  # Index-nicht-leer-Zweig:
  $ git status --porcelain
  A  staged-by-someone-else.txt
  ?? telemetry-x.csv          # <- bleibt liegen

  # add-ok/commit-fail-Zweig (z.B. Pre-Commit-Hook lehnt ab, oder keine git-Identität):
  $ git status --porcelain
  ?? telemetry-x.csv          # <- bleibt liegen
  ```
  **Warum kritisch:** Genau das ist der Fall, den AK6/AK7 explizit ausschließen sollen –
  „Erhebung/Auswertung/Commit schlägt fehl → Exit-Code unverändert" UND „Arbeitsbaum sauber".
  Eine liegengebliebene, untracked CSV macht `git status` dirty; `verify_final_state`
  (ADR-040) prüft genau das und würde den Lauf als `INCOMPLETE_OUTCOME` melden – ein
  **erfolgreicher** Pipeline-Lauf würde allein durch einen Telemetrie-Nebeneffekt als
  gescheitert gemeldet. Der „add/commit fehlgeschlagen"-Zweig ist dabei kein exotischer
  Rand: er greift bereits bei fehlender lokaler Git-Identität oder einem ablehnenden
  `pre-commit`-Hook (der hier – wie bei `factory-commit.sh` – ungeschützt mitläuft, `git commit`
  ohne `--no-verify`, `pnpm lint` inklusive).
  **Fix-Richtung:** In beiden Zweigen symmetrisch zum Push-Fehlschlag-Zweig `rm -f
  "$TELEMETRY_CSV" 2>/dev/null || true` ergänzen, bevor `return 0`. Dazu je einen E2E-Test
  (Index vorbesetzt / Commit schlägt fehl), der `git status --porcelain` nach dem Lauf prüft –
  aktuell deckt keiner der `#334`-Tests diese zwei Zweige ab.

- [x] [scripts/lib/telemetry-harvest.sh:94-99] Die Kumulativ-Counter-Entdopplung nimmt das
  **Maximum** je Schlüssel – richtig für mehrere Export-Zyklen **desselben** `claude`-Prozesses,
  aber falsch, sobald **zwei verschiedene Prozesse** unter demselben Schritt landen: Der
  Retry-mit-Backoff in `run_skill()` (`scripts/run-pipeline.sh:405`, „z.B. bei
  Rate-Limit-Fehlern") startet bei jedem Versuch einen neuen `claude`-Prozess mit einem bei 0
  beginnenden Counter – aber `telemetry_note_step` (`scripts/run-pipeline.sh:369`) steht
  **vor** dieser Schleife und wird pro `run_skill()`-Aufruf nur **einmal** geschrieben. Zwei
  (oder drei) Versuche desselben Skills landen damit unter demselben `step_seq`/Marker, und
  der Harvest nimmt `max(Versuch1, Versuch2)` statt der Summe.
  Empirisch reproduziert (zwei separate `claude_code.cost.usage`-Datenpunkte unter einem
  Marker, wie sie zwei echte Retry-Versuche erzeugen würden):
  ```
  $ harvest_telemetry_csv raw.txt T 334
  ...,claude_code.cost.usage,claude-haiku-4-5-20251001,main,,,0.08
  # Erwartet (Summe der tatsächlichen Kosten beider Versuche): 0.13
  ```
  **Warum kritisch:** AK1 verlangt „Token-/Kosten-**Ist**-Werte dieses Laufs" gerade als
  Grundlage für Modell-/Tier-Entscheidungen (ADR-009/ADR-038) – genau der Fall, den ADR-049 §E1
  („nie selbst rechnen/schätzen") und AK-Fehlerszenario 1 („Fehlen wird sichtbar gemeldet,
  nicht still ein irreführendes Artefakt") verhindern sollen, wird hier durch eine
  **stille Unterzählung** unterlaufen: ein realer Rate-Limit-Retry (kein hypothetisches
  Randszenario, sondern eine im selben Skript dokumentierte Backoff-Strategie) lässt echte
  Kosten aus der Historie verschwinden, ohne jede Fehlermeldung.
  **Fix-Richtung:** `telemetry_note_step` in die Retry-Schleife verschieben (vor jeden
  einzelnen `claude`-Aufruf, nicht nur vor `run_skill()` insgesamt), sodass jeder physische
  Prozess seinen eigenen `step_seq` bekommt – analog zum bereits getesteten Rework-Schleife-Fall
  (`,3,implement,` im dritten `run_skill`-Aufruf). Dazu ein Test, der zwei `cost.usage`-Punkte
  unter EINEM Marker simuliert und eine Summe statt eines Maximums verlangt (oder, bei der
  Marker-pro-Attempt-Lösung, zwei getrennte Zeilen).

## Wichtige Findings (sollten behoben werden)

- [x] [scripts/run-pipeline.sh:155] `persist_telemetry` bricht mit dem Namensschema der übrigen
  Telemetrie-Funktionen (`telemetry_note_step`, `telemetry_capture`, `telemetry_cleanup`) –
  Subjekt-zuerst statt Verb-zuerst. Rein kosmetisch, aber in derselben Datei nebeneinander
  auffällig inkonsistent; Umbenennung zu `telemetry_persist` wäre naheliegend.

## Nitpicks (optional)

- [x] [scripts/run-pipeline.sh:107-118] Der Telemetrie-Aktivierungsblock (inkl. Anlegen der
  leeren Roh-Log-Datei unter `tasks/`) läuft auch bei `--dry-run`, obwohl in diesem Modus nie
  ein `claude`-Prozess startet und `persist_telemetry` sofort früh zurückkehrt
  (`DRY_RUN`-Guard). Die Datei wird zwar über den EXIT-Trap (`telemetry_cleanup`) wieder
  entfernt, aber ein zusätzlicher `[ "$DRY_RUN" = false ]`-Guard vor dem Aktivierungsblock
  würde das unnötige Anlegen/Entfernen ganz vermeiden.

## Positives

- Konsequente Whitelist-Projektion (`scripts/lib/telemetry-harvest.sh:79-85`): nur die
  benannten Attribute werden überhaupt gelesen, kein `user.*`/`organization.id` gerät in
  Reichweite – strukturell robuster als ein Blacklist-Filter.
- Format-Drift-Guard ist tatsächlich fail-closed (nicht nur behauptet): mit einem Log ohne
  jede OTEL-Struktur liefert `harvest_telemetry_csv` exit 1 und keine Ausgabe – per Test UND in
  dieser Review per Hand nachvollzogen.
- Die Ernte-Logik ist als reine, seiteneffektfreie Funktion ausgelagert (`scripts/lib/telemetry-harvest.sh`)
  und dadurch ohne echten `claude`-Lauf gegen eine Fixture prüfbar – genau das von ADR-049
  verlangte „der Orchestrator ruft, er rechnet nicht".
- E2E-Tests fahren den echten Orchestrator (gestubbte CLI) statt nur Wiring zu grep'en –
  Default-an, `--no-telemetry`, Format-Drift und Push-Fehlschlag sind alle als Verhalten belegt,
  nicht nur als Text im Skript.
- Das Ambient-Env-Problem (`CLAUDE_CODE_ENABLE_TELEMETRY=1` ist in einer interaktiven
  Claude-Code-Session bereits gesetzt) wurde selbst erkannt und im Test sauber neutralisiert
  (`env -u CLAUDE_CODE_ENABLE_TELEMETRY -u OTEL_METRICS_EXPORTER`) – sonst wäre der
  `--no-telemetry`-Test lokal falschrot und der Default-Test falschgrün gewesen.
- Fixture ist eine echte, anonymisierte Messung (nicht erfunden) – gegen die eigene Regel
  geprüft, dass kein Original-Personenwert übrig bleibt.
- `--` vor variablen `grep -F`-Pattern in den neuen Testhelfern (`assert_contains_286`/
  `assert_absent`) korrekt gesetzt und mit einer eigenen Diskriminierungs-Kontrolle
  (`--no-telemetry` als Such-Phrase) belegt – vermeidet den in dieser Codebase mehrfach
  aufgetretenen `-`-Anker-Fehler.

## Rework-Notiz (aus `/implement`, 2026-09-11)

Alle vier Findings behoben, je mit RED-Test vor dem Fix:

- **Kritisch 1** (leckende CSV in zwei Fail-Open-Zweigen): `rm -f "$TELEMETRY_CSV"` in beiden
  Zweigen ergänzt (`scripts/run-pipeline.sh`, `telemetry_persist()`). Zwei neue E2E-Tests
  (Index vorbesetzt / `pre-commit`-Hook lehnt ab) belegen `git status --porcelain` sauber
  bzgl. der Telemetrie-Datei danach.
- **Kritisch 2** (Retry-Unterzählung): `telemetry_note_step` aus vor die Retry-Schleife in
  **jeden Versuch hinein** verschoben – jeder physische `claude`-Prozess bekommt jetzt einen
  eigenen `step_seq`. Neuer E2E-Test (Versuch 1 scheitert mit 0.05 USD, Versuch 2 gelingt mit
  0.08 USD) belegt die Summe 0.13 in der CSV statt des vorherigen Maximums 0.08.
- **Wichtig** (Namensinkonsistenz): `persist_telemetry` → `telemetry_persist` umbenannt,
  passend zu `telemetry_note_step`/`telemetry_capture`/`telemetry_cleanup`.
- **Nitpick** (`--dry-run` legt unnötig eine Roh-Log-Datei an): Aktivierungsblock zusätzlich
  auf `[ "$DRY_RUN" = false ]` bedingt.

Bash-Suite: 1528/1528 grün (vorher 1522 + 6 neue). `pnpm lint`/`pre-commit` grün.

## Empfehlung

NEEDS_REWORK

<!-- Verdict bleibt an der nächsten /review-Runde – dieser Abschnitt dokumentiert nur den
     Rework-Stand, ersetzt keine Freigabe. -->
