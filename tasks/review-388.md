# Review: Task 388

**Review-Iteration 1** (Stand `f5e5a1d`). Geprüft wurde `git diff origin/main...HEAD` (7 Dateien: drei PNGs,
Capture-Spec, Spec, Task-Datei, `kleinfunde.md`; `origin/main` ist nicht weitergelaufen). Die drei Runden
(Logik, Code-Qualität, Architektur) hat der Reviewer selbst durchgeführt, ohne Sub-Agenten – der Diff ist klein,
und der Reviewer hat die Änderung mit entwickelt. Deshalb wurden die tragenden Behauptungen nicht gelesen,
sondern nachgemessen: die drei Bilder angesehen, die Zeilenanker in `kleinfunde.md` gegen die Dateien gelesen und die
im Kleinfund behauptete Ursache gegen die lokale DB geprüft (schreibgeschützte Abfragen, nichts verändert).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [docs/factory/kleinfunde.md („Capture-Spec der Anleitung läuft nicht bis zum Ende durch", „Was") ·
  tasks/task-388-…md („Capture-Spec repariert (FS1)")] Die dort genannte Ursache ist falsch. Beschrieben ist
  eine Kollision mit „Bier 0,33 l"/„Bier 0,5 l" des Seed-Sortiments. Gemessen auf der DB des letzten Laufs:
  Annas Verzehr besteht aus **2 × „Weizenbier 0,5 l" (3,00 €)** und 1 × Filterkaffee, zusammen 7,50 €.
  `verzehrPlus` wählt über `hasText: "Bier"`, und `hasText` ist ein Teilstring-Treffer – er trifft auch
  „Weizenbier" (Seed, `sort_order` 250, also hinter den Bier-Varianten), `.last()` nimmt dann genau dieses. Das
  Demo-„Bier" (2,50 €) und die zwei Seed-Biere werden gar nicht gewählt (zwei Seed-Biere ergäben ohnehin 4,00 €
  bzw. 5,00 €, nicht 6,00 €). Der Fix-Vorschlag („Demo-Namen, die nicht Teilstring des Seed-Sortiments sind,
  oder Auswahl über die Variante ‚ohne Größe'") passt zur Ursache nur halb; der Kleinfund würde den Nächsten in die
  falsche Richtung schicken. Korrigieren: Ursache „Teilstring-Treffer auf ‚Weizenbier'" nennen, als Fix einen
  exakten Treffer auf den Artikelnamen (z. B. Regex mit Wortanfang/Ende oder das Label ohne Größen-Suffix) vorschlagen
  und Anker `:252`/`:259` beibehalten (Anker sind korrekt, am Stand `f5e5a1d` gegen die Datei gelesen). Dieselbe
  Verwechslung steht in der Task-Datei und muss dort ebenfalls angeglichen werden (Lesson #319: „X erzwingt Y" /
  Ursachenbehauptungen vor dem Schreiben prüfen).
- [ ] [docs/specs/spec-388-…md:24-32, :42-44] Die Spec ist nach der Scope-Entscheidung nicht nachgezogen. Sie verlangt
  weiterhin AK1 (Capture-Spec läuft ohne Fehler durch, alle zwölf Bilder), AK5 (`10`–`12` prüfen und
  entscheiden) und AK9 („der Kleinfund-Eintrag ist entfernt"), und alle Kriterien stehen als `[ ]`, während die Task-Datei
  einzelne abhakt. Tatsächlich geliefert wurde nur `05`–`07` auf ausdrückliche Entscheidung („Nur 05–07
  liefern"); der Kleinfund wurde nicht entfernt, sondern durch einen engeren ersetzt (plus neuer PDF-Eintrag).
  Die Spec nennt in „Offene Fragen" nur Q1 und Q2, die Entscheidung fehlt. Lesson #253/#55 (im selben PR
  entstandene Spec gegen den gelieferten Stand spiegeln). Vorschlag: Q3 „Scope nach Fehlschlag FS1" mit Datum
  ergänzen, AK1/AK5/AK9 als „zurückgestellt (Q3, Kleinfund)" kennzeichnen und die erfüllten AK (AK2–AK4, AK6–AK8)
  abhaken.

## Nitpicks (optional)

- [ ] [docs/factory/kleinfunde.md („`anleitung.pdf` ist seit #221 nicht neu erzeugt worden", „Was")] „Seit #221 haben
  #369 und #388 Text bzw. Bilder von `anleitung.md` geändert" ist unvollständig: `git log -- docs/anleitung/
  veranstalter/anleitung.md` zeigt zusätzlich `92d0b1a` (#324). Und #388 ändert nur Bilder, nicht den Text. Auf „#324
  und #369 haben den Text, #388 die Bilder geändert" ändern; die Schlussfolgerung (PDF veraltet) bleibt richtig.
- [ ] [docs/anleitung/veranstalter/bilder/07-zugang-teilen.png] Das Link-Feld zeigt nur `http://localhost:3388/t` (das
  Feld ist neben „Link kopieren" schmal) und den privaten Test-Port 3388; die alten Bilder zeigten `localhost:3000/theke/…`.
  In der Task-Datei dokumentiert, die Abbildung bleibt für den Zweck (Dialog, Kopieren-Schaltfläche, QR-Code) tauglich.
  Wer das Bild bei Gelegenheit ohnehin neu erzeugt, kann auf dem Standard-Port 3000 fahren.
- [ ] [docs/anleitung/veranstalter/bilder/05-veranstaltung-fuehren.png] Die Kachel „Kassieren" zeigt „4 von 4 bezahlt"
  bei 0,00 € Verzehr. Das ist korrekt (Zeilen ohne Verzehr zählen als bezahlt, #369 AK4) und im Text unter
  „Schritt 3" als „x von n bezahlt" erklärt, kann Leser aber irritieren. Kein Handlungsbedarf, wenn `05` später mit
  Verzehr aufgenommen wird.

## Positives

- **AK6 belegt:** Der Diff gegen `main` enthält genau `05`, `06`, `07`; `01`–`04`, `08`–`12` sind byte-identisch
  (`git diff --name-status origin/main...HEAD`).
- **Bilder sachlich geprüft:** `05` (Kacheln, Teilnehmerliste, eingeklappte „Einstellungen", Admin `admin@tch.example` wie
  in den unveränderten Bildern), `06` (Dialog mit Suche, Auswahl, „Neuer Gast") und `07` (Dialog mit Link-Feld,
  „Link kopieren", QR-Code) zeigen den Stand nach #369 und passen zu Alt-Text und Fließtext in `anleitung.md`; Alt-Texte
  mussten nicht angefasst werden (AK7). Die Bilder enthalten nur Demo-Daten und die DEV-Kennzeichnung, keine
  Zugangsdaten oder Klarnamen; der QR-Code kodiert einen Token der inzwischen zurückgesetzten Wegwerf-DB (AK8).
- **Capture-Spec: kleine, begründete Reparaturen.** Der relative Katalog-Zähler (`artikelAnzahl`) ist ein sauberer
  kleiner Helfer mit WHY-Kommentar (#59), der `07`-Schritt erklärt, warum Fokus und Scroll zurückgesetzt werden, und
  der Locator ist mit `exact: true` eindeutig (der erste Wurf war es nicht und fiel im Lauf auf). Typecheck, Lint und
  Format liefen in den Gates durch.
- **Der Fehlschlag steht offen im Bericht**, nicht beschönigt: Die Task-Datei nennt die nicht erfüllten AK, den
  nicht reparierten Verzehr-/Kassieren-Schritt, den Port-Hinweis und das veraltete PDF; die Folgearbeit ist
  kanonisch in `kleinfunde.md` verankert (kein Verlust in der Session).
- **Kleinfund-Anker stimmen** (`:173`, `:197`, `:252`, `:259`, `:280`–`:294`, Migration `:20-21`), am Stand `f5e5a1d`
  gegen die Dateien gelesen.
- **Eingriff in die geteilte Dev-DB war ausdrücklich bestätigt** (Spec Q1, Rückfrage vor dem ersten und nach dem
  Guardrails-Hinweis); `.env.local` wurde nicht gelesen oder ausgegeben, `CLAUDE.md` ist unverändert (nach `next dev`
  zurückgesetzt).

## Verlauf

- **Iteration 1** (Stand `f5e5a1d`): 0 kritische, 2 wichtige (beides Dokumentations-Korrektheit, kein Code- oder
  Bild-Mangel), 3 Nitpicks, `NEEDS_REWORK`. Der Rework ist reine Textarbeit in Spec, Task-Datei und `kleinfunde.md`;
  die Bilder und die Capture-Spec bleiben unverändert.
- Keine Out-of-Scope-Funde in dieser Iteration (der Verzehr-Schritt und das PDF sind schon als Kleinfunde angelegt).

## Empfehlung

NEEDS_REWORK
