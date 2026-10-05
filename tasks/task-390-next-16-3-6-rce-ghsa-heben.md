# Task 390: next-16-3-6-rce-ghsa-heben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Sicherheits-Deps-Durchgang (Issue #390): `next` 16.3.5 → ≥ 16.3.6 (kritisch, GHSA-vcvr-r3jv-pc5j) und alle weiteren offenen Dependabot-Alerts (14 gesamt): `brace-expansion` (6, bis high), `undici` (6, bis high, nur dev). Spec: `docs/specs/spec-390-security-deps-durchgang.md`. Details und Verifikation siehe Issue #390.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] `next` ≥ 16.3.6 aufgelöst (Alerts #65, #80) – gepinnt und aufgelöst: 16.3.8
- [x] `brace-expansion` ≥ 1.1.21 bzw. ≥ 2.1.7 (Alerts #74–#79) – aufgelöst: 1.1.21 / 2.1.7 / 5.0.12
- [x] `undici` ≥ 7.29.1 (Alerts #64, #67–#69, #72, #73) – aufgelöst: 7.30.0
- [ ] Dependabot meldet keine offenen Alerts mehr (oder begründete Restausnahme) – **erst nach dem Merge prüfbar:** Dependabot wertet nur den Default-Branch aus, der Feature-Branch schließt keine Alerts. Nachweis über `gh api repos/nothra/tch-gastro-services/dependabot/alerts?state=open` nach dem Merge.
  Erwartete Restausnahme laut `/security-review`: `braces@3.0.3` (GHSA-vfj7-8cjw-p6xm). Das Paket
  ist dev-only, ein Fix existiert nicht, und es liegt schon auf `main`. Getrackt in #396.
- [x] Build, Auth-E2E, `next/image`-Rauchtest, PWA-Build grün (PWA = Manifest, siehe Notizen)
- [x] #169 (postcss-Override) neu bewertet – bleibt entfernt

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- **ADR-Trigger-Check:** keine Kategorie (Patch-Bump innerhalb 16.3.x, Overrides auf neue Floors).
- **Floors aus den Advisory-Volllisten** (`gh api advisories/<ghsa>`, alle Major-Linien, Lesson #231),
  nicht nur aus der Dependabot-Alert-Range: GHSA-q2hr-2g5m-vwhr setzt brace-expansion 1.1.21 /
  2.1.7 / 3.0.9 / 5.0.12. Die 4.x/5.x-Linie hat keinen eigenen Alert, weil der Baum schon 5.0.12
  auflöst. Der Selektor wurde trotzdem auf `<5.0.12` gehoben, denn minimatch@10 deklariert nur
  ^5.0.5. Der Override ist damit die einzige durable Zusicherung (Logik wie #339).
- **undici-Selektor nach unten begrenzt** (`>=7.0.0 <7.29.1`): das alte `<7.29.0` hätte eine
  6.x-Kopie über die Major-Grenze gehoben (die 6er-Linie hat einen eigenen Fix 6.28.1,
  GHSA-r53p-7pc4-xj5r). Heute liegt keine 6.x im Baum.
- **next 16.3.8 statt 16.3.6:** neuester 16.3.x-Patch (2026-09-30), Spec-Q2 erlaubt das.
  postcss bleibt exakt 8.5.23 (#169 unverändert erledigt), sharp ^0.35.4 → 0.35.4.
- **TDD:** bestehender Floor-Guard in `scripts/checks/tests/run-tests.sh` angehoben (kein zweiter
  daneben): RED = 8 rote Fälle (Floors, next-Pin ≥ 16.3.6, Override-Zeilen), GREEN nach Bump +
  `pnpm install`: 1565 grün / 0 rot.
- **Gates:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test` (1425 grün,
  112 DB-Skips wie üblich), `pnpm build` grün.
- **Laufzeit-Verifikation gegen `next start` (16.3.8, Port 3390)**, nicht gegen `next dev`. Ein
  fremder Dev-Server auf 3000 wird so nicht genutzt (Lesson #368), und es entsteht kein
  `CLAUDE.md`-Block (Lesson #337):
  - `/_next/image?url=/favicon.ico` (matcher-ausgenommen, temporäres PNG) → 200 `image/webp`,
    32×32 VP8. Gegenprobe `icon-dev.svg` → erwartetes 400 („image type is not allowed").
  - Auth-E2E 5/5 grün. Die ganze E2E-Suite: 14 grün, 0 rot, 17 Opt-in-Skips (datenanlegende
    Specs, nicht im Scope).
  - Prod-Modus braucht für Auth.js `AUTH_TRUST_HOST=true`, sonst `UntrustedHost`. Das betrifft
    nur die Umgebung, es ist keine Regression: Vercel und `next dev` setzen das implizit.
- **PWA-AK angepasst:** `@serwist/next` ist trotz ADR-014 nicht installiert, es gibt keinen Service
  Worker. Geprüft wurde das Manifest (`○ /manifest.webmanifest` im Build). Spec-Q3 vermerkt.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->
- **Iteration 1** (`tasks/review-390.md`, NEEDS_REWORK, 1 wichtig + 4 Nitpicks), alle behoben:
  - [x] W1: undici-6.x-Vorsorge-Fall `undici|6|6.28.1` in `floor_cases_291` plus Mutationsbeleg
    (Fixture `undici@6.28.0` + Nachbarzeile `7.30.0`, meldet genau `6.28.0`, gegen Floor 6.28.0
    sauber). Den Floor 6.28.1 habe ich über alle sechs undici-Advisories frisch gemessen
    (`gh api advisories/<ghsa>`, Lesson #231). Nur GHSA-r53p-7pc4-xj5r betrifft 6.x (`< 6.28.1`),
    die anderen fünf beginnen bei ≥ 7.0.0. Guard-Verweis in `pnpm-workspace.yaml` ergänzt.
    Suite: 1568 grün / 0 rot.
  - [x] Nitpicks: Caret-Ausnahme-Beispiel auf `<5.0.12 → ^5.0.12`, Selektor-Kommentar in
    `run-tests.sh` nachgezogen, Zeilenumbruch, sharp-Nachmessung in #390 vermerkt.
  - Kleinfunde: Den Eintrag „Override-Selektor ohne untere Schranke" habe ich gelöscht, weil
    `>=7.0.0` ihn erledigt. Neu angelegt: „Floor-Guard hat keinen Vorsorge-Fall für die
    undici-8.x-Linie". Alle sechs Advisories tragen eine 8.x-Linie (Floor 8.10.2), heute liegt
    keine im Baum, und der alte Selektor hat sie auch nie gedeckt. Laut Schwelle (ADR-043) ist
    das ein hypothetischer Zustand und gehört deshalb nicht in ein Issue.
- **Iteration 2** (`tasks/review-390.md`, **APPROVED**, 0 kritisch / 0 wichtig / 2 Nitpicks):
  W1 und die vier Nitpicks aus Iteration 1 sind als behoben bestätigt. Die Suite ist frisch
  gelaufen: 1568 grün / 0 rot. Offen und optional: zwei Kommentar-Nitpicks in
  `pnpm-workspace.yaml` (überlange Zeile 57, Präsens-Aussage „>= 5.0.9" in Zeile 84).

## Test-Notizen
- `/test` (kein Produktionscode, keine neuen Tests nötig): Die Spec-AK 1–3 und 7 (Pin, Floors,
  Overrides) sind durch den angehobenen Floor-Guard in `scripts/checks/tests/run-tests.sh` samt
  Mutationsbelegen abgedeckt, AK 5/6 durch die Laufzeit-Verifikation aus `/implement`.
- `pnpm test:coverage`: 1425 grün / 112 DB-Skips, Branch-Coverage 97,57 %. Die niedrige
  Statement-Quote in `db/` ist die bekannte DB-Skip-Lücke, der Diff berührt keine App-Datei.
- Bash-Suite `run-tests.sh`: 1568 grün / 0 rot.
- Nicht ausgeführt: DB-Integrationstests mit `dotenv` (Aufruf wurde nicht freigegeben). Der Diff
  ändert nur Manifest, Lockfile, Workspace-Overrides und Guard.

## Refactoring-Notizen
- `/refactor`: Der Diff enthält keinen Produktionscode, nur Manifest, Lockfile, Overrides und Guard.
  Umgesetzt sind die zwei offenen Kommentar-Nitpicks aus Review-Iteration 2, beide in
  `pnpm-workspace.yaml`: die überlange sharp-Zeile ist umbrochen, und die Präsens-Aussage
  „>= 5.0.9" nennt jetzt „damals 5.0.9, seit #390 5.0.12". Kein Verhalten geändert.
  Bash-Suite vor und nach dem Refactoring: 1568 grün / 0 rot.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/390-next-16-3-6-rce-ghsa-heben`
Erstellt: 2026-10-05 18:41
