# Task 388: anleitungs-screenshots-05-07-neu-erzeugen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Die Anleitungs-Bilder `05`–`07` (und bei Abweichung `10`–`12`) zeigen noch das Layout vor #369. Mit der Capture-Spec
(`CAPTURE_ANLEITUNG=1`) gegen eine frisch geseedete lokale DB neu erzeugen. Spec: `docs/specs/spec-388-anleitungs-screenshots-05-07-neu-erzeugen.md`.
Herkunft: `docs/factory/kleinfunde.md` („Anleitungs-Screenshots `05`–`07`").

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] Siehe `docs/specs/spec-388-anleitungs-screenshots-05-07-neu-erzeugen.md` (AK1–AK9, FS1–FS4); kurz:
- [x] AK1 (zurückgestellt, Q3 → Kleinfund „Capture-Spec läuft nicht bis zum Ende durch"): Capture-Spec läuft bis `07` durch, schreibt `05`–`07`; Verzehr-/Kassieren-Schritt bleibt rot
- [x] AK2: `05` zeigt Kacheln und Teilnehmerliste
- [x] AK3: `06` zeigt den Dialog „Teilnehmer hinzufügen"
- [x] AK4: `07` zeigt den Dialog „Link & QR teilen"
- [x] AK5 (zurückgestellt, Q3 → Kleinfund): `10`–`12` nicht geprüft und nicht ersetzt, Entscheidung je Bild: „bleibt auf `main`"
- [x] AK6: `01`–`04`, `08`, `09` unverändert (byte-identisch zu `main`)
- [x] AK7: Alt-/Umgebungstext nur angeglichen, wenn er nicht mehr passt
- [x] AK8: Bilder zeigen nur Demo-Daten, keine Zugangsdaten/Klarnamen
- [x] AK9 (angepasst, Q3): Kleinfund-Eintrag durch einen engeren ersetzt (plus neuer PDF-Eintrag), Gates grün

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
- **Capture-Spec repariert (FS1):** Katalog-Zähler relativ zum Startwert (die frische DB bringt 16 Standard-Artikel mit –
  Migration `0004_seed_catalog_reference`, aus #49) und der `07`-Schritt. Weiter ist **nicht** repariert: der Verzehr-/Kassieren-Schritt (`hasText: "Bier"` trifft
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

### /refactor (2026-10-01)
- Aufruf kam mit `369`; gemeint war #388 (#369 ist gemerged, ihr Worktree entfernt).
- Diff gegen `main` durchgegangen (nur `e2e/anleitung-veranstalter.spec.ts` ist Code): `artikelAnzahl` (4 Zeilen, ein Zweck,
  WHY-Kommentar), der relative Zähler in `createKatalogArtikel` und der `07`-Block in `shotZugang` (WHY-Kommentar, 14 Zeilen)
  erfüllen die Checkliste – keine Duplikation, keine Magic Numbers, keine Flag-Parameter. Keine Codeänderung nötig.
- Beobachtung (Doku, kein Verhalten): `anleitung.md:236` nennt das Leeren der DEV-Daten „optional", die Capture-Spec
  braucht aber eine frische DB (FS2). Im bestehenden Kleinfund-Eintrag zur Capture-Spec ergänzt, nicht in diesem PR geändert
  (AK7: `anleitung.md` bleibt unverändert, wenn Alt-/Umgebungstext zu den Bildern passt).

### /security-review (2026-10-01)
- Ergebnis PASSED (`tasks/security-388.md`): kein Produktions-/App-Code im Diff, keine neuen Abhängigkeiten, keine Secrets
  oder Hex-Token im Text-Diff, PNGs ohne Metadaten (`strings`/`file`), Bilder nur mit fiktiven Demo-Daten und
  `admin@tch.example`. Hinweise: QR-Code in `07` kodiert einen lokalen Wegwerf-Token; mehrfacher lokaler DB-Reset war
  bestätigt. Keine Out-of-Scope-Funde, kein Issue.
- Aufruf kam wieder mit `369`; gemeint war #388.

### /codify (2026-10-01)
- Drei Learnings in `docs/factory/lessons/` + Index (siehe `tasks/codify-388.md`); keine Änderung an `CLAUDE.md`/Guidelines.
  Aufruf kam wieder mit `369`; gemeint war #388.
- Beim Schreiben der Lessons fiel eine eigene unbelegte Zuschreibung auf („Default-Artikel seit #59"): die Seed-Migration
  `0004_seed_catalog_reference` stammt aus #49 (vor #221). Im Code-Kommentar der Capture-Spec, in den Task-Notizen und in der
  Lesson auf die verifizierte Migration umgestellt; wie die Spec bei #221 mit `Artikel (1)` durchkam, bleibt ungeklärt.
- AK-Wortlaut der Task-Datei an Q3 angeglichen (Review-Nitpick Iteration 2) und abgehakt; alle Checkboxen stehen vor dem
  Merge auf dem Branch.

### /pr-shepherd (2026-10-01)
PR-Shepherd 2026-10-01: Merge freigegeben – alle Gates grün. Branch nicht hinter `main`, keine offenen Review-Kommentare,
PR-Body trägt `Closes #388`, CI vollständig bestanden (test, lint, factory-self-test, config-validation, issue-sync,
pr-closes-issue, CodeQL, Vercel). Folgearbeit steht in `docs/factory/kleinfunde.md` (Capture-Spec-Verzehr-Schritt,
`10`–`12`, `anleitung.pdf`).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/388-anleitungs-screenshots-05-07-neu-erzeugen`
Erstellt: 2026-10-01 02:27
