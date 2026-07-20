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
- [ ] GIVEN die Ziel-Frage nach gewähltem Erfasser WHEN sie angezeigt wird THEN ist die erste Antwortmöglichkeit „Für mich" (der Erfasser), darunter die übrigen Teilnehmer.
- [ ] GIVEN die Ziel-Frage WHEN „Für mich" gewählt wird THEN wird der Erfasser als Ziel-Teilnehmer übernommen (ohne erneute Namenssuche), gemerkt und dessen Erfassbereich aufgeklappt.
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

Architektur festgelegt in [ADR-035](../docs/adr/035-selbstbedienung-erfasser-ziel-fokus.md).
**Reine Präsentations-/Client-Schicht** – kein Datenmodell, keine Migration, keine neue
Dependency, kein neuer Auth-Pfad, keine `docs/routes.md`-Änderung.

**Betroffene Dateien:**
- `app/_verzehr/VerzehrErfassung.tsx` – interne `ZeileKarte` **exportieren** und um **optionale**
  Akkordeon-Props erweitern (`collapsible?`, `open?`, `onToggle?`). Ohne diese Props **unverändertes**
  Verhalten (flach, aufgeklappt). Eingeklappt: nur Kopf (Name + Summen) rendern, Körper (Kategorien +
  `MengeControl`) weglassen. (ADR-035 D2)
- `app/veranstaltung/[id]/verzehr/page.tsx` (F5) – **nicht anfassen** (nutzt die Karte weiter flach).
- `app/theke/[token]/FokusListe.tsx` – **NEU**, `"use client"`: sticky Chip-Leiste (D3) + Akkordeon
  (genau eine offen = Ziel), rendert die wiederverwendete Karte collapsible; `scrollIntoView` beim
  Wechsel **guarded** (`ref.current?.scrollIntoView?.({ block: "start" })`).
- `app/theke/[token]/IdentityGate.tsx` – **umbauen** zur Zustandsmaschine (Erfasser → Ziel), Zweischritt
  „Wer bist du?" → „Für wen?" mit **„Für mich"** als erster Option; rendert bei beiden gesetzt die
  `FokusListe`, sonst die passende Frage. „Erfasser wechseln" unauffällig. (ADR-035 D1)
- Kleiner **guarded localStorage-Helfer** (fail-open, try/catch) – IDs statt Namen; Schlüssel
  `tch:sb:erfasser:<token>` / `tch:sb:ziel:<token>`; Legacy-Adoption von `tch:sb:name:<token>` (D4/D6).

**TDD-Reihenfolge & Pflicht-Testfälle (je AC ein Test, Codify #117/#116):**
1. Guarded-Storage-Helfer: read/write/clear, **Storage-nicht-verfügbar → fail-open** (kein Throw),
   Stale-ID → null. **Legacy-Keep-Test:** Alt-Key `tch:sb:name` mit passendem Namen → als Erfasser-ID
   adoptiert + Alt-Key entfernt; ohne Match → ignoriert.
2. Karte collapsible: `open=false` rendert **Kopf + Summen**, aber **keine** `MengeControl`;
   `open=true` rendert Körper. Ohne die Props (F5-Pfad): unverändert voll aufgeklappt (Regressions-Test).
3. `FokusListe`: genau **eine** Karte offen; Chip-Tipp/Karten-Tipp öffnet Ziel + schließt andere +
   merkt Ziel; aktiver Chip `aria-current`. Read-only (`editable=false`): alle zu, keine Controls.
4. `IdentityGate`-Zweischritt: kein Erfasser → „Wer bist du?"; Erfasser gewählt → „Für wen?" mit
   **erster** Option „Für mich"; „Für mich" → Ziel = Erfasser (kein zweiter Suchschritt);
   anderer Teilnehmer → Ziel gesetzt, Karte offen. Wiederkehr (beide gemerkt) → direkt Fokus-Ansicht.
   Stale Erfasser → „Wer bist du?"; Stale Ziel (Erfasser bekannt) → „Für wen?". Erfasser-Wechsel.
5. Leere Liste → bestehender neutraler Hinweis (kein Gate). Read-only → kein Gate.

**Achtung Codify-Altlasten:** `set-state-in-effect` vermeiden (Auswahl über Event/`useSyncExternalStore`
wie im bisherigen Gate, kein `useEffect`+`setState`); `afterEach(cleanup)` bleibt; `MengeControl` in
Tests wie gehabt stubben.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Durch /architecture (ADR-035) geklärt: Sticky-Auswahl = Chip-Leiste (D3); Persistenz = IDs, zwei
Schlüssel + Legacy-Adoption (D1/D6); Akkordeon = wiederverwendete Karte + neue F7-`FokusListe`,
F5 unberührt (D2)._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/183-teilnehmer-fokus-verzehrerfassung`
Erstellt: 2026-07-20 10:44
