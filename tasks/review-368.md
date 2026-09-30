# Review: Task 368

**Runde 2.** Diff-Basis: `git diff origin/main...HEAD` (7 Commits, 38 Dateien). Den Rework prüfen
die Commits `9f1ac9f` und `109e4a5`. Runde 1 (NEEDS_REWORK: W1, W2, N1–N6) steht in der
Git-History dieser Datei.

Gates in dieser Session: `pnpm vitest run app/components/ui eslint app/login app/verwaltung/katalog`
→ 22 Dateien, 320 Tests grün (Runde 1: 278). `pnpm lint` ist grün mit aktivem Farb-Gate, und
`pnpm format:check` ist ebenfalls grün.

**Stand der Runde-1-Findings:**

| Finding | Stand | Beleg |
|---|---|---|
| W1 Farb-Gate-Lücken | behoben | Paletten, Utilities und Präfix-Formen ergänzt, je Form ein `invalid`-Fall. Drift-Test gegen `tailwindcss/theme.css` mit fail-closed-Untergrenze (≥ 20). ADR-052 D3 nachgezogen. Zwei Rest-Formen siehe N7. |
| W2 AK5.3-Nachweis | **offen** | siehe W2 unten |
| N1 `color-scheme` | behoben | `:root` + Test |
| N2 Hover-Paare | behoben | `on-accent`/`accent-hover`, `on-danger`/`danger-hover` in `TEXT_PAIRS`, Dublette entfernt |
| N3 tautologischer Test | behoben | als Klassen-Kontrakt benannt, Verhalten prüft weiter `should_beDisabledAndNotFire_when_disabled` |
| N4 Hover bei disabled | behoben | `not-disabled:hover:`, mit begründetem Verzicht auf `enabled:` (`<a>` von `ButtonLink`) |
| N5, N6 | bewusst nicht umgesetzt | Begründung in der Task-Datei ist tragfähig (YAGNI bzw. Folge-Issues #369–#374) |

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] **W3** [scripts/pr368-body.tmp.md:1-22] **Ein Wegwerf-Artefakt ist committet.** Die Datei
  ist die Vorlage für den PR-Body und kam mit `9f1ac9f` in den Branch. `.gitignore` deckt nur
  `*.tmp.{txt,sh,py,spec.ts,spec.tsx}` ab, `*.tmp.md` nicht. Deshalb ist die Datei nicht
  ignoriert und würde mit dem Squash auf `main` landen. Das ist dieselbe Fehlerklasse wie in den
  Lessons #67/#324 (`build-tooling.md`). Außerdem behauptet sie „Die Screenshots hängen als
  Kommentar an diesem PR", was heute nicht stimmt (siehe W2).
  **Fix:** `git rm scripts/pr368-body.tmp.md`. Der Inhalt steht bereits im PR-Body von #378.
  Ob `*.tmp.md` in `.gitignore` gehört, ist eine eigene Frage außerhalb dieses Scopes.

- [ ] **W2** (aus Runde 1, weiterhin offen) [tasks/task-368-…md AK5.3 · PR #378] **Die
  Screenshots fehlen am PR.** Der PR-Body enthält jetzt die Zusammenfassung und die
  Screenshot-Tabelle, das ist erledigt. Per `gh pr view 378 --json comments` geprüft: Außer dem
  Vercel-Bot gibt es keinen Kommentar, also keine Bilder. Der Satz „Die Screenshots hängen als
  Kommentar an diesem PR" im Body stimmt damit noch nicht. AK5.3 ist in der Task-Datei trotzdem
  abgehakt.
  **Fix (menschliche Aktion, `/implement` kann das nicht):** Die 12 PNGs aus
  `test-results/ux368/` per Drag & Drop als PR-Kommentar an #378 anhängen. Das muss vor dem
  Merge passieren, **nicht** über einen weiteren `/implement`-Lauf.

## Nitpicks (optional)

- [ ] **N7** [eslint/no-raw-color-classes.mjs:50,67] **Zwei seltene v4-Formen umgehen das Gate
  weiterhin.** Per Wegwerf-Probe gegen die echte Regel (`rule.create` + `Literal`) geprüft: Von
  `[&_[data-x]]:bg-red-500 bg-red-500/(--a) [&>*]:bg-red-500` meldet sie nur `[&>*]:bg-red-500`.
  Es gibt zwei Ursachen:
  1. Das Klammer-Muster `\[[^\]\s]*\]` endet an der ersten `]`. Verschachtelte
     Arbitrary-Varianten (`[&_[data-x]]:`) passen deshalb nicht.
  2. `OPACITY` kennt nur `/50` und `/[…]`, nicht die v4-Kurzform `/(--var)`.

  Beide Formen sind selten, und das Gate soll Versehen abfangen, nicht Absicht. Deshalb ist das
  nur ein Nitpick. Der Fix wäre billig: In `OPACITY` `\([^)\s]+\)` zulassen, im Klammer-Muster
  eine Verschachtelungsebene erlauben, und je Form ein `invalid`-Fall dazu.
- [ ] **N8** [app/components/ui/Button.test.tsx:62-66] Der Name
  `should_notHoverWhileDisabled_when_variantIs%s` verspricht mehr, als der Test prüft. Er rendert
  einen **aktivierten** Button und prüft, dass kein ungeschütztes `hover:` vorkommt. Das ist
  der richtige Klassen-Kontrakt, aber ein Name wie
  `should_guardHoverWithNotDisabled_when_variantIs%s` wäre ehrlicher (vgl. N3 aus Runde 1).

## Positives

- W1 ist gründlich und nach der Lesson #214 behoben. Die Kopplung zu Tailwind ist ein echter
  Drift-Guard: Die Paletten werden aus `theme.css` gelesen und erzeugen je einen
  `invalid`-Fall (bricht die Regelseite). Die Untergrenze ≥ 20 wird rot, wenn sich das Format
  von `theme.css` ändert (bricht die Quellseite). Der Guard ist fail-closed, nicht still grün.
- Das neue Präfix-Muster ist robust gegen `:` in Klammern (`supports-[display:grid]:`) und
  bleibt linear. Das `^…$`-Anker-Prinzip und die Token-Prüfung als Ganzes verhindern weiter
  Fehlalarme (`mein-bg-red-500-wrapper` bleibt stumm, per Probe bestätigt). Neue `valid`-Fälle
  mit den neuen Präfix-Formen auf Token-Klassen belegen die Gegenrichtung (AK6.3).
- Bei N4 ist die Entscheidung für `not-disabled:` statt `enabled:` sauber begründet und im Code
  kommentiert. Sie verhindert eine Regression bei `ButtonLink`, die mit dem naheliegenden Fix
  entstanden wäre.
- ADR-052 D3 ist im selben PR nachgezogen: Utility-Liste, Präfix-Formen und Drift-Test
  (Lesson #211).
- Die Task-Datei dokumentiert je Finding den Stand, auch die bewusst nicht umgesetzten.

## Empfehlung

NEEDS_REWORK

Der einzige Rework-Punkt für `/implement` ist W3: ein `git rm`. N7 und N8 sind optional. W2 kann
kein Agent erledigen. Es ist eine Merge-Voraussetzung, die ein Mensch erfüllen muss. Wenn W2 der
letzte offene Punkt ist, darf es die Review-Schleife nicht weiter drehen (Circuit Breaker).
