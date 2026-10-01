# Spec: Anleitungs-Screenshots 05–07 neu erzeugen

Issue #388 · Herkunft: `docs/factory/kleinfunde.md` → „Anleitungs-Screenshots `05`–`07` (und ggf. `10`–`12`) zeigen noch die alte Detailseite" (aus `/review` zu #369). Bezug: [spec-221](spec-221-bedienungsanleitung-veranstalter.md) (Bedienungsanleitung, reproduzierbare Bilder).

## Kontext

#369 hat die Veranstaltungs-Detailseite neu geordnet (drei Arbeitsschritt-Kacheln, ein „+ Teilnehmer"-Dialog, „Link & QR teilen" im Dialog, Abschließen am Ende von Kassieren). Text und Alt-Texte der Anleitung (`docs/anleitung/veranstalter/anleitung.md`) beschreiben das schon; die Bilder `05`, `06` und `07` stammen noch aus dem alten Layout. Die Bilder erzeugt die Capture-Spec `e2e/anleitung-veranstalter.spec.ts` (nur mit `CAPTURE_ANLEITUNG=1`); sie legt ihre Demo-Daten deterministisch an und braucht deshalb eine **frisch geseedete** DB.

## Scope

**Inbegriffen:**
- `05-veranstaltung-fuehren.png`, `06-teilnehmer-hinzufuegen.png`, `07-zugang-teilen.png` mit dem neuen Layout neu erzeugen.
- `10-kassieren.png`, `11-abrechnung.png`, `12-abschluss-bericht.png` gegen den neuen Stand prüfen (Abschließen liegt jetzt am Ende von Kassieren, der Bericht über den Kacheln) und nur bei sichtbarer Abweichung ersetzen.
- Passen Alt-Text oder umgebender Text einer ersetzten Abbildung nicht mehr zum neuen Bild, wird er im selben Zug angeglichen.
- Den Kleinfund-Eintrag in `docs/factory/kleinfunde.md` schließen (entfernen), sobald die Bilder committet sind.

**Nicht inbegriffen:**
- Bilder `01`–`04`, `08`, `09` (unverändert; Neu-Rendern erzeugt nur Rauschen im Diff).
- Inhaltliche Änderungen an der Anleitung über Bild-Alt-Texte hinaus; Änderungen an der Capture-Spec, außer ein vorbestehender Bruch macht den Lauf unmöglich.
- Änderungen an App-Code, Styling oder Seed-Daten.

## Akzeptanzkriterien

- [ ] AK1: GIVEN eine frisch aufgesetzte und geseedete lokale DB WHEN die Capture-Spec mit `CAPTURE_ANLEITUNG=1` läuft THEN läuft sie ohne Fehler durch und schreibt alle zwölf Bilder nach `docs/anleitung/veranstalter/bilder/`.
- [ ] AK2: GIVEN `05-veranstaltung-fuehren.png` WHEN es angesehen wird THEN zeigt es die neue Detailseite mit den Kacheln „Verzehr", „Auslagen" und „Kassieren" und der Teilnehmerliste – passend zum Alt-Text in `anleitung.md`.
- [ ] AK3: GIVEN `06-teilnehmer-hinzufuegen.png` WHEN es angesehen wird THEN zeigt es den Dialog „Teilnehmer hinzufügen" mit Suche, Auswahl der bekannten Personen und dem Bereich „Neuer Gast".
- [ ] AK4: GIVEN `07-zugang-teilen.png` WHEN es angesehen wird THEN zeigt es den Dialog „Link & QR teilen" mit Selbstbedienungs-Link, „Link kopieren" und QR-Code.
- [ ] AK5: GIVEN die Bilder `10`, `11` und `12` WHEN sie mit dem neuen Layout verglichen werden THEN sind sie nur dann ersetzt, wenn sie sichtbar vom aktuellen Stand abweichen (z. B. Abschließen am Ende von Kassieren); die Entscheidung je Bild steht in der Task-Datei.
- [ ] AK6: GIVEN die Bilder `01`–`04`, `08`, `09` WHEN der Diff gegen `main` angesehen wird THEN sind sie unverändert (byte-identisch zu `main`).
- [ ] AK7: GIVEN ein ersetztes Bild WHEN Alt-Text oder umgebender Text nicht mehr zum Bild passt THEN ist er im selben PR angeglichen; sonst bleibt `anleitung.md` unverändert.
- [ ] AK8: GIVEN der Diff WHEN er geprüft wird THEN enthält er weder Zugangsdaten noch Klarnamen: die Bilder zeigen nur die deterministischen Demo-Daten der Capture-Spec und keine Produktionsdaten (Banner „DEV · Lokale Entwicklung" ist nur ein Hinweis, kein Beleg – Inhalte werden vor dem Commit gesichtet).
- [ ] AK9: GIVEN der PR WHEN er gemerged wird THEN ist der Kleinfund-Eintrag zu den Anleitungs-Screenshots aus `docs/factory/kleinfunde.md` entfernt, und die Gates (Lint, Format, Tests, Routen-Doku) sind grün.

## Fehlerszenarien

- [ ] FS1: Die Capture-Spec bricht ab (vorbestehender Bruch, z. B. mehrdeutiger Locator wie in #345) → minimal reparieren (`exact: true` o. Ä.), die Reparatur in der Task-Datei nennen; reicht das nicht, abbrechen und melden, nicht die Spec umbauen.
- [ ] FS2: Die DB ist nicht frisch (Altbestand, Demo-Artikel mit abweichender Nummerierung) → Lauf nicht werten, DB neu aufsetzen und wiederholen; keine Bilder aus einem unsauberen Lauf committen.
- [ ] FS3: Ein Bild zeigt unerwartete Inhalte (Testdaten mit `__test__`-Präfix aus anderen Läufen, fremde Veranstaltungen) → verwerfen und den Lauf auf frischer DB wiederholen.
- [ ] FS4: Der Dev-Server blockiert Ressourcen (`allowedDevOrigins`, `127.0.0.1` statt `localhost`; Lesson #368) → mit `localhost:<port>` fahren; ein nicht hydriertes Bild (leere Dialoge) nie committen.

## Offene Fragen

- [x] Q1: Auf welcher DB laufen? **Entschieden (Ralf, 2026-10-01): die lokale Dev-DB wird zurückgesetzt und neu geseedet.** Das zerstört ihren aktuellen Bestand, auch für die parallele Session #370; die Entscheidung wurde in Kenntnis dieser Folge getroffen.
- [x] Q2: Alle zwölf Bilder neu schreiben und die unveränderten verwerfen? **Ja** – die Spec schreibt immer alle zwölf; AK6 stellt sicher, dass nur die gewollten im Diff landen (`git checkout -- <bild>` für den Rest).
