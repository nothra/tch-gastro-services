# ADR 062: „Katalog bearbeiten" – Mehr-Aktionen-Dialog mit Bestätigungsschritt statt Dialog über Dialog

## Status

Accepted

> Ergänzt **ADR-053** D1 (`Dialog`, `ConfirmDialog`) und **ADR-058** D4 (Formular-Dialoge der
> Listenseiten). Alle bestehenden Regeln bleiben unverändert; kein Baustein ändert seine API.

## Datum

2026-10-18

## Kontext

[spec-407](../specs/spec-407-katalog-seite-knoepfe-artikelbereich.md) (#407) bündelt die drei
Katalog-Aktionen Umbenennen, Duplizieren und Deaktivieren/Aktivieren in **einen** Dialog „Katalog
bearbeiten" (AK2). „Deaktivieren" eines Katalogs fragt weiterhin nach (spec-372 AK3; spec-407
Q1) – heute über einen eigenen `ConfirmDialog` an einem Einzel-Knopf (`CatalogControls`).
Innerhalb des neuen Dialogs gäbe es dafür zwei Wege. Zugleich braucht die Seite einen
Neben-Knopf „Katalog anlegen" neben dem Primär-Knopf „+ Neu" des Artikelbereichs (Q2); der
`AnlegeDialog` ist aber als **der eine** Seitenkopf-Primär-Auslöser verdrahtet (feste Id
`anlegen-seitenkopf`, Primär-Variante).

Ist-Stand-Korrektur zum Issue: Der im Issue genannte `CatalogModal` (`<dialog open>`-Nachbau)
existiert seit spec-372 nicht mehr; alle Katalog-Dialoge stehen bereits auf `Dialog` /
`FormularDialog` / `ConfirmDialog`. AK2.10 ist damit nur noch zu erhalten, nicht herzustellen.

## Entscheidung

### D1 · Bestätigung als Schritt im selben Dialog

Der Dialog „Katalog bearbeiten" kennt zwei Schritte: **Bearbeiten** (drei Bereiche) und
**Deaktivieren bestätigen**. „Deaktivieren" im Bereich wechselt den Schritt; der Bestätigungsschritt
zeigt den Wirkungssatz („… ist danach für neue Veranstaltungen nicht mehr wählbar."), `Abbrechen`
(zurück zum Bearbeiten-Schritt) und `Deaktivieren` (danger, Busy „Deaktivieren …"). „Aktivieren"
wirkt ohne Schritt (reversibel, spec-372 AK4).

- Der Dialog bleibt **ein** `Dialog` (Titel wechselt mit dem Schritt, z. B. „Katalog
  deaktivieren?"). Der Schritt-Zustand liegt in der Komponente, die den Dialog hält, und wird
  beim Öffnen auf „Bearbeiten" zurückgesetzt (analog `zuruecksetzen()` in `useFormularDialog`).
- Es wird **kein** `ConfirmDialog` in den Dialog geschachtelt.
- Fokus je Richtung explizit setzen (Lesson #404 W1: `autoFocus` greift nur beim Mount): in den
  Bestätigungsschritt → auf `Abbrechen` (sicheres Ziel bei danger-Aktion); zurück → auf
  „Deaktivieren" im Bearbeiten-Schritt; beim Öffnen weder noch.
- Escape schließt wie bei jedem `Dialog` den ganzen Dialog (nicht nur den Schritt); das ist
  bewusst einfach gehalten (Alternative: Escape = Zurück, siehe unten).

### D2 · Bereiche des Dialogs sind getrennte Formulare auf einer `DialogSteuerung`

Umbenennen, Duplizieren und (De-)Aktivieren sind je ein eigenes `<form>` mit eigenem
`useDialogFormular` (Muster `ArtikelBearbeiten`/`ArtikelAktivUmschalten` in `CatalogRow`): ein
Bereich sendet nie die Felder der anderen (spec-407 AK2.3), Ablehnungen stehen als `Notice` am
jeweiligen Bereich, die geteilte `steuerung.gesperrt` sperrt während einer Action alle übrigen
Knöpfe und das Schließen (AK2.4). Duplizieren entfällt bei inaktivem Katalog (AK2.5). Weil der
Dialog nach **jedem** Erfolg schließt und die Kinder erst beim Öffnen mounten (ADR-053 D1), zeigt
ein erneutes Öffnen nie veraltete Vorbelegungen (F5). Ein Schließen-Knopf (statt „Abbrechen":
die Bereiche wirken sofort, nichts wird „abgebrochen") steht am Ende; Beschriftung nach Glossar.

### D3 · „Katalog anlegen" ist ein `FormularDialog` mit Neben-Knopf, `AnlegeDialog` bleibt unverändert

`AnlegeDialog` ist nur `FormularDialog` + Auslöser-Konfiguration für den **einen** Anlege-Knopf im
Kopf einer Listenseite. „Katalog anlegen" nutzt deshalb `FormularDialog` direkt
(`ausloeserVariant="secondary"`, keine feste Auslöser-Id) – Dialog-Verhalten (Escape, inert,
Fokus-Rückgabe, Sperre, `DialogAktionen`) ist identisch, es entsteht kein zweiter Dialog-
Baustein. Der Artikelbereich behält `AnlegeDialog`: „+ Neu" ist dessen einzige Primär-Instanz
(Id `anlegen-seitenkopf`), der Leerzustand-Knopf ist die `imLeerzustand`-Instanz mit Rückfall
auf diese Id. Damit bleibt die Id je Seite eindeutig. Abweichung vom Issue-Wortlaut „nutzt den
Standard-Dialog (`AnlegeDialog`)": gemeint ist das Standard-Dialog-Verhalten, nicht die
Seitenkopf-Verdrahtung; die Spec ist entsprechend präzisiert (AK2.8/AK2.9).

### D4 · Artikelbereich: `Card` + `ListenZeile` im Auslöser-Modus, kein neuer Baustein

Der Bereich ist eine `Card` mit Kopfzeile (Überschrift „Artikel" + Anzahl, „+ Neu") und darunter
den Kategorie-Gruppen (`<h3>` je Kategorie, `<ul>` aus `ListenZeile`). Die Artikelzeile
(`CatalogRow`) wird zur `ListenZeile` mit `onOeffnen`, `id`/`ausloeserRef` und dem Dialog im
`anhang` – wie `TeilnehmerRow` (ADR-060 D1); Preis als `kennzeichen` (ADR-061 D2, verblasst
nicht), deaktiviert als `zustand`. Bereich und Gruppen sind Server-Komponenten (eigene Datei
`ArtikelBereich.tsx` statt Inline-Funktion in `page.tsx`); nur Zeile und Dialoge sind Client.
`Card` trägt die Umrandung, nicht `Aufklapper` (ADR-059: Rahmen kommt von außen).

## Alternativen

### Option A: `ConfirmDialog` in den Bearbeiten-Dialog schachteln
Vorteile: Wiederverwendung des vorhandenen `ConfirmDialog` samt `useBestaetigung`; kein
Schritt-Zustand.
Nachteile: zwei modale `<dialog>` übereinander – Fokus-Rückgabe auf einen Knopf **im** darunter
liegenden Dialog, dessen Kinder beim Schließen unmounten (Reihenfolge-Risiko, Lesson #371/#373);
Toast im offenen Dialog-Kontext (Lesson #372) wird bei zwei offenen Dialogen mehrdeutig; Escape
und Sperrlogik zweifach; jsdom kann nichts davon belegen.

### Option B: Bestätigungsschritt im selben Dialog (gewählt)
Vorteile: genau ein modaler Dialog, ein Fokus-Ziel, eine Sperre; Schritt-Wechsel hat Vorbild
(spec-404 „Teilnehmer hinzufügen"/„Teilnehmer anlegen", Lesson #404). Beliebig testbar.
Nachteile: Schritt-Zustand und explizite Fokus-Steuerung je Richtung; Titel wechselt.

### Option C: Deaktivieren ohne Rückfrage, nur Erklärsatz (wie beim Artikel)
Vorteile: einfachster Dialog.
Nachteile: widerspricht spec-372 AK3 – ein deaktivierter Katalog ist für neue Veranstaltungen
nicht mehr wählbar; Rücknahme per „Aktivieren" ist zwar möglich, aber die Wirkung ist weitreichender
als beim Artikel. Von Ralf als Default ausgeschlossen (Q1).

### Option D: `AnlegeDialog` um eine Variante erweitern („Neben-Knopf ohne feste Id")
Vorteile: Wortlaut des Issues buchstäblich erfüllt.
Nachteile: API-Änderung eines geteilten Bausteins für genau einen Konsumenten, der schon heute
`FormularDialog` nutzt; `imLeerzustand` darf dafür nicht zweckentfremdet werden (falscher Name,
falscher Rückfall-Fokus).

## Begründung

Die Entscheidung hält die geteilten Bausteine unverändert (YAGNI) und löst die einzige echte
Verhaltensfrage – Bestätigung innerhalb eines Dialogs – mit einem bereits belegten Muster
(Schrittwechsel) statt mit verschachtelten modalen Dialogen, deren Fokus-/Toast-/Escape-
Verhalten die Lessons #371–#373 gerade als fehleranfällig ausweisen.

## Konsequenzen

- `CatalogControls.tsx` (+ Test) entfällt; neu: `KatalogAnlegen.tsx`, `KatalogBearbeiten.tsx`,
  `ArtikelBereich.tsx`; `CatalogRow.tsx` wird `ListenZeile`-basiert; `page.tsx` komponiert nur.
  Die alte Datei wird im selben Schritt gelöscht (Lesson #187), alle Verweise gegrept.
- Die Vorbelegung `ersatzFokusId` der Artikelzeile bleibt die Zeilen-Id (Kategorie-/Zustandswechsel
  hängt die Zeile aus, Lesson #371).
- Das Kommentar „Seitenkopf" an `SEITENKOPF_AUSLOESER_ID` in `FormularDialog.tsx` bleibt sachlich
  richtig genug (der Primär-Anlege-Auslöser der Seite); nur der Kommentar wird auf „Bereichskopf"
  präzisiert, der Name bleibt (kein Rename-Churn).
- Betroffene Tests/Specs ziehen mit: `e2e/bestaetigen-rueckmelden.spec.ts` (Katalog-Knöpfe,
  Dialogtitel), `e2e/listenseiten.spec.ts` („+ Artikel" → „+ Neu"), ggf.
  `e2e/anleitung-veranstalter.spec.ts` und Screenshots der Anleitung (Lesson #391).
- Neuer Fall für das Dialog-Muster: künftige Mehr-Aktionen-Dialoge mit Rückfrage folgen D1
  (Schritt statt Schachtelung).
