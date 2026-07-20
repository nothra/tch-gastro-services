# Task 183: teilnehmer-fokus-verzehrerfassung

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->

Überarbeitung der Selbstbedienungs-Verzehrerfassung (F7, `theke/[token]`) mit Fokus auf den
**Ziel-Teilnehmer** statt auf den Erfasser. Trennung von **Erfasser** (wer bedient, einmalig
festgelegt, rein clientseitig/anonym gemerkt) und **Ziel-Teilnehmer** (für wen gebucht wird,
schnell wechselbar). Zweistufiger, geführter Einstieg (Erfasser → Ziel-Teilnehmer), Akkordeon
mit nur dem Ziel-Teilnehmer aufgeklappt, und eine dauerhaft erreichbare (sticky) Teilnehmer-
Auswahl für schnelle Navigation auf Handy/Tablet.

**Kein** neues Datenmodell, **keine** Migration – reine Präsentations-/Client-Schicht auf dem
mit #54/ADR-034 gelegten Fundament. Kanonische Spec: [`docs/specs/spec-183-erfasser-ziel-teilnehmer-verzehr.md`](../docs/specs/spec-183-erfasser-ziel-teilnehmer-verzehr.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->

### Zweistufiger Einstieg
- [ ] GIVEN erstmaliges Öffnen (offene Veranstaltung, kein Erfasser gemerkt) WHEN die Seite lädt THEN erscheint zuerst „Wer bist du?"; Erfassbereiche noch nicht bearbeitbar.
- [ ] GIVEN „Wer bist du?" WHEN ein Erfasser gewählt wird THEN wird er clientseitig pro Token gemerkt UND direkt „Für wen möchtest du einen Verzehr erfassen?" abgefragt.
- [ ] GIVEN „Für wen?" WHEN ein Ziel-Teilnehmer gewählt wird THEN wird die Auswahl gemerkt, dessen Erfassbereich aufgeklappt (andere zu) und die Bearbeitung freigeschaltet.

### Wiederkehr / Persistenz
- [ ] GIVEN gemerkter Erfasser UND Ziel-Teilnehmer WHEN der Link erneut geöffnet wird THEN werden beide Fragen übersprungen und der zuletzt gewählte Erfassbereich ist direkt aufgeklappt.

### Akkordeon & Transparenz
- [ ] GIVEN mehrere Teilnehmer WHEN einer aufgeklappt ist THEN sind die übrigen eingeklappt.
- [ ] GIVEN ein eingeklappter Erfassbereich WHEN er dargestellt wird THEN zeigt er weiterhin Name + laufende Summen (Getränke/Essen/Kaffee).
- [ ] GIVEN ein eingeklappter Teilnehmer WHEN darauf getippt wird THEN klappt er auf und der zuvor offene zu (höchstens einer offen).

### Schnelle Navigation
- [ ] GIVEN die Erfassungsansicht auf Handy/Tablet WHEN gescrollt wird THEN bleibt oben eine dauerhaft erreichbare Teilnehmer-Auswahl (Chips/Dropdown) sichtbar.
- [ ] GIVEN die Sticky-Auswahl WHEN ein Teilnehmer angetippt wird THEN wird er Ziel-Teilnehmer, sein Bereich klappt auf (andere zu), kommt in den Sichtbereich und wird gemerkt.

### Erfasser-Wechsel (untergeordnet)
- [ ] GIVEN eine laufende Erfassung WHEN der Erfasser gewechselt werden soll THEN ist das über eine unauffällige, aber erreichbare Aktion möglich; neuer Erfasser wird gemerkt.

### Read-only
- [ ] GIVEN eine abgeschlossene Veranstaltung WHEN der Link geöffnet wird THEN kein Erfasser-/Ziel-Flow; Liste im selben Akkordeon-Layout, aber nicht bearbeitbar.

### Fehlerszenarien
- [ ] GIVEN gemerkter Erfasser/Ziel nicht (mehr) in der Liste WHEN die Seite lädt THEN wird die betreffende Frage erneut gestellt (Stale-Fallback).
- [ ] GIVEN localStorage nicht verfügbar WHEN die Seite öffnet THEN funktioniert der Ablauf weiter (bei jedem Laden erneut fragen), kein Absturz.
- [ ] GIVEN leere Teilnehmerliste WHEN der Link geöffnet wird THEN bestehender neutraler Hinweis, kein Gate.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Betroffen v. a.: `app/theke/[token]/IdentityGate.tsx` (Zweischritt + Erfasser/Ziel-Persistenz),
`app/_verzehr/VerzehrErfassung.tsx` (Akkordeon/Fokus – möglichst über optionales Prop, ohne die
F5-Seite `app/veranstaltung/[id]/verzehr` zu verändern), ggf. neue Sticky-Auswahl-Komponente.
Persistenz clientseitig (localStorage pro Token). Details klärt `/architecture`.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] UI-Form der Sticky-Auswahl (Chips vs. Dropdown) + Verhalten bei sehr langer Liste → /architecture
- [ ] Persistenz-Schema + Umgang mit Alt-Schlüssel `tch:sb:name:<token>` aus #54 → /architecture
- [ ] Akkordeon-/Fokus-Mechanismus ohne Umbau der F5-Seite (optionales Prop?) → /architecture

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/183-teilnehmer-fokus-verzehrerfassung`
Erstellt: 2026-07-20 10:44
