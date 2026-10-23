## Codify-Report: Task 432

### Neue Regeln hinzugefügt
- `docs/factory/lessons/factory-workflow.md` + Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` – „Tests zwischen Suiten umziehen": Prosa-Verweise auf den alten Testort nachziehen (ADR-032 und Projekt-Lesson hatten weiter „run-tests.sh“), toter Patch-Zweig nach dem Anwenden eines `.claude/**`-Patches, Anker gegen den ursprünglichen Wortlaut statt gegen neue Zusammenfassungen. Wegen: Review-Findings W1–W3 und `/refactor`-Nachzügler (AK-K2-Anker). Rezidiv-Familie #211/#176/#212, deshalb ergänzende Lesson statt neuer Guideline.

### Keine Änderungen nötig
- Kein neuer Check: die Fehlerklasse (Prosa-Drift nach Umzug) ist durch Grep im Review auffindbar, ein Gate würde die Menge an Prosa-Mustern nicht sinnvoll abdecken.
- Kein Out-of-Scope-Fund: keine Issues, keine `kleinfunde.md`-Einträge.
- Der dreifache Guardrail-Hook-Treffer auf `rm -rf "$TMP_…"` (mktemp-Variablen, in Tests/Greps) war ein Fehlalarm der lokalen Umgebung, keine Factory-Regel.

### Empfehlung für nächste Features
- T1a-3 ist behaviour-neutral abgeschlossen; AK-X2 (Required Checks) und AK-X3 (Stage-2-Probe: `start-work.sh` ID-Modus, `pre-push.sh` auf Probe-Branch) lassen sich erst nach Push/Merge prüfen – im PR-Lauf bzw. direkt nach dem Merge nachweisen.
- Bei Folge-Splits (T1b) die Testzahl-Bilanz (verschoben + neu = vorher + neu) wieder in der Task-Datei herleiten und `import-context-limit-check.sh` (aktuell ~1033/1100) im Blick behalten.
