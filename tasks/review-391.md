# Review: Task 391

> **Iteration 2.** Basis: `git diff origin/main...HEAD` (Commits bis `37df2b5`) plus der
> **nicht committete** Nacharbeits-Stand im Worktree (15 Dateien). Gates am Worktree-Stand:
> `pnpm lint` grün (pre-commit.sh), `vitest run app/components/ui app/veranstaltung` 46 Dateien /
> 750 Tests grün, `tsc --noEmit` grün, `prettier --check` (e2e, spec-391, ZugangTeilen) grün.
> E2E in dieser Runde nicht ausgeführt; Screenshots 05/07 per Sichtprüfung kontrolliert.
>
> **Aus Iteration 1 inhaltlich erledigt (im Worktree):** Screenshots 05/07 neu (Kopf mit Teilen,
> Zahnrad, rotem Papierkorb bzw. Teilen-Dialog), 01/02 nicht mehr im Diff; AK8 auf
> „Schließen" + Escape zurückgeführt und als Q4 begründet; Hover-Fläche `neutral` →
> `bg-line-subtle` mit Test; Herleitungs-Kommentar an `kopfAktionen()`; ADR-053-Verweis auf
> `KopfDialog`; E2E-Helfer `kopfAktion`/`oeffneEinstellungen`/`oeffneLoeschDialog` + neue Tests für
> AK16 und FS2; Anleitung nachgezogen.

## Kritische Findings (müssen behoben werden)
- [ ] [Worktree, 14 Dateien + 2 PNG] Die gesamte Nacharbeit aus Iteration 1 ist weiterhin **nicht committet**. Auf dem Branch (`37df2b5`) steht unverändert der alte E2E-Helfer `page.locator("details").filter({ hasText: "Einstellungen" })` – gegen die neue Seite (AK1: kein `<details>` mehr) laufen `veranstaltung-detailseite`, `veranstaltung-bearbeiten-loeschen`, `verzehr-einzelansicht` und die Capture-Spec auf dem Branch-Stand rot; AK17 (Anleitung + Screenshots) und die Nachweise zu AK16/FS2 fehlen im Branch. → E2E-Specs lokal laufen lassen (eigener Dev-Server/Port, Lesson testing #368; `db:seed`, Lesson factory-workflow #370), Ergebnis in der Task-Datei vermerken, dann committen. **`CLAUDE.md` ausnehmen** – die Änderung dort ist der `next dev`-Block (`git checkout -- CLAUDE.md`, Lesson build-tooling #337/#369/#370).

## Wichtige Findings (sollten behoben werden)
- [ ] [tasks/task-391-veranstaltung-einstellungen-zahnrad-oben.md] Unverändert seit Iteration 1: keine Status- oder AK-Checkbox gesetzt (nicht einmal „In Bearbeitung"), Abschnitt „Review-Findings" leer. AK8 ist in der Spec angepasst (Q4) – die Task-Datei sollte das beim Abhaken mit abbilden. Vor dem Abschluss im Branch nachziehen (CLAUDE.md-Guardrail #63).

## Nitpicks (optional)
- [ ] [app/veranstaltung/[id]/ZugangTeilen.tsx:50] Iteration-1-Nitpick nur verschoben, nicht gelöst: die überlange Kommentarzeile steht jetzt eine Zeile tiefer („login-freie Selbstbedienungs-Link … und als QR-Code. Der QR wird server-seitig … gerendert –", ~170 Zeichen). Den Absatz komplett auf die Breite der Nachbarzeilen (~100) neu umbrechen.
- [ ] [e2e/anleitung-veranstalter.spec.ts:53–63, docs/anleitung/veranstalter/bilder/05-veranstaltung-fuehren.png] Das in diesem PR neu erzeugte Bild 05 zeigt unten links das Next.js-Dev-Symbol „N". `shotVerzehr` blendet es bereits über `style: "nextjs-portal { display: none !important; }"` aus, `shot()` nicht. Dieselbe `style`-Option in `shot()` setzen und 05 neu aufnehmen – betrifft künftig auch alle anderen Viewport-Bilder.

## Positives
- Nacharbeit trifft die Iteration-1-Findings punktgenau, inklusive Spec-Korrektur statt stiller Code-Abweichung (Q4 nennt Anlass, Datum und das Folgethema `ConfirmDialog`-Sperre – Lesson factory-workflow #388 angewendet).
- Neue E2E-Fälle prüfen echtes Browser-Verhalten, das jsdom nicht kann: AK16 misst `scrollWidth`-Überstand, `toBeInViewport({ ratio: 1 })` und je Symbol ≥ 44 × 44 px; FS2 nutzt einen zweiten Tab für den echten Parallel-Abschluss und prüft die Meldung **im noch offenen Dialog**.
- Helfer `kopfAktion` begrenzt auf den Seitenkopf und matcht `exact` (Lesson testing #388, Teilstring-Treffer); `seitenkopf` begründet, warum nicht `getByRole("banner")`.
- `oeffneLoeschDialog` ist aus der Spec in den gemeinsamen Helfer gewandert statt ein drittes Mal kopiert.
- Bestätigt aus Iteration 1: Pflicht-`label` im `IconButton` per Typ, geteilte `BUTTON_BASE_CLASSES`, `key`-basierter Neustart des Lösch-Action-Zustands mit Ausgangslage-Assertion, `ZugangTeilen` bleibt Server Component (`qrcode` nicht im Client-Bundle), Reihenfolge-Assertions der Kopfaktionen als `toEqual([...])`, ADR-055 Accepted, keine Routen-Änderung (`docs/routes.md` zu Recht unberührt).

## Empfehlung
NEEDS_REWORK
