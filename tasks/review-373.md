# Review: Task 373

> Iteration 1. Drei Runden (Logik, Code-Qualität, Architektur) als Sub-Agenten; deren
> Prüflücken (kein Bash) hat der Orchestrator nachgeholt: `routes-doc-check.sh` grün,
> keine getrackten `*.tmp.*`-Artefakte, Doku-Sweep nach gelöschten Modulen
> (`VeranstaltungForm`, `CatalogItemForm`, `TeilnehmerForm`, `app/veranstaltung/ThekeSetup`,
> Radiogruppe) ohne Präsens-Drift in ADRs/Lessons, `setCatalogItemActiveAction` hat außer
> `CatalogRow` keinen Aufrufer.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] **W1** [`app/veranstaltung/VeranstaltungListe.tsx:33-35, 56-57`, `app/verwaltung/teilnehmer/page.tsx:31-35`, `app/verwaltung/katalog/[id]/page.tsx:44-48`] Fokus geht nach erfolgreichem Anlegen aus dem Leerzustand verloren: Der Leerzustand-Button ist eine eigene `AnlegeDialog`-Instanz. Nach dem Erfolg tauscht die Revalidierung den Zweig (Leerzustand → Liste), der Auslöser wird ausgehängt, `returnFocusRef` zeigt auf einen entfernten Knoten, der Fokus fällt auf `<body>`. Das gilt auch für „Offen (0)" mit abgeschlossenen Veranstaltungen (AK2.4). Rezidiv der Lesson #371 („Erfolgsfall gesondert festlegen und testen"); kein Test deckt ihn ab. Fix: Fokusziel im Erfolgsfall festlegen, z. B. „+ Neu" im Seitenkopf oder die neue Zeile, plus ein Test mit Zweigwechsel nach Erfolg. Gleiche Familie, geringere Wirkung: `CatalogRow` nach „Speichern" mit geänderter Kategorie (die Zeile wandert in eine andere `<section>` und wird neu gemountet).
- [ ] **W2** [`app/components/FormularDialog.tsx:11-16, 45-60`] `useDialogFormular` kopiert den Kern von `app/veranstaltung/useSchliessendeAction.ts:14-32` (`FormAction`-Typ, try/await, `ok` → schließen, `finally` → Lauf-Ende), und der begründende Kommentar ist falsch: `useSchliessendeAction` verdrahtet kein `<form action>`, es liefert nur `formAction`. Die Verdrahtung macht der Konsument; `startTransition(() => formAction(fd))` geht damit genauso. Das ist eine ungeprüfte „X erzwingt Y"-Behauptung (Lesson `code-style.md`, #319). Zwei Hooks mit derselben Erfolgsregel können auseinanderlaufen (ADR-053 D1 nennt `useSchliessendeAction` „gemeinsame Hülle"). Fix: einen gemeinsamen Hook route-neutral nach `app/components/` legen, `useDialogFormular` darauf aufbauen (nur `absenden` ist neu), Kommentar korrigieren, ADR-053 D1 nachziehen. Zulässig ist auch die kleinere Variante: Kommentar richtigstellen und im Kopf festhalten, welcher Hook kanonisch ist. Die Umstellung der bestehenden Konsumenten ist Out-of-Scope (#398).
- [ ] **W3** [`tasks/task-373-listenseiten-liste-zuerst-anlegen-per-button.md:30-33`, `docs/anleitung/veranstalter/anleitung.md:9, 72`] Die menschliche Vor-Merge-Checkbox nennt nur die Bilder 03/04 und das PDF. Es fehlen:
  - `02-startseite.png`: Die Startseite baut ihre Kacheln aus `visibleNavItems` (`app/page.tsx:19`). Der Seed-Admin ist `verwalter` und sieht deshalb jetzt eine vierte Kachel „Theke".
  - Bildunterschrift Z. 72: zählt nur „Veranstaltungen", „Katalog" und „Teilnehmer" auf.
  - „Stand"-Datum Z. 9.

  Spec-NFR: Anleitungen nachziehen; Lesson #391: verschobener UI-Einstieg. Fix: Unterschrift und Stand jetzt im Text anpassen, die Checkbox um Bild 02 ergänzen. Den PR-Body nicht in der Vergangenheitsform formulieren, solange die Bilder fehlen (Lesson #368).

## Nitpicks (optional)

- [ ] [`app/components/FormularDialog.test.tsx:129-136`] Der Escape-Test prüft nur das Schließen, nicht die Fokus-Rückgabe. Nur „Abbrechen" prüft den Fokus (Z. 126), AK1.5 nennt aber beide Wege. E2E deckt Escape samt Fokus ab (`e2e/listenseiten.spec.ts`).
- [ ] [`app/components/FormularDialog.tsx:50-58`] Kein Test hält fest, dass `gesperrt` nach einer werfenden Action wieder `false` ist. Das Verhalten selbst ist korrekt (`finally`).
- [ ] [`app/components/FormularDialog.tsx:14`] Der route-neutrale Baustein nennt im Kommentar den Feature-Pfad `app/veranstaltung/useSchliessendeAction.ts` (Lesson #52). Erledigt sich mit W2.
- [ ] [`app/components/FormularDialog.tsx:26`] Der Generic `<T extends HTMLElement>` an `useFormularDialog` wird nie genutzt, beide Konsumenten nehmen den Default (YAGNI).
- [ ] [`app/verwaltung/teilnehmer/TeilnehmerAnlegen.tsx:37, 47`] Nach der Duplikat-Warnung bleiben die Eingaben jetzt erhalten. Ändert man danach den Namen, bleibt `confirmDuplicate="true"` gesetzt, und ein anderer doppelter Name wird ohne Warnung angelegt. Überstimmbar laut ADR-022, aber jetzt naheliegender. Vorschlag: `needsConfirm` bei Namensänderung zurücksetzen.
- [ ] [`app/verwaltung/katalog/CatalogRow.tsx:49-52, 61-100`] Zwei Formulare mit je eigenem Fehler-State können zwei Meldungen übereinander zeigen. „Deaktivieren" verwirft ungespeicherte Feldänderungen ohne Hinweis (bewusst laut Z. 79).
- [ ] [`app/verwaltung/katalog/CatalogRow.tsx:35-37`] Klassen werden per Template-Literal gebaut, obwohl `joinClasses` aus `app/components/ui/` existiert.
- [ ] [`app/verwaltung/katalog/[id]/CatalogSwitcher.tsx:19-23`] Das kontrollierte `<select>` springt nach `onChange` bis zum Ende von `router.push` optisch auf den alten Katalog zurück. Auf langsamem Netz wirkt das wie „nichts passiert".
- [ ] [`app/verwaltung/katalog/actions.ts:130, 160`] „Kein Artikel angegeben." steht zweimal als Literal, während die Nachbarmeldungen Konstanten sind (`ITEM_NOT_FOUND` …).
- [ ] [`docs/specs/spec-373-listenseiten-liste-zuerst.md:155-156`] Das Fehlerszenario „zweiter Tab bereits **deaktiviert** → Fehlermeldung" passt nicht zum Code: Ein erneutes Deaktivieren ist ein stiller Erfolg, nur der No-Match (gelöscht oder fremder Katalog) meldet einen Fehler. Spec-Wortlaut auf „gelöscht" glätten, denn derselbe Satz sagt „bestehendes guarded-UPDATE-Verhalten bleibt".
- [ ] [`app/veranstaltung/page.test.tsx:252-265`] Der AK7.2-Test prüft Zeile 1 nur negativ. Kasse und Standardkatalog heißen beide „Montagsrunde", deshalb belegt der Test nicht, dass Zeile 1 ihren Katalognamen zeigt. Mit `kasse: "vereinskasse"` wird der Check positiv. In der UI ist „· Montagsrunde · Montagsrunde" ohne Beschriftung ebenfalls mehrdeutig, ein Hinweis für #375.
- [ ] [`e2e/listenseiten.spec.ts:131-132`] Der Kommentar sagt, die Grenze werde „auf die tatsächliche Anzahl umgerechnet". `Math.max(anzahl, 24)` hebt sie aber nur an.
- [ ] [`e2e/listenseiten.spec.ts:75-77, 156-160`] Die Prüfungen zu AK2.2 und AK5.2 laufen nur bedingt (`if count > 0` / `if andere`) und können still nichts prüfen. Mindestens eine Annotation setzen, wenn sie übersprungen werden.
- [ ] [`e2e/helpers/listenseiten.ts:65`] `getByRole("link", { name })` ist ein Teilstring-Treffer (Lesson #388). Hier robust durch Zähl-Delta und `LAUF`-Suffix, ein `^`-verankerter Regex wäre präziser.

## Positives

- **`FormularDialog`**:
  - `onSubmit` + `startTransition` erhält die Eingaben bei einer Ablehnung (AK1.4).
  - Der Lauf-Start wird dringlich gemeldet, das Ende im `finally` (Lesson #369).
  - Escape ist über `schliessbar` gesperrt, solange die Action läuft.
  - Kein alter Fehler beim Wiederöffnen, strukturell gesichert, weil `Dialog` seine Kinder nur im Zustand `open` mountet. Ein Test sichert das ab.
- **`setCatalogItemActiveAction`**: Rollencheck zuerst, der No-Match des guarded UPDATE wird ausgewertet (Kern-Kurzregeln 1/2), jeder Guard hat einen eigenen Test.
- **`VeranstaltungListe`**:
  - Gruppierung nur per `filter`, die Reihenfolge aus `listVeranstaltungen` bleibt (AK2.3).
  - Natives `<details>` für „Abgeschlossen" (AK2.2).
  - Ein Lookup über alle Kataloge plus `KATALOG_UNBEKANNT` deckt beide Hälften von AK7.3 ab und ist getestet.
- **`/verwaltung/theke`**: serverseitiges Rollen-Gate nach dem Muster der anderen `/verwaltung`-Seiten. Die Seite fällt nicht unter den öffentlichen `/theke/`-Bypass in `proxy.ts`. `docs/routes.md` und `lib/navigation.ts` sind gepflegt, AK3.4 ist in beide Richtungen getestet.
- **Saubere Moves**: Die gelöschten Komponenten sind wirklich weg (Lesson #187). `eslint/ui-token-files.mjs` führt alle neuen Pfade, die Ausnahme `TeilnehmerRow` ist begründet. In der neuen UI gibt es keine rohen Farbklassen.
- **Tests mit Mutations-Sensibilität**:
  - Die Eingabe-Reihenfolge ist absichtlich gemischt (AK4.1, AK2.3).
  - Der inaktive Artikel steht mitten in der Gruppe (AK4.4).
  - Der Standardkatalog steht nicht an erster Stelle, damit die Vorauswahl wirklich geprüft wird (AK5.1).
  - Offene Promises werden im Test selbst aufgelöst (Lesson #370).
- **E2E**: Die fünffach kopierte Veranstaltungs-Anlage ist in `e2e/helpers/listenseiten.ts` zusammengezogen. Die Locatoren nutzen `exact: true` und sind auf den Seitenkopf bzw. die Navigation eingeschränkt.

## Out-of-Scope-Funde (klassifiziert nach ADR-043)

- **Issue #398** (`bug`): Die Dialog-Formulare auf `useSchliessendeAction` mit `<form action>` (`TeilnehmerHinzufuegenDialog.tsx:146, 183`, `ZeilenMenue.tsx:128`, `AbschlussAktion.tsx:124`) verlieren die Eingaben vermutlich bei einer Ablehnung. Das ist das Problem, das #373 für die Listenseiten löst.
- **`docs/factory/kleinfunde.md`**: `Dialog.handleClose` meldet ein natives Schließen ohne `schliessbar`-Prüfung. Ungeprüfte Hypothese: In Chromium könnte ein zweites Escape die Sperre umgehen.

## Empfehlung

NEEDS_REWORK
