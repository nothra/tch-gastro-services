# Coverage / Test-Vollständigkeit: Task 431

## App-Coverage (`pnpm test:coverage`, Vitest)
Statements 93,35 % · Branches 98,17 % · Functions 87,14 % · Lines 93,11 % (Schwelle 80 %).
Task 431 ändert keinen App-Code; die niedrigen Werte unter `db/` stammen von den ohne `.env.local`
übersprungenen DB-Integrationstests (vorbestehend, nicht Teil dieser Task).

## Self-Test-Suite (`scripts/checks/tests/run-tests.sh`)
1894 grün, 0 rot (Stand nach `/test`; vor `/test` 1884). Die geänderten Gate-Skripte sind Bash – die
Abdeckung wird über Verhaltenstests je Akzeptanzkriterium belegt (Gruppen D–I, AK-X-Teile).

## Ergänzt in `/test`
- Exit-Code der Pipeline-Abbruchfälle (Gate-Kommando fehlt / rotes Config-Lint) wird mitassertiert.
- Defektes `yq` (Config nicht lesbar): `pre-push` und `pre-commit` blockieren fail-closed; Kontrolle mit
  funktionierendem `yq`; gesetzte Env-Kommandos brauchen die Config nicht.
- AK-H6: fehlgeschlagenes `commands.install` → Warnung, `start-work` endet mit exit 0, Worktree besteht.

## Bewusst nicht Teil dieses Schritts
AK-X1 (Baseline-Vergleich gegen `main` @ `bcba043`), AK-X2/F-7 (Required Checks auf dem PR), AK-X3
(Stage-2-Probelauf nach dem Merge) – erst mit CI bzw. nach dem Merge belegbar.
