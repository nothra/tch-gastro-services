# Review: Task 375

Diff-Scope: `git diff origin/main...HEAD` (5 Dateien, reine Doku). Alle 35 `Datei:Zeile`-Anker des
Glossars (Abweichungsliste, „Beim Umsetzen mitziehen", „Bereits konform") per Skript gegen den
Worktree geprüft – jeder Anker zeigt auf den genannten Ist-Text. #372 und #401 existieren und sind
offen; `import-context-limit-check.sh` → 929 von 1100 Zeilen (grün). Die in „Ausnahmen" zitierten
Specs/ADRs (spec-194, spec-345, spec-369, spec-373, ADR-022) enthalten die genannten Alt-Texte.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [docs/ux/glossar.md:45] **Fehler-Muster ohne Geltungsbereich – Feld-Validierungsmeldungen
  ungeregelt.** Die Zeile „Fehler | „<Aktion> nicht möglich: <Grund>."" liest sich als Regel für
  *jede* Fehlermeldung. Der Großteil der Fehlertexte in `app/` sind aber Feld-/Zod-Meldungen, die
  diesem Muster nicht folgen und es auch nicht sollen: „Name fehlt." (`app/verwaltung/teilnehmer/schema.ts`)
  neben „Name fehlt" / „Preis fehlt" / „Kategorie fehlt" (ohne Punkt), „Bitte einen Katalog wählen.",
  „Katalog nicht gefunden.", „Abgelehnt.". Weder die Tabelle noch die Satzzeichen-Regel noch die
  Abweichungsliste sagt, ob diese Texte konform sind. Folge: #372 (AK5 „Meldungstexte nach dem
  Glossar") und #401 können sie entweder großflächig umschreiben oder übersehen – beides ohne
  Grundlage, und `/review` kann neue Feldtexte nicht prüfen. Zusätzlich offen gegen den
  Anrede-Abschnitt: Ist der Infinitiv „Bitte einen Katalog wählen." zulässig, oder soll es „Wähle
  einen Katalog." heißen (Positivbeispiel Z. 62)? **Fix:** Fehler-Zeile auf *abgelehnte Aktionen*
  eingrenzen und eine eigene Zeile „Feld-Validierung" ergänzen (z. B. „<Feld> fehlt." /
  „<Objekt> nicht gefunden." mit Punkt), dazu ein Satz, ob der Infinitiv-Imperativ („Bitte …
  wählen.") als Sachsatz gilt. Daraus folgende Abweichungen (fehlende Punkte) in die Liste → #401.

- [ ] [docs/ux/glossar.md:120] **Abweichungsliste unvollständig: `app/veranstaltung/[id]/LinkKopieren.tsx:45`.**
  „Kopieren nicht möglich – der Link ist markiert und kann manuell kopiert werden." folgt dem
  Fehler-Muster mit Gedankenstrich statt Doppelpunkt. Die Liste beansprucht, die Ist-Texte zu
  führen, „die vom Glossar abweichen" – diese Stelle fehlt (Grep `nicht möglich` über `app/` findet
  sie; alle übrigen Treffer in `actions.ts` sind konform). **Fix:** Zeile ergänzen, Soll
  „Kopieren nicht möglich: Der Link ist markiert und kann manuell kopiert werden.", Ziel #372
  (Meldungstext) oder #401.

## Nitpicks (optional)

- [ ] [docs/ux/glossar.md:136] Die Abweichungszeile für den **Kommentar** `TeilnehmerHinzufuegenDialog.tsx:185`
  („Walk-in") widerspricht dem Kopf (Z. 7: „Nicht betroffen: … Code-Kommentare") und ist
  selektiv – die gleichartigen Kommentare `TeilnehmerHinzufuegenDialog.tsx:16` und
  `app/veranstaltung/actions.ts:403` fehlen. Entweder die Zeile streichen und in „Ausnahmen"
  festhalten, dass „Walk-in" in der UI bereits nicht mehr vorkommt (AK1.7 ist damit belegt), oder
  alle drei Kommentarstellen als „optional" listen.
- [ ] [docs/ux/glossar.md:65] „Kein Zugriff – nur Veranstalter dürfen …" dient als Sachsatz-Beispiel
  und nutzt einen Gedankenstrich, das Fehler-Muster einen Doppelpunkt. Ein Halbsatz, dass der
  Zugriffs-Hinweis ein eigenes, zulässiges Muster ist, verhindert, dass jemand ihn bei #401
  „angleicht". (Lässt sich mit dem ersten Wichtig-Finding zusammen erledigen.)

## Positives

- Anker-Disziplin vorbildlich: Stand-Commit (`31e5fbf`) genannt, jeder der 35 Anker trifft exakt
  den zitierten Text; e2e-Helfer und Unit-Tests sind unter „Beim Umsetzen mitziehen" aufgeführt
  (Lesson #391 vorweggenommen).
- Alle AK1.1–AK1.8, AK2.1, AK2.2 und AK3.1 erfüllt; Fehlerszenario 1 sauber über den Abschnitt
  „Ausnahmen" mit belegten Spec-/ADR-Verweisen gelöst.
- Klare Abgrenzung anlegen ↔ hinzufügen am Gast-Fall und die Regel „Busy-Text folgt dem Button"
  machen die Busy-Abweichungen eindeutig ableitbar.
- Über den Spec-Wortlaut hinausgehende Festlegungen (Satzzeichen, Theke „anlegen") sind in der
  Task-Datei transparent dokumentiert.
- Out-of-Scope-Rest korrekt über den Issue-Seam als #401 angelegt statt im PR umgesetzt;
  PROJECT-CONTEXT-Verweis ist genau eine Zeile, Kontextgrenze bleibt grün.
- Keine Routen-, Code- oder ADR-Änderung → `docs/routes.md` nicht betroffen, kein ADR-Drift.

## Empfehlung

NEEDS_REWORK
