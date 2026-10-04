# Review: Task 391

> **Iteration 5 – Nachprüfung des Reworks aus Iteration 4 (`876d23a`).** Iteration 4 war das
> erste Review nach dem Rebase auf #371 (NEEDS_REWORK, 1 kritisch, 3 wichtig, 1 Nitpick). Geprüft:
> `git diff origin/main...HEAD` nach `git fetch origin`; `origin/main` hat seitdem nichts Neues.
> Schwerpunkt: Sind die Funde aus Iteration 4 erledigt, und ist der neue `PageHeader`-Fix sauber?
> Für den Code nach dem Rebase ist das die zweite Runde, der Circuit Breaker greift nicht.
>
> Gates in dieser Runde selbst ausgeführt: `scripts/checks/pre-commit.sh` (inkl. `pnpm lint`)
> grün; `vitest run app/components/ui app/veranstaltung` 46 Dateien / **799** Tests grün
> (+1 = neuer `PageHeader`-Test); `tsc --noEmit` grün; `prettier --check` (app, e2e, docs/adr,
> docs/specs, docs/anleitung, tasks) grün; `routes-doc-check.sh` grün. E2E nicht selbst
> ausgeführt. Die Task-Datei belegt einen Lauf nach dem Fix: 12/12 + 2/2 grün, vorher 10/12.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

_Keine._

## Positives

- **Iteration 4 vollständig abgearbeitet:**
  - **K (doppelte ADR-055):** Die ADR heißt jetzt `056-…`, Titel und Status `Accepted` sind
    nachgezogen. `git grep "ADR-055"` über app, e2e, eslint, docs/adr, docs/specs und
    docs/anleitung liefert nur noch #371-Stellen (`KassiereZeileForm*`, `AbschlussAktion*`,
    `kassierSummen*`, `KassierSummenKarte`, `actions*`, `kassieren/page.tsx`, `page.tsx:73`,
    `page.test.tsx:290/308`, ADR-053:153, die beiden #371-E2E-Specs) und den bewussten
    #371-Verweis in ADR-056 D5. Kein #391-Verweis zeigt mehr auf 055.
  - **W (Spec/ADR-Drift):** ADR-056 D5 nennt die Reihenfolge Badge · Abschluss-Aktion · Teilen ·
    Einstellungen · Papierkorb sowie die Zustandsregeln je Fall (Theke ohne Abschließen,
    abgeschlossen nur „Wieder öffnen"). spec-391 AK2/AK14/AK16 sind angepasst, Q5 hält die
    Zusammenführung mit Begründung fest.
  - **W (`kassieren/page.tsx`-Kommentar):** Der Vergleich mit „Einstellungen" ist entfernt, der
    #371-ADR-Verweis bleibt.
  - **W (E2E-Nachweis):** Der AK16-Test prüft „Veranstaltung abschließen" mit, ohne
    44-px-Prüfung, weil es eine Text-Schaltfläche ist. Der Nachweis ist neu und datiert in der
    Task-Datei vermerkt.
  - **Nitpick:** Beide Kommentare in `page.tsx` sagen jetzt „außer ‚Wieder öffnen'".
- **Runde 1 (Logik):** Der neue E2E-Fund ist echt: Der `shrink-0`-Aktionsbereich ohne
  Breitengrenze hat 37 px Überstand verursacht. Die Ursache ist richtig erkannt und minimal
  behoben (`max-w-full` am Aktionsbereich). Davon profitiert auch spec-371 AK24 (#369 AK27 war
  ebenfalls rot). Für die anderen Konsumenten (`kassieren/page.tsx`,
  `verwaltung/katalog/[id]/page.tsx`) ändert sich nichts: Ihre Aktionen sind schmaler als die
  Zeile, die Grenze greift dort nie.
- **Runde 2 (Qualität):** Der Fix ist per TDD belegt (`PageHeader.test.tsx`, Testname im
  Projektformat, WHY-Kommentar mit Spec-Bezug). Der Kommentar am Aktionsbereich erklärt das
  Warum und nicht das Was. Die Anleitung beschreibt den Kopf richtig: Abschluss-Schaltfläche,
  drei Symbole, Umbruch auf schmalen Bildschirmen. Bild 05 und der Alt-Text sind nachgezogen.
- **Runde 3 (Architektur):** Die Änderung am geteilten Baustein `PageHeader` ist an beiden
  Stellen dokumentiert: in ADR-056 D5 als „einzige Änderung" mit Begründung und als Nachtrag in
  ADR-055 D3, das bisher „keine Änderung am `PageHeader`" zusagte (Lesson #211/#55, ADR-Drift).
  Es gibt keine Routen-Änderung, `docs/routes.md` bleibt zu Recht unverändert.

## Empfehlung
APPROVED
