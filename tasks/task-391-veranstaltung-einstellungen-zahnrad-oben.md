# Task 391: veranstaltung-einstellungen-zahnrad-oben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Einstellungen der Veranstaltung vom Seitenende in den Seitenkopf holen: Zahnrad-Symbol öffnet
einen Dialog „Einstellungen" (Katalog, Stammdaten). „Link & QR teilen" und „Veranstaltung löschen"
werden eigene Symbol-Schaltflächen im Seitenkopf (Teilen bzw. Papierkorb). Spec: `docs/specs/spec-391-veranstaltung-einstellungen-zahnrad-oben.md`
(ersetzt spec-369 AK1/AK21/AK22).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 Kein Einstellungen-Bereich mehr am Seitenende
- [x] AK2 Seitenkopf-Aktionszone: Badge, Teilen, Zahnrad, Papierkorb
- [x] AK3 Symbol-Schaltflächen mit zugänglichem Namen, ≥ 44 px, Papierkorb als Gefahr abgesetzt
- [x] AK4 Zahnrad öffnet Dialog „Einstellungen"
- [x] AK5 Datierte Veranstaltung: Katalog, Bearbeiten (ohne Teilen, ohne Löschen)
- [x] AK6 Stehende Theke: nur Katalog wechseln
- [x] AK7 Funktionen im Dialog verhalten sich unverändert
- [x] AK8 „Schließen"/Escape + Fokusrückgabe aufs Zahnrad (angepasst: Tippen außerhalb entfällt,
  spec-391 Q4)
- [x] AK9 Teilen-Schaltfläche öffnet „Link & QR teilen", QR serverseitig
- [x] AK10 Link & QR mit einem Tap erreichbar
- [x] AK11 Papierkorb öffnet Bestätigungsdialog, Fokusrückgabe
- [x] AK12 Abgelehnte Löschung: Meldung sichtbar, Veranstaltung bleibt
- [x] AK13 Stehende Theke: kein Papierkorb
- [x] AK14 Abgeschlossen: weder Teilen, Zahnrad noch Papierkorb
- [x] AK15 Nur Tokens/Bausteine (ADR-052), Symbole hell/dunkel erkennbar
- [x] AK16 375 px + langer Titel: Kopf-Aktionen bleiben sichtbar
- [x] AK17 Anleitung + Screenshots nachgezogen
- [x] FS1 Kein Zugriff unverändert
- [x] FS2 Parallel abgeschlossen → Schreibaktion abgelehnt mit Meldung
- [x] FS3 Fehler beim Speichern → Dialog bleibt offen, Werte bleiben

## Technische Notizen
ADR: `docs/adr/055-detailseite-kopfaktionen-symbol-schaltflaechen.md` (Proposed → beim
Implementieren Accepted setzen).

- Symbole als eigene Inline-SVGs `app/components/ui/icons.tsx` (`currentColor`, `aria-hidden`),
  ggf. Lucide-Pfade mit ISC-Hinweis – keine neue Abhängigkeit (D1).
- Neuer Baustein `app/components/ui/IconButton.tsx`: Pflicht-`label` → `aria-label`/`title`,
  44 × 44 px, `tone` neutral/danger; Basisklassen aus `Button.tsx` exportieren (D2).
- `ZugangDialog` → verallgemeinerter `KopfDialog` (label/icon/title/children), alte Datei + Test
  löschen; zweimal genutzt: Teilen (mit `ZugangTeilen` als Server-children) und Einstellungen
  (`KatalogWechsel` + bei datierter Veranstaltung `VeranstaltungMetaForm`). Dialog bleibt nach
  Speichern offen (D3).
- `VeranstaltungLoeschen` auf `ConfirmDialog` + `IconButton tone="danger"`; Ablehnung im
  Bestätigungsdialog, Action-Zustand je Öffnen erneuern (D4).
- Aktionszone: Badge · Teilen · Einstellungen · Papierkorb; Theke ohne Papierkorb,
  abgeschlossen nur Badge; `PageHeader` unverändert (D5).
- `KatalogWechsel`/`VeranstaltungMetaForm` auf Field/Button/Notice + Tokens; Dateien in
  `eslint/ui-token-files.mjs`, `ZugangDialog.tsx`-Eintrag raus (D6).
- E2E-Helfer `oeffneEinstellungen`/`schliesseEinstellungen`, betroffene Specs, Capture-Spec,
  Screenshots und Anleitung nachziehen; ADR-053 D6 hat bereits den Ablöse-Hinweis.

## Offene Fragen
Q1 vom Nutzer entschieden (Löschen als Papierkorb im Kopf); Q2/Q3 für `/architecture` (Icon-Quelle, Schließen nach Speichern) + Ort der Lösch-Ablehnungsmeldung.

## Review-Findings
<!-- Wird durch /review befüllt -->
- Iteration 1 (NEEDS_REWORK): Screenshots 05/07, AK8-Wortlaut (→ Q4), Hover-Fläche `neutral`,
  Herleitungs-Kommentar `kopfAktionen()`, ADR-053-Verweis, E2E-Helfer + Tests AK16/FS2,
  Anleitung – nachgearbeitet.
- Iteration 2 (NEEDS_REWORK): Nacharbeit nicht committet (K), Task-Datei ohne Häkchen (W),
  Nitpicks Kommentar-Umbruch `ZugangTeilen.tsx` und Dev-Symbol in `shot()` – alle im
  Rework-Commit nach Iteration 2 erledigt.
- Iteration 3 (APPROVED): keine Findings; Gates (Lint, 750 Unit-Tests, tsc, Prettier,
  Routen-Doku) grün.

## Nachweise (Rework nach Iteration 2, 2026-10-04)
- E2E gegen einen Dev-Server aus diesem Worktree (:3000 vorher als frei geprüft, Lesson testing
  #368; die Kopfaktions-Tests gibt es nur auf diesem Branch): `veranstaltung-detailseite`,
  `veranstaltung-bearbeiten-loeschen`, `verzehr-einzelansicht` mit `E2E_DETAILSEITE_369=1`,
  `E2E_VERANSTALTUNG_352=1`, `E2E_VERZEHR_370=1` → **12/12 grün** (inkl. spec-391 AK16, FS2,
  AK1–AK10/AK14).
- Capture-Spec (`CAPTURE_ANLEITUNG=1`) gegen eine **eigene Wegwerf-DB** im Dev-Container (die
  geteilte `tch_dev` nicht zurückgesetzt, Wegwerf-DB danach gelöscht) → grün. Übernommen nur
  Bild 05 (jetzt ohne Next.js-Dev-Symbol) und 07; die nebenbei neu erzeugten Bilder 01–04/08–12
  sind nicht Gegenstand dieser Task und bleiben auf dem `main`-Stand.

## Test-Notizen (/test, 2026-10-04)
- Unit-Lauf mit Coverage (`app/components/ui`, `app/veranstaltung`): 1342 Tests grün, Zeilen
  100 %, Branches 99,62 %. Die zwei offenen Branches (`Dialog.tsx:59`, `actions.ts:636`) liegen
  in Dateien, die dieser PR nicht ändert.
- Alle neuen/geänderten Dateien (IconButton, icons, KopfDialog, VeranstaltungLoeschen,
  VeranstaltungMetaForm, KatalogWechsel, page.tsx) ohne Lücke; AK1–AK16 und FS1–FS3 sind durch
  Unit- oder E2E-Test belegt. Keine neuen Tests nötig, kein Produktionscode geändert.

## Refactoring-Notizen (/refactor, 2026-10-04)
- Geprüft: `IconButton`, `icons`, `KopfDialog`, `VeranstaltungLoeschen`, `VeranstaltungMetaForm`,
  `KatalogWechsel`, `page.tsx` gegen die Clean-Code-Checkliste (Naming, Funktionslänge, Duplikate,
  Magic Strings, Early Returns, WHY-Kommentare). Kein Befund, der eine Änderung rechtfertigt:
  Basisklassen sind über `BUTTON_BASE_CLASSES` geteilt, `LoeschBestaetigung` ist bereits von der
  Auslöser-Hülle getrennt, keine Funktion mit mehr als 3 Parametern ohne Objekt-Prop.
- Kein Code geändert, daher keine neuen Testläufe nötig; der Stand der /test-Notizen gilt weiter.

## Codify-Notizen
- Zwei Lessons in `factory-workflow.md` (+ Index): Rezidiv „Rework nicht committet" (#251) und
  „UI-Einstieg verschoben → E2E/Capture/Screenshots/Anleitung mitziehen". Details: `tasks/codify-391.md`.

---
Branch: `feature/391-veranstaltung-einstellungen-zahnrad-oben`
Erstellt: 2026-10-02 23:07
