# Task 161: factory-doku-zwei-phasen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die Factory-Doku beschreibt den Ablauf im Kern als **eine durchgängige Abfolge** von Schritten.
Der grundlegende Charakter-Unterschied zwischen den ersten beiden Schritten (Anforderung schärfen)
und dem Rest (Umsetzung) geht dabei unter. Ziel: aus der Doku soll klar hervorgehen, dass die
Factory in **zwei wesentliche Phasen** zerfällt, die sich in der Rolle des Menschen unterscheiden:

- **Phase 1 – Anforderung schärfen (Requirements + Architecture).** Erfordert die Interaktion
  Mensch ↔ Claude; nicht automatisierbar. Start: `start-work.sh` → `/requirements`, ggf. `/architecture`.
- **Phase 2 – Umsetzung (Implement → … → PR).** Vollautomatisierbar. Start: `run-pipeline.sh`.
  Der manuelle Skill-für-Skill-Fallback bleibt erhalten.

Reine **Doku-Änderung** – kein Produktionscode, keine Skript-Änderung, kein neues Verhalten.
Kanonische Quelle des prozeduralen Ablaufs bleibt **OPERATING.md**; CLAUDE.md/README verweisen
darauf, statt zu duplizieren.

## Akzeptanzkriterien
- [x] AC1: OPERATING.md benennt die zwei Phasen explizit und ordnet jeder Phase ihr **Start-Skript**
      zu (`start-work.sh` bzw. `run-pipeline.sh`).
- [x] AC2: Es wird klar, dass Phase 1 (Requirements + Architecture) **immer** Mensch↔Claude-Interaktion
      erfordert und nicht automatisiert wird.
- [x] AC3: Es wird klar, dass Phase 2 (Umsetzung) **vollautomatisiert** laufen kann.
- [x] AC4: Der **manuelle Skill-für-Skill-Fallback** für Phase 2 bleibt dokumentiert.
- [x] AC5: Der Hinweis auf die **höheren Kosten** der vollautomatisierten Pipeline bleibt erhalten.
- [x] AC6: Die Pipeline-Übersicht in CLAUDE.md zeigt die Phasengrenze; README verweist konsistent
      auf OPERATING.md (keine widersprüchlichen Parallel-Beschreibungen).

## Technische Notizen

- Kein automatisiertes Test-Gate: Scope schließt Skript-Änderungen aus, und der Codify-Grundsatz
  „kein Check-Skript aus Reflex" (OPERATING §5.1) greift – die AC sind reine Prosa-Präsenz und
  werden per `git grep` gegen die drei Dateien verifiziert (siehe Verifikations-Notiz unten).
- Geänderte Dateien: `docs/factory/OPERATING.md` (primär, kanonisch), `CLAUDE.md` (Phasengrenze im
  Ablaufdiagramm + Verweis), `README.md` (ein Satz + Verweis auf OPERATING.md).

## Offene Fragen
_Keine._

## Verifikation (Implement)

- ADR-Trigger-Check (Schritt 0): keine der vier Kategorien trifft zu – reine Doku-Änderung
  (kein Produktionscode/Technologie-/Architektur-/Schnittstellen-/irreversible Entscheidung).
- AC1–AC6 per `git grep` gegen die drei Dateien belegt (Phasen + Start-Skripte in OPERATING.md,
  Phasengrenze in CLAUDE.md, OPERATING-Verweis in README.md).
- Anker `#12-automatik-laufen-lassen--ein-kommando-bis-zum-merge` gegen den echten Header
  `### 1.2 Automatik laufen lassen — ein Kommando bis zum Merge` verifiziert.
- `pnpm format:check` grün (Prettier prüft Markdown). Keine `app/`-Änderung → Routen-Drift n/a.
- Keine UI-/Runtime-Oberfläche berührt → keine Browser-/E2E-Verifikation nötig.
- `docs/CHANGELOG.md` `[Unreleased]` ergänzt (Repo-Konvention).

## Verifikation (/test)

- **Keine testbare Laufzeit-Oberfläche:** reine Markdown-Doku, kein Produktionscode hinzugefügt →
  keine Unit-/Integrationstests anwendbar. Die AC sind Text-Präsenz-Kriterien, per `git grep`
  gegen die drei Dateien belegt (siehe oben).
- **Kein Grep-Guard-Skript ergänzt:** außerhalb des Scopes (keine Skript-Änderung) und gegen den
  Codify-Grundsatz „kein Check-Skript aus Reflex" (OPERATING §5.1) – kein wiederkehrender,
  verlässlich grep-barer Fehler.
- **Regressions-Nachweis:** `pnpm test` grün – 431 passed, 52 skipped (52 Test-Dateien),
  keine Regression durch die Doku-Änderung.
- Coverage-Schwelle (80 % / 100 % neuer Code) n/a: kein neuer Code.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/161-factory-doku-zwei-phasen`
Erstellt: 2026-07-19 19:47
