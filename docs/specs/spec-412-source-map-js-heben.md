# Spec: source-map-js auf ≥ 1.2.2 heben (GHSA-68fv-2mgg-jv7q)

## Kontext
Dependabot meldet einen **High**-Alert (#82, `pnpm-lock.yaml`, 2026-10-09) auf `source-map-js`:
fehlende Validierung des Section-Offsets in indexed Source Maps, extrem große Werte blockieren
den Event-Loop synchron (DoS; GHSA-68fv-2mgg-jv7q, betroffen ≥ 1.0.0 < 1.2.2, Fix 1.2.2).
Aufgelöst ist heute genau eine Kopie, `1.2.1`, transitiv über `postcss` (next 8.5.23 und
tailwindcss/vite 8.5.26), `css-tree` (jsdom/vitest) und `magicast` (`@vitest/coverage-v8`).

Messbefund beim Schärfen: Alle vier Parents deklarieren `source-map-js ^1.2.1`, 1.2.2 ist auf
npm veröffentlicht – ein Refresh löst also 1.2.2 auf, die **deklarierte** Untergrenze liegt aber
unter dem Floor. Die Zusicherung „≥ 1.2.2" ist ohne weitere Maßnahme nicht dauerhaft (gleiche
Lage wie `brace-expansion` ≥ 4.0.0 in #339).

Erreichbarkeit: voraussichtlich nicht erreichbar – das Paket hängt an Build-/Test-Tooling und an
`postcss` im Next-Build; kein Laufzeitpfad verarbeitet fremde Source Maps. Der Bump ist trotzdem
fällig (High-Advisory, offener Alert, Patch-Bump).

## Scope
**Inbegriffen:**
- Jede aufgelöste `source-map-js`-Kopie im Lockfile liegt auf ≥ 1.2.2.
- Die Zusicherung bleibt gegen künftige Lockfile-/Parent-Änderungen abgesichert
  (konsistent zum bestehenden Floor-Guard für aufgelöste Versionen, #291/#337/#390).
- Gegenprüfung der Erreichbarkeit vor der Umsetzung und Dokumentation des Ergebnisses.
- Doku der Entscheidung dort, wo das Projekt vergleichbare Entscheidungen führt
  (Kommentar in `pnpm-workspace.yaml`, falls ein Override entsteht).

**Nicht inbegriffen:**
- Major-Upgrades und Funktionsänderungen; Bumps anderer Pakete.
- Neue, nach dem Start auftauchende Alerts (eigenes Issue).
- Der Nachweis „Dependabot-Alert geschlossen" vor dem Merge – nicht prüfbar (Dependabot wertet
  nur den Default-Branch aus).

## Akzeptanzkriterien
- [ ] GIVEN das Lockfile WHEN `source-map-js` aufgelöst wird THEN liegt jede aufgelöste Version bei ≥ 1.2.2 (und weiterhin in der 1.x-Linie).
- [ ] GIVEN eine Neuauflösung ohne Alt-Lockfile WHEN `pnpm why source-map-js` läuft THEN zeigt es ausschließlich ≥ 1.2.2 (gemessen, nicht aus Parent-Ranges angenommen).
- [ ] GIVEN die Parents deklarieren nur `^1.2.1` WHEN ein Lockfile mit `source-map-js` < 1.2.2 entsteht THEN schlägt der Floor-Guard (`scripts/checks/tests/run-tests.sh`) an – inkl. Mutationsbeleg.
- [ ] GIVEN die Änderung WHEN `pnpm build`, `pnpm lint`, Typecheck und `pnpm test` laufen THEN sind alle grün.
- [ ] GIVEN die Erreichbarkeitsannahme WHEN die Umsetzung beginnt THEN ist in der Task-Datei belegt, dass kein Laufzeitpfad der App fremde Source Maps verarbeitet.
- [ ] GIVEN der Fix ist auf `main` gemergt WHEN Dependabot neu scannt THEN ist Alert #82 geschlossen (Nach-Merge-Prüfung, nicht vorab prüfbar).

## Fehlerszenarien
- [ ] Ein Parent pinnt künftig eine zweite `source-map-js`-Kopie unter 1.2.2 → Floor-Guard rot statt stilles Durchrutschen.
- [ ] Eine Maßnahme zieht `source-map-js` in eine andere Major-Linie → nicht zulässig (Caret innerhalb 1.x, Lesson `build-tooling.md`).
- [ ] `pnpm audit` scheitert in der Sandbox (Gzip-Bug) → Gegenprüfung per npm-Bulk-Advisory-API bzw. Lockfile-Versionsabgleich (Lesson #228/#390).
- [ ] `next dev` schreibt den Agent-Regel-Block in `CLAUDE.md`/`AGENTS.md` → vor dem Commit zurücksetzen (Lesson #337).

## Offene Fragen
- [ ] Reicht ein Lockfile-Refresh, oder wird – analog `brace-expansion`/`undici` – ein konditionaler Override (`source-map-js@<1.2.2` → `^1.2.2`) angelegt? Annahme für `/architecture`/`/implement`: Override, weil die deklarierte Untergrenze (^1.2.1) unter dem Floor liegt; dafür den Floor-Guard-Eintrag (`floor_cases_291`) ergänzen.
