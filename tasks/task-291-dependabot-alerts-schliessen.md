# Task 291: dependabot-alerts-schliessen

## Status
- [ ] In Bearbeitung
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

- [ ] **AK-1** GIVEN `package.json` mit `next: 16.2.10` WHEN der Bump umgesetzt ist THEN steht
      dort `next` auf ≥ 16.2.12, und `pnpm-lock.yaml` löst dieselbe Version auf.
- [ ] **AK-2** GIVEN `eslint-config-next` ist exakt auf die next-Version gepinnt WHEN `next`
      gehoben wird THEN trägt `eslint-config-next` dieselbe Version.
- [ ] **AK-3** GIVEN `postcss`/`nanoid`/`brace-expansion` WHEN die aufgelösten Lockfile-Versionen
      geprüft werden THEN liegt keine unter ihrem Floor (≥ 8.5.23 / ≥ 3.3.17 / ≥ 1.1.18 bzw.
      ≥ 2.1.4).
- [ ] **AK-4** GIVEN die Dev-Scope-Pakete WHEN die aufgelösten Versionen geprüft werden THEN
      liegt `undici` ≥ 7.29.0 und `js-yaml` ≥ 4.3.1.
- [ ] **AK-5** GIVEN ein Paket bleibt unter seinem Floor WHEN dafür ein Override angelegt wird
      THEN ist er konditional (`paket@<floor`) und trägt Advisory-ID, Parent und Scope im
      Kommentar.
- [ ] **AK-6** GIVEN `sharp` 0.34.5 (Floor 0.35.0, Minor) WHEN nach dem next-Bump geprüft wird
      THEN ist die aufgelöste Version ≥ 0.35.0 – entweder durch next selbst oder per Override.
- [ ] **AK-7** GIVEN die bestehenden Overrides `postcss@<8.5.10` / `esbuild@<0.25.0` (#169) WHEN
      geprüft wird, ob sie noch greifen THEN ist jeder entfernt (No-op) oder begründet angepasst
      – kein toter Eintrag, kein zweiter postcss-Floor daneben.
- [ ] **AK-8** GIVEN den geänderten Stand WHEN die Gates laufen THEN sind `pnpm test`,
      `typecheck`, `lint`, `format:check` und **`pnpm build`** grün.
- [ ] **AK-9** GIVEN den geänderten next-Stand WHEN Playwright läuft THEN sind Login,
      Rollen-Gate und Logout grün.
- [ ] **AK-10** GIVEN den gemergten Stand auf `main` WHEN Dependabot neu bewertet hat THEN ist
      kein `runtime`-Alert mit high/medium mehr offen – oder jeder verbleibende ist begründet.

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
