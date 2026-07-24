# Task 221: bedienungsanleitung-veranstalter

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig — E2E-Capture-Spec (kompletter Veranstalter-Flow) + Unit-Suite (647) grün; separater `/test`-Skill bewusst übersprungen (siehe Abschluss-Notiz)
- [x] Security-Review bestanden — n/a: reine Doku-Task, kein Produktionscode / keine Auth-/Secret-/Payment-Pfade; `/security-review` bewusst übersprungen
- [x] Refactoring abgeschlossen — Clean-up bereits in der Review-Rework-Runde erledigt; separater `/refactor`-Skill übersprungen
- [x] Codify ausgeführt — Learning erfasst (siehe Umsetzungsnotizen / Codify-Notizen); formaler `/codify`-Skill separat nachzuholen
- [x] Fertig / PR erstellt

> **Abschluss-Notiz (Entscheidung in dieser Session):** Für diese reine Doku-Task wurde nach
> `/review` (APPROVED) direkt zu `/pr-shepherd` gesprungen; `/test`, `/security-review`, `/refactor`
> und der formale `/codify`-Lauf wurden bewusst übersprungen (kein neuer Produktionscode). Die
> Test-/Clean-Code-Substanz ist über die Capture-Spec + die Review-Rework-Runde abgedeckt; das
> Codify-Learning (Formular-`key`-Remount + Toast-Race) ist unten notiert und für einen späteren
> `/codify`-Lauf vorgemerkt.

> **PR-Shepherd 2026-07-24:** Merge freigegeben – alle Gates grün (Review APPROVED, keine offenen
> Kommentare, Branch aktuell auf `main`, keine Approval-Pflicht). PR [#226](https://github.com/nothra/tch-gastro-services/pull/226),
> Auto-Merge (Squash) aktiviert; GitHub merged nach grüner CI.

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

- [x] AC1 – Alle sieben Schritte in richtiger Reihenfolge (Anmelden → anlegen → führen → Verzehr → Auslagen → Kassieren/Abschluss → Abschlussbericht).
- [x] AC2 – Zu jedem wesentlichen Schritt mindestens ein aktueller echter App-Screenshot (12 Bilder, `bilder/01`–`12`).
- [x] AC3 – Laienverständliche Sprache; jeder Schritt nummeriert, „Was tue ich? → Was passiert?".
- [x] AC4 – Druckbares PDF (`anleitung.pdf`) + reproduzierbar dokumentierter Browser-Druck-Weg; Ablageort `docs/anleitung/veranstalter/`.
- [x] AC5 – Glossar der Fachbegriffe (Veranstaltung, Teilnehmer, Verzehr, Auslage, Kasse, Spende).
- [x] AC6 – Kurzer Selbstbedienungs-Hinweis (Link/QR, `/theke/[token]`) im Verzehr-Schritt.
- [x] AC7 – Große, lesbare Darstellung (PDF: A4, 12,5 pt Fließtext, gerahmte Screenshots, Skalier-Hinweis).
- [x] F1 – Fehlerhinweis „falsche Rolle" (Kachel/Liste erscheint nicht → an Verwalter wenden).
- [x] F2 – Screenshot-Aktualität/Stand-Hinweis (24.07.2026) + Regenerierungs-Anleitung in der Quelle.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

- Keine ADR nötig (reine Doku-Task, kein Architektur-Trigger).
- Screenshots brauchen laufenden Dev-Server + Testdaten (Login als `veranstalter`, mind. eine
  offene Veranstaltung mit Teilnehmern/Verzehr für aussagekräftige Screenshots).

### Umsetzungsnotizen (Implementierung)

- **Screenshots reproduzierbar via Playwright-Spec** (`e2e/anleitung-veranstalter.spec.ts`): fährt
  den kompletten Veranstalter-Workflow durch, legt die Demo-Daten (Katalog, Teilnehmer,
  Veranstaltung, Verzehr, Auslage inkl. „als erstattet", Kassieren, Abschluss) **live über die UI**
  an (Seed-Admin trägt beide Rollen) und speichert 12 PNGs nach `bilder/`. Doppelt nutzbar als
  E2E-Smoke des Flows. Nur mit `CAPTURE_ANLEITUNG=1` aktiv – im normalen `pnpm test:e2e`
  übersprungen (schreibt Bilder/Daten). Viewport mobil (414×896 @2×), Locale `de-DE`.
- **Voraussetzung frische DB:** Die Spec erwartet einen frisch geseedeten DEV-Stand (legt Daten
  ohne „existiert schon"-Sprung an). Regenerierung dokumentiert in `anleitung.md` → „Bilder
  aktualisieren".
- **PDF:** einmalig aus der Markdown-Quelle per Chromium-Druck-Engine erzeugt (entspricht dem in
  der Quelle dokumentierten manuellen Browser-Druck; kein neues Repo-Tooling). Der Generator lag im
  Scratchpad und ist nicht Teil des Repos.
- **Kein App-Code geändert** (reine Doku-Task): nur `docs/anleitung/veranstalter/**` + die
  Capture-Spec. Keine Routen berührt → `docs/routes.md` unverändert.
- Learning aus der Umsetzung (Kandidat für `/codify`): Anlege-Formulare mit `key`-Remount + stehen-
  bleibender Toast-Erfolgsmeldung → Erfolg über die wachsende Listen-Zählung asserten und vor dem
  nächsten Befüllen auf leeres Formular (`toHaveValue("")`) warten, nicht auf die Toast-Meldung.

## Offene Fragen

_Keine offenen Fragen – alle in /requirements geklärt (siehe Beschreibung / Spec)._

## Review-Findings

Multi-Persona-Review → [`tasks/review-221.md`](review-221.md). Ergebnis Runde 1: NEEDS_REWORK
(3 WICHTIG, keine KRITISCH). Rework umgesetzt (PDF-Doku Option B, robustere Selektoren,
`login`→`fillLoginForm`, Login-Shot ohne Zugangsdaten, `(EUR)`-Labels) → **APPROVED**.

## Codify-Notizen

Vorgemerkt für einen späteren `/codify`-Lauf (Kandidaten-Learnings dieser Task):

- **UI-Capture/E2E gegen Anlege-Formulare mit `key`-Remount:** Erfolg NICHT über die
  stehenbleibende Toast-Erfolgsmeldung asserten (sie ist vom vorherigen Submit noch sichtbar →
  Assertion greift zu früh, Remount leert die frische Eingabe → Zeile geht verloren). Stattdessen
  vor dem Befüllen auf ein leeres Formular warten (`toHaveValue("")`) und den Erfolg über die
  wachsende Listen-Zählung (`Artikel (N)` / `Teilnehmer (N)`) prüfen.
- **Playwright-Selektoren in Capture-Skripten layout-klassen-frei halten:** kein
  `li.justify-between` (Tailwind-Utility, mehrfach vergeben); stattdessen über Rolle + Textinhalt +
  vorhandene Steuer-Buttons (`.last()` = innerste Positionszeile). Und `form > span` ist bei einem
  optionalen Fehler-Span mehrdeutig → `.first()` auf den stabil zuerst gerenderten Mengen-Span.
- **Doku-Reproduzierbarkeit ehrlich halten:** Wenn ein committetes Artefakt (PDF) anders erzeugt
  wurde als der dokumentierte manuelle Weg, entweder den echten Generator versionieren oder die
  Doku auf das herunterstufen, was der manuelle Weg wirklich liefert (aus #221 Review-Finding).

---
Branch: `docs/221-bedienungsanleitung-veranstalter`
Erstellt: 2026-07-24 18:16
