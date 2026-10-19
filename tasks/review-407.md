# Review: Task 407

**Iteration 3** (2026-10-18) – **Circuit Breaker ausgelöst, Eskalation an Ralf.**
Diff-Basis: `git diff origin/main...HEAD` (unverändert `4a374f7`) plus Working Tree. Gegenüber
Iteration 2 hat sich **nichts** geändert: Es gibt keinen neuen Commit, der Working-Tree-Diff ist
identisch (`ArtikelAnlegen.test.tsx`, `CatalogRow.test.tsx`, `docs/ux/glossar.md`, Task-Datei) und
`test-results/` stammt weiter aus dem Lauf um 21:38 (`listenseiten` rot). Dies ist der dritte Review
auf denselben Code. Laut Skill wird nicht weiter iteriert.

**Ungelöster Konflikt:** K1 lässt sich nicht durch `/implement` lösen, weil zwei gültige Specs sich
widersprechen: spec-407 Q6 (Größe als Untertitel, zweizeilige `ListenZeile`) und spec-373 AK4.6
(Dichte: 24 Artikel ≤ 2 Bildschirmhöhen bei 375 px). Ohne eine Entscheidung von Ralf würde jeder
weitere Rework-Lauf entweder die eine Spec verletzen oder die Testgrenze still anheben. Beides ist
unzulässig (Lesson #388).

Die Findings aus Iteration 2 werden unverändert übernommen.

## Kritische Findings (müssen behoben werden)

- [ ] [e2e/listenseiten.spec.ts:141, app/verwaltung/katalog/CatalogRow.tsx; spec-373 AK4.6 vs. spec-407 AK4.2/Q6] **Die neue Artikelzeile reißt die Dichte-Vorgabe aus spec-373 AK4.6, der E2E-Lauf ist rot.** Gemessen bei 375 px: 20 Artikel belegen 1796 px, erlaubt sind 1624 px; bei 24 Artikeln wären es hochgerechnet ≈ 2155 px. Ursache ist die zweizeilige `ListenZeile` (Größe als Untertitel, Q6). spec-407 hebt spec-373 AK4.6 nicht auf. **Entscheidung Ralf nötig:** (a) einzeilig „Name · Größe" ohne Untertitel (keine Baustein-API-Änderung), danach neu messen; **oder** (b) spec-407 um einen Q-Eintrag und ein AK „ersetzt spec-373 AK4.6" mit neuem Richtwert ergänzen und die E2E-Grenze samt Kommentar nachziehen. **Unverändert seit Iteration 2.**

## Wichtige Findings (sollten behoben werden)

- [ ] [e2e/bestaetigen-rueckmelden.spec.ts:122-203] **Es fehlt weiter der Nachweis, dass diese Spec gelaufen ist** (Fokus nach Erfolg, „(deaktiviert)" im `<select>`, Fokus auf „Abbrechen" beim Schrittwechsel im echten Browser). **Fix:** nach K1 beide Opt-in-Specs (`E2E_372=1`, `E2E_LISTENSEITEN_373=1`) gegen den eigenen Dev-Server im Worktree laufen lassen und das Ergebnis samt Datum und 375-px-Sichtprüfung in die Task-Datei schreiben (Lessons #368/#374/#403/#406). **Unverändert.**
- [ ] [Working Tree] **Der Rework ist weiter nicht committet** (Nitpick-Fixes aus Iteration 1, Review-Einträge in der Task-Datei, `tasks/review-407.md`). Lesson #391/#251. **Fix:** zusammen mit dem K1/W1-Rework committen. **Unverändert.**

## Nitpicks (optional)

- [ ] [e2e/katalog-407.tmp.spec.ts, test-results/407-*.png] Die Wegwerf-Sichtprüfung und ihre Screenshots liegen noch im Worktree. Nach dem letzten Lauf löschen (Lesson build-tooling #372). **Unverändert.**
- [ ] [app/components/ui/ListenZeile (geteilt)] Bei 375 px bricht „Cola/Fanta/Spezi/Limo" mitten im Wort um. Das fällt bei Option (a) voraussichtlich weg; sonst ist es Baustein-Verhalten außerhalb des Scopes. **Unverändert.**

## Positives

- Unverändert gültig aus Iteration 1/2: ADR-062 ist umgesetzt (Bestätigung als Schritt im selben
  Dialog, Fokus je Richtung). Die Sperre greift für alle Interaktionsflächen (`it.each`), jeder
  Bereich sendet nur seine eigenen Felder, `CatalogControls` ist vollständig entfernt,
  `docs/routes.md` bleibt zu Recht unverändert, die Coverage im Katalog-Pfad liegt bei 100 %.
- Der rote E2E-Lauf ist ein echter Fund (Dichte-Messung greift), keine Lokator-Panne.

Keine Out-of-Scope-Funde, die ein Issue oder einen `kleinfunde.md`-Eintrag brauchen.

## Empfehlung
NEEDS_REWORK
