# Review: Task 407

**Iteration 4** (2026-10-19) – nach der Eskalation (Circuit Breaker in Iteration 3) und Ralfs
Entscheidung zu K1, Option (a). Diff-Basis: `git diff origin/main...HEAD` (HEAD `41daebb`), Working
Tree sauber. Schwerpunkt: der Rework seit `4a374f7` (`66a7ebe`, `41daebb`). Der übrige Code ist
gegenüber Iteration 1–3 unverändert, die Befunde dazu gelten weiter.

Geprüft:
- **Rework:** `CatalogRow.tsx` setzt den Titel einzeilig auf „Name · Größe“ (bzw. nur den Namen) und
  hat keinen Untertitel mehr. spec-407 AK4.2, AK4.7 und Q6 sind im selben Commit nachgezogen
  (Lesson #388: Scope-Änderung steht in der Spec). Der Test deckt beide Zweige ab (mit Größe /
  ohne Größe samt Abwesenheit von „·“ und „ohne Größe“).
- **Gestrichene Farbklassen-Assertion:** Der neue Kommentar sagt, dass das Farb-Gate rohe Farben
  abweist. Das stimmt: `eslint/ui-token-files.mjs:18` enthält `app/verwaltung/katalog/`
  (Lesson #319).
- **Folgestellen** (Lesson #391/#370): `grep "ohne Größe|untertitel"` findet im Katalog-Pfad und in
  den E2E-Specs keinen Rest. Der Treffer in `e2e/anleitung-veranstalter.spec.ts:209` gilt der
  Verzehr-Erfassung, nicht der Katalogseite, und ist deshalb nicht betroffen.
- **Unit-Tests** `app/verwaltung/katalog` + `app/components`: 38 Dateien, 492 Tests grün
  (2026-10-19 03:14).
- **E2E:** In der Task-Datei ist für HEAD `66a7ebe` ein Lauf von `listenseiten` und
  `bestaetigen-rueckmelden` gegen einen eigenen Dev-Server belegt (7/7 grün, mit Dichte-Grenze aus
  spec-373 AK4.6), dazu die 375-px-Sichtprüfung. `41daebb` ändert nur die Task-Datei. Damit sind
  K1 und W1 aus Iteration 2/3 erledigt, und W2 ist erledigt, weil der Rework committet ist.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [ ] [tasks/task-407-…md, Abschnitt „Review-Iteration 3 – Entscheidung K1“] Dort steht
  „Wegwerf-Spec und Screenshots gelöscht“. Im Worktree liegen aber weiter (gitignoret, nicht im
  Diff) `e2e/katalog-407.tmp.spec.ts` (03:10), `playwright-407.tmp.config.ts`,
  `scripts/{e2e,mutation,vitest}407.tmp.sh` und `test-results/407-*.png`. **Fix:** Die Dateien vor
  `/security-review` löschen (Lesson build-tooling #372) oder die Notiz korrigieren.
- [ ] [app/components/ui/ListenZeile (geteilt)] „Cola/Fanta/Spezi/Limo“ bricht bei 375 px mitten
  im Wort um. Das ist Verhalten des Bausteins und liegt außerhalb des Scopes. Wie beim Fund aus
  Iteration 1–3 gilt: kein Defekt mit funktionalem Auslöser, Anzeige bleibt lesbar, kein Issue.

## Positives

- Die Entscheidung des Menschen ist sauber umgesetzt: Spec (AK4.2, AK4.7, Q6 mit Begründung und
  Messwert), Code und Test stehen im selben Commit, und die E2E-Dichte-Messung belegt die Grenze aus
  spec-373 AK4.6 im echten Browser.
- Die Änderung ist minimal (eine Zeile in `CatalogRow.tsx`), die `ListenZeile`-API bleibt
  unverändert, wie spec/ADR-062 es verlangen.
- Der Kommentar zur Farbklassen-Assertion verweist auf den echten Enforcer, statt eine Behauptung
  zu duplizieren.
- Aus Iteration 1–3 gilt weiter: ADR-062 ist umgesetzt, die Sperre greift für alle Flächen,
  `CatalogControls` ist vollständig entfernt, `docs/routes.md` bleibt zu Recht unverändert, die
  Coverage im Katalog-Pfad liegt bei 100 %.

Keine Out-of-Scope-Funde, die ein Issue oder einen `kleinfunde.md`-Eintrag brauchen.

## Empfehlung
APPROVED
