# Security Review: Task 334

> Runde 2 (2026-09-13), nach dem Fix auf den Runde-1-Kritisch-Fund. Unabhängig neu geprüft,
> nicht nur „laut Commit-Message übernommen": der demonstrierte Angriff aus Runde 1 wurde
> gegen den gefixten Code erneut gefahren (blockiert jetzt), zusätzlich per Mutationstest
> bestätigt (Fix zurückgenommen → genau die vier zugehörigen Tests kippen rot), und die
> gesamte Bash-Suite frisch laufen lassen (1543/1543 grün).

## Kritische Findings (Blocker)

*(keine – der Runde-1-Fund ist behoben und verifiziert, siehe unten)*

## Wichtige Findings

- [ ] [Data Exfiltration / Whitelist-Bypass, residual] Der Runde-1-Fix schließt den
  **demonstrierten** Angriffspfad (E-Mail-artige Werte in `model`/`query_source`/
  `agent.name`/`type`), aber `model`/`agent_name` bleiben als NICHT vollständig
  enumerierbare Felder weiterhin offen für **beliebigen Freitext ohne `@`-Zeichen** –
  insbesondere Namen oder andere Personendaten ohne E-Mail-Form.

  Empirisch belegt (gegen den GEFIXTEN Code, Runde 2):
  ```
  $ harvest_telemetry_csv raw.txt T 334
  ...,claude_code.cost.usage,Ralf.Notheis-Vollstaendiger.Name,main,,,0.01
  ```
  Ein Wert ohne `@` und unter der 100-Zeichen-Grenze passiert `plausible_free_text()`
  unverändert – dieselbe Angriffskette wie in Runde 1 (Agent gibt eine Zeile aus, die der
  erwarteten Blockstruktur entspricht), nur mit einem Payload, der kein `@` enthält.

  **Warum nicht mehr Blocker:** Der praktisch relevanteste, am leichtesten automatisierbar
  ausnutzbare Pfad (maschinell scrapbare E-Mail-Adressen) ist geschlossen; der verbleibende
  Pfad braucht einen Angreifer, der gezielt weiß, welchen konkreten Freitext er exfiltrieren
  will, statt ihn massenhaft/automatisch abzugreifen. Eine vollständige Schließung würde
  entweder `model` auf eine deutlich strengere Positiv-Liste (Risiko: legitime Gateway-/
  Custom-Modellnamen fälschlich leeren) oder eine architektonische Trennung der
  OTEL-Erhebung vom mitgeschriebenen Konversationsstream verlangen – beides über den Rahmen
  einer iterativen Härtung hinaus.

  **Nachverfolgung:** [Issue #336](https://github.com/nothra/tch-gastro-services/issues/336)
  angelegt (`enhancement`, `security`, `factory-pipeline`) – bewusst als eigener Task
  ausgelagert (ADR-018-Schwelle: eigenständige Härtung), nicht Blocker für diesen PR.

## Hinweise

- [ ] [CSV-Injection / Formeleinschleusung] Unverändert aus Runde 1: `clean()` erlaubt
  `+`, `-`, `@`, `.` als Zeichen in jedem Feldwert; ein Feld, das mit einem dieser Zeichen
  beginnt, könnte von Excel/Google Sheets als Formel interpretiert werden. Weiterhin kein
  Blocker (Payload-Zeichen wie Pipe/Leerzeichen/Anführungszeichen/Klammern sind bereits durch
  `clean()` entfernt; die primäre Auswertung laut Spec ist maschinell, `AK8`).

## Was in Runde 2 verifiziert wurde

- Der Runde-1-Angriff (`model: "opfer@beispielfirma.de"` etc.) wird jetzt für alle vier
  Felder korrekt geleert, nicht nur für `model` allein – einzeln nachgeprüft.
- Zwei Kontroll-Tests bestätigen, dass echte Werte (Hauptsession **und** Sub-Agent) nach dem
  Fix unverändert erhalten bleiben – der Fix ist nicht überscharf.
- Mutationstest: die Werte-Whitelist-Prüfung aus dem Fix entfernt → exakt die vier
  zugehörigen Tests kippen rot, alle anderen bleiben grün (Kausalität, nicht nur Korrelation).
- Keine neuen Dependencies, keine Secrets im Diff, keine internen Stack-Traces in
  Fehlerausgaben – Rest des Prüfkatalogs unverändert unauffällig (bereits in Runde 1 geprüft,
  seither keine Änderungen an den betroffenen Stellen außer dem Fix selbst).

## Ergebnis

PASSED
