# Spec: undici auf >= 7.30.1 heben (GHSA-xjj6-f33q-929c)

## Kontext
Dependabot-Alert **#100** (high): `undici` stürzt mit einem unbehandelten Fehler ab, wenn eine
Antwort übermäßig viele `content-encoding`-Werte trägt (Denial of Service, GHSA-xjj6-f33q-929c).
Das Advisory betrifft drei Linien:

| Linie | Betroffen | Fix |
|-------|-----------|-----|
| 6.x | `>= 6.23.0, < 6.29.1` | 6.29.1 |
| 7.x | `>= 7.18.0, < 7.30.1` | 7.30.1 |
| 8.x | `>= 8.0.0, < 8.12.2` | 8.12.2 |

Im Baum liegt heute nur `undici@7.30.0`, transitiv über `jsdom@29.1.1` (Vitest-Environment,
dev-Scope, kein Produktions-Bundle). jsdom 29.1.1 deklariert `^7.25.0`, die Untergrenze liegt also
**unter** dem Floor. Ein jsdom-Bump ist keine Option: jsdom 30.x wechselt auf `undici ^8`, also auf
eine neue Major-Version. Der Weg ist deshalb der bestehende Override in `pnpm-workspace.yaml`
(`"undici@>=7.0.0 <7.29.1": "^7.29.1"`, aus #390), dessen Floor auf 7.30.1 steigt.

Der Floor-Guard in `scripts/checks/tests/run-tests.sh` (`floor_cases_291`) prüft die aufgelösten
Versionen je Major-Linie. Mit dem Advisory steigen sein 7.x-Floor (7.29.1 → 7.30.1) und sein
6.x-Vorsorge-Floor (6.28.1 → 6.29.1). Mitgenommen wird der offene Kleinfund „Floor-Guard hat keinen
Vorsorge-Fall für die undici-8.x-Linie" (`docs/factory/kleinfunde.md`), jetzt mit Floor 8.12.2
(Entscheidung des Entwicklers in `/requirements`).

## Scope
**Inbegriffen:**
- Override-Eintrag in `pnpm-workspace.yaml` auf `"undici@>=7.0.0 <7.30.1": "^7.30.1"` heben,
  Begründungsblock im YAML-Kommentar um GHSA-xjj6-f33q-929c ergänzen (6.x- und 8.x-Lage nennen).
- Lockfile neu auflösen, sodass `undici` ≥ 7.30.1 aufgelöst ist.
- Floor-Guard: 7.x-Fall auf 7.30.1, 6.x-Vorsorge-Fall auf 6.29.1, neuer 8.x-Vorsorge-Fall mit Floor
  8.12.2 samt Mutationsbeleg nach dem Muster des Major-6-Falls; die Wiring-Assertion auf die
  Override-Zeile (#390 AK3) an den neuen Wortlaut anpassen.
- Kleinfund „undici-8.x-Linie" aus `docs/factory/kleinfunde.md` entfernen.

**Nicht inbegriffen:**
- jsdom- oder vitest-Major-Bump (jsdom 30 / undici 8).
- Override-Selektoren für 6.x oder 8.x: heute liegt dort keine Kopie im Baum, die Deckung übernimmt
  der Floor-Guard (gleiches Vorgehen wie bei brace-expansion 3.x, #339).
- Die übrigen offenen Dependabot-Alerts (vite, @vitest/mocker, #444).
- Die übrigen Override-Einträge (esbuild, uuid, brace-expansion, source-map-js).

## Akzeptanzkriterien
- [ ] AK1: GIVEN `pnpm-workspace.yaml` WHEN die `overrides` gelesen werden THEN steht dort genau ein
  undici-Eintrag `"undici@>=7.0.0 <7.30.1": "^7.30.1"` (Caret in der 7er-Linie, untere Schranke
  `>=7.0.0` bleibt).
- [ ] AK2: GIVEN der YAML-Kommentarblock zum undici-Override WHEN er gelesen wird THEN nennt er
  GHSA-xjj6-f33q-929c mit Floor 7.30.1 sowie die Fixes der 6.x-Linie (6.29.1) und der 8.x-Linie
  (8.12.2) und verweist für beide auf den Floor-Guard.
- [ ] AK3: GIVEN `pnpm-lock.yaml` WHEN alle aufgelösten `undici`-Versionen gelistet werden
  (`pnpm why undici` bzw. Lockfile-Snapshots) THEN ist keine Version < 7.30.1 in der 7er-Linie
  enthalten, und es gibt keine 6.x- oder 8.x-Kopie unter ihrem Floor.
- [ ] AK4: GIVEN eine Frisch-Auflösung ohne Alt-Lockfile (`pnpm install --lockfile-only` in einer
  Wegwerf-Kopie ohne Lockfile, Lesson #412) WHEN undici aufgelöst wird THEN ist die Version ≥ 7.30.1;
  das Ergebnis mit und ohne Override steht in der Task-Notiz.
- [ ] AK5: GIVEN der Floor-Guard WHEN `run-tests.sh` läuft THEN prüft `floor_cases_291` undici mit
  den Floors 6.29.1 (Major 6), 7.30.1 (Major 7) und 8.12.2 (Major 8), und alle drei Fälle sind grün.
- [ ] AK6: GIVEN eine Fixture mit `undici@7.30.0` WHEN der Major-7-Fall gegen sie läuft THEN meldet er
  genau diese Version (Mutationsbeleg: der alte Floor 7.29.1 hätte sie durchgelassen).
- [ ] AK7: GIVEN eine Fixture mit `undici@8.12.1` und Nachbarzeile `undici@7.30.1` WHEN der
  Major-8-Fall gegen sie läuft THEN meldet er genau `8.12.1` und nicht die 7.x-Nachbarzeile; gegen
  Floor 8.12.1 meldet er nichts (Gegenprobe).
- [ ] AK8: GIVEN der bestehende Major-6-Mutationsbeleg WHEN der Floor auf 6.29.1 steigt THEN bleibt
  er ein echter Beleg (Fixture-Version liegt unter dem neuen Floor und wird gemeldet).
- [ ] AK9: GIVEN `docs/factory/kleinfunde.md` WHEN nach dem Eintrag „Floor-Guard hat keinen
  Vorsorge-Fall für die undici-8.x-Linie" gesucht wird THEN ist er entfernt.
- [ ] AK10: GIVEN der Bump WHEN `pnpm test`, `pnpm lint`, Typecheck, `pnpm build` und die
  Self-Test-Suite `run-tests.sh` laufen THEN sind alle grün.
- [ ] AK11: GIVEN die Advisory-Prüfung über den ganzen Lockfile-Baum (npm-Bulk-Advisory-API mit
  Gegenprobe gegen 7.30.0, Lesson #390) WHEN sie nach dem Bump läuft THEN meldet sie für `undici`
  keinen offenen Treffer.
- [ ] AK12 (Nach-Merge): GIVEN der Merge auf `main` WHEN Dependabot neu scannt THEN ist Alert #100
  geschlossen. Vor dem Merge nicht prüfbar (Lesson #390).

## Fehlerszenarien
- [ ] undici 7.30.1 bricht jsdom-basierte Vitest-Tests → Ursache in der Task-Datei dokumentieren,
  nicht durch Abschwächen der Tests umgehen; im Zweifel eskalieren.
- [ ] Die Frisch-Auflösung zieht über einen anderen Parent eine undici-6.x- oder 8.x-Kopie unter den
  Floor herein → der Floor-Guard wird rot; dann einen eigenen Override-Selektor für die Linie
  ergänzen (Caret in der Fix-Linie) statt den Guard zu lockern.
- [ ] Bestehende Assertions, die den alten Override-Wortlaut oder den Floor 7.29.1/6.28.1 literal
  prüfen (#337/#390), werden rot → per Grep auf `7.29.1`/`6.28.1`/`<7.29` alle Fundstellen in
  `run-tests.sh` und Doku im selben Schritt nachziehen; historische Prosa zu #390 bleibt.
- [ ] `pnpm audit` scheitert in der Sandbox (Gzip-Bug, Lesson #228) → Ersatz über die
  npm-Bulk-Advisory-API.

## Offene Fragen
- [x] Kleinfund undici-8.x mitnehmen? → Ja (Entwickler, `/requirements`).
- [ ] Das Issue trägt nur `enhancement` + `security`. Berührte Pfade liegen auch unter `scripts/`
  (Floor-Guard) – Aspekt-Label `factory-pipeline` laut PROJECT-CONTEXT „im Zweifel setzen"; Anlage
  gemäß `git-workflow.md` → „GitHub-Labels" prüfen.

## ADR
Kein ADR-Trigger: gleiche Mechanik wie #291/#390/#412 (konditionaler Override + Floor-Guard),
keine neue Architekturentscheidung.
