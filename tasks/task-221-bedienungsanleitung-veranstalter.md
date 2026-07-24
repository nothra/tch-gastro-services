# Task 221: bedienungsanleitung-veranstalter

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Bebilderte, laienverständliche **Bedienungsanleitung für die Rolle `veranstalter`**, die den
kompletten Veranstaltungs-Workflow von Anfang bis Ende Schritt für Schritt erklärt. Zielgruppe:
Vereinsmitglieder mit wenig App-Erfahrung. Als versionierte **Markdown-Quelle unter `docs/`**
mit echten App-Screenshots je Schritt **plus druckbares PDF**.

Spec: [`docs/specs/spec-221-bedienungsanleitung-veranstalter.md`](../docs/specs/spec-221-bedienungsanleitung-veranstalter.md)

Entscheidungen aus /requirements:
- Format: Markdown-Quelle + PDF-Export.
- Screenshots: jetzt echt aus lokalem Dev-Server (`pnpm dev`) mit Testdaten erzeugen.
- Selbstbedienung (`/theke/[token]`): nur kurzer Hinweis im Verzehr-Schritt, kein eigener Abschnitt.
- Ablageort: `docs/anleitung/veranstalter/` (`anleitung.md`, `bilder/`, `anleitung.pdf`).
- PDF-Weg: manueller Browser-Druck, in der Quelle dokumentiert (kein neues Tooling).
- Screenshot-Markierungen: keine Pfeile/Rahmen – präzise Bildunterschriften genügen.

## Akzeptanzkriterien

- [ ] AC1 – Alle sieben Schritte in richtiger Reihenfolge (Anmelden → anlegen → führen → Verzehr → Auslagen → Kassieren/Abschluss → Abschlussbericht).
- [ ] AC2 – Zu jedem wesentlichen Schritt mindestens ein aktueller echter App-Screenshot.
- [ ] AC3 – Laienverständliche Sprache; jeder Schritt nummeriert, „Was tue ich? → Was passiert?".
- [ ] AC4 – Druckbares PDF + reproduzierbar dokumentierter Erzeugungsweg; Ablageort festgelegt.
- [ ] AC5 – Glossar der Fachbegriffe (Veranstaltung, Teilnehmer, Verzehr, Auslage, Kasse, Spende).
- [ ] AC6 – Kurzer Selbstbedienungs-Hinweis (Link/QR, `/theke/[token]`) im Verzehr-Schritt.
- [ ] AC7 – Große, lesbare Darstellung (Ausdruck/PDF).
- [ ] F1 – Fehlerhinweis „falsche Rolle" (Liste erscheint nicht → an Verwalter wenden).
- [ ] F2 – Screenshot-Aktualität/Stand-Hinweis in der Quelle.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

- Keine ADR nötig (reine Doku-Task, kein Architektur-Trigger).
- Screenshots brauchen laufenden Dev-Server + Testdaten (Login als `veranstalter`, mind. eine
  offene Veranstaltung mit Teilnehmern/Verzehr für aussagekräftige Screenshots).

## Offene Fragen

_Keine offenen Fragen – alle in /requirements geklärt (siehe Beschreibung / Spec)._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/221-bedienungsanleitung-veranstalter`
Erstellt: 2026-07-24 18:16
