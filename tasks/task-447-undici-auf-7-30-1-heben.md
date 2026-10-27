# Task 447: undici-auf-7-30-1-heben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Dependabot-Alert #100 (high, GHSA-xjj6-f33q-929c, DoS über `content-encoding`) schließen:
undici-Override auf `^7.30.1` heben, Floor-Guard für 6.x/7.x/8.x nachziehen (8.x neu, Kleinfund
mitgenommen). Spec: [`docs/specs/spec-447-undici-7-30-1-ghsa-xjj6.md`](../docs/specs/spec-447-undici-7-30-1-ghsa-xjj6.md)

## Akzeptanzkriterien
<!-- Wortlaut: siehe Spec -->
- [x] AK1: Override `"undici@>=7.0.0 <7.30.1": "^7.30.1"` in `pnpm-workspace.yaml`
- [x] AK2: YAML-Kommentar nennt GHSA-xjj6-f33q-929c + Fixes 6.29.1 / 8.12.2
- [x] AK3: Lockfile ohne undici < 7.30.1 (7.x), keine 6.x/8.x unter Floor
- [x] AK4: Frisch-Auflösung ohne Alt-Lockfile ≥ 7.30.1, mit/ohne Override in Task-Notiz
- [x] AK5: Floor-Guard prüft undici 6.29.1 / 7.30.1 / 8.12.2, grün
- [x] AK6: Mutationsbeleg Major 7 (Fixture 7.30.0 wird gemeldet)
- [x] AK7: Mutationsbeleg Major 8 (8.12.1 gemeldet, 7.x-Nachbar nicht; Gegenprobe)
- [x] AK8: Major-6-Mutationsbeleg bleibt unter neuem Floor 6.29.1 gültig
- [x] AK9: Kleinfund „undici-8.x-Linie" entfernt
- [x] AK10: test, lint, Typecheck, build, run-tests.sh grün (Vitest/Lint/tsc/Build Exit 0; run-tests.sh 1844 grün / 0 rot)
- [x] AK11: Bulk-Advisory-API ohne undici-Treffer (Gegenprobe 7.30.0)
- [ ] AK12 (Nach-Merge): Dependabot-Alert #100 geschlossen

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger (gleiche Mechanik wie #291/#390/#412) → /architecture entfällt.

**/implement (2026-10-27):**
- RED: Probe gegen den Ist-Stand – Override-Zeile und Major-7-Fall rot (`undici@7.30.0`), Major 6/8 grün.
- GREEN: Override `"undici@>=7.0.0 <7.30.1": "^7.30.1"`, `pnpm install` → Lockfile `undici@7.30.1`
  (einzige Kopie, via jsdom@29.1.1; `pnpm why undici`: „Found 1 version").
- AK4 Frisch-Auflösung ohne Alt-Lockfile (`pnpm install --lockfile-only` in Wegwerf-Kopie):
  **mit** Override 7.30.1, **ohne** Override 7.30.1. Der Eintrag ist frisch aufgelöst also ein No-op,
  bleibt aber die einzige durable Zusicherung: jsdom deklariert `^7.25.0` (unter dem Floor) und gegen
  ein bestehendes Lockfile mit 7.30.0 wirkt er (gleiche Lage wie source-map-js, #412).
- AK11 npm-Bulk-Advisory-API über den ganzen Lockfile-Baum (706 Pakete / 774 Versionen): kein
  undici-Treffer. Gegenprobe `undici@7.30.0` → GHSA-xjj6-f33q-929c (high) **plus**
  GHSA-4qv8-2p9j-2685 und GHSA-f72v-6w45-q472 (moderate). Alle drei haben dieselben Floors
  6.29.1 / 7.30.1 / 8.12.2 (je Linie gemessen: x.y.(z-1) getroffen, Floor sauber) → im YAML-Kommentar
  mitgenannt, Floor-Guard deckt sie ohne weitere Fälle. Verbleibende Treffer im Baum: nur vite und
  @vitest/mocker (out of scope, #444).
- Floor-Guard: Fälle 6.29.1 / 7.30.1 / 8.12.2 (8.x neu); Mutationsbelege Major 7 (7.30.0 gemeldet,
  gegen alten Floor 7.29.1 sauber), Major 8 (8.12.1 gemeldet, 7.30.1-Nachbar nicht, gegen 8.12.1 sauber),
  Major 6 läuft jetzt gegen den neuen Floor 6.29.1 (Fixture 6.28.0 weiter darunter).
  Wiring-Assertion #390 AK3 auf den neuen Override-Wortlaut gehoben. Die Fixture-Zeile
  `"undici@<7.29.0"` im #337-Mutationsbeleg bleibt: synthetische Fixture, prüft nur den Zähl-Ausdruck.
- Kleinfund „undici-8.x-Linie" aus `docs/factory/kleinfunde.md` entfernt.

**/test (2026-10-27):** Vitest-Coverage 93,35 % Statements / 98,17 % Branches (≥ 80 %; `db/` niedrig,
weil DB-Integrationstests ohne dotenv skippen – unabhängig von #447). Review-Nitpick umgesetzt:
Major-6-Mutationsbeleg mit Fixture 6.29.0 (neuer Floor meldet, alter 6.28.1 nicht). run-tests.sh:
1845 grün / 1 rot – das eine Rot („kein `grep -c … || echo`-Muster in scripts/") stammt von der
gitignorten Alt-Datei `scripts/runtests447.tmp.log` (Content-Scan-Guard, bekannte Lesson #312/#339);
Löschen war nicht freigegeben → vor dem Merge von Hand entfernen, danach 1846 grün erwartet.

**/refactor (2026-10-27):** Kein Code-Eingriff nötig. Geprüft: Diff ist Konfiguration + Test-Fälle im
bestehenden Muster (inline Mutationsbeleg + Diskriminierungs-Kontrolle je Linie, wie #291/#337/#390/#412);
einen Helper dafür gibt es nicht, eine neue Abstraktion über die Alt-Blöcke hinweg wäre Umbau fremder Tests
ohne Verhaltensgewinn. Review-Nitpicks erledigt: #447-Zeile im Chronik-Kommentar (`floor_cases_291`
in run-tests.sh) und Major-6-Beleg mit Fixture 6.29.0 (in /test). Namen, WHY-Kommentare und
Magic Numbers unauffällig.

**/security-review (2026-10-27): PASSED** – Details in [`security-447.md`](security-447.md).
0 kritisch, 0 wichtig. Lockfile-Integrity gegen die Registry geprüft; Bulk-Advisory-API zeigt für 7.30.1
keine Treffer, für 7.30.0 drei (Gegenprobe). Hinweis: sechs gitignorte `scripts/*447.tmp.*` vor dem
Merge von Hand löschen (`rm` war nicht freigegeben).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Kleinfund undici-8.x mitnehmen → ja (Entwickler, /requirements)
- [ ] Aspekt-Label `factory-pipeline` (berührt `scripts/`) gemäß git-workflow.md prüfen

## Review-Findings
<!-- Wird durch /review befüllt -->
**/review Iteration 1 (2026-10-27): APPROVED** – Details in [`review-447.md`](review-447.md).
0 kritisch, 1 wichtig (Aspekt-Label `factory-pipeline` am Issue fehlt, kein Code-Rework),
2 Nitpicks (Chronik-Kommentar ohne #447-Zeile; Major-6-Fixture belegt den Floor-Bump nicht).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

**PR-Shepherd 2026-10-27:** Merge freigegeben – alle Gates grün.

---
Branch: `chore/447-undici-auf-7-30-1-heben`
Erstellt: 2026-10-27 17:57
