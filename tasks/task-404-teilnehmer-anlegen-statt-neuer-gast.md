# Task 404: teilnehmer-anlegen-statt-neuer-gast

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Dialog „Teilnehmer hinzufügen" verschlanken; „Neuer Gast" wird zum eigenen Schritt „Teilnehmer anlegen" (gleiches Formular wie die Verwaltung). Spec: `docs/specs/spec-404-teilnehmer-anlegen-statt-neuer-gast.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 Kein „Gast"/„Neuer Gast" mehr in der UI
- [x] AK2 Dialog nur Suche, Mehrfachauswahl, „Hinzufügen"/„Abbrechen"
- [x] AK3.1 Absprung „Teilnehmer anlegen" → eigener Schritt mit Zurück
- [x] AK3.2 Zurück behält Auswahl/Suche
- [x] AK3.3 Ohne Treffer: „„<Suchtext>" als Teilnehmer anlegen" übernimmt Namen
- [x] AK4.1 Gleiche Felder/Komponente wie Verwaltung + Hinweis „direkt hinzugefügt"
- [x] AK4.2 Anlegen + Hinzufügen, Meldung „Teilnehmer angelegt und hinzugefügt"
- [x] AK4.3 Duplikat-Warnung „Trotzdem anlegen" (ADR-022)
- [x] AK4.4 Ablehnung: Dialog bleibt offen, Fehler am Namensfeld, nichts angelegt
- [x] AK5 Label „Name" überall; „Stammteilnehmer" entfällt
- [x] AK6 `TeilnehmerFields` von beiden Stellen genutzt; Kleinfund aufgelöst
- [x] AK7 Auslöser „Teilnehmer hinzufügen"
- [x] AK8 `docs/ux/glossar.md` angepasst

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- ADR-Trigger-Check (2026-10-09): keine Kategorie – reiner UI-Umbau; die Server Action übernimmt
  nur die bestehende Duplikat-Warnung (ADR-022). ADR-053 D1/D3 im selben PR nachgezogen.
- Duplikat-Warnung als gemeinsamer Baustein `app/verwaltung/teilnehmer/DuplikatWarnung.tsx`
  (Hidden-Feld + Warnung + Button-Label); Wortlaut `TEILNEHMER_DUPLIKAT_WARNUNG` in `schema.ts`,
  nicht in einer `"use server"`-Datei, weil beide Actions ihn melden.
- `createWalkInAction` prüft die Veranstaltung **vor** der Duplikat-Warnung, damit „Trotzdem
  anlegen" nicht in die nächste Ablehnung läuft.
- Der Dialog schickt jetzt über `useFormularDialog`/`useDialogFormular` (`onSubmit` +
  `startTransition`) ab – `<form action>` setzte die Eingaben nach der Duplikat-Warnung zurück
  (Lesson #373 AK1.4).
- Zod-Meldungen „Anzeigename ist erforderlich./zu lang." bleiben (Spec: Schema unverändert); als
  Ist→Soll-Zeilen an #401 übergeben (`docs/ux/glossar.md`).
- Oberflächentests (2026-10-09) gegen den lokalen Dev-Server: `e2e/teilnehmer-anlegen.spec.ts`
  (`E2E_404=1`) sowie die angepassten Specs `veranstaltung-detailseite` (`E2E_DETAILSEITE_369`),
  `bestaetigen-rueckmelden` (`E2E_372`) und `listenseiten` (`E2E_LISTENSEITEN_373`) – 14/14 grün.
  Zwei Locator-Fehler der neuen Spec behoben (Dev-DB-Namen mit „Gast"; Toast im Dialog-Portal, #372).
- **Offen – menschlicher Schritt vor dem Merge:** `docs/anleitung/veranstalter/bilder/06-teilnehmer-hinzufuegen.png`
  zeigt noch den alten Dialog mit „Neuer Gast"; per Capture-Spec (`CAPTURE_ANLEITUNG=1`) neu
  erzeugen. Der Alt-Text ist bereits angepasst; die Capture-Spec läuft laut `kleinfunde.md` nicht
  bis zum Ende durch.

## Offene Fragen
Keine. Entschieden: Q1 Auswahl bleibt beim Zurück · Q2 Dialog schließt nach Anlegen · Q3 Duplikat-Warnung auch in der Veranstaltung · Q4 „Alle aktiven Teilnehmer sind bereits hinzugefügt."

## Review-Findings
<!-- Wird durch /review befüllt -->
- Iteration 1 (2026-10-09): **NEEDS_REWORK** – 0 kritisch, 4 wichtig, 10 Nitpicks; Details in
  `tasks/review-404.md`. Wichtig: Fokus beim Schrittwechsel, E2E-Helfer vs. Duplikat-Warnung,
  offen gehaltene Promises im Unit-Test (Lesson #370), verrutschte Glossar-Zeilenverweise.
  Out-of-Scope: Issue #416 (Duplikat-Bestätigung an den gewarnten Namen binden), Kleinfund
  „`createWalkInAction` nicht atomar".
- Rework nach Iteration 1 (2026-10-09), alle 4 Wichtig-Funde behoben:
  - Fokus beim Schrittwechsel: Anlegen fokussiert das Namensfeld (`TeilnehmerFields`
    `nameFokussieren`), „← Zur Auswahl" den Absprung (`Schritt.zurueckVomAnlegen`, React-`autoFocus`
    greift nur beim Mount im schon offenen Dialog). Unit-Tests in beide Richtungen + Gegenprobe
    „beim Öffnen nicht", E2E prüft beide Ziele im echten Browser.
  - E2E-Helfer heißt `teilnehmerAnlegenUndHinzufuegen`, Kommentar korrigiert; `wechsel-…` und
    `veranstaltung-bearbeiten-loeschen` mit `Date.now()`-Default, F1 mit eigenem Namen; Capture-Spec
    legt „Clara Neumann" an (frische DB vorausgesetzt, kein „Gast" mehr im Bild 05).
  - Offen gehaltene Promises im Dialog-Test: Resolve-Liste + `afterEach` in `act` (Lesson #370);
    Ablehnungstest prüft zusätzlich die angezeigte Meldung.
  - Glossar-Zeilenverweise auf `actions.ts` nachgezogen, alle Tabellenzeilen per Grep geprüft.
  - Nitpicks erledigt: `AbbrechenKnopf` als Baustein (kein Handnachbau im Leer-Zweig), Kommentar
    zu Ablehnungen enger, `useAuswahl` senkt die Props des Auswahl-Schritts, ADR-053-Drift,
    Kopfkommentar `FormularDialog`, `exact: true` in `teilnehmer-anlegen.spec.ts` (Abwesenheit
    jetzt ohne Namensfilter), Fixture-Name + „nichts angelegt"-Assertion in `actions.test.ts`.
  - Bewusst nicht umgesetzt: Duplikat-Prüf-Helfer in `schema.ts` – `schema.ts` wird von
    `TeilnehmerFields` im Client importiert, ein DB-Zugriff dort zöge `db/` ins Client-Bundle;
    `TEILNEHMER_NAME_MAX` in ein abhängigkeitsfreies Modul – vorbestehend, optional.
  - Gates: Lint, `tsc --noEmit`, `pnpm test` (1635 grün); E2E 15/15 grün (`E2E_404`,
    `E2E_WECHSEL_308`, `E2E_VERANSTALTUNG_352`, `E2E_372`, `E2E_DETAILSEITE_369`).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/404-teilnehmer-anlegen-statt-neuer-gast`
Erstellt: 2026-10-09 16:18
