# Task 375: wording-glossar-ui-texte

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Verbindliches Wording-Glossar `docs/ux/glossar.md` für alle UI-Texte (Verb je Aktionstyp,
Meldungsmuster, Anrede „überall Du", Einheiten „€", Ersatz „Walk-in" → „Neuer Gast"), Verweis aus
`PROJECT-CONTEXT.md`. Reine Doku – bestehende UI-Texte werden in #369–#374 angeglichen.
Spec: `docs/specs/spec-375-wording-glossar-ui-texte.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] **AK1.1** Glossar-Tabelle Verb je Aktionstyp (anlegen/hinzufügen/erfassen/entfernen/löschen/(de)aktivieren, nie „reaktivieren")
- [ ] **AK1.2** Meldungsmuster: „Gespeichert", „<Objekt> gelöscht", „<Aktion> nicht möglich: <Grund>", Busy „<Verb> …"
- [ ] **AK1.3** Anrede: überall Du, kein „Sie", Sachsätze erlaubt
- [ ] **AK1.4** Einheiten: „0,00 €", Labels „(€)" statt „(EUR)"
- [ ] **AK1.5** „Bitte wählen …", Pfeilregel (← vor Ziel, → nach Ziel), „…" als ein Zeichen
- [ ] **AK1.6** „Neuer Gast" statt „Walk-in"; Texte „Neuen Gast anlegen", „Teilnehmer hinzufügen"
- [ ] **AK1.7** Abweichungsliste Ist → Soll mit Datei-Anker und Ziel-Issue
- [ ] **AK1.8** `ux-issue-entwuerfe.md` verweist bei UX-8 auf das Glossar
- [ ] **AK2.1** Eine Verweiszeile in `PROJECT-CONTEXT.md` → Coding-Konventionen
- [ ] **AK2.2** `import-context-limit-check.sh` bleibt grün
- [ ] **AK3.1** Login-Labels sichtbar – bereits durch #368 erfüllt (`app/login/page.test.tsx:35`), nur vermerken/Nachweis prüfen

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] Abweichungsliste nach Abarbeitung von #369–#374 entfernen oder als Historie behalten? (nicht blockierend)

Geklärt (2026-10-08): Anrede = überall Du; Ersatz für „Walk-in" = „Neuer Gast".

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/375-wording-glossar-ui-texte`
Erstellt: 2026-10-08 21:44
