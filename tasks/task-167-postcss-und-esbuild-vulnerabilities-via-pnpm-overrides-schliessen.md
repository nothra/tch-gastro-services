# Task 167: postcss-und-esbuild-vulnerabilities-via-pnpm-overrides-schliessen

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [x] Security-Review bestanden (PASSED, keine Blocker – `tasks/security-167.md`)
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Zwei Dependabot-Alerts (moderate) auf `main` schließen, beide über transitiv gepinnte,
verwundbare Kopien:

- **postcss** `8.4.31` (`<8.5.10`) – GHSA-qx2v-qp2m-jg93 (XSS via unescaped `</style>` im
  CSS-Stringify), gezogen über `next` → nur **Build-Zeit** über eigenes Tailwind/CSS, keine
  untrusted-CSS-Eingabe. Tatsächliches Risiko in dieser App gering.
- **esbuild** `0.18.20` (`<=0.24.2`) – GHSA-67mh-4wv8-2f99 (Dev-Server erlaubt beliebigen
  Websites Requests/Response-Lesen), gezogen über `drizzle-kit` → `@esbuild-kit/*`, **dev-only**,
  kein browser-exponierter esbuild-Dev-Server. Tatsächliches Risiko gering.

Ein `pnpm update` räumt beide nicht weg (von `next`/`drizzle-kit` gepinnt) → gezielte
`pnpm.overrides`.

## Akzeptanzkriterien
- [x] GIVEN die Overrides WHEN `pnpm install` THEN im Baum keine `postcss@<8.5.10` und keine
  `esbuild@<0.25.0` mehr (verifiziert: `postcss@8.5.16`, `esbuild@0.25.12/0.28.1`).
- [x] GIVEN das Projekt WHEN `pnpm audit` THEN „No known vulnerabilities found".
- [x] GIVEN der Fix WHEN `pnpm test` THEN grün (410 passed, 52 skipped).
- [x] GIVEN der Fix WHEN `pnpm build` THEN erfolgreich.
- [x] GIVEN spätere legitime Parent-Upgrades WHEN sie eine gepatchte Version ziehen
  THEN greift der (konditionale) Override nicht mehr und blockiert das Upgrade nicht.

## Technische Notizen
- pnpm@11 liest das `pnpm`-Feld in `package.json` **nicht mehr** – Overrides gehören in
  `pnpm-workspace.yaml` (`overrides:`). Erste Fassung im `package.json`-`pnpm`-Feld wurde von
  pnpm mit Warnung ignoriert und wieder entfernt.
- **Konditionale** Override-Form (`paket@<version` → `>=version`): greift nur unterhalb des
  Patch-Floors, blockiert also keine späteren legitimen Upgrades der Parents. Sobald `next`
  bzw. `drizzle-kit` die Patches selbst mitbringen, werden die Overrides zu No-ops und sollten
  entfernt werden (Follow-up).
- Geänderte Dateien: `pnpm-workspace.yaml` (Overrides + Kommentar), `pnpm-lock.yaml`.

## Offene Fragen
_Keine._

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/167-postcss-und-esbuild-vulnerabilities-via-pnpm-overrides-schliessen`
Erstellt: 2026-07-19 15:18
