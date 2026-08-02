# Task 253: kassieren-position-bis-reload-behalten

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Auf der Kassierseite springt eine gerade kassierte Teilnehmerzeile sofort in den unteren
("bezahlt") Bereich, weil `revalidatePath` in `kassiereZeileAction` die Server-Komponente neu
sortiert. Die Zeile soll stattdessen bis zum nächsten Seitenaufruf/Reload an ihrer bisherigen
Position im offenen Bereich stehen bleiben (Badge wechselt weiterhin sofort auf "bezahlt").
Siehe [spec-253](../docs/specs/spec-253-kassieren-position-bis-reload-behalten.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN eine offene Veranstaltung mit mehreren offenen Teilnehmerzeilen WHEN der Nutzer für
  eine Zeile in der Mitte der offenen Gruppe auf "Kassieren" klickt THEN bleibt diese Zeile
  unmittelbar danach an derselben Position innerhalb der Liste (kein Sprung nach unten).
- [ ] GIVEN dieselbe gerade kassierte Zeile WHEN die Server-Antwort eintrifft THEN wechselt ihr
  Badge unmittelbar auf "bezahlt" (Status-Anzeige aktualisiert sich sofort, unabhängig von der
  eingefrorenen Position).
- [ ] GIVEN eine gerade kassierte Zeile, die an ihrer bisherigen Position stehen bleibt WHEN der
  Nutzer die Seite neu lädt (bzw. erneut aufruft) THEN erscheint die Liste gemäß bestehender
  Sortierung neu einsortiert (offene Zeilen oben, bezahlte unten, je Gruppe alphabetisch).
- [ ] GIVEN mehrere Zeilen werden nacheinander in derselben Sitzung kassiert WHEN jede einzelne
  kassiert wird THEN bleibt jede an ihrer ursprünglichen Position stehen (kein kumulatives
  Nachrutschen der noch offenen Zeilen).
- [ ] GIVEN eine in dieser Sitzung bereits kassierte, aber noch oben stehende Zeile WHEN der
  Nutzer den Erhalten-Betrag erneut über dasselbe Formular korrigiert THEN bleibt das Formular
  weiterhin editierbar und die Position ändert sich nicht erneut.
- [ ] GIVEN dieselbe Seite WHEN eine Zeile abgeschlossen/wiedereröffnet wird (StatusToggle,
  außerhalb des Kassierens) THEN bleibt das bestehende Sortierverhalten dieser Aktion
  unverändert (nicht Teil dieser Task).
- [ ] GIVEN das Kassieren einer Zeile schlägt fehl WHEN die Server-Action eine Fehlermeldung
  zurückgibt THEN bleibt die Zeile unverändert an ihrer aktuellen Position.
- [ ] GIVEN eine frisch geladene Kassierseite (keine Zeile in dieser Sitzung kassiert) WHEN sie
  gerendert wird THEN entspricht die Sortierung weiterhin unverändert dem bestehenden Verhalten
  aus spec-223 (keine Regression für den unveränderten Fall).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger erwartet (keine neue Technologie). Details siehe Abschnitt „Technische
Notizen" in spec-253: Reihenfolge der `zeile.id`s beim ersten Rendern client-seitig einfrieren,
aktuelle Server-Daten je Zeile weiterhin live übernehmen (nur die Position einfrieren, nicht
den Inhalt).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine offen (Klärungen bereits im Requirements-Gespräch erfolgt, siehe spec-253).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/253-kassieren-position-bis-reload-behalten`
Erstellt: 2026-08-02 21:11
