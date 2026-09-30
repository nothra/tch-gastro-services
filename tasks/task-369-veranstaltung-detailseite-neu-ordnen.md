# Task 369: veranstaltung-detailseite-neu-ordnen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Detailseite `/veranstaltung/[id]` neu ordnen: Kopf → drei Arbeitsschritt-Kacheln → Teilnehmerliste → eingeklappte Einstellungen; ein gemeinsamer „+ Teilnehmer"-Dialog; Zeilenmenü mit bestätigtem Entfernen; Abschließen wandert minimal ans Ende von Kassieren. Spec: `docs/specs/spec-369-veranstaltung-detailseite-neu-ordnen.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] Siehe `docs/specs/spec-369-veranstaltung-detailseite-neu-ordnen.md` (AK1–AK31, FS1–FS6); kurz:
- [ ] AK1: GIVEN eine offene Veranstaltung WHEN die Detailseite geöffnet wird THEN erscheinen
- [ ] AK2: GIVEN die Detailseite WHEN sie gerendert wird THEN zeigt der Kopf Titel, Datum und
- [ ] AK3: GIVEN eine offene Veranstaltung WHEN die Kacheln angezeigt werden THEN gibt es
- [ ] AK4: GIVEN eine offene Veranstaltung mit erfasstem Verzehr WHEN die Kacheln angezeigt
- [ ] AK5: GIVEN eine offene Veranstaltung ohne Teilnehmer, ohne Verzehr oder ohne Auslagen
- [ ] AK6: GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
- [ ] AK7: GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
- [ ] AK8: GIVEN eine offene Veranstaltung WHEN die Teilnehmerliste angezeigt wird THEN steht
- [ ] AK9: GIVEN die Liste einer abgeschlossenen Veranstaltung WHEN sie angezeigt wird THEN
- [ ] AK10: GIVEN eine offene Veranstaltung WHEN „+ Teilnehmer" getippt wird THEN öffnet sich
- [ ] AK11: GIVEN der Dialog WHEN ein Suchbegriff eingegeben wird THEN zeigt die Auswahl nur
- [ ] AK12: GIVEN der Dialog WHEN mehrere Stammteilnehmer angehakt und „Hinzufügen" getippt
- [ ] AK13: GIVEN der Dialog WHEN bei „Neuer Gast" ein Name eingegeben und bestätigt wird THEN
- [ ] AK14: GIVEN der Dialog WHEN „Hinzufügen" ohne Auswahl getippt wird THEN bleibt der
- [ ] AK15: GIVEN der Dialog WHEN Escape gedrückt oder „Abbrechen" getippt wird THEN schließt
- [ ] AK16: GIVEN alle aktiven Stammteilnehmer sind bereits erfasst WHEN der Dialog geöffnet
- [ ] AK17: GIVEN eine Teilnehmerzeile einer offenen Veranstaltung WHEN auf den Namen
- [ ] AK18: GIVEN eine Teilnehmerzeile einer offenen Veranstaltung WHEN das Zeilenmenü
- [ ] AK19: GIVEN das Zeilenmenü WHEN „Entfernen" gewählt wird THEN öffnet ein
- [ ] AK20: GIVEN die Bestätigung WHEN der Server das Entfernen ablehnt (z. B. weil die
- [ ] AK21: GIVEN die Detailseite WHEN sie geöffnet wird THEN ist „Einstellungen" standardmäßig
- [ ] AK22: GIVEN der Bereich „Einstellungen" WHEN „Link & QR teilen" getippt wird THEN öffnet
- [ ] AK23: GIVEN die bestehende Löschen-Funktion WHEN sie unter „Einstellungen" bedient wird
- [ ] AK24: GIVEN die Detailseite WHEN sie gerendert wird THEN enthält sie weder „Abschließen"
- [ ] AK25: GIVEN die Kassieren-Seite einer offenen Veranstaltung WHEN sie geöffnet wird THEN
- [ ] AK26: GIVEN die Kassieren-Seite einer abgeschlossenen Veranstaltung WHEN sie geöffnet
- [ ] AK27: GIVEN ein Viewport von 375 × 812 px und eine offene Veranstaltung mit mindestens
- [ ] AK28: GIVEN die Detailseite bei 375 px WHEN sie gerendert wird THEN gibt es keinen
- [ ] AK29: GIVEN der `ConfirmDialog` WHEN er geöffnet wird THEN ist er ein natives
- [ ] AK30: GIVEN die Dialoge „+ Teilnehmer" und „Link & QR teilen" WHEN sie geöffnet werden
- [ ] AK31: GIVEN die neu gebauten Oberflächen WHEN sie gestylt sind THEN verwenden sie nur die
- [ ] FS1: Zwei Geräte: Während ein Dialog offen ist, wird die Veranstaltung abgeschlossen →
- [ ] FS2: Ein Stammteilnehmer wird im Dialog gewählt, ist aber inzwischen deaktiviert oder
- [ ] FS3: Gast-Name leer, nur Leerzeichen oder zu lang → Feldfehler im Dialog, wie beim
- [ ] FS4: Kein Zugriff (nicht `veranstalter`) → unveränderte Meldung „Kein Zugriff"; die
- [ ] FS5: Stehende Theke: Einstellungen zeigen weder Bearbeiten noch Löschen (#352); die
- [ ] FS6: Sehr lange Teilnehmernamen und Veranstaltungsbezeichnungen brechen um und

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
Q1–Q5 siehe Spec (Dialog-Baustein/Zeilenmenü, atomare Mehrfach-Anlage, Kennzahl „x von n bezahlt", Abgrenzung #307, Nachschlage-Ansicht bei abgeschlossenen Veranstaltungen). Hinweis: Branch liegt vor dem Merge von #368 – vor /implement auf origin/main bringen (`gh pr update-branch`/pr-shepherd).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/369-veranstaltung-detailseite-neu-ordnen`
Erstellt: 2026-09-30 23:30
