# Review: Task 233

Drei Runden (Logik/Korrektheit, Code-Qualität, Architektur & Konsistenz) gegen
`git diff origin/main...HEAD`. Alle drei Runden liefen unabhängig gegen denselben Diff-Stand.

## Kritische Findings (müssen behoben werden)

- [x] [PR #303 Beschreibung] AK-8 war nicht erfüllt: Der PR-Body enthielt nur `Closes #233` +
      Task-Titel, der laut Spec/Task geforderte manuelle Nachlauf-Hinweis („Vercel-
      Projekteinstellung 'Node.js Version' nach dem Merge auf 24.x setzen") fehlte vollständig
      (Runde 1, Logik). **Behoben:** PR-Body um einen Abschnitt „Manueller Nachlauf nach dem
      Merge (AK-8)" mit dem Vercel-Schritt ergänzt (`gh pr edit 303`); AK-8 in der Task-Datei
      auf `[x]` gesetzt.

## Wichtige Findings (sollten behoben werden)

- Keine (das einzige „Wichtig"-Finding aus Runde 3 – PR-Body ohne AK-8-Hinweis – deckt sich
  mit dem oben behobenen kritischen Finding aus Runde 1 und ist mit derselben Änderung erledigt).

## Nitpicks (optional)

- [x] [docs/specs/spec-233-node-runtime-24-anheben.md:6] Kontext-Absatz sprach von „fünf
      Stellen", während die Tabelle und der Rest des Dokuments („sechs Fundstellen") korrekt
      sechs nennen (Runde 2). **Behoben:** Tippfehler auf „sechs Stellen" korrigiert.
- [ ] [tasks/task-233-node-runtime-24-anheben.md, AK-7-Notiz] Die Herleitung der „Node-22-
      Blockade" bleibt etwas implizit – CI lief schon vor diesem Task auf Node 22, das jest-
      dom-7-Engine-Requirement (`>=22`) war dort also bereits erfüllt; die eigentliche
      Blockade dürfte die vormals erlaubte lokale Node-20-Doku-Baseline gewesen sein. Kein
      Sachfehler, nur eine Lücke in der Begründungskette (nicht behoben – Doku-Feinschliff,
      unterhalb der Merge-Blocker-Schwelle).

## Positives

- Diff ist exakt scope-konform: nur die drei CI-Stellen, `engines.node`, die sechs (plus die
  selbst gefundene siebte, `OPERATING.md:82`) Doku-Fundstellen sowie Spec-/Task-Datei – kein
  Dependency-Bump, keine App-Logik-Änderung, kein Gold-Plating.
- `engines.node: ">=24"` als offene Untergrenze ist sachlich korrekt begründet und funktional
  verifiziert (lokal `node -v` zeigt v26.3.0, `pnpm install` läuft ohne Engine-Warnung).
- Volltextsuche über alle drei Schreibweisen (`Node 20`, `Node ≥ 20`, `node-version: 22`)
  bestätigt: außerhalb von `tasks/`/Spec-Kontext keine verbliebenen Treffer im Repo.
- AK-4 wurde anhand echter CI-Läufe verifiziert (nicht nur behauptet): `factory-ci` Jobs
  `lint`/`test` liefen mit `node-version: 24` / `node: v24.19.0` und sind grün; `deploy-gate`
  läuft erwartungsgemäß erst bei Push auf `main`.
- jest-dom-7-Herleitung (AK-7) bei Nachprüfung exakt korrekt zitiert (`node: ">=22"`,
  `@testing-library/dom: ">=10 <11"`, `vitest: ">= 0.32"`); `@testing-library/jest-dom` bleibt
  im Diff unverändert auf `^6.9.1`.
- Zusätzlich gefundene siebte Stelle (`docs/factory/OPERATING.md:82`), die nicht in der
  ursprünglichen Sechser-Liste des Issues stand, wurde selbstständig entdeckt, mitgezogen und
  transparent in der Task-Datei dokumentiert (Lesson #144 referenziert).
- ADR-Trigger-Verzicht sauber gegen alle vier Kategorien durchargumentiert; beide berührten
  ADRs (014, 036) wurden nur in der Versionsangabe geändert, keine ADR-Drift.
- Keine Routen-Änderungen im Diff – `docs/routes.md` musste folgerichtig nicht angefasst
  werden (bestätigt).
- `factory-poll.yml`/`deploy-freeze-release.yml` verifiziert ohne Node-Bezug – Spec-Aussage
  „nicht betroffen" ist zutreffend.
- Kein `.npmrc`/`engine-strict`, keine zweite Versionsmanager-Quelle – `engines.node` bleibt
  konsistent die einzige kanonische Quelle.

## Empfehlung

APPROVED (nach Remediation des einzigen kritischen Findings – PR-Body um AK-8-Hinweis ergänzt,
Task-Datei aktualisiert; kein zusätzlicher `/implement`-Durchlauf nötig, da reine
PR-Metadaten-Korrektur ohne Code-/Dokuänderung im Branch außer dem bereits erledigten
Nitpick-Fix).
