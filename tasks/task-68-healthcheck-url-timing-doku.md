# Task 68: healthcheck-url-timing-doku

## Status
- [x] In Bearbeitung
- [x] Review bestanden (Doku-only, Selbst-Review)
- [x] Tests vollständig (n/a – reine Kommentaränderung, keine Laufzeitfläche; Self-Test-Suite 265 grün)
- [x] Security-Review bestanden (n/a – kein Angriffsvektor, nur Kommentare)
- [x] Refactoring abgeschlossen (n/a – kein Code)
- [x] Codify ausgeführt (kein neues wiederkehrendes Fehlermuster – Timing-Falle ist bereits in ADR-017 §Alternatives dokumentiert)
- [x] Fertig / PR erstellt

## Beschreibung
Timing-Falle dokumentieren: `post-merge-verify` (`factory-ci.yml`, ADR-007) läuft beim
`main`-Push **parallel** zum Deploy-Gate – also **bevor** das Gate `main`→`production`
promotet. Zeigt jemand `FACTORY_HEALTHCHECK_URL` naiv auf `.../api/health`, prüft
`post-merge-verify` den Vor-Promote-Stand von Production → Fehlalarme. Der autoritative
Post-Deploy-Healthcheck liegt bewusst im Deploy-Gate (nach dem Promote), nicht in
`post-merge-verify` (ADR-017 §Alternatives).

## Akzeptanzkriterien
- [x] GIVEN ein Adopter konfiguriert `FACTORY_HEALTHCHECK_URL` WHEN er die Konfig-Doku
  liest THEN wird die Timing-Falle (nicht auf `/api/health` zeigen) explizit benannt.

## Technische Notizen
Doku an drei natürlichen Stellen ergänzt (README dokumentiert die Variablen nicht):
- `.github/workflows/factory-ci.yml`: Konfig-Kommentar am Dateikopf **und** Warn-Kommentar
  am `post-merge-verify`-Job.
- `scripts/post-merge-verify.sh`: Warnhinweis direkt an der `FACTORY_HEALTHCHECK_URL`-Doku
  (autoritative Beschreibung der Variable).
Alle drei verweisen auf ADR-017 §Alternatives als kanonische Quelle (Regel „Kanonische
Quellen immer referenzieren").

## Offene Fragen
Keine.

## Review-Findings
Keine (Doku-only).

## Codify-Notizen
Kein neues Fehlermuster – die Timing-Falle ist bereits in ADR-017 §Alternatives erklärt;
diese Task macht sie nur an der Konfigurationsstelle sichtbar.

---
Branch: `docs/68-healthcheck-url-timing-doku`
Erstellt: 2026-07-15 15:12
