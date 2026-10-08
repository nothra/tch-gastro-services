# Task 375: wording-glossar-ui-texte

## Status
- [x] In Bearbeitung
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
- [x] **AK1.1** Glossar-Tabelle Verb je Aktionstyp (anlegen/hinzufügen/erfassen/entfernen/löschen/(de)aktivieren, nie „reaktivieren")
- [x] **AK1.2** Meldungsmuster: „Gespeichert", „<Objekt> gelöscht", „<Aktion> nicht möglich: <Grund>", Busy „<Verb> …"
- [x] **AK1.3** Anrede: überall Du, kein „Sie", Sachsätze erlaubt
- [x] **AK1.4** Einheiten: „0,00 €", Labels „(€)" statt „(EUR)"
- [x] **AK1.5** „Bitte wählen …", Pfeilregel (← vor Ziel, → nach Ziel), „…" als ein Zeichen
- [x] **AK1.6** „Neuer Gast" statt „Walk-in"; Texte „Neuen Gast anlegen", „Teilnehmer hinzufügen"
- [x] **AK1.7** Abweichungsliste Ist → Soll mit Datei-Anker und Ziel-Issue
- [x] **AK1.8** `ux-issue-entwuerfe.md` verweist bei UX-8 auf das Glossar
- [x] **AK2.1** Eine Verweiszeile in `PROJECT-CONTEXT.md` → Coding-Konventionen
- [x] **AK2.2** `import-context-limit-check.sh` bleibt grün
- [x] **AK3.1** Login-Labels sichtbar – bereits durch #368 erfüllt (`app/login/page.test.tsx:35`), nur vermerken/Nachweis prüfen

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- ADR-Trigger-Check (/implement, 2026-10-08): keine Kategorie – reine Doku.
- Abweichungsliste gegen `app/` per Grep belegt (Stand `31e5fbf`). Von #369–#374 ist nur #372 offen:
  Meldungstexte + „Reaktivieren" → #372; alle übrigen Abweichungen (Busy-Texte, „(EUR)",
  „Bitte wählen…", „Gast hinzufügen", Theke „einrichten", „bereits erfasst") → Folge-Issue **#401**
  (über den Issue-Seam angelegt, Label `enhancement`).
- Festlegungen über den Spec-Wortlaut hinaus, im Glossar stehend: Erfolgsmeldung ohne Schlusspunkt,
  Fehlermeldung mit; Busy-Text nimmt das Verb des Buttons auf; die Theke wird „angelegt" (auch wenn
  `ensureThekeAction` idempotent ist); Abschnitt „Ausnahmen" für Code-Bezeichner und
  abgeschlossene Specs/ADRs (Fehlerszenario 1 der Spec).
- AK2.2: `import-context-limit-check.sh` → 929 von 1100 Zeilen (vorher 928).
- AK3.1: erfüllt durch #368 – `app/login/page.test.tsx:32–36` (`getByLabelText("E-Mail"/"Passwort")`),
  `pnpm vitest run app/login/page.test.tsx` grün (6/6). Kein neuer Code.
- Oberflächentest entfällt: keine UI-Änderung.

## Offene Fragen
- [ ] Abweichungsliste nach Abarbeitung von #369–#374 entfernen oder als Historie behalten? (nicht blockierend; das Glossar legt fest, erledigte Zeilen beim Umsetzen zu streichen – ob die leere Liste danach ganz entfällt, bleibt offen)

Geklärt (2026-10-08): Anrede = überall Du; Ersatz für „Walk-in" = „Neuer Gast".

## Review-Findings
<!-- Wird durch /review befüllt -->
Iteration 1 (2026-10-08): **NEEDS_REWORK** – 0 kritisch, 2 wichtig, 2 Nitpicks; Details in
`tasks/review-375.md`. Wichtig: (W1) Fehler-Muster ohne Geltungsbereich, Feld-Validierungsmeldungen
(„Name fehlt.", „Bitte einen Katalog wählen.") ungeregelt; (W2) `LinkKopieren.tsx:45`
(„Kopieren nicht möglich – …") fehlt in der Abweichungsliste. Alle 35 Anker gegen den Baum belegt.

Rework 1 (2026-10-08): W1 – Meldungstabelle unterscheidet jetzt abgelehnte Aktion, Feld-Validierung,
„nicht gefunden" und „Kein Zugriff" (alle mit Punkt; Doppelpunkt nur bei „nicht möglich"); der
Infinitiv „Bitte … wählen." gilt als erlaubter Sachsatz. Gegen `app/**/schema.ts` + `actions.ts`
gegrept: die Feldmeldungen enden alle bereits mit Punkt („… ist erforderlich.", „… nicht gefunden.") –
die im Review genannten „Name fehlt"-Texte gibt es im Produktionscode nicht, also keine neuen
Abweichungszeilen. W2 – `LinkKopieren.tsx:45` → #372 ergänzt. Nitpick 1 – Kommentarzeile gestrichen,
„Walk-in"-Kommentare unter „Ausnahmen" (UI-frei, per Grep belegt). Nitpick 2 – mit W1 erledigt.

Iteration 2 (2026-10-08): **NEEDS_REWORK** – 0 kritisch, 1 wichtig, 1 Nitpick; alle Iteration-1-Findings
erledigt. Wichtig: (W1) die neue Regel „Doppelpunkt nur bei ‚nicht möglich'" trifft
`app/veranstaltung/actions.ts:101/:353/:357` („Bereits erfasst: …", „Nicht mehr wählbar: …"); `:101`/`:357`
zusätzlich Verb „erfasst" statt „hinzugefügt" – fehlen in der Abweichungsliste. Details in `tasks/review-375.md`.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/375-wording-glossar-ui-texte`
Erstellt: 2026-10-08 21:44
