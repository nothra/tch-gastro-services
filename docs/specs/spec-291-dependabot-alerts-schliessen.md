# Spec: Offene Dependabot-Alerts schließen (next 16.2.12 + transitive)

## Kontext

Dependabot meldet auf dem Default-Branch **34 offene Alerts** (19 high, 15 moderate), die bisher
kein eigenes Issue trugen. #231 ist bewusst als „**unkritische** Patch-Updates" gescoped – ein
Teil der hier gelisteten Findings ist aber **high** und **runtime-scope**, betrifft also die
deployte App. Dieses Issue macht sie als eigenständige `security`-Aufgabe sichtbar.

**Ist-Stand, in der Requirements-Phase frisch gegen
`gh api repos/nothra/tch-gastro-services/dependabot/alerts?state=open` und `pnpm-lock.yaml`
verifiziert** (nicht aus dem Issue-Text übernommen):

| Paket | installiert | Scope | Alerts | Floor | Herkunft im Lockfile |
|---|---|---|---|---|---|
| `next` | 16.2.10 | runtime | 18 (9 Advisories × 2 Manifeste) | 16.2.11 | direkte Dependency |
| `brace-expansion` | 1.1.15 / 2.1.2 | runtime | 5 high | 1.1.18 / 2.1.4 | `minimatch@3.1.5` / `minimatch@5.1.9` |
| `undici` | 7.28.0 | development | 5 (1 high, 4 medium) | 7.29.0 | `jsdom` (Vitest-Environment) |
| `postcss` | 8.5.16 | runtime | 2 (1 high, 1 medium) | 8.5.18 / 8.5.23 | `next` (Build-Zeit) |
| `nanoid` | 3.3.15 | runtime | 2 high | 3.3.16 / 3.3.17 | `postcss` |
| `sharp` | 0.34.5 | runtime | 1 high | **0.35.0** | `next` (optionale Dep, Bildoptimierung) |
| `js-yaml` | 4.3.0 | development | 1 high | 4.3.1 | `eslint` |

**Zwei Abweichungen vom Issue-Text**, in dieser Phase festgestellt und mit dem Nutzer entschieden:

1. Das Issue nennt **16.2.11** als Ziel. Inzwischen ist **16.2.12** veröffentlicht – ebenfalls
   ein Patch derselben 16.2-Linie, gleiches Risikoprofil. Ziel ist deshalb **≥ 16.2.12**, damit
   nicht unmittelbar nach dem Merge der nächste Bump ansteht. (`16.3.0` wäre `latest`, aber ein
   Minor-Sprung – bewusst nicht gewählt, weil das dem „geringes Breaking-Change-Risiko"-Argument
   des Issues widerspricht.)
2. Das Issue führt `sharp` unter „Floor-Bumps" auf. Tatsächlich ist `0.34.5 → 0.35.0` ein
   **Minor**-Bump einer nativen Bibliothek, kein Patch – das ist eine andere Risikoklasse und
   wird deshalb separat behandelt (siehe AK-6).

**Reachability-Einordnung** (Issue-Vorgabe: je Advisory kurz einordnen): Für eine
nicht-kommerzielle Vereins-App mit kleinem Nutzerkreis sind DoS- und Cache-Poisoning-Advisories
gering relevant. Ernst wäre allein ein **Middleware-/Auth-Bypass**, weil `proxy.ts` die
Rollen-Gates trägt (ADR-016, `lib/authz.ts`). Genau deshalb ist der Auth-E2E-Lauf ein eigenes
Akzeptanzkriterium und nicht nur „nice to have".

## Scope

**Inbegriffen:**

- **Primäraktion:** `next` von 16.2.10 auf **≥ 16.2.12** in `package.json` + `pnpm-lock.yaml`.
- **Lockstep-Bump von `eslint-config-next`**: steht in `devDependencies` exakt auf `16.2.10`
  (kein Caret) und ist bewusst an die next-Version gekoppelt – wird im selben Schritt auf
  dieselbe Version gehoben. Ohne das entsteht ein Versions-Split zwischen Framework und seiner
  Lint-Config.
- **Verbleibende Runtime-Alerts** nach dem next-Bump schließen: `postcss` (≥ 8.5.23),
  `nanoid` (≥ 3.3.17), `brace-expansion` (≥ 1.1.18 bzw. ≥ 2.1.4). Weg: erst prüfen, ob der
  next-Bump bzw. ein Lockfile-Refresh sie ohnehin hebt; nur die dann noch verbleibenden per
  **konditionalem Override** (`paket@<floor`) in `pnpm-workspace.yaml` – nach dem bestehenden
  Muster aus #167, inklusive Begründungs-Kommentar (Advisory-ID + Parent + Scope).
- **`sharp`:** nach dem next-Bump prüfen, ob next 16.2.12 selbst `sharp ≥ 0.35.0` zieht. Nur
  falls nicht, per Override erzwingen (Nutzer-Entscheidung, siehe „Offene Fragen"). Ein
  Override, der ohnehin ein No-op wäre, wird nicht angelegt.
- **Dev-Scope-Alerts** im selben Durchgang: `undici` (≥ 7.29.0, via `jsdom`) und `js-yaml`
  (≥ 4.3.1, via `eslint`). Nicht in Prod ausgeliefert, deshalb nachrangig priorisiert – aber
  im Scope (Nutzer-Entscheidung).
- **#169 miterledigen:** die bestehenden Overrides `postcss@<8.5.10` und `esbuild@<0.25.0` in
  `pnpm-workspace.yaml` daraufhin prüfen, ob `next`/`drizzle-kit` die Patches inzwischen selbst
  mitbringen. Sind sie No-ops, werden sie entfernt (keine tote Config); wird ein `postcss`-Floor
  weiterhin gebraucht, wird der bestehende Eintrag **angehoben** statt ein zweiter danebengelegt.
- **Verifikation je Paket** über die tatsächlich aufgelöste Version im Lockfile (`pnpm why` bzw.
  Lockfile-Prüfung), nicht über die Deklaration in `package.json` – ein Override wirkt erst,
  wenn er sich im Lockfile niederschlägt.
- **Verifikation der App:** `pnpm build` plus vollständige Gates plus **Playwright-Auth-E2E**
  (Login, Rollen-Gate, Logout).

**Nicht inbegriffen:**

- **Kein Minor-/Major-Sprung auf `next` 16.3.x.** Bewusste Entscheidung dieser Phase; ein
  Framework-Minor-Upgrade ist ein eigener Task mit eigenem Risikoprofil.
- **Keine sonstigen Dependency-Updates aus #231** (react, prettier, tailwind, tsx, playwright).
  Dieser Task fasst ausschließlich Pakete an, die einen offenen Alert tragen. Überschneidung mit
  #231 ist allein `next` – siehe „Offene Fragen".
- **Kein Umbau des Alert-Prozesses** (kein Dependabot-Auto-Merge, keine neue CI-Stage, kein
  `pnpm audit`-Gate). Reines Schließen des aktuellen Rückstands.
- **Kein Refactoring** an `pnpm-workspace.yaml` über die betroffenen Override-Einträge hinaus.
- **Kein neues Verhalten in der App.** Die Task ist `tech-debt`/`security`, nicht `feature` –
  bestehende Tests dürfen unverändert grün bleiben, es entstehen keine neuen Produkt-Tests.

## Akzeptanzkriterien

- [ ] **AK-1** GIVEN `package.json` mit `next: 16.2.10` WHEN der Bump umgesetzt ist THEN steht
      dort `next` auf **≥ 16.2.12**, und `pnpm-lock.yaml` löst `next` auf dieselbe Version auf.
- [ ] **AK-2** GIVEN `eslint-config-next` ist in `devDependencies` exakt auf die next-Version
      gepinnt WHEN `next` gehoben wird THEN trägt `eslint-config-next` **dieselbe** Version –
      kein Split zwischen Framework und Lint-Config.
- [ ] **AK-3** GIVEN die Runtime-Pakete `postcss`, `nanoid`, `brace-expansion` WHEN man nach der
      Umsetzung die im Lockfile aufgelösten Versionen prüft THEN liegt **keine** davon unterhalb
      ihres Floors (`postcss` ≥ 8.5.23, `nanoid` ≥ 3.3.17, `brace-expansion` ≥ 1.1.18 für die
      1.x-Kopie und ≥ 2.1.4 für die 2.x-Kopie).
- [ ] **AK-4** GIVEN die Dev-Scope-Pakete WHEN man die aufgelösten Versionen prüft THEN liegt
      `undici` ≥ 7.29.0 und `js-yaml` ≥ 4.3.1.
- [ ] **AK-5** GIVEN ein Paket, das nach dem next-Bump noch unter seinem Floor liegt WHEN dafür
      ein Override in `pnpm-workspace.yaml` angelegt wird THEN ist er **konditional**
      (`paket@<floor`, greift nur unterhalb des Patches) und trägt einen Kommentar mit
      Advisory-ID, Parent-Paket und Scope – nach dem Muster der bestehenden Einträge.
- [ ] **AK-6** GIVEN `sharp` steht auf 0.34.5 (Floor 0.35.0, Minor-Bump) WHEN nach dem next-Bump
      geprüft wird, welche Version aufgelöst wird THEN gilt entweder: next zieht bereits
      ≥ 0.35.0 (kein Override nötig), ODER es existiert ein konditionaler Override, der ≥ 0.35.0
      erzwingt – und in beiden Fällen ist die aufgelöste Version im Lockfile ≥ 0.35.0.
- [ ] **AK-7** GIVEN die bestehenden Overrides `postcss@<8.5.10` und `esbuild@<0.25.0` (#169)
      WHEN nach dem next-Bump geprüft wird, ob sie noch greifen THEN ist jeder von ihnen
      entweder **entfernt** (weil No-op) oder **begründet angepasst** – es bleibt kein Eintrag
      zurück, der nachweislich nichts mehr bewirkt, und es entsteht kein zweiter `postcss`-Floor
      neben dem bestehenden.
- [ ] **AK-8** GIVEN den geänderten Dependency-Stand WHEN die Gates laufen THEN sind
      `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` und **`pnpm build`** grün.
      `pnpm build` ist explizit gefordert, weil Lint/Vitest keine Turbopack-/Bundling-Fehler
      fangen (Lesson aus #137/#193).
- [ ] **AK-9** GIVEN den geänderten next-Stand WHEN der Playwright-E2E-Lauf ausgeführt wird
      THEN sind die Auth-Pfade grün: Login mit gültigen Credentials, Rollen-Gate (Zugriff auf
      eine rollengeschützte Route wird für die falsche Rolle abgewiesen) und Logout. Begründung:
      Middleware-/Auth-Bypass ist das einzige Advisory-Szenario mit ernster Auswirkung für
      diese App.
- [ ] **AK-10** GIVEN den gemergten Stand auf `main` WHEN Dependabot die Alerts neu bewertet hat
      THEN ist **kein** Alert mit Scope `runtime` und Severity `high`/`medium` mehr offen; für
      jeden dennoch verbleibenden Alert steht im PR bzw. in der Task-Datei eine explizite
      Begründung, warum er nicht geschlossen werden konnte.

## Fehlerszenarien

- [ ] **Der next-Bump bricht Build oder Typecheck.** → Kein „Fix durch Rückbau auf 16.2.11":
      erst die Ursache benennen (Breaking Change im Patch, Typ-Drift in `@types/*`), dann
      entscheiden. Bleibt es dabei, ist das ein Blocker, der eskaliert wird, statt still den
      Alert offenzulassen.
- [ ] **Ein Override erzwingt eine Version, die einen Peer-Konflikt auslöst** (z. B.
      `sharp ≥ 0.35.0` gegen die von next erwartete Range). → `pnpm install` schlägt fehl oder
      warnt; in dem Fall Override zurücknehmen und den Alert als bewusst offen dokumentieren
      (AK-10 zweiter Halbsatz), statt den Konflikt zu übergehen.
- [ ] **`sharp`-Minor-Bump bricht die Bildoptimierung zur Laufzeit** – ein Fehler, den weder
      Unit-Tests noch `pnpm build` zeigen, weil `sharp` erst beim Ausliefern eines optimierten
      Bildes greift. → `sharp` steht in `allowBuilds` (nativer Post-Install-Build); nach dem
      Bump muss `pnpm install` den Build fehlerfrei durchlaufen.
- [ ] **Ein neu angelegter Override ist ein No-op**, weil der Parent die gepatchte Version
      ohnehin zieht. → Erzeugt genau die tote Config, die #169 beseitigen will. Deshalb prüft
      AK-6/AK-7 die **aufgelöste** Lockfile-Version, nicht die Existenz des Eintrags.
- [ ] **`pnpm audit` ist in dieser Umgebung nicht nutzbar** – es scheitert an einem
      Gzip-Decoding-Bug (Lesson aus #228). → Maßgeblich für die Verifikation sind (a) die im
      Lockfile aufgelösten Versionen gegen die Floor-Tabelle und (b) die Dependabot-API. Ein
      grünes/rotes `pnpm audit` ist **kein** belastbares Kriterium für AK-3/AK-4.
- [ ] **Dependabot-Alerts aktualisieren sich nur auf dem Default-Branch.** → Auf dem
      Feature-Branch ist AK-10 nicht prüfbar; dort gilt die Lockfile-Prüfung. AK-10 wird nach
      dem Merge verifiziert.
- [ ] **Lockfile-Drift zwischen lokal und CI.** → CI installiert mit gefrorenem Lockfile; ein
      lokal erzeugter, aber nicht committeter `pnpm-lock.yaml`-Stand lässt CI rot werden. Das
      geänderte Lockfile gehört in denselben Commit wie `package.json`/`pnpm-workspace.yaml`.

## Offene Fragen

- [x] Ziel-Version für `next`: 16.2.11 (Issue-Text), 16.2.12 (neuester Patch) oder 16.3.0
      (latest)? → **16.2.12** (Nutzer-Entscheidung dieser Phase).
- [x] Gehören die Dev-Scope-Alerts (`undici`, `js-yaml`) in den Scope? → **Ja**, im selben
      Durchgang (Nutzer-Entscheidung).
- [x] Wird #169 (postcss/esbuild-Override-Aufräumen) hier miterledigt? → **Ja** (AK-7).
- [x] Wie mit dem `sharp`-Minor-Bump umgehen? → **Erst nach dem next-Bump entscheiden**: nur
      dann ein Override, wenn next nicht ohnehin ≥ 0.35.0 zieht (AK-6, Nutzer-Entscheidung).
- [x] Verifikationstiefe? → **Gates + `pnpm build` + Auth-E2E lokal** (AK-8/AK-9);
      `/post-merge-verify` bewusst nicht Teil dieses Tasks.
- [ ] **Verhältnis zu #231:** Dieser Task hebt `next`, das dort ebenfalls gelistet ist. Nach dem
      Merge sollte `next` in #231 gestrichen werden, damit dort kein bereits erledigter Punkt
      stehen bleibt. Kein Blocker für die Umsetzung – Aufräum-Schritt für `/pr-shepherd` bzw.
      `/codify`.
- [ ] **Kein ADR-Trigger erkennbar.** Es entsteht keine neue Architekturentscheidung: das
      Override-Muster in `pnpm-workspace.yaml` ist mit #167/#169 etabliert, die Version-Pin-Wahl
      ist eine Einzelfall-Entscheidung. `/architecture` kann damit übersprungen werden – sofern
      sich in `/implement` nicht doch ein struktureller Umbau ergibt.
