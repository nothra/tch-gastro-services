# Review: Task 390

**Iteration 2** (nach dem Rework-Commit `37bc566`). Diff-Basis: `git diff origin/main...HEAD`
(nach `git fetch origin`). Geändert: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`scripts/checks/tests/run-tests.sh`, `docs/factory/kleinfunde.md`, Spec, Task-Datei, dieser Report.
Die drei Runden (Logik, Code-Qualität, Architektur) liefen wegen des kleinen Diffs (keine
App-Code-Änderung) wieder direkt im Orchestrator-Kontext, nicht als Sub-Agenten.

Gegengeprüft:
- Lockfile: `next@16.3.8`, `brace-expansion@1.1.21/2.1.7/5.0.12`, `undici@7.30.0` (keine 6.x-
  oder 8.x-Kopie), Override-Block im Lockfile deckungsgleich mit `pnpm-workspace.yaml`.
- Self-Test-Suite `scripts/checks/tests/run-tests.sh` frisch gelaufen (mit `unset PR_SHEPHERD
  FACTORY_STAGE`): **1568 grün / 0 rot**. Darunter grün: der neue Fall `undici|6|6.28.1`, der
  Mutationsbeleg (meldet genau ` 6.28.0`, nicht die 7.x-Nachbarzeile) und die
  Diskriminierungs-Kontrolle gegen Floor 6.28.0.
- `kleinfunde.md`-Anker `run-tests.sh:5638` trifft die Zeile `undici|6|…`, die Folgezeile 5639
  ist `undici|7|…` – die Aussage „nur Major 6 und 7" stimmt. Der gelöschte Eintrag „Override-
  Selektor ohne untere Schranke" ist durch `>=7.0.0` tatsächlich erledigt.
- Advisory-Volllisten (`gh api advisories/…`) waren in dieser Session wieder nicht freigegeben.
  Die Floors (u. a. 6.28.1 und 8.10.2) stammen aus den Notizen von `/implement` und sind hier
  nicht unabhängig nachgemessen.

Status der Findings aus Iteration 1: W1 und alle vier Nitpicks behoben (siehe Task-Datei).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [ ] [pnpm-workspace.yaml:57] Der Fix für den sharp-Nitpick aus Iteration 1 hat die Zeile auf
  rund 140 Zeichen verlängert, der Block bricht sonst bei etwa 100 um. Hinter „erneut gemessen:
  0.35.4)." umbrechen. Dieselbe Sorte, kleiner: Zeile 77 (~118, „…mit unterschiedlichem Ergebnis:
  gegen das BESTEHENDE") und Zeile 70 (~105). Rein kosmetisch, Prettier prüft YAML-Kommentare nicht.
- [ ] [pnpm-workspace.yaml:83–84] „…UNTER dem Floor 5.0.9. Der Eintrag ist damit die einzige
  durable Zusicherung >= 5.0.9." steht im Präsens, der aktuelle Floor ist 5.0.12. Zeile 75 rahmt
  den Absatz zwar als #339-Messung, der Schlusssatz ist aber eine Gegenwartsaussage über den
  Eintrag. Vorschlag: „… >= 5.0.9 (seit #390: >= 5.0.12; ^5.0.5 liegt auch darunter)".

## Positives

- W1 sauber nach dem etablierten #339-Muster umgesetzt: Vorsorge-Fall **im bestehenden**
  `floor_cases_291` (kein Parallel-Guard, Lesson #240), Mutationsbeleg mit Nachbarzeile aus der
  anderen Major-Linie, also gegen „grün aus dem falschen Grund" abgesichert (Lesson #214), plus
  Diskriminierungs-Kontrolle in der Gegenrichtung.
- Der Floor 6.28.1 wurde laut Task-Notiz über **alle** sechs undici-Advisories bestimmt, nicht nur
  über die eine im Review genannte (Lesson #231).
- Die Prosa in `pnpm-workspace.yaml` nennt den neuen Guard als Wächter der 6er-Linie, symmetrisch
  zum brace-expansion-3.x-Absatz.
- Der neue Out-of-Scope-Fund (undici-8.x-Linie) ist sofort kanonisch in `kleinfunde.md` verankert
  und nach ADR-043 begründet eingestuft (hypothetischer Zustand, keine verlorene Deckung) –
  nicht als Session-Notiz liegen geblieben (Lesson #345).
- Der durch diesen PR erledigte `kleinfunde.md`-Eintrag wurde im selben PR entfernt (Lesson #176).
- Weiterhin gut aus Iteration 1: Floors angehoben statt daneben gestellt, undici-Selektor nach
  unten begrenzt, exakter next-Pin im Lockstep mit `eslint-config-next`, Laufzeit-Verifikation
  gegen `next start` statt `next dev`, Spec-Abweichungen ehrlich im selben PR vermerkt.

## Empfehlung
APPROVED
