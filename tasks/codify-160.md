## Codify-Report: Task 160

### Muster-Analyse
Ein Review-Finding in Runde 1 (`tasks/review-160.md`, Wichtig): Die neu gefasste
`CONTRIBUTING.md` listete **Typecheck** unter den *required CI-Checks*. Tatsächlich hat das Repo
**zwei getrennte Ebenen** – required CI-Checks (`lint`, `test`, `issue-sync`, `factory-self-test`,
`pr-closes-issue`) und lokale pre-push-Gates (Superset inkl. Typecheck/Format/Routen-Drift). Beim
Doku-Schreiben wurden sie zu einer Liste vermischt.

Muster: Onboarding-/Beitrags-Doku, die „die Gates" aufzählt, verwechselt die CI-Ebene mit der
lokalen pre-push-Ebene. Verwandt mit #155 (required Checks gegen echte PR-Check-Runs verifizieren)
– hier die Doku-Variante.

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` → „Bekannte Stolpersteine" → neuer Abschnitt **„Doku über ‚die
  Gates': required CI-Checks ≠ lokale pre-push-Gates nicht vermischen (aus #160)"**. Regel: beide
  Ebenen getrennt benennen, jede gegen ihre Quelle prüfen (`factory-ci.yml`/`check-runs` vs.
  `scripts/checks/pre-push.sh`); ein nur in `pre-push.sh` stehendes Gate ist kein required CI-Check;
  im Zweifel allgemein „grüne CI-Gates" formulieren.

### Keine Änderungen an CLAUDE.md / Guidelines / neuen Checks
- **CLAUDE.md / Guidelines:** Der Fehler ist repo-spezifisch (die konkrete Gate-Aufteilung dieses
  Projekts), kein universelles Prinzip → gehört in PROJECT-CONTEXT.md, nicht in die generischen
  Guidelines.
- **Neuer Check:** Nicht sinnvoll automatisierbar ohne Fragilität – ein Grep-Gate „CONTRIBUTING.md
  darf Typecheck nicht als required Check nennen" wäre über-spezifisch und falsch-positiv-anfällig
  (vgl. Test-Analyse `tasks/coverage-160.md`, bewusst kein Doc-Guard).
- **Kein Folge-Issue (ADR-018):** kein Learning mit eigenständigem Aufwand offen.

### Empfehlung für nächste Features
- Beim Dokumentieren von CI-/Qualitäts-Verhalten immer die **Quelle** zitieren (Workflow-Job bzw.
  `pre-push.sh`), nicht aus dem Gedächtnis aufzählen – dieselbe Disziplin, die #155/#137/#145 schon
  für die jeweilige Ebene etabliert haben.
