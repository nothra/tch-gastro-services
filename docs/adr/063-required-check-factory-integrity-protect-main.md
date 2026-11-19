# ADR 063: `factory-integrity` als Required Check im Ruleset `protect-main`

## Status

Proposed – wird **Accepted**, sobald das Ruleset geändert ist (menschlicher Schritt nach dem Merge von #428, AK2.14c).

> Nachtrag zu **Factory-ADR-029** (Branch-Protection `main` per Ruleset) und **Factory-ADR-063** (Factory als
> vendored Manifest, E8 Integritäts-Gate). Factory-ADR-029 liegt seit #428 im `factory.lock` und darf im Projekt nicht
> mehr geändert werden (`factory-integrity`); die Projekt-Entscheidung steht deshalb hier, nicht als Nachtrag in jener Datei.

## Datum

2026-11-19

## Kontext

Mit #428 liegen 129 Dateien der Factory per `factory.lock` im Projekt. Der CI-Job `factory-integrity` prüft, dass sie
unverändert sind (Hashes gegen das Lock, das Lock gegen das Release-Manifest des Tags aus `upstream.repo`; fail-closed,
wenn Repo, Tag oder Manifest nicht erreichbar sind). Ein Gate, das den Merge nicht verhindern kann, schützt nichts:
ohne Eintrag unter den Required Checks könnte ein PR mit lokal geänderter Factory-Datei oder manipuliertem Lock
gemergt werden. Die bisherigen Required Checks von `protect-main` (Ruleset 19162920): `lint`, `test`, `issue-sync`,
`factory-self-test`, `pr-closes-issue`, `config-validation`.

## Entscheidung

Das Ruleset `protect-main` erhält als siebten Required Check **`factory-integrity`** (Job-Name aus
`.github/workflows/factory-ci.yml`, läuft auf `pull_request`). Alle anderen Parameter bleiben: `enforcement: active`,
keine Bypass-Akteure, `squash` als einzige Merge-Methode, `strict_required_status_checks_policy: false`.

Reihenfolge: erst Merge von #428 (der Check muss auf `main` existieren und mindestens einmal gelaufen sein), dann
Ruleset-Änderung – sonst blockiert ein nicht existierender Pflichtcheck jeden PR.

## Alternativen

- **Check nicht als Pflicht führen:** verworfen – das Gate wäre umgehbar, E8 verlöre seinen Zweck.
- **Vor dem Merge eintragen:** verworfen – der Check existiert dann noch nicht, jeder PR (auch #428 selbst) hinge.
- **Nachtrag in Factory-ADR-029:** nicht möglich – Datei ist vendort und hash-gesichert; die Factory pflegt ihre
  eigene Fassung (dort gilt `project-self-test`, siehe Factory-ADR-064).

## Begründung

Das Ruleset ist die einzige serverseitige, auch für Admins gültige Durchsetzung (Factory-ADR-029); lokale Hooks sind
mit `--no-verify` umgehbar. `factory-integrity` ist fail-closed und braucht kein Secret, kann also ohne Folgekosten
Pflicht sein.

## Konsequenzen

- Jeder PR, der eine Datei aus `factory.lock` ändert, scheitert – gewollt. Factory-Änderungen laufen über einen
  Update-PR (`factory-update.yml`) oder einen Änderungsantrag im Factory-Repo.
- Ist `nothra/dev-factory` oder der Tag nicht erreichbar, blockiert der Check alle PRs, bis er wieder grün ist
  (fail-closed). Notfall: Check kurzzeitig aus dem Ruleset nehmen, Vorfall dokumentieren.
- Kontrolle nach der Änderung (Soll-Ist-Abgleich):

```bash
gh api repos/nothra/tch-gastro-services/rulesets/19162920 --jq \
  '{enforcement, bypass: (.bypass_actors|length),
    checks: [.rules[]|select(.type=="required_status_checks").parameters.required_status_checks[].context],
    strict: (.rules[]|select(.type=="required_status_checks").parameters.strict_required_status_checks_policy),
    merge: (.rules[]|select(.type=="pull_request").parameters.allowed_merge_methods)}'
```

  Erwartet: `checks` enthält zusätzlich `factory-integrity`, sonst unverändert.
- Beim Wechsel auf Accepted: Status oben ändern und diese ADR im Index (`docs/adr/README.md`) auf Accepted setzen.
