# Review: Task 404

Iteration 3 · 2026-10-09 · Diff `origin/main...HEAD` (33 Dateien), Schwerpunkt Rework `e88f87a..HEAD`
(`39f8edb`) · drei Runden (Logik, Code-Qualität, Architektur), im Orchestrator direkt
durchgeführt. Betroffene Unit-Tests lokal grün (`app/veranstaltung`, `app/verwaltung/teilnehmer`,
`app/components` – 64 Dateien, 1064/1064).

Iteration-2-Funde: beide Wichtig-Funde behoben, alle Nitpicks erledigt (Bild 06 bleibt bewusst als
menschlicher Schritt vor dem Merge offen).

- Glossar-Anker `TeilnehmerHinzufuegenDialog.tsx:36` stimmt (`SCHRITT_TITEL.auswahl`). Alle übrigen
  Anker auf in diesem PR geänderte Dateien nachgeprüft: `actions.ts:100` (`GLEICHZEITIG_ERFASST`),
  `:103–106` (`nichtsAngelegt`), `:342`, `:346`; `schema.ts:20–21`; `TeilnehmerAnlegen.tsx:42` –
  alle treffen.
- Kleinfund „`createWalkInAction` nicht atomar“: Fix empfiehlt jetzt `runAtomic`, nie
  `db.transaction()` (Lesson #345). Die referenzierten Dateien existieren (`db/atomic.ts`,
  `db/catalog.duplicateCatalog-driver.test.ts`). Die FK-Behauptung stimmt gegen `db/schema.ts:254-256`
  (`veranstaltung_id … references … onDelete: "cascade"`): Fehlt die Veranstaltung, scheitert der
  Batch.
- Neue Tests `should_focusAbsprung_when_zurueckTappedWithoutVerfuegbare` (Leer-Zweig) und
  `should_notFocusAbsprung_when_dialogReopenedAfterZurueck` (Reset in `oeffnenBeiAuswahl`) decken
  die beiden offenen Zweige ab.
- ADR-053: Zeile umbrochen; Fokus-Regel beim Schrittwechsel ergänzt, deckungsgleich mit dem
  WHY-Kommentar `TeilnehmerHinzufuegenDialog.tsx:27-29`.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)
- [ ] [docs/anleitung/veranstalter/bilder/06-teilnehmer-hinzufuegen.png] Weiterhin offen als menschlicher Schritt vor dem Merge (Task-Datei, „Offen – menschlicher Schritt“). Das Bild zeigt noch „Neuer Gast“. Kein Agenten-Fund, nur als Erinnerung für `/pr-shepherd`.
- [ ] [app/veranstaltung/actions.ts:325] Ein Code-Kommentar spricht noch von „Stammteilnehmer“ (`waehlbareTeilnehmer`). AK5 betrifft nur UI-Texte, der Kommentar ist also kein AK-Verstoß. Beim nächsten Anfassen der Funktion die Begriffe aber angleichen (der Nachbarkommentar `:351` wurde in diesem PR bereits umgestellt).

## Out-of-Scope (klassifiziert nach ADR-043)
_Keine neuen._ Es bestehen weiterhin Issue #416 und der Kleinfund „`createWalkInAction` nicht atomar“
(Fix-Text jetzt korrekt).

## Positives
- Der Rework ist eng am Fund geblieben: fünf Dateien, keine Nebenänderungen. Die Anker-Prüfung lief
  diesmal über alle in diesem PR geänderten Dateien, nicht nur über die gemeldete Zeile
  (Lesson #375 wirksam).
- Der korrigierte Kleinfund begründet die vorab erzeugte ID technisch (`.batch()` erlaubt keine
  Abhängigkeit zwischen Abfragen) und benennt den Treiber-Mock-Test als Vorbild. Damit lässt er sich
  ohne erneutes Nachlesen der Lesson umsetzen.
- Die neuen Fokus-Tests haben je einen WHY-Kommentar und prüfen genau den Zweig, der vorher fehlte.
  Die Task-Datei belegt beide per Mutation.
- Über den gesamten PR: AK1–AK8 und FS der Spec erfüllt. Kein „Gast“/„Stammteilnehmer“ mehr in
  UI-Texten (Grep über `app/`, nur noch Kommentare und Negativ-Assertions in Tests).
  `TeilnehmerFields` und `DuplikatWarnung` werden von Verwaltung und Veranstaltung gemeinsam
  genutzt. `createWalkInAction` prüft fail-closed in der dokumentierten Reihenfolge. Keine
  Routen geändert → `docs/routes.md` nicht betroffen.

## Empfehlung
APPROVED
