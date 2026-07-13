# Codify-Report: Task 96

## Neue Regeln hinzugefügt

- **[docs/factory/guidelines/bash-gotchas.md] §6: `printf '%f'` ist locale-abhängig –
  Zahlenformatierung in `jq`/`awk` statt bash** – wegen: `scripts/metrics.sh` formatierte
  die Lead-Time mit `bash printf '%.1f'`, das sein `%f`-Argument über `strtod()` locale-abhängig
  parst. Unter `de_DE.UTF-8` (Komma-Dezimaltrenner) schlägt das Parsen eines Punkt-Werts
  (`"1.6436..."`) lautlos fehl und printf gibt `0,0` statt des korrekten Werts zurück. Kein
  non-zero Exit, da `metrics.sh` ohne `-e` läuft – der Bug war nur am falschen Report-Wert
  erkennbar. Fix: Rundung und Formatierung komplett in `jq` verlagert (`tostring`), das immer
  den Punkt als Dezimaltrenner nutzt, unabhängig von Locale-Einstellungen.

## Keine weiteren Änderungen nötig

- **bash-gotchas.md §3 (SIGPIPE)** war bereits dokumentiert und wurde im Test korrekt angewandt
  (Output-Capture statt direkter Pipe in `grep -q`). Keine neue Regel erforderlich.
- **Review-Nitpicks** (ganzzahlige Ausgabe `"2"` statt `"2.0"`, CI-Skip-Verhalten des
  Locale-Tests): beide bewusst als YAGNI/vertretbar eingestuft; keine Regel abgeleitet.
- **Security-Finding** (Awareness zu aggregierten Kennzahlen in geteilten Reports):
  kein Handlungsbedarf, keine Regel.

## Empfehlung für nächste Features

Beim Schreiben neuer Shell-Skripte, die numerische Ausgaben formatieren: die neue §6-Regel
in `bash-gotchas.md` vorab prüfen und Formatierung von Dezimalzahlen direkt in `jq` oder
`awk` führen, nie über `bash printf '%f'`. Gilt insbesondere für Metriken/Reports, die auf
Entwickler-Maschinen mit `de_DE.UTF-8`-Locale laufen.
