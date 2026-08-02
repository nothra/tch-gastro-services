# Spec: Regressionstest für bestehende Edit(...)-Allow-Einträge aus #88

## Kontext

Bei `/review` von Task 240 (wirkungslose `Write(...)`-Regeln aus `.claude/settings.json`
entfernt) fiel auf: `scripts/checks/tests/run-tests.sh` prüft zwar die #224/#240-spezifischen
Einträge (Top-Level-YAML-Freigabe, `pnpm-lock.yaml`, `.claude/**`, `.env*`), aber **keine**
Assertion belegt das Fortbestehen der ursprünglichen #88-`Edit(...)`-Allow-Einträge
(`Edit(app/**)`, `Edit(lib/**)`, `Edit(scripts/**)`, `Edit(*.ts)`, `Edit(*.md)` usw.).

AK3 von Task 240 ("kein Funktionsverlust durch die `Write(...)`-Entfernung") stützt sich implizit
auf das Fortbestehen dieser `Edit(...)`-Einträge – aktuell nur durch einen einmaligen manuellen
Abgleich belegt, nicht automatisiert. Ein versehentliches Entfernen eines dieser Kern-Einträge
(z. B. bei einer künftigen Permissions-Änderung) würde von keinem Test rot gefärbt.

Referenz-Muster: die bestehende #224-AK1/AK4-Schleife in `run-tests.sh`
(`scripts/checks/tests/run-tests.sh:2320`), die je Eintrag eine eigene Assertion erzeugt statt
eines pauschalen Bulk-Checks – damit ein Wegfall genau eines Eintrags genau die zugehörige
Assertion rot färbt.

## Scope

**Inbegriffen:**
- Neue Testschleife in `scripts/checks/tests/run-tests.sh`, die für jeden der 16 ursprünglichen
  #88-`Edit(...)`-Allow-Einträge in `.claude/settings.json` eine eigene, geparste (`jq`)
  Assertion ergänzt:
  `Edit(app/**)`, `Edit(lib/**)`, `Edit(db/**)`, `Edit(e2e/**)`, `Edit(types/**)`,
  `Edit(scripts/**)`, `Edit(docs/**)`, `Edit(tasks/**)`, `Edit(config/**)`, `Edit(public/**)`,
  `Edit(.github/workflows/**)`, `Edit(*.ts)`, `Edit(*.tsx)`, `Edit(*.mjs)`, `Edit(*.json)`,
  `Edit(*.md)`.
- Ein `jq`-unabhängiger Grep-Fallback (analog zum bestehenden #91/#240-Muster), der dieselben
  16 Einträge textbasiert prüft, falls `jq` in der Ausführungsumgebung fehlt.
- Vor dem Schreiben: Abgleich mit der bestehenden #224-AK1-Schleife (identischer Rumpf, andere
  Werteliste) – keine zweite, strukturell duplizierte Schleife anlegen, sondern ggf. die
  Werteliste an geeigneter Stelle ergänzen/eine neue Schleife direkt daneben platzieren.

**Nicht inbegriffen:**
- Keine Änderung an `.claude/settings.json` selbst (reine Testabdeckung, kein neues Verhalten).
- Keine erneute Prüfung der bereits abgedeckten Einträge (`Edit(/*.yml)`, `Edit(/*.yaml)`,
  `Edit(pnpm-lock.yaml)`, `Edit(.claude/**)`, `Edit(.env*)`, `Read(.env*)` – #224).
- Keine Prüfung der Hooks-Sektion oder sonstiger `settings.json`-Struktur jenseits von
  `permissions.allow`.

## Akzeptanzkriterien

- [ ] GIVEN `.claude/settings.json` enthält alle 16 ursprünglichen #88-`Edit(...)`-Allow-Einträge
      WHEN `scripts/checks/tests/run-tests.sh` läuft
      THEN erzeugt eine geparste (`jq`) Schleife für jeden der 16 Einträge eine eigene,
      benannte Assertion, die grün ist.
- [ ] GIVEN einer der 16 Einträge fehlt versehentlich in `.claude/settings.json`
      WHEN `scripts/checks/tests/run-tests.sh` läuft
      THEN schlägt genau die zu diesem Eintrag gehörende Assertion fehl (nicht nur ein
      pauschaler Sammel-Check) – manuell durch Streichen eines Eintrags in einer Testkopie
      verifiziert.
- [ ] GIVEN `jq` ist in der Ausführungsumgebung nicht verfügbar
      WHEN `scripts/checks/tests/run-tests.sh` läuft
      THEN prüft ein Grep-basierter Fallback (analog zum bestehenden #91/#240-Muster) dieselben
      16 Einträge textbasiert, sodass die Regressionsabsicherung nicht stillschweigend
      übersprungen wird.
- [ ] GIVEN die neue Schleife wird in `run-tests.sh` ergänzt
      WHEN der Code geschrieben wird
      THEN wurde vorher gegen die bestehende #224-AK1-Schleife abgeglichen (kein struktureller
      Duplikat-Rumpf ohne Grund – `lessons/testing.md`, #240-Learning).

## Fehlerszenarien

- [ ] `jq` fehlt in CI/lokal → Fallback greift, Test bleibt aussagekräftig (kein stilles Grün).
- [ ] Ein Eintrag wird umbenannt statt entfernt (z. B. `Edit(app/**)` → `Edit(app/*)`) → die
      exakte String-Assertion für `Edit(app/**)` färbt rot (kein Fuzzy-Match).

## Offene Fragen

_Keine._
