# Task 388: anleitungs-screenshots-05-07-neu-erzeugen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die Anleitungs-Bilder `05`–`07` (und bei Abweichung `10`–`12`) zeigen noch das Layout vor #369. Mit der Capture-Spec
(`CAPTURE_ANLEITUNG=1`) gegen eine frisch geseedete lokale DB neu erzeugen. Spec: `docs/specs/spec-388-anleitungs-screenshots-05-07-neu-erzeugen.md`.
Herkunft: `docs/factory/kleinfunde.md` („Anleitungs-Screenshots `05`–`07`").

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] Siehe `docs/specs/spec-388-anleitungs-screenshots-05-07-neu-erzeugen.md` (AK1–AK9, FS1–FS4); kurz:
- [ ] AK1: frisch geseedete DB → Capture-Spec läuft durch, zwölf Bilder geschrieben
- [x] AK2: `05` zeigt Kacheln und Teilnehmerliste
- [x] AK3: `06` zeigt den Dialog „Teilnehmer hinzufügen"
- [x] AK4: `07` zeigt den Dialog „Link & QR teilen"
- [ ] AK5: `10`–`12` nur bei sichtbarer Abweichung ersetzt, Entscheidung je Bild notiert
- [x] AK6: `01`–`04`, `08`, `09` unverändert (byte-identisch zu `main`)
- [x] AK7: Alt-/Umgebungstext nur angeglichen, wenn er nicht mehr passt
- [x] AK8: Bilder zeigen nur Demo-Daten, keine Zugangsdaten/Klarnamen
- [ ] AK9: Kleinfund-Eintrag entfernt, Gates grün

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Q1 entschieden (Ralf, 2026-10-01): lokale Dev-DB wird zurückgesetzt und neu geseedet – zerstört den Bestand, auch für die parallele Session #370.

### Implementierungs-Notizen (/implement, 2026-10-01)
- Dev-DB wie entschieden zurückgesetzt (`DROP/CREATE DATABASE tch_dev` im Container `tch-gastro-db`, kein
  `docker compose` aus dem Worktree wegen festem `container_name`), dann `db:migrate` + `db:seed`; insgesamt
  viermal, weil jeder gescheiterte Lauf Demo-Daten anlegt (Spec-FS2). Eigener `next dev` auf Port 3388 und
  Config ohne `webServer` (Lesson #368). Seed-Admin als `admin@tch.example`, damit `05` zu den unveränderten Bildern
  passt (die zeigen diese Adresse; `.env.local` hat `admin@tch.local`).
- **Neu: `05`, `06`, `07`.** `07`: Das native `<dialog>` fokussiert das Link-Feld und scrollt es ans URL-Ende – die
  Capture-Spec setzt Fokus und Scroll vor dem Bild zurück (sonst nur „…ffb7cff344" sichtbar, mit Fokusring).
  Der Link zeigt `localhost:3388` (Port des Wegwerf-Servers; Port 3000 war durch eine fremde Dev-Instanz belegt, die ich
  nicht angefasst habe) – die alten Bilder zeigten `:3000`.
- **Capture-Spec repariert (FS1):** Katalog-Zähler relativ zum Startwert (die frische DB bringt 16 Standard-Artikel mit,
  #59) und der `07`-Schritt. Weiter ist **nicht** repariert: der Verzehr-/Kassieren-Schritt (`hasText: "Bier"` trifft
  per Teilstring auch das Seed-„Weizenbier 0,5 l" und `.last()` wählt es – gemessen an der DB des Laufs); der Lauf endet dort mit rotem Test, `08`–`12` sind deshalb **nicht** neu und bleiben
  auf `main` (AK1/AK5 nicht erfüllt, bewusst – Entscheidung Ralf: „nur 05–07 liefern"). Kanonisch festgehalten in
  `docs/factory/kleinfunde.md` („Capture-Spec der Anleitung läuft nicht bis zum Ende durch").
- AK9 entsprechend: Der alte Kleinfund-Eintrag ist durch einen engeren ersetzt (nur noch Capture-Spec + `10`–`12`).
- Nicht geprüft: Ob `10`–`12` tatsächlich veraltet sind.
- `docs/anleitung/veranstalter/anleitung.pdf` (manueller Browser-Druck) ist seit #221 nicht neu erzeugt und zeigt noch die
  alte Detailseite; als eigener Kleinfund festgehalten, nicht Teil dieses PRs.

### Review-Rework Iteration 1 (/implement, 2026-10-01)
- Wichtig 1 behoben: Ursache im Kleinfund und in diesen Notizen korrigiert – Teilstring-Treffer von `hasText: "Bier"` auf
  „Weizenbier 0,5 l" (nicht die Seed-Biere), gemessen an der DB des Laufs (Anna 2 × Weizenbier, Familie Klein 1 ×).
- Wichtig 2 behoben: Spec um Q3 (Scope-Entscheidung) ergänzt, AK2–AK4 und AK6–AK8 abgehakt, AK1/AK5 als zurückgestellt und
  AK9 als angepasst gekennzeichnet.
- Nitpick behoben: PDF-Eintrag nennt jetzt #324 und #369 für den Text und #388 für die Bilder. Port `3388` in `07` und „4 von 4
  bezahlt" in `05` bleiben bewusst (dokumentiert, kein Handlungsbedarf).
- Bilder und Capture-Spec unverändert.

### /test (2026-10-01)
- Regulärer Lauf ohne `.env.local` (DB-Integrationstests übersprungen): 98 Dateien / 1279 Tests grün, 110 übersprungen,
  Coverage gesamt 91,8 % Statements / 97,3 % Branches (Schwelle 80 %). Factory-Self-Tests (`scripts/checks/tests/run-tests.sh`):
  1564 grün, 0 rot – sie hätten `kleinfunde.md` und Doku-Guards erfasst.
- Keine neuen Tests: Der Task ändert keinen Produktionscode (drei Bilder, Doku, Capture-Spec, die ohne `CAPTURE_ANLEITUNG=1`
  übersprungen wird). Die Akzeptanzkriterien sind Bild-/Diff-Prüfungen und stehen belegt in den Implementierungs-Notizen
  und in `tasks/review-388.md`; die Capture-Spec ist selbst die Prüfung der Bilder (Lauf bis zum bekannten Abbruch im Kassieren-Schritt).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/388-anleitungs-screenshots-05-07-neu-erzeugen`
Erstellt: 2026-10-01 02:27
