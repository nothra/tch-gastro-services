# Task 412: source-map-js-heben

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`source-map-js` (transitiv, aufgelöst 1.2.1) auf ≥ 1.2.2 heben – High, Event-Loop-DoS (GHSA-68fv-2mgg-jv7q, Dependabot-Alert #82). Spec: `docs/specs/spec-412-source-map-js-heben.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] GIVEN das Lockfile WHEN `source-map-js` aufgelöst wird THEN liegt jede aufgelöste Version bei ≥ 1.2.2 (1.x-Linie).
- [x] GIVEN eine Neuauflösung ohne Alt-Lockfile WHEN `pnpm why source-map-js` läuft THEN zeigt es ausschließlich ≥ 1.2.2.
- [x] GIVEN die Parents deklarieren nur `^1.2.1` WHEN ein Lockfile mit `source-map-js` < 1.2.2 entsteht THEN schlägt der Floor-Guard an (inkl. Mutationsbeleg).
- [x] GIVEN die Änderung WHEN `pnpm build`, `pnpm lint`, Typecheck und `pnpm test` laufen THEN sind alle grün.
- [x] GIVEN die Erreichbarkeitsannahme WHEN die Umsetzung beginnt THEN ist in der Task-Datei belegt, dass kein Laufzeitpfad fremde Source Maps verarbeitet.
- [ ] GIVEN der Fix ist auf `main` gemergt WHEN Dependabot neu scannt THEN ist Alert #82 geschlossen (Nach-Merge-Prüfung).

## Technische Notizen
- Entscheidung: konditionaler Override `source-map-js@<1.2.2` → `^1.2.2` (Parents deklarieren `^1.2.1`, Untergrenze unter Floor) + Floor-Guard-Fall und Mutationsbeleg (`run-tests.sh`). Kein ADR (Patch-Bump, Muster #339).
- Erreichbarkeit belegt: Grep nach source-map/sourcemap in `app/`, `lib/`, `db/`, Next-/Vitest-Config ohne Treffer, `productionBrowserSourceMaps` nicht gesetzt; Paket hängt nur an postcss/css-tree/magicast (Build-/Test-Tooling).
- Gemessen: `pnpm why source-map-js` → ausschließlich 1.2.2; lint, tsc, `pnpm test` (1769 grün; DB-Tests ohne dotenv geskippt), `run-tests.sh` (1838 grün), `pnpm build` grün.
- Offen (Nach-Merge): Dependabot-Alert #82 geschlossen prüfen.

## Offene Fragen
- [x] Lockfile-Refresh oder konditionaler Override (`source-map-js@<1.2.2` → `^1.2.2`)? Messbefund: alle Parents deklarieren `^1.2.1`, 1.2.2 ist auf npm verfügbar; die deklarierte Untergrenze liegt unter dem Floor → Annahme: Override + Floor-Guard-Eintrag (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/412-source-map-js-heben`
Erstellt: 2026-10-27 00:12
