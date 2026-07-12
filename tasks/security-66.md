# Security Review: Task 66

> Härtung – Secret-Prüfung im Deploy-Gate über `env:` statt inline `${{ secrets.* }}`
> Reviewter Diff: `git diff main...HEAD` (+ staged) · Dateien: `.github/workflows/deploy-gate.yml`,
> `scripts/checks/tests/run-tests.sh`

## Kontext & Threat Surface

Der einzige Trigger des Deploy-Gates ist `push: main`; die Secret-Werte sind
Repo-Owner-gesetzt (nicht PR-/angreiferkontrolliert). Das adressierte Muster
(GitHub-Actions-Script-Injection: `${{ secrets.X }}` textuell in einen `run:`-Ausdruck
interpoliert) ist damit **Defense-in-Depth**, kein akuter Angriffsvektor – so bereits in
`tasks/security-63.md` (Backlog-Hinweis #2) eingeordnet. Genau diese Härtung setzt der Task um.

## Kritische Findings (Blocker)

- _Keine._

## Wichtige Findings

- _Keine._

## Hinweise

- [x] **[Injection] Script-Injection-Muster strukturell geschlossen (Kern des Tasks).** Beide
  betroffenen Steps (`Secrets vorhanden?`, `INT-Refresh aktiv?`) lesen ihre Secrets jetzt über
  einen `env:`-Block und testen ausschließlich gequotete Shell-Variablen (`[ -n "$VAR" ]`).
  GitHub interpoliert `${{ … }}` nicht mehr in den `run:`-Ausdruck; ein Wert mit `"`/Backtick/`$`
  wird von der Shell **literal** behandelt. Entspricht der GitHub-Empfehlung und dem im Gate
  bereits etablierten `$BYPASS`-Vorbild.
- [x] **[Injection] Vollständigkeit verifiziert.** `grep -nE 'run:|env:|secrets\.'` über die
  gesamte `deploy-gate.yml` zeigt: **alle** `${{ secrets.* }}`-Referenzen stehen ausschließlich
  in `env:`-Blöcken; **keine** `run:`-Zeile referenziert ein Secret inline. Der neue awk-Detektor
  `secrets_in_run` (POSIX-portabel, mit Positiv- **und** Negativ-Kontrolle gegen Vacuous-Green)
  sichert das als Gate ab.
- [x] **[Sensitive Data Exposure] Kein Secret-Leak.** Kein `echo`/`printf` gibt einen Secret-Wert
  aus; die Steps testen nur Präsenz (`[ -n … ]`). GitHub maskiert als `secrets.*` bezogene
  Env-Vars in Logs weiterhin. Kein Klartext in Logs/Outputs.
- [x] **[Misconfiguration] Kein Verhaltenswechsel.** Fail-closed-Logik (`exit 1` bei fehlendem
  Pflicht-Secret) und Skip-mit-Warnung des INT-Refresh (`enabled=false`) bleiben identisch;
  `::error::`/`::warning::`-Meldungen wortgleich. Durch Tests abgesichert (219 grün / 0 rot),
  `yq`-Parse bestätigt valides YAML.
- [x] **[Dependencies] Keine neuen Dependencies**, keine neuen Secrets, keine Auth-/Krypto-Änderung.
- Nicht im Scope (unverändert, kein Finding): `git push origin "HEAD:int" --force` (Zeile 95) –
  `int` ist ein Wegwerf-Ref (CLAUDE.md/Task-42-Regel); `--force` dort bewusst zulässig.

## Ergebnis

PASSED

Reine Härtung ohne neues Verhalten; das adressierte Injection-Muster ist vollständig und
verifiziert (Grep + Gate-Test) entfernt. Kein Merge-Blocker. Keine Out-of-Scope-Findings, die
ein eigenes Issue erfordern.
