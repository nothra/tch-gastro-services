## Codify-Report: Task 334

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  – „Eine Feldnamen-Whitelist filtert nicht die Wertform, wenn derselbe Stream strukturierten
  Export und Agenten-Freitext ununterschieden vermengt" – wegen: der Security-Review-Fund, dass
  `telemetry_capture` den gesamten `claude --print`-Output mitschreibt und ein Agent darüber
  beliebigen Text (auch Personendaten) über ein erlaubtes Feld (`model` u. a.) einschleusen
  konnte, obwohl die Feldnamen-Whitelist per Design genau das verhindern sollte.
  Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` ergänzt (Trigger: `/architecture`,
  `/implement`, `/security-review` bei jeder Whitelist-Projektion aus gemischter Quelle).

- [`docs/factory/lessons/factory-workflow.md`](../docs/factory/lessons/factory-workflow.md)
  – „Pipeline-Code, der selbst committet, braucht eine explizite Git-Identität" – wegen: ein
  CI-only-Fehlschlag (`factory-self-test` auf `ubuntu-latest`), der lokal auf macOS nicht
  reproduzierbar war, weil Git dort mangels Domainanteil im Hostname keine
  Fallback-Identität synthetisiert – anders als auf der Entwickler-Maschine. Ergänzt die
  bestehende Test-Fixture-Lesson (db-drizzle.md, #265) um den Produktionscode-Fall und die
  Repro-Technik (Container statt Config-Blanking). Index-Zeile ergänzt.

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – „Claude-Stub-
  Nebenwirkung ohne Skill-/Task-Bindung lässt ein Testszenario über einen fremden Guard
  bestehen" – wegen: mein eigener erster Entwurf des „zwei normale Läufe überschreiben sich
  nicht"-Tests schrieb eine Report-Datei für den zweiten Lauf schon während des ersten,
  wodurch der ECHTE `/review`-Aufruf des zweiten Laufs auf den Report-Frische-Guard lief und
  abbrach – der Test bestand trotzdem, aber über den EXIT-Trap-Fallback statt den behaupteten
  Pfad. Erst ein Mutationstest deckte die Verwechslung auf. Index-Zeile ergänzt.

- [`docs/factory/kleinfunde.md`](../docs/factory/kleinfunde.md) – Eintrag „Telemetrie-CSV:
  führende `+`/`-`/`@`-Zeichen ungeschützt gegen CSV-Injection" – der begleitende
  Security-Hinweis (kein Blocker) aus `tasks/security-334.md`, festgehalten statt in einer
  Task-spezifischen Datei zu verschwinden.

### Issue angelegt (ADR-018, oberhalb der Schwelle)

- [Issue #336](https://github.com/nothra/tch-gastro-services/issues/336) – residualer
  Whitelist-Bypass für Nicht-E-Mail-Freitext in `model`/`agent_name` (bereits während
  `/security-review` Runde 2 angelegt, hier nur referenziert – kein Doppel-Eintrag).

### Muster über die drei Review-/Fix-Runden

Alle drei technischen Findings dieser Task (CSV-Leck in Fail-Open-Zweigen, Retry-
Unterzählung, Git-Identität) wurden **erst durch echtes Ausführen** gefunden – Review-Runde 1
per Standalone-Repro und Mutationstest, Runde 2 durch den tatsächlichen CI-Lauf (nicht durch
Code-Lesen). Kein Finding wäre durch reines Lesen des Diffs auffindbar gewesen; alle drei
brauchten eine laufende Umgebung, die vom bloßen Vorhandensein von Tests abweicht (Retry-Pfad,
gescheiterter Commit, CI-Runner-Hostname). Das bestätigt eine bereits etablierte Grundhaltung
dieser Factory (bash-gotchas.md, „empirisch verifizieren, nicht behaupten") eher, als dass es
eine neue Regel begründet – deshalb keine vierte, redundante Lesson dazu.

### Keine Änderungen nötig

- Die Refactoring-Runde (Duplikat-Extraktion in `telemetry_persist()`) folgte bereits
  bestehenden clean-code.md-Regeln ohne neuen Fehler-Typ – keine Lesson.
- Die Test-Vervollständigungsrunde (`/test`, zwei neue Fehlerszenario-Tests) deckte reguläre
  Spec-Lücken, kein wiederkehrendes Muster jenseits der bereits oben codifizierten
  Stub-Bindungs-Lesson.

### Empfehlung für nächste Features

- Bei jedem neuen `git commit`/`git push` in Pipeline-Code (außerhalb `factory-commit.sh`)
  sofort eine explizite Identität setzen, statt erst auf einen CI-Fehlschlag zu warten – die
  neue Lesson benennt das jetzt als Trigger für `/implement`/`/review`.
- Bei jeder neuen Whitelist-artigen Projektion aus einer Quelle mit gemischtem Inhalt
  (strukturiert + potenziell agentenkontrolliert) die Wertform von Anfang an mitdenken, nicht
  erst in `/security-review` nachrüsten.
