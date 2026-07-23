# Task 194: auswahl-als-dropdown

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
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
- [x] Erfasser-Schritt zeigt ein `<select>` mit vorausgewähltem Platzhalter „Bitte wählen…" und
      allen Teilnehmern als Optionen; keine Teilnehmer-Buttons; Erfassbereiche darunter sichtbar,
      aber nicht bearbeitbar.
- [x] Auswahl im Erfasser-`<select>` merkt den Erfasser und zeigt direkt den Ziel-Schritt (kein
      „Weiter"-Button).
- [x] Ziel-Schritt zeigt ein `<select>` mit Platzhalter, dann „Für mich (Name)" als erster echter
      Option, danach den übrigen Teilnehmern (Erfasser nicht doppelt).
- [x] „Für mich" übernimmt den Erfasser als Ziel und schaltet dessen Erfassbereich frei.
- [x] Auswahl eines anderen Teilnehmers im Ziel-`<select>` merkt ihn und schaltet frei.
- [x] Nach der Erfasser-Wahl erhält das Ziel-`<select>` programmatisch den Fokus (nächster Frame),
      sichtbar ohne manuelles Scrollen.
- [x] Jedes `<select>` ist mit seiner Frage-Beschriftung als zugängliches Label verknüpft und
      per Tastatur bedienbar (a11y).
- [x] Regression: gemerkter Erfasser + Ziel → beide Schritte werden übersprungen (Fokus-Ansicht).
- [x] Fehlerfall: Platzhalter/keine echte Auswahl → nichts passiert, Schritt bleibt stehen.
- [x] Fehlerfall: nur ein Teilnehmer → Ziel-`<select>` enthält Platzhalter + „Für mich", „Für mich"
      schaltet korrekt frei.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- Betroffen: `app/theke/[token]/IdentityGate.tsx` (`ErfasserPicker`, `ZielPicker`) und Tests
  `app/theke/[token]/IdentityGate.test.tsx`.
- Kein ADR-Trigger: keine Architektur-Entscheidung (Widget-Wechsel innerhalb bestehender Komponente).
- Fokus-Setzen erst im nächsten Frame nach layout-änderndem State-Wechsel (Codify #188).
- Interaktive Browser-Verifikation (lokaler Dev-Server) in dieser Session nicht möglich – kein
  laufendes Docker/Colima, daher keine lokale DB. Alle Akzeptanzkriterien sind jedoch durch die
  aktualisierte/erweiterte `IdentityGate.test.tsx` (16 Tests) abgedeckt, inkl. Options-Reihenfolge,
  Platzhalter-Guard, Fokus-Timing (rAF-Stub) und Namensauflösung über `aria-labelledby` (dieselbe
  Accessibility-Tree-Logik, die Screenreader nutzen). Empfehlung: vor/bei `/post-merge-verify` einmal
  manuell durchklicken.

## Offene Fragen
_Keine._

## Review-Findings
<!-- Wird durch /review befüllt -->
APPROVED (3 Perspektiven, keine kritischen Findings). Details: [tasks/review-194.md](review-194.md).
Zwei „Wichtig"-Funde (Duplikation Select-Hülle, doppelter rAF-Test-Helper) für `/refactor` vorgesehen.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/194-auswahl-als-dropdown`
Erstellt: 2026-07-23 07:45
