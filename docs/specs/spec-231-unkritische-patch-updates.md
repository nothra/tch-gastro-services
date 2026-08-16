# Spec: Unkritische Patch-/Minor-Updates (react, prettier, tailwind, tsx, playwright, vitejs-plugin-react)

## Kontext

`pnpm outdated` zeigte zum Zeitpunkt der Issue-Erstellung mehrere Pakete mit ausstehenden
Patch-/Minor-Updates ohne Breaking-Change-Risiko laut SemVer. `next` wurde bereits über #291
(Dependabot-Alerts) auf 16.2.12 angehoben und ist im Issue-Text bereits gestrichen.

**Ist-Stand, in der Requirements-Phase frisch gegen `pnpm outdated` und `package.json`
verifiziert** (nicht aus dem Issue-Text übernommen – der Issue-Text ist zwei Wochen alt und in
zwei Punkten überholt, siehe unten):

| Paket | installiert | Issue-Ziel | tatsächlich neueste (heute) | Deklaration in `package.json` |
|---|---|---|---|---|
| react | 19.2.4 | 19.2.8 | 19.2.8 | exakt (kein Caret) |
| react-dom | 19.2.4 | 19.2.8 | 19.2.8 | exakt (kein Caret) |
| prettier | 3.9.4 | 3.9.6 | 3.9.6 | `^3.9.4` |
| tailwindcss | 4.3.2 | 4.3.3 | 4.3.3 | `^4` |
| @tailwindcss/postcss | 4.3.2 | 4.3.3 | 4.3.3 | `^4` |
| tsx | 4.23.0 | 4.23.1 | **4.23.12** | `^4.23.0` |
| @vitejs/plugin-react | 6.0.3 | 6.0.4 | **6.0.5** | `^6.0.3` |
| @playwright/test | 1.61.1 | 1.62.0 | **1.62.1** | `^1.61.1` |
| eslint-config-next | 16.2.10 | 16.2.11 | **16.3.1 (Minor, an next gekoppelt)** | exakt, `16.2.12` (bereits durch #291 gehoben) |

**Zwei Abweichungen vom Issue-Text, in dieser Phase festgestellt:**

1. **`tsx`, `@vitejs/plugin-react`, `@playwright/test`:** Seit Issue-Erstellung sind neuere
   Patches erschienen (`4.23.1→4.23.12`, `6.0.4→6.0.5`, `1.62.0→1.62.1`). Ziel ist die
   **aktuell neueste** Version je Paket, nicht die im Issue genannte – sonst stünde direkt nach
   dem Merge der nächste Patch an (gleiche Begründung wie bei `next`/16.2.12 in #291).
2. **`eslint-config-next` ist aus dem Scope genommen.** #291 hat es bereits (lockstep mit
   `next`) auf 16.2.12 gehoben – das Issue-Ziel (16.2.11) ist damit bereits übertroffen. Der
   einzige verbleibende Schritt wäre 16.3.1, aber das ist ein **Minor-Sprung von `next`
   selbst** (`eslint-config-next` ist exakt an die next-Version gekoppelt, siehe
   `spec-291-dependabot-alerts-schliessen.md` „Lockstep-Bump"). `next` auf 16.3.x zu heben ist
   explizit **nicht** Teil dieses Issues (dort bereits gestrichen) – ein isolierter
   `eslint-config-next`-Bump auf 16.3.1 würde genau den Versions-Split zwischen Framework und
   Lint-Config erzeugen, den der Lockstep verhindern soll. Deshalb bleibt `eslint-config-next`
   in diesem Task unverändert.

**Zusätzlich als outdated, aber nicht im Scope:** `pnpm outdated` zeigt weitere veraltete
Pakete (`@testing-library/user-event`, `@types/react`, `@types/react-dom`, `@types/pg`,
`@testing-library/jest-dom`, `@types/node`, `eslint`, `jsdom`, `typescript`). Keines davon
steht im Issue-Text – nach dem „Scope einhalten"-Prinzip (kein Gold-Plating) bleiben sie
unangetastet, auch wo es sich um reine Patches handelt (z. B. `@types/react`
19.2.17→19.2.18). Mehrere sind ohnehin Major-Sprünge (`typescript` 5→7, `eslint` 9→10,
`jsdom` 29→30, `@types/node` 20→26) und damit klar außerhalb von „unkritisch".

## Scope

**Inbegriffen:**

- Anheben der folgenden Pakete auf die jeweils aktuell neueste Version (Stand
  Requirements-Phase, siehe Tabelle):
  - `react` → 19.2.8 (exakte Version in `package.json`, wie bisher kein Caret)
  - `react-dom` → 19.2.8 (exakte Version, wie bisher kein Caret)
  - `prettier` → 3.9.6
  - `tailwindcss` → 4.3.3
  - `@tailwindcss/postcss` → 4.3.3
  - `tsx` → 4.23.12
  - `@vitejs/plugin-react` → 6.0.5
  - `@playwright/test` → 1.62.1
- Entsprechende Aktualisierung von `pnpm-lock.yaml` im selben Commit.
- Volle Gates + `pnpm build` (Lesson #137/#193: Lint/Vitest fangen keine Build-/
  Turbopack-Fehler) + `pnpm test:e2e` (Playwright-Update betrifft den Test-Runner selbst).

**Nicht inbegriffen:**

- **`eslint-config-next` / `next`:** siehe „Kontext" – beide bleiben unverändert in diesem Task.
- **Alle sonstigen von `pnpm outdated` gemeldeten Pakete**, die nicht im Issue-Text stehen
  (s. Tabelle „Zusätzlich als outdated"). Eigener Task bei Bedarf.
- **Kein Umbau der `pnpm-workspace.yaml`-Overrides.** Keines der acht Zielpakete ist dort
  referenziert (geprüft) – kein Interaktionsrisiko mit den bestehenden
  Security-Overrides aus #167/#169/#291.
- **Kein neues Verhalten in der App.** Reines Dependency-Update, `tech-debt`/`enhancement` –
  bestehende Tests bleiben unverändert grün, es entstehen keine neuen Produkt-Tests.

## Akzeptanzkriterien

- [ ] **AK-1** GIVEN `package.json` mit den acht Zielpaketen auf ihrer jeweils alten Version
      WHEN der Bump umgesetzt ist THEN steht jedes auf der in der Scope-Tabelle genannten
      Zielversion, und `pnpm-lock.yaml` löst jedes Paket auf dieselbe Version auf (Prüfung via
      `pnpm why <paket>` bzw. Lockfile-Eintrag, nicht nur die Deklaration in `package.json`).
- [ ] **AK-2** GIVEN `eslint-config-next` und `next` WHEN der Task abgeschlossen ist THEN sind
      beide **unverändert** (16.2.12) – kein isolierter Lint-Config-Bump ohne den gekoppelten
      next-Bump.
- [ ] **AK-3** GIVEN den geänderten Dependency-Stand WHEN `pnpm install` läuft THEN terminiert
      es ohne Peer-Dependency-Konflikte oder -Warnungen für die acht Zielpakete.
- [ ] **AK-4** GIVEN den geänderten Stand WHEN die Gates laufen THEN sind `pnpm lint`,
      `pnpm typecheck`, `pnpm test`, `pnpm format:check` und **`pnpm build`** grün.
- [ ] **AK-5** GIVEN den geänderten Stand (insbesondere `@playwright/test` 1.61.1→1.62.1)
      WHEN `pnpm test:e2e` läuft THEN ist die vollständige Playwright-Suite grün.
- [ ] **AK-6** GIVEN die in „Nicht inbegriffen" gelisteten, ebenfalls veralteten Pakete WHEN der
      Task abgeschlossen ist THEN sind sie **unverändert** – kein Gold-Plating über den
      Issue-Scope hinaus.

## Fehlerszenarien

- [ ] **`react`/`react-dom` 19.2.8 bricht Typecheck oder Build.** → Kein Rückbau auf 19.2.4
      ohne Ursachenbenennung (Typ-Drift in `@types/react`/`@types/react-dom`, die hier bewusst
      NICHT mitgehoben werden, s. Scope). Tritt das auf, wird es als Blocker eskaliert statt
      den Alert/Patch-Bump stillschweigend zu überspringen.
- [ ] **`@vitejs/plugin-react` 6.0.5 oder `tsx` 4.23.12 ändert das Vitest-/Build-Verhalten.**
      → Vollständiger `pnpm test`-Lauf muss weiterhin 100 % der bisherigen Tests grün liefern;
      ein neu rot werdender, vorbestehender Test ist eine Regression dieses Bumps, keine
      Umgebungs-Flakiness (Lesson `factory-workflow.md` „Vorbestehenden … Testfehlschlag …
      belegen").
- [ ] **`@playwright/test` 1.62.1 ändert Runner-Verhalten (z. B. Timeouts, Selektoren-API).**
      → `pnpm test:e2e` muss lokal vor Fertigmeldung tatsächlich ausgeführt werden, nicht nur
      angenommen grün zu sein.
- [ ] **Lockfile-Drift zwischen lokal und CI.** → Das geänderte `pnpm-lock.yaml` gehört in
      denselben Commit wie `package.json`.
- [ ] **Peer-Dependency-Warnung durch `react`/`react-dom` 19.2.8 gegen ein drittes Paket, das
      eine engere Range deklariert.** → `pnpm install`-Output auf neue `WARN`-Zeilen zu diesen
      Paketen prüfen, nicht nur den Exit-Code.

## Offene Fragen

- [x] Zielversionen für `tsx`, `@vitejs/plugin-react`, `@playwright/test`: Issue-Text oder
      aktuell neueste Patch-Version? → **Aktuell neueste** (Nutzer-Entscheidung dieser Phase,
      analog zur next-16.2.12-Entscheidung in #291).
- [x] Bleibt `eslint-config-next` im Scope, obwohl im Issue gelistet? → **Nein** – Ziel bereits
      durch #291 übertroffen, verbleibender Schritt ist ein an `next` gekoppelter Minor-Sprung
      außerhalb dieses Issues.
- [x] Werden die zusätzlichen, von `pnpm outdated` gemeldeten, aber nicht im Issue stehenden
      Pakete mitgenommen? → **Nein**, Scope-Disziplin (Kein Gold-Plating).
- [ ] **Kein ADR-Trigger erkennbar.** Reines Dependency-Update ohne strukturelle Entscheidung –
      `/architecture` kann übersprungen werden, sofern sich in `/implement` kein struktureller
      Umbau ergibt.
