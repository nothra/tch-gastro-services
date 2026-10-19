# Task 407: katalog-seite-knoepfe-artikelbereich

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Katalog-Seite `/verwaltung/katalog/[id]` neu ordnen: „Katalog bearbeiten“ (Umbenennen, Duplizieren,
Deaktivieren/Aktivieren in einem Dialog) und „Katalog anlegen“ als Neben-Knöpfe direkt unter der
Katalog-Auswahl; Artikel in einem umrandeten Bereich mit „+ Neu“ als einzigem Primär-Knopf, als
`ListenZeile` nach Kategorie gruppiert; Texte laut Glossar. Nur Darstellung/Bedienung, keine
Änderung an Daten, Actions oder Rechten.
Spec: [`docs/specs/spec-407-katalog-seite-knoepfe-artikelbereich.md`](../docs/specs/spec-407-katalog-seite-knoepfe-artikelbereich.md)
· Abhängig von #403 (gemergt).

## Akzeptanzkriterien
Vollwortlaut (GIVEN/WHEN/THEN) in der Spec.
- [x] **AK1** Seitenaufbau: Titel, Auswahl, darunter „Katalog bearbeiten“ + „Katalog anlegen“ (Neben-Knöpfe); kein Kopf-Primärknopf; genau ein Primär-Knopf auf der Seite (AK1.1–AK1.5)
- [x] **AK2** Dialog „Katalog bearbeiten“ (Umbenennen/Duplizieren/(De-)Aktivieren), „Katalog anlegen“ als `FormularDialog`-Neben-Knopf, Bestätigungsschritt im selben Dialog (AK2.1–AK2.10)
- [x] **AK3** Umrandeter Artikelbereich „Artikel <n>“ mit „+ Neu“ (Primär), Leerzustand im Bereich (AK3.1–AK3.5)
- [x] **AK4** Artikel als `ListenZeile` (Preis, Pfeil), Kategorie-Zwischenüberschriften, deaktivierte verblasst + Badge an der Sortierstelle, Fokus-Rückgabe (AK4.1–AK4.7)
- [x] **AK5** Texte: „Aktivieren“, „(deaktiviert)“, „Katalog anlegen“, Busy „Anlegen …“, Glossar-Tabelle nachziehen (AK5.1–AK5.4)
- [x] **AK6** Farb-Gate bleibt grün; Doku/Anleitung/Screenshots auf verschobene Einstiege geprüft (AK6.1–AK6.2)
- [x] Fehlerszenarien F1–F6 abgedeckt
- [x] Oberflächentest gegen lokalen Dev-Server (`listenseiten`, `bestaetigen-rueckmelden` + Sichtprüfung 375 px) – siehe Notizen

## Technische Notizen
Entscheidung: [ADR-062](../docs/adr/062-katalog-bearbeiten-dialog-bestaetigungsschritt.md) (Accepted).
Kein Baustein ändert seine API.
- **Dateien neu:** `app/verwaltung/katalog/[id]/KatalogAnlegen.tsx` (`FormularDialog`, secondary),
  `KatalogBearbeiten.tsx` (ein `Dialog`, drei Formulare + Bestätigungsschritt), `ArtikelBereich.tsx`
  (Server: `Card`, Kopfzeile „Artikel <n>" + `ArtikelAnlegen` „+ Neu", h3 je Kategorie, Leerzustand).
- **Dateien ändern:** `page.tsx` (nur komponieren, `PageHeader` ohne Aktion), `CatalogRow.tsx`
  (`ListenZeile onOeffnen` + `anhang`, Muster `TeilnehmerRow`; Preis = `kennzeichen`, Titel = „Name · Größe“
  einzeilig, nur Name ohne Größe), `CatalogSwitcher.tsx` („(deaktiviert)"), `ArtikelAnlegen.tsx` (Busy „Anlegen …"),
  `FormularDialog.tsx` (nur Kommentar „Seitenkopf" → „Bereichskopf").
- **Datei löschen:** `CatalogControls.tsx` + `CatalogControls.test.tsx` (Verweise greppen, Lesson #187).
- **KatalogBearbeiten:** Schritt-Zustand im Eltern (beim Öffnen zurück auf „Bearbeiten"); Fokus je
  Richtung explizit (Lesson #404: in Bestätigung → „Abbrechen", zurück → „Deaktivieren", beim Öffnen
  keins); je Bereich eigenes `useDialogFormular`, geteilte `steuerung.gesperrt`; „Schließen" statt
  „Abbrechen" (Glossar prüfen); Duplizieren nur bei aktivem Katalog; „Aktivieren" ohne Schritt.
- **Tests:** Zeile (Button, kein Link, Fokus-Rückgabe, Kategorie-Wechsel → Fokus), Dialog
  (Bereiche senden nur eigene Felder, Sperre, Ablehnung bleibt offen, Schritt hin/zurück beide
  Richtungen, Mutationsbeleg Lesson #369), Seite (Reihenfolge, genau ein Primär-Knopf, Leerzustand im
  Bereich, `currentCatalog` fehlt). E2E ziehen nach: `bestaetigen-rueckmelden`, `listenseiten`,
  ggf. `anleitung-veranstalter` + Screenshots; Playwright-Locatoren `exact: true` (Lesson #372).
- **Glossar:** Abweichungszeile `ArtikelAnlegen.tsx` Busy als erledigt nachziehen (AK5.4).

## Offene Fragen
Siehe Spec → „Offene Fragen“ (Q1–Q6, alle von Ralf mit Default bestätigt):
- [x] Q1 Deaktivieren-Rückfrage bleibt → als Schritt im selben Dialog (ADR-062 D1)
- [x] Q2 Auslöser-Id/Fokus → `AnlegeDialog` unverändert, `FormularDialog` für „Katalog anlegen“ (ADR-062 D3)
- [x] Q3 Anzahl-Format „Artikel 24“ vs. „Artikel (24)“
- [x] Q4 Leerzustand zusätzlich mit „Artikel anlegen“?
- [x] Q5 Zähler an Kategorie-Zwischenüberschriften behalten?
- [x] Q6 Zeileninhalt: einzeilig „Name · Größe“ (Ralf, Review-Iteration 3)

## Implementierungs-Notizen (/implement, 2026-10-18)
- Schritt 0: kein ADR-Trigger offen – ADR-062 (Accepted) deckt Dialog-Schritt und `FormularDialog`-Wahl.
- `CatalogRow` liegt in `app/verwaltung/katalog/` (nicht `[id]/`); nur auf `ListenZeile` umgestellt,
  Bearbeiten-Dialog unverändert. Fokus nach Zustandswechsel: Zeile bleibt derselbe Knoten (Test AK4.6).
- `KatalogBearbeiten`: Bereiche als `<form aria-label>` (benannt für Screenreader und Tests);
  Bereichsknöpfe alle Neben-Knöpfe, „Deaktivieren" in der Bestätigung `danger`; Fokus je Richtung per
  `autoFocus` des jeweils neu gemounteten Schritts (wie spec-404). Mutationsbeleg (Lesson #369): Sperre
  an „Deaktivieren"/„Schließen" entfernt, `autoFocus` hin/zurück entfernt bzw. immer gesetzt,
  Schritt-Reset beim Öffnen entfernt – jede Mutation macht den zugehörigen Test rot.
- Artikelbereich-Kopfzeile ist ein `<header>` der Section: der geteilte E2E-Helfer
  `oeffneAnlegeDialog` (`main header`) trifft so „+ Neu" ohne Sonderweg.
- Glossar: „Schließen" als Abgrenzung zu „Abbrechen" ergänzt (ADR-062 D2), Abweichungszeile
  `ArtikelAnlegen.tsx` gestrichen. Anleitung beschreibt die Katalogseite nicht, kein Screenshot betroffen.
- Spec-Präzisierung AK2.8: „Wechsel auf die Seite des neuen Katalogs" war nie Ist-Verhalten
  (`createCatalogAction` leitet nicht weiter); Wortlaut korrigiert statt Action zu ändern (Scope).
- Coverage `app/verwaltung/katalog/**/*.tsx`: 100 % Statements/Branches/Functions/Lines.

## Review-Findings
<!-- Wird durch /review befüllt -->
- Iteration 1 (2026-10-18): **NEEDS_REWORK** – 0 kritisch, 1 wichtig, 4 Nitpicks; Details in
  [`review-407.md`](review-407.md). W1: geänderte Opt-in-E2E-Specs (`bestaetigen-rueckmelden`,
  `listenseiten`) nicht gelaufen (Lesson #403/#406). Keine Out-of-Scope-Funde.
- Iteration 2 (2026-10-18): **NEEDS_REWORK** – 1 kritisch, 2 wichtig, 2 Nitpicks. K1: `listenseiten`
  rot – die zweizeilige `ListenZeile` (Q6) reißt die Dichte-Vorgabe aus spec-373 AK4.6 (20 Artikel =
  1796 px > 1624 px). Entscheidung Ralf nötig: einzeilig „Name · Größe“ oder spec-373 AK4.6 bewusst
  ablösen. W1: Lauf von `bestaetigen-rueckmelden` nicht belegt; W2: Rework nicht committet.
- Iteration 3 (2026-10-18): **NEEDS_REWORK – Circuit Breaker, Eskalation an Ralf.** Code seit
  Iteration 2 unverändert (kein Commit, kein neuer E2E-Lauf); Findings 1:1 übernommen. Weiter nur mit
  Ralfs Entscheidung zu K1 (a: einzeilig „Name · Größe“ / b: spec-373 AK4.6 in spec-407 ablösen).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/407-katalog-seite-knoepfe-artikelbereich`
Erstellt: 2026-10-18 18:10

## Review-Iteration 3 – Entscheidung K1 (2026-10-19)

Ralf entschied Option (a): Artikelzeile einzeilig „Name · Größe“ ohne Untertitel (spec-407 Q6/AK4.2/AK4.7
angepasst). `CatalogRow` + Test umgestellt. E2E gegen eigenen Dev-Server aus dem Worktree
(`E2E_372=1 E2E_LISTENSEITEN_373=1`, `listenseiten` + `bestaetigen-rueckmelden`): 7/7 grün, inkl. Dichte-Grenze
spec-373 AK4.6. Keine manuelle 375-px-Sichtprüfung/Screenshot in dieser Runde (Dichte-Messung im E2E belegt die Grenze).
Wegwerf-Spec und Screenshots gelöscht.

**Nachtest 2026-10-19 (HEAD `66a7ebe`):** `listenseiten` + `bestaetigen-rueckmelden` erneut gegen eigenen
Dev-Server (Port 3407, `localhost`) – 7/7 grün. Sichtprüfung 375 px per Wegwerf-Screenshot (Seite oben,
ganze Seite, Dialog „Katalog bearbeiten“): Neben-Knöpfe unter der Auswahl, umrandeter Bereich „Artikel 20“
mit „+ Neu“ als einzigem Primär-Knopf, einzeilige Zeilen „Name · Größe“ mit Preis + Pfeil, Kategorie-
Überschriften Getränk/Kaffee/Essen, Dialog mit Umbenennen/Duplizieren/Deaktivieren + „Schließen“, kein
horizontaler Überlauf. Bekannt (Review-Nitpick, Baustein `ListenZeile`, außerhalb Scope): der Name
„Cola/Fanta/Spezi/Limo“ ohne Trennstelle bricht bei 375 px mitten im Wort um.
