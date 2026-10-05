# Security Review: Task 390

Scope: `git diff origin/main...HEAD`. Geändert sind `package.json`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml` (Overrides plus Kommentare), `scripts/checks/tests/run-tests.sh`
(Floor-Guard), außerdem Doku und Task-Dateien. Produktionscode unter `app/`, `db/` und `lib/` ist
nicht berührt.

## Kritische Findings (Blocker)

Keine.

## Wichtige Findings

Keine im Scope.

## Hinweise

- [x] [Dependencies] **Zielversionen frei von bekannten Advisories, live verifiziert.**
  `pnpm audit` scheitert in dieser Sandbox (Lesson #228). Deshalb lief die npm-Bulk-Advisory-API
  (`registry.npmjs.org/-/npm/v1/security/advisories/bulk`) direkt gegen die aufgelösten
  Versionen: `next`/`@next/env` 16.3.8, `undici` 7.30.0, `brace-expansion` 1.1.21 / 2.1.7 / 5.0.12,
  `postcss` 8.5.23 / 8.5.26, `sharp` 0.35.4, `nanoid` 3.3.18, `esbuild` 0.25.12 / 0.28.1,
  `uuid` 14.0.1 und `next-auth` 5.0.0-beta.32. Ergebnis: `{}`, also keine Advisories.
  **Gegenprobe**, damit ein leeres Ergebnis kein stilles Fehlsignal ist: Die Altversionen
  (`next` 16.3.5, `undici` 7.29.0, `brace-expansion` 1.1.18) liefern dieselbe API-Abfrage mit
  GHSA-vcvr-r3jv-pc5j (critical, `>=16.2.0 <16.3.6`), elf undici-Advisories (alle `<7.29.1`) und
  den brace-expansion-Advisories bis `<1.1.21`. Die Floors im Diff decken damit auch die
  undici-Advisories ab, die Dependabot nicht einzeln gemeldet hatte (u. a. GHSA-rfgv-xxqx-mfg5,
  GHSA-3wwx-pv8p-q78v, GHSA-3xpg-4rpp-hhhm, GHSA-rx4f-c7p8-82vq, alle mit Floor 7.29.1).
- [x] [Dependencies] **Override-Selektoren sind Major-sicher.** `undici@>=7.0.0 <7.29.1` hat
  jetzt eine untere Schranke und hebt eine 6.x-Kopie nicht mehr über die Major-Grenze (#291-Klasse).
  Die drei brace-expansion-Selektoren sind disjunkt, alle Ziel-Ranges sind Carets in der Fix-Linie.
  Die 6.x-Lücke (eigener Floor 6.28.1) bewacht der neue Vorsorge-Fall samt Mutationsbeleg.
- [x] [Dependencies] **Keine neuen Dependencies.** `next` und `eslint-config-next` bleiben exakt
  gepinnt (16.3.8). Es gibt keine neuen Top-Level-Pakete und keine neuen `allowBuilds`-Einträge.
- [ ] [Dependencies] **Vorbestehend, außerhalb des Diffs: `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm
  (high, DoS/CWE-674, `<=3.0.3`).** Gefunden beim Abgleich des **gesamten** Lockfiles
  (704 Pakete) gegen dieselbe API. Das ist der einzige Treffer im ganzen Baum. Herkunft nur dev:
  `@next/eslint-plugin-next` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces`. Der Eintrag
  liegt identisch auf `main`. 3.0.3 ist `latest`, ein Fix existiert nicht, also gibt es auch kein
  Override-Ziel. Ausnutzbar ist der Fund kaum, denn die Muster stammen aus der Repo-Konfiguration
  und nicht aus Nutzereingaben. Als Tracking-Issue angelegt (Zweifelsregel ADR-043): **#396**
  (`enhancement` + `security` + `tech-debt` + `factory-pipeline`).
  **Folge für AK4:** Nach dem Merge bleibt voraussichtlich genau dieser Alert offen. Er ist eine
  begründete Restausnahme im Sinne des AK, Begründung und Folgeschritt stehen in #396.
- [x] [Secrets/Config] Keine Secrets, Tokens oder Env-Werte im Diff. Die Notiz zu
  `AUTH_TRUST_HOST=true` in der Task-Datei betrifft nur die lokale `next start`-Verifikation,
  an der Konfiguration ändert sich nichts.
- [x] [Command Injection] Die neuen Testzeilen in `run-tests.sh` nutzen `mktemp` plus
  `printf` mit festen Literalen und `grep -qxF --` mit festen Mustern. Es fließt kein externer
  Input in die Shell.
- [x] [Kleinfunde-Drift] Der neue `kleinfunde.md`-Anker `run-tests.sh:5638` zeigt auf die
  `undici|6`-Zeile in `floor_cases_291`, der Wo-Teil stimmt. Den gelöschten Eintrag „Override-Selektor
  ohne untere Schranke" erledigt `>=7.0.0` tatsächlich.

Nicht anwendbar, weil der Diff keinen Code dafür enthält: Input-Validierung/XSS/SQL-Injection,
AuthN/AuthZ/IDOR, Kryptographie, Error-Handling.

## Ergebnis

PASSED
