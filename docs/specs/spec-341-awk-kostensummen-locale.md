# Spec: awk-Kostensummen-Test in run-tests.sh locale-unabhängig machen

## Kontext

Die Telemetrie-Kostensummen-Assertion aus #334 (`scripts/checks/tests/run-tests.sh:8409`)
summiert zwei CSV-Werte per awk und vergleicht das Ergebnis gegen den String `"0.13"`:

```sh
tele_sum_h=$(awk -F, '$4=="implement" && $5=="claude_code.cost.usage"{s+=$10} END{printf "%.2f", s+0}' "$tele_csv_h")
```

Der Aufruf läuft ohne gesetzte Locale. Unter einer Locale mit Komma-Dezimaltrenner macht
BSD-awk **zwei** Fehler in diesem einen Ausdruck: es parst `0.05`/`0.08` als `0` (Abbruch am
Punkt) **und** formatiert `%.2f` mit Dezimalkomma. Ergebnis `0,00` statt `0.13`, die Assertion
meldet `war: 0,00`.

Isoliert reproduziert am 2026-09-16 (derselbe awk-Ausdruck, zwei CSV-Zeilen mit `0.05`/`0.08`
in Spalte 10, awk version 20200816):

| Umgebung | Ergebnis |
|---|---|
| ambient (`LANG` leer) | `0.13` ✅ |
| `LC_NUMERIC=de_DE.UTF-8` | `0,00` ❌ |
| `LC_ALL=de_DE.UTF-8` | `0,00` ❌ |
| `LC_ALL=C` | `0.13` ✅ |

**Auswirkung:** Die Bash-Self-Test-Suite ist auf einem Entwicklungsrechner mit deutscher
Locale rot, ohne dass ein echter Defekt vorliegt. In CI (C-Locale) bleibt sie grün – der
Fehlschlag ist also **nicht** gate-blockierend, kostet aber bei jedem lokalen Lauf eine
Fehlersuche. Genau dieses Muster (lokal grün/rot je Umgebung) hat laut
`lessons/testing.md` bereits einmal einen fail-open-Fall verdeckt.

**Präzedenz im Repo:**
- `LC_ALL=C`-Präfix als etabliertes Mittel in derselben Datei: `:4687`, `:7871`.
- Analoger Vorfall #96 (`metrics.sh`, bash-`printf '%.1f'` unter de_DE) – dokumentiert ab
  `:363`; der zugehörige Test fährt seinen Prüfling absichtlich unter
  `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8` und überspringt sich, wenn die Locale fehlt.
- Die dafür nötige Verfügbarkeitsvariable `HAS_DE_LOCALE` existiert bereits auf Top-Level
  (`:373`, außerhalb jedes `if`-Blocks und jeder Funktion) und ist an der Fundstelle sichtbar.

**Scope-Prüfung (im Issue gefordert):** `:8409` ist die **einzige** Stelle in `run-tests.sh`,
die in awk Dezimalzahlen parst oder formatiert – belegt per Grep über `%.Nf`, `s+=$N` und
`sum+=$N` (ein Treffer). Die übrigen 39 awk-Aufrufe der Suite arbeiten feldweise/textuell und
sind von der Locale nicht betroffen.

## Scope

**Inbegriffen:**
- Der Kostensummen-awk-Aufruf läuft unter `LC_ALL=C`.
- Der awk-Ausdruck wandert in eine kleine Shell-Funktion (Summen-Helfer), die **sowohl** die
  echte #334-Assertion **als auch** der neue Locale-Regressionstest aufrufen. Grund: eine
  Test-eigene Kopie des Ausdrucks würde vom Original wegdriften und grün bleiben, während die
  echte Zeile wieder bricht (Muster aus `lessons/testing.md`, „Mutationsbeleg muss denselben
  Assert-Ausdruck ausführen").
- Ein Regressionstest, der den Helfer unter deutscher Locale gegen eine Fixture-CSV ausführt,
  gegated über die **vorhandene** Variable `HAS_DE_LOCALE` (keine dritte Schreibweise einer
  Locale-Verfügbarkeitsprüfung – `lessons/code-style.md`).
- Ein Mutationsbeleg, der zeigt, dass der Regressionstest ohne das `LC_ALL=C` im Helfer rot
  würde – und zwar über denselben vollen Aufrufweg, nicht über ein Ausdrucks-Fragment.

**Nicht inbegriffen:**
- **Kein** globales `LC_ALL=C` am Anfang von `run-tests.sh`. Begründung: der #96-Test setzt
  für seinen Prüfling bewusst `LC_ALL=de_DE.UTF-8`; ein suite-weites `LC_ALL=C` würde diese
  Absicht verschleiern statt sie zu stützen, und der Zweck der Suite ist gerade,
  Locale-Abhängigkeiten zu finden, nicht sie global zu maskieren.
- **Kein** Wechsel des Summen-Werkzeugs auf `jq` (der Weg, den #96 in `metrics.sh` gewählt
  hat). Begründung: `awk` ist mit 40 Aufrufen das etablierte Test-Utility der Suite, `jq` wird
  nur 18-mal und teils hinter `HAS_JQ` gegated genutzt – ein `jq`-Wechsel wäre hier der
  Ausreißer und würde den Test zusätzlich von einer optionalen Abhängigkeit abhängig machen.
- **Kein** Content-Scan-Guard, der künftige awk-Dezimal-Aufrufe ohne `LC_ALL=C` projektweit
  verbietet (in `/requirements` bewusst abgewählt): verzeichnisweite Content-Scan-Guards sind
  laut `lessons/factory-workflow.md` (#312, #339) eine wiederkehrende Fehlerquelle.
- Kein zweiter vollständiger `run_334`-Pipeline-Lauf unter deutscher Locale (Laufzeit).
- Keine Änderung an den #334-Fixtures, am Telemetrie-Format oder an der Pipeline selbst.
- Die 39 locale-neutralen awk-Aufrufe der Suite bleiben unverändert.

## Akzeptanzkriterien

- [ ] GIVEN `scripts/checks/tests/run-tests.sh` WHEN der Kostensummen-Helfer gelesen wird THEN
      enthält er den awk-Aufruf mit vorangestelltem `LC_ALL=C` und ist die einzige Stelle, an
      der dieser awk-Ausdruck im Skript steht (kein zweites Vorkommen als Kopie).
- [ ] GIVEN der Helfer existiert WHEN die #334-Kostensummen-Assertion (`Review-Finding 2`,
      Summe beider Versuche) geprüft wird THEN ruft sie den Helfer auf, statt den awk-Ausdruck
      selbst auszuschreiben – verankert an der vollen Aufrufzeile, nicht an einem Fragment.
- [ ] GIVEN eine Fixture-CSV mit den Werten `0.05` und `0.08` in Spalte 10 und passenden
      Feldern in Spalte 4/5 WHEN der Helfer unter `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8`
      aufgerufen wird THEN liefert er exakt `0.13` (Punkt-Dezimaltrenner, kein `0,00`).
- [ ] GIVEN dieser Regressionstest WHEN das `LC_ALL=C` im Helfer probeweise entfernt wird THEN
      schlägt er unter deutscher Locale fehl (Mutationsbeleg über denselben Aufrufweg; das
      Entfernen wird in der Implementierung tatsächlich ausgeführt und das Ergebnis notiert,
      nicht vermutet).
- [ ] GIVEN eine Umgebung ohne `de_DE.UTF-8`-Locale (z. B. CI) WHEN die Suite läuft THEN wird
      der Regressionstest über die bereits vorhandene Variable `HAS_DE_LOCALE` übersprungen
      und gibt eine Skip-Meldung im Stil der bestehenden #96-Meldung aus – er wird nicht rot
      und es wird keine zweite/dritte Locale-Verfügbarkeitsprüfung eingeführt.
- [ ] GIVEN die vollständige Bash-Self-Test-Suite WHEN sie einmal unter
      `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8` und einmal unter `LC_ALL=C` läuft THEN ist
      sie in **beiden** Läufen grün (die #334-Assertion meldet in keinem Lauf `war: 0,00`).
- [ ] GIVEN die Pre-Push-Gates (Lint, Tests, Typecheck, Format, Drift-Checks) WHEN sie nach der
      Änderung laufen THEN sind sie grün.

## Fehlerszenarien

- [ ] Der Helfer wird nur vom neuen Locale-Test, nicht von der echten #334-Assertion
      aufgerufen → der Fix wäre wirkungslos, der Test grün. Abgedeckt durch AK2 (Wiring an der
      echten Aufrufzeile).
- [ ] Der Locale-Test prüft eine Kopie des awk-Ausdrucks statt des echten Helfers → Drift,
      Test bleibt grün während die Produktionszeile bricht. Durch die Helfer-Extraktion
      (AK1/AK2) konstruktiv ausgeschlossen.
- [ ] `de_DE.UTF-8` fehlt in der Umgebung → Test überspringt sich (AK5), statt mit einem
      Locale-Fehler rot zu werden.
- [ ] Der Mutationsbeleg trifft nur ein Fragment (z. B. den Dateinamen oder `awk -F,`) statt
      der vollen Helfer-Zeile → er belegt dann nur Syntax/Quoting, nicht Kausalität zum echten
      Guard. Abgedeckt durch die Formulierung in AK4 (siebtes Rezidiv dieses Musters ist in
      `lessons/factory-workflow.md` dokumentiert).
- [ ] Ein suite-weites `LC_ALL=C` würde den #96-Test seiner Aussagekraft berauben → explizit
      außerhalb des Scopes.

## Offene Fragen

- [ ] Keine. Fix-Richtung (`LC_ALL=C` statt `jq`), Schutz-Umfang (Fix + gezielter Locale-Test,
      ohne projektweiten Content-Scan-Guard) und Test-Ansatz (Summen-Helfer extrahieren statt
      Ausdruck kopieren oder Pipeline-Lauf wiederholen) sind in `/requirements` entschieden.
