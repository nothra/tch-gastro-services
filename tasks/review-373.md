# Review: Task 373

> Iteration 2 (2026-10-07). Geprüft: der Rework-Commit `f433022` gegen die Findings aus Iteration 1,
> dazu ein erneuter Blick auf Logik, Code-Qualität und Architektur der geänderten Stellen.
> Die Gates hat der Orchestrator selbst laufen lassen: `pre-commit.sh` (Lint) grün,
> `tsc --noEmit` grün, Vitest für `app/components`, `app/verwaltung` und `app/veranstaltung`
> grün (69 Dateien, 1030 Tests), Prettier grün, `routes-doc-check.sh` grün.
> Nach dem Hook-Umzug zeigt kein Verweis mehr auf `app/veranstaltung/useSchliessendeAction`,
> und es sind keine `*.tmp.*`-Artefakte getrackt.

## Status der Findings aus Iteration 1

- [x] **W1** Fokus nach Erfolg aus dem Leerzustand: behoben. `useFormularDialog(ersatzFokusId)`
  lenkt den Fokus beim Aushängen des Auslösers auf ein Ersatzziel um, aber nur nach einem Erfolg
  und nur, wenn der Fokus auf `<body>` gefallen ist. Ersatzziel ist im Leerzustand der Auslöser im
  Seitenkopf, bei einem Kategoriewechsel die umgezogene Katalogzeile. Beide Fälle sind getestet
  (`FormularDialog.test.tsx` Leerzustand, `CatalogRow.test.tsx` Kategoriewechsel), dazu der
  Gegenfall „Abbrechen → eigener Auslöser". Geprüft ist auch, dass es je Seite genau einen
  Seitenkopf-Auslöser gibt (Veranstaltungen, Teilnehmer, Katalog), die feste Id `anlegen-seitenkopf`
  also nicht doppelt vorkommt.
- [x] **W2** Doppelter Hook: behoben. `useSchliessendeAction` liegt route-neutral in
  `app/components/`, `useDialogFormular` baut darauf auf, der falsche Kommentar ist korrigiert.
  ADR-053 D1 ist nachgezogen und nennt den Unterschied (`<form action>` vs. `startTransition`, #398).
- [x] **W3** Anleitung: behoben. Bildunterschrift und „Stand" sind angepasst, die Vor-Merge-Checkbox
  nennt jetzt auch Bild 02.
- Nitpicks aus Iteration 1: Sieben sind erledigt, die übrigen sind in der Task-Datei begründet
  offen gelassen (Abschnitt „Review-Findings", Rework 1). Das ist vertretbar.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [ ] [`app/components/FormularDialog.tsx:17`] `FormAction<State>` ist wörtlich derselbe Typ wie in
  `app/components/useSchliessendeAction.ts:16`. Seit beide Dateien im selben Verzeichnis liegen,
  könnte der Hook ihn exportieren und `FormularDialog` ihn importieren.
- [ ] [`app/components/FormularDialog.tsx:19-20, 131-133`] Der Leerzustand-Auslöser verlässt sich
  stillschweigend darauf, dass ein Seitenkopf-Auslöser mit `id="anlegen-seitenkopf"` existiert.
  Fehlt er, fällt der Fokus wieder auf `<body>`, ohne Fehler (fail-soft). Gäbe es zwei, wäre die
  Id doppelt. Die Regel steht im JSDoc, durchgesetzt wird sie nicht. Für den heutigen Stand reicht
  das; es wird erst relevant, wenn ein vierter Konsument dazukommt.
- [ ] [`app/verwaltung/katalog/CatalogRow.tsx:28-31`] Nicht verifiziert, gleiche Familie wie W1:
  Die Artikel sind innerhalb einer Gruppe nach `sortOrder`, `name`, `size` sortiert
  (`db/catalog.ts:27`). Ändert „Speichern" nur den Namen, kann die Zeile in derselben Liste
  umsortiert werden. Die Komponente bleibt dabei gemountet, der Cleanup greift also nicht. Falls
  React dabei gerade den fokussierten Knoten im DOM verschiebt, könnte der Fokus im Browser
  verloren gehen. Bei Gelegenheit per E2E prüfen; kein Blocker.

## Positives

- **Ersatzfokus mit engen Bedingungen:** Umgelenkt wird nur nach einem Erfolg und nur bei
  verlorenem Fokus. Ein Nutzer, der inzwischen woanders steht, wird nicht weggezogen. Die
  Erfolgsmarke wird beim Öffnen zurückgesetzt und erst im Cleanup gelesen; der Kommentar erklärt
  das WHY.
- **`imLeerzustand` statt `variant`:** Die Prop sagt, wozu die Instanz da ist, statt nur ihre Optik
  zu beschreiben. Optik und Fokusziel hängen so zwangsläufig zusammen.
- **Tests bilden den echten Zweigwechsel nach:** Die Action füllt im Test selbst die Liste bzw.
  sortiert um, wie es die Revalidierung tut. Positions-Assertion (`toContainElement` in der
  „Essen"-Liste) plus Fokus-Assertion; der Gegenfall „Abbrechen" ist getestet.
- **Hook-Umzug sauber:** Alle drei Detailseiten-Konsumenten sind umgestellt, die alte Datei ist
  weg (Lesson #187), die ADR ist im selben Commit nachgezogen (Lesson #55/#211).
- **Spec-Drift korrigiert:** Das Fehlerszenario „zweiter Tab" deckt sich jetzt mit dem
  guarded-UPDATE-Verhalten.

## Out-of-Scope-Funde

Keine neuen. Aus Iteration 1 bleiben bestehen: Issue #398 und ein `kleinfunde.md`-Eintrag zu
`Dialog.handleClose`.

## Empfehlung

APPROVED
