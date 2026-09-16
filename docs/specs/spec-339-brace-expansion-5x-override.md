# Spec: brace-expansion 5.x-Override gegen neue High-Advisories

## Kontext

Die Security-Review von Task 337 (next-16.3.5-Bump) hat `pnpm audit --json` erneut laufen
lassen und zwei NEUE High-Severity-Advisories auf `brace-expansion` gefunden, die außerhalb des
Task-337-Scopes lagen (Spec-337 Abschnitt „Nicht inbegriffen"):

- GHSA-mh99-v99m-4gvg – DoS via unbounded expansion length (Floor `5.0.8`)
- GHSA-rgw5-rvv9-x895 – DoS via unbounded intermediate arrays, umgeht die
  CVE-2026-14257-Mitigation (Floor `5.0.9`)

Im Lockfile ist `brace-expansion@5.0.7` aufgelöst (dev-only, via
`minimatch@10.2.5` → `@typescript-eslint/typescript-estree` → `@typescript-eslint/parser` /
`eslint-config-next`) – verifiziert per `pnpm why brace-expansion` und Grep im Lockfile
(`brace-expansion@5.0.7:` an zwei Stellen, `pnpm-lock.yaml:1672`/`5054`).

Die bestehenden Overrides in `pnpm-workspace.yaml` (aus #291) decken nur die 1.x- und
2.x-Major-Linien ab (`brace-expansion@<1.1.18` → `^1.1.18`, `brace-expansion@>=2.0.0 <2.1.4`
→ `^2.1.4`). `brace-expansion` pflegt inzwischen parallel (mind.) eine 4.x/5.x-Linie – das
bereits in `lessons/build-tooling.md` dokumentierte Muster, dass `pnpm audit` bei Paketen mit
mehreren parallel gepflegten Major-Linien nur eine Range-Gruppe je Advisory zeigt.

## Scope

**Inbegriffen:**
- Dritter, konditionaler Override-Eintrag für die 4.x/5.x-Linie in `pnpm-workspace.yaml`
  (Selektor `brace-expansion@>=4.0.0 <5.0.9`, Ziel-Range als Caret innerhalb der 5er-Linie,
  z. B. `^5.0.9` – Zielversion wird zum Implementierungszeitpunkt gegen die dann aktuell
  verfügbare Patch-Version gemessen, nicht vermutet).
- Kommentar-Block über dem `overrides:`-Eintrag im etablierten Stil (Advisory-IDs, Floor,
  Herkunft im Baum, Begründung für die untere Schranke).
- No-op-Messung: Override probeweise entfernen, Lockfile neu auflösen, tatsächlich
  resultierende Version feststellen – nicht aus der Parent-Range (`typescript-eslint`)
  annehmen (Analog zu #291/#337).
- Erweiterung des Floor-Guards in `scripts/checks/tests/run-tests.sh`
  (`floor_cases_291`-Tabelle) um neue `brace-expansion`-Fälle für die 4.x/5.x-Linie,
  nach demselben Muster wie die bestehenden 1.x/2.x-Fälle. Anzahl und Major-Linien folgen der
  Messung (siehe AK4), nicht der Annahme „ein Selektor = ein Fall".
- Ein Major-`3`-Floor-Fall im selben Guard (Floor `3.0.6`) als Vorsorge: die 3er-Linie trägt
  eigene Advisory-Floors, wird upstream weiter gepflegt und ist von **keinem** der drei
  Override-Selektoren gedeckt – ohne den Fall zöge eine künftige 3.0.x still ein
  (ergänzt in der Review-Rework-Runde, eine Tabellenzeile).

**Nicht inbegriffen:**
- Ein genereller `pnpm audit`-Vollabgleich über alle Pakete (bewusst außerhalb des Scopes,
  wie bereits in Spec-337 festgehalten).
- Änderungen an den 1.x/2.x-Overrides oder an anderen bestehenden Floor-Einträgen.
- Ein Upgrade der Parent-Pakete (`typescript-eslint`, `@typescript-eslint/*`), das die 5.x-Linie
  überhaupt erst in den Baum zieht – das bleibt außerhalb des Scopes, solange kein
  Sicherheits-Grund dafür vorliegt.

## Akzeptanzkriterien

- [ ] GIVEN `pnpm-workspace.yaml` WHEN der `overrides:`-Block gelesen wird THEN existiert ein
      dritter `brace-expansion`-Eintrag mit oberer Schranke `<5.0.9` und unterer Schranke
      `>=4.0.0`, dessen Ziel-Range als Caret innerhalb der 5er-Linie geschrieben ist
      (kein offenes `>=`).
- [ ] GIVEN der Override ist gesetzt WHEN `pnpm-lock.yaml` neu aufgelöst wird THEN ist keine
      `brace-expansion@4.x`- oder `@5.x`-Kopie unterhalb `5.0.9` im Lockfile vorhanden.
- [ ] GIVEN der Override wird probeweise entfernt WHEN das Lockfile neu aufgelöst wird THEN
      wird die tatsächlich resultierende Version dokumentiert (No-op-Kriterium messen, nicht
      vermuten) – Ergebnis fließt in den Kommentar-Block ein.
- [ ] GIVEN `scripts/checks/tests/run-tests.sh` WHEN die `floor_cases_291`-Tabelle geprüft wird
      THEN enthält sie **zwei** neue `brace-expansion`-Fälle für den einen Selektor (Major `4`
      und Major `5`, beide Floor `5.0.9`), von denen der Major-`5`-Fall bei einer Regression
      unter den Floor real anschlägt. Begründung (in der Implementierung gemessen): die
      Extraktion filtert je Major-Linie, ein Major-`4`-Fall allein sähe die real aufgelöste
      `5.x`-Kopie nie und wäre grün, ohne zu messen. Der Major-`4`-Fall bleibt als Vorsorge für
      ein künftiges Hereinziehen einer 4.x-Kopie.
- [ ] GIVEN die bestehenden 1.x/2.x-`brace-expansion`-Overrides und -Floor-Guards WHEN der neue
      Eintrag ergänzt wird THEN bleiben sie unverändert (keine Kollision der drei disjunkten
      Selektoren `<1.1.18` / `>=2.0.0 <2.1.4` / `>=4.0.0 <5.0.9`).
- [ ] GIVEN die Pre-Push-Checks (Lint, Tests, Typecheck, Format) WHEN sie nach der Änderung
      laufen THEN sind sie grün.

## Fehlerszenarien

- [ ] Der neue Selektor überlappt versehentlich mit dem bestehenden 2.x-Eintrag oder mit einer
      zukünftigen 3.x-Linie → durch die exakte untere Schranke `>=4.0.0` ausgeschlossen; wird
      durch die bestehenden 1.x/2.x-Assertions plus den neuen Fall abgedeckt.
- [ ] Eine künftige `brace-expansion@3.0.x` zieht unbemerkt ein: von keinem Selektor gedeckt
      (`<1.1.18` ✗, `>=2.0.0 <2.1.4` ✗, `>=4.0.0 <5.0.9` ✗) → der Major-`3`-Floor-Fall im Guard
      macht sie CI-rot, statt sie nur im Kommentar zu erwähnen.
- [ ] Die Ziel-Range wird versehentlich offen (`>=5.0.9` statt `^5.0.9`) geschrieben → würde bei
      einem künftigen Major-Bump (6.x) unkontrolliert mitziehen; der bestehende
      Caret-Violations-Guard in `run-tests.sh` (AK5-Muster aus #291) erfasst das bereits
      projektweit, sofern der neue Eintrag nicht in der `esbuild|uuid`-Ausnahmeliste landet.

## Offene Fragen

- [ ] Keine – Fix-Ansatz, betroffene Datei und Advisory-IDs sind aus der Security-Review
      (Task 337) bereits eindeutig vorgegeben.
