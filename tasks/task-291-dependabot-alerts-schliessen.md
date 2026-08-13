# Task 291: dependabot-alerts-schliessen

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die 34 offenen Dependabot-Alerts auf dem Default-Branch schließen. Primäraktion ist der
Patch-Bump `next` 16.2.10 → **≥ 16.2.12** (schließt 18 der 34 Alerts); dazu die verbleibenden
transitiven Runtime-Findings (`postcss`, `nanoid`, `brace-expansion`, `sharp`) und die
Dev-Scope-Findings (`undici` via jsdom, `js-yaml` via eslint). #169 (Aufräumen der
postcss/esbuild-Overrides) wird mitgenommen.

Spec: [`docs/specs/spec-291-dependabot-alerts-schliessen.md`](../docs/specs/spec-291-dependabot-alerts-schliessen.md)

## Akzeptanzkriterien

- [x] **AK-1** GIVEN `package.json` mit `next: 16.2.10` WHEN der Bump umgesetzt ist THEN steht
      dort `next` auf ≥ 16.2.12, und `pnpm-lock.yaml` löst dieselbe Version auf.
- [x] **AK-2** GIVEN `eslint-config-next` ist exakt auf die next-Version gepinnt WHEN `next`
      gehoben wird THEN trägt `eslint-config-next` dieselbe Version.
- [x] **AK-3** GIVEN `postcss`/`nanoid`/`brace-expansion` WHEN die aufgelösten Lockfile-Versionen
      geprüft werden THEN liegt keine unter ihrem Floor (≥ 8.5.23 / ≥ 3.3.17 / ≥ 1.1.18 bzw.
      ≥ 2.1.4).
- [x] **AK-4** GIVEN die Dev-Scope-Pakete WHEN die aufgelösten Versionen geprüft werden THEN
      liegt `undici` ≥ 7.29.0 und `js-yaml` ≥ 4.3.1.
- [ ] **AK-5** GIVEN ein Paket bleibt unter seinem Floor WHEN dafür ein Override angelegt wird
      THEN ist er konditional (`paket@<floor`) und trägt Advisory-ID, Parent und Scope im
      Kommentar. → **Konditionalität, Parent und Scope erfüllt; die GHSA-IDs der sechs neuen
      Floors fehlen noch** (siehe Blocker unten).
- [x] **AK-6** GIVEN `sharp` 0.34.5 (Floor 0.35.0, Minor) WHEN nach dem next-Bump geprüft wird
      THEN ist die aufgelöste Version ≥ 0.35.0 – entweder durch next selbst oder per Override.
- [x] **AK-7** GIVEN die bestehenden Overrides `postcss@<8.5.10` / `esbuild@<0.25.0` (#169) WHEN
      geprüft wird, ob sie noch greifen THEN ist jeder entfernt (No-op) oder begründet angepasst
      – kein toter Eintrag, kein zweiter postcss-Floor daneben.
- [x] **AK-8** GIVEN den geänderten Stand WHEN die Gates laufen THEN sind `pnpm test`,
      `typecheck`, `lint`, `format:check` und **`pnpm build`** grün.
- [ ] **AK-9** GIVEN den geänderten next-Stand WHEN Playwright läuft THEN sind Login,
      Rollen-Gate und Logout grün. → **Blockiert, Umgebung** (siehe Blocker unten).
- [ ] **AK-10** GIVEN den gemergten Stand auf `main` WHEN Dependabot neu bewertet hat THEN ist
      kein `runtime`-Alert mit high/medium mehr offen – oder jeder verbleibende ist begründet.
      → Erst nach dem Merge prüfbar (Default-Branch), planmäßig offen.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**Kein ADR-Trigger erkennbar** – das Override-Muster in `pnpm-workspace.yaml` ist mit #167/#169
etabliert, die Versionswahl ist eine Einzelfall-Entscheidung. `/architecture` kann übersprungen
werden, sofern sich in `/implement` kein struktureller Umbau ergibt.

Verifikations-Hinweise:
- `pnpm audit` ist in dieser Umgebung wegen eines Gzip-Decoding-Bugs nicht belastbar (#228) –
  maßgeblich sind die aufgelösten Lockfile-Versionen und die Dependabot-API.
- Dependabot-Alerts aktualisieren sich nur auf dem Default-Branch → AK-10 ist erst nach dem
  Merge prüfbar.
- Lockfile gehört in denselben Commit wie `package.json`/`pnpm-workspace.yaml`.

### Umsetzung /implement

**Aufgelöste Versionen nach dem Bump** (`pnpm-lock.yaml`, gegen die Floor-Tabelle der Spec):

| Paket | vorher | nachher | Floor | Weg |
|---|---|---|---|---|
| `next` | 16.2.10 | **16.2.12** | 16.2.12 | direkter Pin |
| `eslint-config-next` | 16.2.10 | **16.2.12** | – | Lockstep-Pin |
| `postcss` | 8.5.16 | **8.5.26** | 8.5.23 | Override (bestehender Eintrag angehoben) |
| `nanoid` | 3.3.15 | **3.3.18** | 3.3.17 | Override |
| `brace-expansion` (1.x) | 1.1.15 | **1.1.18** | 1.1.18 | Override |
| `brace-expansion` (2.x) | 2.1.2 | **2.1.4** | 2.1.4 | Override |
| `sharp` | 0.34.5 | **0.35.3** | 0.35.0 | Override |
| `undici` | 7.28.0 | **7.29.0** | 7.29.0 | Override |
| `js-yaml` | 4.3.0 | **4.3.1** | 4.3.1 | Override |

Der next-Bump allein hat **keinen** der transitiven Floors gehoben (nach `next@16.2.12` + Install
standen postcss/nanoid/brace-expansion/sharp/undici/js-yaml unverändert auf den alten Versionen) –
alle sechs brauchten einen Override.

**Zwei Befunde, die die Umsetzung gegenüber der Spec-Erwartung korrigiert haben:**

1. **`esbuild@<0.25.0` ist kein No-op** (AK-7 / #169). Nach dem Entfernen des Eintrags und einem
   Neu-Install löste der Baum wieder `esbuild@0.18.20` auf. Der Override bleibt deshalb stehen;
   der No-op-Verdacht aus #169 ist damit widerlegt statt bestätigt. `postcss@<8.5.10` wurde nicht
   entfernt, sondern auf `<8.5.23` **angehoben** – ein zweiter Floor daneben entfällt.
2. **Offene `>=`-Ziel-Ranges springen über die Major-Grenze.** Der erste Versuch nutzte für beide
   `brace-expansion`-Advisories die Form `paket@<floor`. Da `<2.1.4` auch auf `1.1.15` passt, hob
   der Override die von `minimatch@3` erwartete 1.x-Kopie auf 2.x – ein ungewollter Major-Bump.
   Korrektur: disjunkte Selektoren (`<1.1.18` und `>=2.0.0 <2.1.4`) plus Caret-Ziel-Ranges
   (`^1.1.18` statt `>=1.1.18`), damit die Hebung in der Major-Linie bleibt. Das weicht formal vom
   Spec-Wortlaut „`paket@<floor`" ab; die Absicht der AK-5 (Override greift **nur** unterhalb des
   Patches) ist erfüllt, die Spec-Form war für zwei Advisories desselben Pakets zu eng.

**Regressions-Guard:** `scripts/checks/tests/run-tests.sh` bekommt einen `#291`-Block, der die im
Lockfile **aufgelösten** Versionen gegen die Floor-Tabelle prüft (je Paket + Major-Linie), den
Lockstep `next` ↔ `eslint-config-next` sichert und die Konditionalität aller Override-Selektoren
erzwingt. Zwei Mutationsbelege zeigen, dass Floor-Vergleich und Konditionalitäts-Prüfung real
anschlagen und nicht vakuos grün sind. Der Block lief vor dem Bump erwartungsgemäß rot
(10 rote Tests), danach grün.

**Gates (AK-8):** `pre-commit.sh` (Lint) grün · `pre-push.sh` (Tests 678 passed/59 skipped,
Typecheck, `format:check`, Routen-Doku, Hooks) grün · `pnpm build` grün (Turbopack-Compile +
TypeScript + 9 statische Seiten) · `run-tests.sh` 965 grün / 0 rot ·
`pnpm install --frozen-lockfile` ohne Drift (CI-tauglich).

**Blocker – AK-9 (Playwright-Auth-E2E) nicht ausgeführt.** Umgebungsbedingt, keine Regression:
dieser Worktree hat kein `.env.local` (bekanntes Worktree-Problem, Root-Cause-Fix ausgelagert nach
#236), und der Docker-Daemon läuft nicht (`pnpm db:up` nicht möglich). `.env*` ist zudem in
`.claude/settings.json` schreib-/lesegesperrt, die Session kann die Datei also nicht selbst
anlegen. → Nachzuholen vor dem Merge: `pnpm db:up` + `.env.local` bereitstellen, dann
`pnpm test:e2e e2e/auth.spec.ts`. Alternativ nach dem Merge über `/post-merge-verify`.

**Blocker – AK-5 (GHSA-IDs in den Override-Kommentaren).** Die Kommentare tragen Floor,
Parent-Paket und Scope; die Advisory-IDs der sechs neuen Floors fehlen. In dieser Session sind
`gh api …/dependabot/alerts`, `pnpm view` und Web-Zugriff sämtlich nicht freigegeben, und die IDs
sind nirgends im Repo hinterlegt – geraten wird nicht. → Nachzutragen, sobald die Alert-Liste
zugänglich ist.

## Offene Fragen

- [ ] Verhältnis zu #231: `next` ist dort ebenfalls gelistet. Nach dem Merge dort streichen,
      damit kein erledigter Punkt stehen bleibt (Aufräum-Schritt für `/pr-shepherd` bzw.
      `/codify`, kein Blocker).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/291-dependabot-alerts-schliessen`
Erstellt: 2026-08-12 21:55
