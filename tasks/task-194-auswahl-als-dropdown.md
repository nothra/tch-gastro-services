# Task 194: auswahl-als-dropdown

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die beiden Auswahl-Widgets des Identitäts-Gates der Selbstbedienung
(`app/theke/[token]/IdentityGate.tsx`) – `ErfasserPicker` („Wer bist du?") und `ZielPicker`
(„Für wen möchtest du einen Verzehr erfassen?") – von der langen Button-Liste (`<ul>`/`<button>`)
auf ein natives Dropdown (`<select>`) umstellen. Reine Frontend-/UX-Änderung; keine Server-/
DB-Änderung, keine Migration.

Entscheidungen (aus /requirements): **Auto-Weiter + Platzhalter** (Auswahl löst sofort aus, erste
Option ist ein neutraler Platzhalter) und **Fokus aufs Ziel-Dropdown** nach der Erfasser-Wahl.

Details: [docs/specs/spec-194-auswahl-als-dropdown.md](../docs/specs/spec-194-auswahl-als-dropdown.md)

## Akzeptanzkriterien
- [ ] Erfasser-Schritt zeigt ein `<select>` mit vorausgewähltem Platzhalter „Bitte wählen…" und
      allen Teilnehmern als Optionen; keine Teilnehmer-Buttons; Erfassbereiche darunter sichtbar,
      aber nicht bearbeitbar.
- [ ] Auswahl im Erfasser-`<select>` merkt den Erfasser und zeigt direkt den Ziel-Schritt (kein
      „Weiter"-Button).
- [ ] Ziel-Schritt zeigt ein `<select>` mit Platzhalter, dann „Für mich (Name)" als erster echter
      Option, danach den übrigen Teilnehmern (Erfasser nicht doppelt).
- [ ] „Für mich" übernimmt den Erfasser als Ziel und schaltet dessen Erfassbereich frei.
- [ ] Auswahl eines anderen Teilnehmers im Ziel-`<select>` merkt ihn und schaltet frei.
- [ ] Nach der Erfasser-Wahl erhält das Ziel-`<select>` programmatisch den Fokus (nächster Frame),
      sichtbar ohne manuelles Scrollen.
- [ ] Jedes `<select>` ist mit seiner Frage-Beschriftung als zugängliches Label verknüpft und
      per Tastatur bedienbar (a11y).
- [ ] Regression: gemerkter Erfasser + Ziel → beide Schritte werden übersprungen (Fokus-Ansicht).
- [ ] Fehlerfall: Platzhalter/keine echte Auswahl → nichts passiert, Schritt bleibt stehen.
- [ ] Fehlerfall: nur ein Teilnehmer → Ziel-`<select>` enthält Platzhalter + „Für mich", „Für mich"
      schaltet korrekt frei.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Betroffen: `app/theke/[token]/IdentityGate.tsx` (`ErfasserPicker`, `ZielPicker`) und Tests
  `app/theke/[token]/IdentityGate.test.tsx`.
- Kein ADR-Trigger: keine Architektur-Entscheidung (Widget-Wechsel innerhalb bestehender Komponente).
- Fokus-Setzen erst im nächsten Frame nach layout-änderndem State-Wechsel (Codify #188).

## Offene Fragen
_Keine._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/194-auswahl-als-dropdown`
Erstellt: 2026-07-23 07:45
