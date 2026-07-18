# Task 151: apache-20-lizenz-und-securitymd-ergnzen

## Status
- [x] In Bearbeitung
- [x] Review bestanden — n/a (reine Doku-/Meta-Task, kein Produktionscode; Selbst-Review erfolgt)
- [x] Tests vollständig — n/a (kein neuer Code; Bestandssuite 376 grün über Pre-Push-Gate)
- [x] Security-Review bestanden — n/a (kein Code; History-/Secret-Scan des Repos war Voraussetzung, sauber)
- [x] Refactoring abgeschlossen — n/a (keine Logik)
- [x] Codify ausgeführt — n/a (keine wiederkehrende Fehlerklasse)
- [x] Fertig / PR erstellt

## Beschreibung
Vorbereitung des Repositories für die Umstellung auf **public**: eine Open-Source-Lizenz
und eine Sicherheitsrichtlinie ergänzen, damit der Code rechtlich nachnutzbar ist und ein
vertraulicher Meldeweg für Schwachstellen existiert.

Umgesetzt:
- `LICENSE` mit vollständigem **Apache-2.0**-Text.
- `package.json`: Feld `"license": "Apache-2.0"`.
- `SECURITY.md` mit vertraulichem Meldeweg (GitHub Private Vulnerability Reporting).

## Akzeptanzkriterien
- [x] GIVEN das Repo soll public werden, WHEN man `LICENSE` öffnet, THEN enthält sie den
      vollständigen Apache-2.0-Text mit `Copyright 2026 Ralf Notheis` in der Boilerplate
      (GitHub erkennt die Lizenz automatisch → Lizenz-Badge).
- [x] GIVEN `package.json`, WHEN man das `license`-Feld liest, THEN steht dort `Apache-2.0`;
      `"private": true` bleibt bestehen (App, kein npm-Publish – verhindert versehentliches
      Veröffentlichen im Registry, unabhängig von der Repo-Sichtbarkeit).
- [x] GIVEN eine gefundene Schwachstelle, WHEN man `SECURITY.md` liest, THEN wird ein
      **vertraulicher** Meldeweg genannt (GitHub Private Vulnerability Reporting) und ausdrücklich
      vor öffentlichen Issues/PRs gewarnt.
- [x] GIVEN der Feature-Branch, WHEN die Gates laufen, THEN sind Lint, Tests (376) und Typecheck grün.

## Technische Notizen
- **Lizenzwahl Apache-2.0** (permissiv + expliziter Patent-Grant) gegenüber MIT/AGPL/PolyForm-NC
  abgewogen: Vereinsprojekt ohne Geheimhaltungswert, Ziel ist Transparenz/Wiederverwendung.
  AGPL/Non-Commercial bringen hier mehr Komplexität als Nutzen; der Schutz der Vereins-Instanz
  läuft ohnehin über Secrets, nicht über die Lizenz.
- **Copyright-Inhaber:** Ralf Notheis (persönlich), Jahr **2026** (Projektstart).
- **SECURITY.md** nutzt bewusst GitHub Private Vulnerability Reporting statt einer öffentlichen
  E-Mail – so wird keine `dm.de`-Adresse im öffentlichen Repo exponiert.
- **Voraussetzung geprüft:** git-History + aktueller Tree auf committete Secrets und echte PII
  gescannt – sauber (keine `.env` committet, `.gitignore` deckt `.env*`/`*.pem`, Seed nur generische
  Produkte, Admin aus Env-Vars).
- **Manuelle GitHub-Settings** (Secret Scanning, Push Protection, Private Vulnerability Reporting
  aktivieren, Fork-PR-Approval) liegen außerhalb des Repos und sind **nicht Teil dieses PRs** – sie
  wurden dem Menschen als Schritt-für-Schritt-Anleitung übergeben.

## Offene Fragen
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/151-apache-20-lizenz-und-securitymd-ergnzen`
Erstellt: 2026-07-18 12:05
