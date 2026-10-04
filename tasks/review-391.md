# Review: Task 391

> **Iteration 3 (letzte Runde vor dem Circuit Breaker).** Basis: `git diff origin/main...HEAD`
> (Commits bis `99e3a64`), Worktree sauber. Gates in dieser Runde selbst ausgeführt:
> `scripts/checks/pre-commit.sh` (inkl. `pnpm lint`) grün, `vitest run app/components/ui
> app/veranstaltung` 46 Dateien / 750 Tests grün, `tsc --noEmit` grün, `prettier --check` (app, e2e,
> docs/anleitung, docs/adr, docs/specs, tasks) grün, `routes-doc-check.sh` grün. E2E nicht erneut
> ausgeführt – der Nachweis 12/12 grün plus Capture-Spec gegen eine Wegwerf-DB steht in der
> Task-Datei („Nachweise").
>
> **Aus Iteration 2 erledigt:**
> - K (Nacharbeit nicht committet): alles in `99e3a64`; der Branch trägt jetzt die neuen
>   E2E-Helfer (`kopfAktion`, `oeffneEinstellungen` über das Zahnrad, `oeffneLoeschDialog`),
>   Anleitung, Bilder 05/07 und die AK16-/FS2-Tests. `CLAUDE.md` ist nicht im Diff.
> - W (Task-Datei): Status „In Bearbeitung" und alle AK/FS abgehakt, AK8 mit Q4-Anpassung,
>   Review-Findings und Nachweise eingetragen.
> - Nitpick `ZugangTeilen.tsx`: Kommentarabsatz auf ~100 Zeichen neu umbrochen.
> - Nitpick Dev-Symbol: `shot()` und `shotVerzehr()` teilen sich die Konstante
>   `OHNE_DEV_SYMBOL`; Bild 05 neu aufgenommen.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

_Keine._

## Positives

- **Runde 1 (Logik):** Alle AK/FS aus spec-391 sind abgedeckt. Die Kopfaktionen hängen am Zustand
  (`bearbeitbar` → Papierkorb und Stammdaten nur bei datierter Veranstaltung, abgeschlossen → keine
  `kopfAktionen`, ADR-055 D5). Die Lösch-Ablehnung erscheint im Bestätigungsdialog, und der
  `key`-Neustart erneuert den Action-Zustand bei jedem Öffnen.
- **Runde 2 (Qualität):** Duplikate abgebaut statt vermehrt: `BUTTON_BASE_CLASSES` geteilt,
  `ZugangDialog` zu `KopfDialog` verallgemeinert (alte Datei + Test gelöscht, Doku-Treffer nur noch
  als historischer Nachtrag in ADR-053/ADR-055, Lesson factory-workflow #370), Dev-Symbol-Style als
  eine Konstante. E2E-Helfer matchen `exact` und auf den Seitenkopf begrenzt (Lesson testing #388).
- **Runde 3 (Architektur):** `ZugangTeilen` bleibt Server Component (`qrcode` nicht im
  Client-Bundle). Neue UI nutzt Bausteine und Token-Klassen (ADR-052), `eslint/ui-token-files.mjs`
  ist nachgezogen. ADR-055 ist Accepted, ADR-053 trägt den Ablöse-Nachtrag. Keine Routen-Änderung –
  `docs/routes.md` bleibt zu Recht unberührt.

## Empfehlung
APPROVED
