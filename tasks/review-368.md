# Review: Task 368

**Runde 3.** Diff-Basis: `git diff origin/main...HEAD` (9 Commits, 38 Dateien). Den Rework prüft
der Commit `ee39a14`. Runde 1 und 2 (je NEEDS_REWORK) stehen in der Git-History dieser Datei.
Weil das die dritte Runde auf denselben Code ist, greift der Circuit Breaker: keine weitere
Review↔Implement-Iteration. Was noch offen ist, geht an einen Menschen (siehe Empfehlung).

Gates in dieser Session: `pnpm vitest run app/components/ui eslint app/login app/verwaltung/katalog`
→ 22 Dateien, 322 Tests grün (Runde 2: 320, dazu die zwei neuen `invalid`-Fälle). `pnpm lint`,
`pnpm format:check` und `tsc --noEmit` sind grün.

**Stand der Runde-2-Findings:**

| Finding | Stand | Beleg |
|---|---|---|
| W3 Wegwerf-Artefakt | behoben | `scripts/pr368-body.tmp.md` ist per `git rm` entfernt und fehlt im Diff gegen `origin/main`. Die `.gitignore`-Lücke steht als Kleinfund in `docs/factory/kleinfunde.md`. |
| W2 Screenshots am PR | **offen, an einen Menschen eskaliert** | `gh pr view 378 --json comments` liefert keinen Kommentar, also keine Bilder. |
| N7 Farb-Gate-Rest-Formen | behoben | Per Wegwerf-Probe gegen `rule.create` geprüft: `[&_[data-x]]:bg-red-500`, `bg-red-500/(--a)`, `bg-red-500/(--a)!` und `[&[x]]:bg-red-500` werden gemeldet. `[&_[data-x]]:bg-accent`, `bg-accent/(--a)` und `mein-bg-red-500-wrapper` bleiben stumm. Zwei Verschachtelungsebenen (`[a[b[c]]]:`) werden nicht erkannt, das ist laut Kommentar und ADR-052 D3 so gewollt („eine Ebene"). Laufzeit bei pathologischen Eingaben (5000× `[a]`, 20000 Präfixe) unter 1 ms, weil die Alternativen im neuen `BRACKET` am ersten Zeichen disjunkt sind. |
| N8 Testname | behoben | `should_guardHoverWithNotDisabled_when_variantIs%s` |

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] **W2** (aus Runde 1, **an einen Menschen eskaliert**, kein Rework-Punkt für `/implement`)
  [tasks/task-368-…md AK5.3 · PR #378] **Die Screenshots fehlen am PR.** Der PR-Body verspricht
  „Die Screenshots hängen als Kommentar an diesem PR", aber es gibt keinen Kommentar. AK5.3 ist
  in der Task-Datei abgehakt, obwohl der Nachweis noch nicht am PR hängt.
  **Fix (Mensch, vor dem Merge):** Die 12 PNGs aus `test-results/ux368/` per Drag & Drop als
  Kommentar an #378 anhängen. Kein Agent kann das erledigen, weil `gh` keine Bilder hochlädt.

## Nitpicks (optional)

- [ ] **N9** [docs/factory/kleinfunde.md:40] Der in Runde 2 angelegte Kleinfund verankert
  `.gitignore:18-22`. Die aufgezählten Muster `*.tmp.txt` … `*.tmp.spec.tsx` stehen aber in
  **Zeile 17–21**. Zeile 22 ist `coverage-*-tmp/`, und `*.tmp.txt` fällt heraus. Das ist ein
  Anker-Fehler direkt beim Anlegen, dieselbe Klasse wie in der Lesson #291/#351
  (`factory-workflow.md`). **Fix:** Anker auf `.gitignore:17-21` ändern.

## Positives

- Der Rework bleibt eng am Finding. `BRACKET` ist als eigene Konstante herausgezogen, statt das
  Präfix-Muster weiter zu verschachteln. Der Kommentar nennt das WHY: Die innere `]` darf das
  Präfix nicht vorzeitig beenden.
- Je neuer Form gibt es genau einen `invalid`-Fall mit exakter `className` im `data`. Damit ist
  belegt, dass die ganze Klasse gemeldet wird und nicht nur ein Teilstück.
- ADR-052 D3 ist im selben Commit nachgezogen, mit beiden neuen Formen (Lesson #211).
- W3 ist sauber gelöst. Die außerhalb des Scopes liegende `.gitignore`-Lücke ist nach ADR-043 als
  Kleinfund abgelegt und nicht still im PR mitgefixt.
- Die Task-Datei führt W2 ehrlich als offen und benennt den Circuit Breaker, statt den Punkt
  abzuhaken.

## Empfehlung

APPROVED

Der Code ist abnahmereif. Seit Runde 2 ist kein Code-Finding offen, N9 ist optional. **Der
Circuit Breaker greift (3. Runde):** W2 ist kein Code-Mangel, sondern eine Merge-Voraussetzung,
die nur ein Mensch erfüllen kann. Deshalb geht es weiter zu `/test`, und W2 ist ausdrücklich an
einen Menschen eskaliert. Bevor `/pr-shepherd` merged, müssen die Screenshots an #378 hängen.
Sonst stimmt der PR-Body nicht, und AK5.3 ist nicht belegt.
