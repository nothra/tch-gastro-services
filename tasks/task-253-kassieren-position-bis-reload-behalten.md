# Task 253: kassieren-position-bis-reload-behalten

## Status
- [x] In Bearbeitung
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
- [x] GIVEN eine offene Veranstaltung mit mehreren offenen Teilnehmerzeilen WHEN der Nutzer für
  eine Zeile in der Mitte der offenen Gruppe auf "Kassieren" klickt THEN bleibt diese Zeile
  unmittelbar danach an derselben Position innerhalb der Liste (kein Sprung nach unten).
- [x] GIVEN dieselbe gerade kassierte Zeile WHEN die Server-Antwort eintrifft THEN wechselt ihr
  Badge unmittelbar auf "bezahlt" (Status-Anzeige aktualisiert sich sofort, unabhängig von der
  eingefrorenen Position).
- [x] GIVEN eine gerade kassierte Zeile, die an ihrer bisherigen Position stehen bleibt WHEN der
  Nutzer die Seite neu lädt (bzw. erneut aufruft) THEN erscheint die Liste gemäß bestehender
  Sortierung neu einsortiert (offene Zeilen oben, bezahlte unten, je Gruppe alphabetisch).
- [x] GIVEN mehrere Zeilen werden nacheinander in derselben Sitzung kassiert WHEN jede einzelne
  kassiert wird THEN bleibt jede an ihrer ursprünglichen Position stehen (kein kumulatives
  Nachrutschen der noch offenen Zeilen).
- [x] GIVEN eine in dieser Sitzung bereits kassierte, aber noch oben stehende Zeile WHEN der
  Nutzer den Erhalten-Betrag erneut über dasselbe Formular korrigiert THEN bleibt das Formular
  weiterhin editierbar und die Position ändert sich nicht erneut.
- [x] GIVEN dieselbe Seite WHEN eine Zeile abgeschlossen/wiedereröffnet wird (StatusToggle,
  außerhalb des Kassierens) THEN bleibt das bestehende Sortierverhalten dieser Aktion
  unverändert (nicht Teil dieser Task).
- [x] GIVEN das Kassieren einer Zeile schlägt fehl WHEN die Server-Action eine Fehlermeldung
  zurückgibt THEN bleibt die Zeile unverändert an ihrer aktuellen Position.
- [x] GIVEN eine frisch geladene Kassierseite (keine Zeile in dieser Sitzung kassiert) WHEN sie
  gerendert wird THEN entspricht die Sortierung weiterhin unverändert dem bestehenden Verhalten
  aus spec-223 (keine Regression für den unveränderten Fall).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger erwartet (keine neue Technologie). Details siehe Abschnitt „Technische
Notizen" in spec-253: Reihenfolge der `zeile.id`s beim ersten Rendern client-seitig einfrieren,
aktuelle Server-Daten je Zeile weiterhin live übernehmen (nur die Position einfrieren, nicht
den Inhalt).

**ADR-Trigger-Check (Schritt 0):** keine der vier Kategorien trifft zu – keine
Technologiewahl (React `useState` ist Bestand), kein Architekturmuster-Wechsel (Server
Component rendert weiter alles, nur die Reihenfolge wird clientseitig gehalten), kein
Schnittstellen-Vertrag, keine irreversible Konsequenz (reines UI-Verhalten, keine Persistenz).

**Umsetzung (`/implement`, 2026-08-02):**
- Neue Client-Komponente `app/veranstaltung/EingefroreneZeilenListe.tsx`: hält die
  `zeile.id`-Reihenfolge des ersten Renderns in `useState` (Initializer, kein `useEffect` –
  Codify #49) und ordnet die vom Server gelieferten Zeilen bei jedem weiteren Rendern wieder in
  diese Reihenfolge. Sie rendert nur `<ul>`/`<li>`; der `inhalt` je Zeile bleibt server-gerendert
  und damit inhaltlich immer aktuell (Badge, Beträge, `initialErhalten`).
- Sortierung in `app/veranstaltung/[id]/kassieren/page.tsx` (spec-223) bleibt unverändert – sie
  bestimmt weiterhin die Reihenfolge bei jedem **neuen** Seitenaufruf; das Einfrieren wirkt nur
  innerhalb einer gemounteten Sitzung. Beim Reload mountet die Komponente neu → Server-Sortierung.
- Ids ohne eingefrorene Position werden angehängt (nie ausgeblendet), entfallene eingefrorene Ids
  übersprungen – beides mit eigenem Test belegt, obwohl auf dieser Seite nicht erwartet.
- Keine Routen-Änderung → `docs/routes.md` unverändert (Drift-Check grün).

**Gates:** `scripts/checks/pre-push.sh` grün (675 Tests, Typecheck, Prettier, Routen-Doku,
Hooks, Branch-Guard); Coverage des neuen Moduls 100 % (Stmts/Branch/Funcs/Lines).

**Offen – UI-Verifikation am Dev-Server:** Nicht durchgeführt. Der Docker-Daemon ist in dieser
Umgebung nicht erreichbar (`pnpm db:up` schlägt fehl), damit gibt es keine lokale DB und keinen
sinnvollen Dev-Server-Durchlauf; für die Kassierseite existiert zudem noch keine E2E-Spec
(`e2e/` deckt bislang auth/navigation/anleitung ab). Das Verhalten ist stattdessen auf zwei
Ebenen mit jsdom-Tests belegt: Komponente isoliert und die echte Kassierseite über
render → rerender (simulierter `revalidatePath`-Zyklus). Nachweis am laufenden System später
über `/post-merge-verify` bzw. einen manuellen Klick-Test.

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
