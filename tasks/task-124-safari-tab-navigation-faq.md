# Task 124: safari-tab-navigation-faq

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Ein Nutzer meldete, dass im Safari die Tab-Taste nicht sauber auf das nächste Feld
bzw. den nächsten Button springt, während es in Edge und Chrome funktioniert.

Die Code-Prüfung ergab: **kein App-Bug.** Das Markup nutzt ausschließlich native
`<button>`/`<input>`-Elemente in natürlicher DOM-Reihenfolge, ohne `tabindex`,
ohne `outline: none`, ohne Fake-Buttons (`role="button"`). Ursache ist die
macOS/Safari-Standardeinstellung, die Buttons/Links/Checkboxen aus der
Tab-Reihenfolge nimmt (Chrome/Edge ignorieren diese OS-Einstellung).

Da kein Fehlverhalten im Code vorliegt, wird die Erklärung als Nutzer-FAQ
dokumentiert, damit künftige Nutzer nicht stolpern.

## Akzeptanzkriterien
- [x] GIVEN ein Nutzer sucht Hilfe zur Tab-Bedienung im Safari, WHEN er die Doku
      öffnet, THEN findet er in `docs/FAQ.md` einen Eintrag, der (a) klarstellt, dass
      es kein App-Bug ist, und (b) die konkrete macOS/Safari-Einstellung
      („Tastaturnavigation") als Lösung nennt.
- [x] GIVEN das README, WHEN ein Leser nach Nutzungsfragen sucht, THEN verweist ein
      FAQ-Abschnitt auf `docs/FAQ.md`.

## Technische Notizen
Reiner Dokumentations-Task – keine Produktionscode-Änderung, keine Migration, keine
Tests nötig (TDD nicht anwendbar). Neue Datei `docs/FAQ.md` + README-Verweis.

## Offene Fragen
Keine.

## Review-Findings
Keine – Doku-only.

## Codify-Notizen
Kein Bug im Code: Der gemeldete „Bug" war erwartetes Plattform-Verhalten von
macOS/Safari (Tab überspringt Buttons/Links, solange „Tastaturnavigation" aus ist).
Vor einem `/bug-fix`-Durchlauf lohnt bei browser-spezifischen Tastatur-/Fokus-Meldungen
die Prüfung, ob eine OS-/Browser-Einstellung die Ursache ist – erkennbar daran, dass
das Markup semantisch sauber ist (native Elemente, kein `tabindex`, kein `outline:none`).

---
Branch: `docs/124-safari-tab-navigation-faq`
Erstellt: 2026-07-17 10:43
