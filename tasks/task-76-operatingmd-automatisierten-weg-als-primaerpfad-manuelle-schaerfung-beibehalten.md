# Task 76: OPERATING.md – automatisierten Weg als Primärpfad, manuelle Schärfung beibehalten

## Status
- [x] In Bearbeitung
- [x] Review bestanden — Selbst-Review: automatisierter Weg klar als Default; Anforderungs-Schärfung interaktiv prominent erhalten; interne Anker konsistent
- [x] Tests vollständig — reine Doku, keine Code-Änderung; lint/format:check/unit grün, Self-Test 154 grün
- [x] Security-Review bestanden — keine Secrets/Endpunkte eingeführt; nur Umstellung/Verweise
- [x] Refactoring abgeschlossen — n/a (Markdown), inhaltlich verlustfrei umgestellt
- [x] Codify ausgeführt — kein neuer Regel-Bedarf; Prozess-Wunsch (automatisiert primär, Mensch schärft) ist im Runbook selbst kodifiziert
- [x] Fertig / PR erstellt

## Beschreibung
Umstellung von `docs/factory/OPERATING.md` nach Nutzer-Feedback: Der **automatisierte Weg** soll
**primär** beschrieben sein (Titel versprach „maximal automatisiert", der Text stellte aber den
manuellen Stage-2-Ablauf als „Standardweg" voran).

Änderungen:
- **§1 „Der automatisierte Weg (Default)"** neu: 1.1 Anforderung schärfen (Mensch) → 1.2 `run-pipeline.sh`
  (ein Kommando, `PR_SHEPHERD=true`) → 1.3 vollautomatisch/unbeaufsichtigt (`factory::run`) → 1.4 Deploy-Gate.
- **§2 „Manuell / mit voller Kontrolle (Fallback)"**: der bisherige Skill-für-Skill-Ablauf + #63-Guardrail.
- Leitbild-Absatz im Intro; `factory::run`/Async (0.4) als Voraussetzung des unbeaufsichtigten Pfads
  hochgezogen (statt „Optional"-Fußnote).

**Explizit beibehalten (Nutzer-Anforderung):** Die Empfehlung, die Anforderung **interaktiv mit dem
Menschen zu schärfen** (`/requirements`, ggf. `/architecture`), bevor die Automatik übernimmt –
prominent als Schritt **1.1** im automatisierten Weg, plus Querverweis aus §2 und §4.1.

## Akzeptanzkriterien
- [x] GIVEN das Runbook WHEN ein Leser §1 öffnet THEN ist der **automatisierte** Weg der beschriebene Standard (nicht der manuelle).
- [x] GIVEN die Nutzer-Anforderung WHEN §1 den Ablauf beschreibt THEN steht die **interaktive Anforderungs-Schärfung durch den Menschen** (`/requirements`, ggf. `/architecture`) weiterhin explizit und prominent drin (§1.1).
- [x] GIVEN der manuelle Bedarf WHEN jemand jeden Schritt selbst fahren will THEN existiert der Stage-2-Ablauf weiterhin vollständig als Fallback (§2), inkl. #63-Guardrail.
- [x] GIVEN die Umstellung WHEN Inhalte verschoben werden THEN geht kein Inhalt verloren (Interrupts, Menschen-Gates, Wartung, Branch-Protection-Anhang unverändert erhalten).

## Technische Notizen
- Nur Umstellung/Reframing, kein neuer Fakt. Interne Anker an die neue Nummerierung angepasst
  (1.1–1.4, 2.1–2.3); Verweise auf 0.4/4.1/4.4 geprüft.

## Offene Fragen
Keine.

## Review-Findings
Selbst-Review, keine offenen Findings: automatisierter Weg eindeutig Default; Mensch-schärft-Empfehlung
erhalten und hervorgehoben; Fallback vollständig; alle vorher vorhandenen Abschnitte weiterhin präsent.

## Codify-Notizen
Kein neuer „Stolperstein". Das Feedback („primär automatisiert dokumentieren, Mensch schärft die
Anforderung") ist direkt im Runbook umgesetzt.

---
Branch: `docs/76-operatingmd-automatisierten-weg-als-primaerpfad-manuelle-schaerfung-beibehalten`
Erstellt: 2026-07-12 12:26
</content>
