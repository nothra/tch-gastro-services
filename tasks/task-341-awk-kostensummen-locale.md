# Task 341: awk-kostensummen-locale

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die Telemetrie-Kostensummen-Assertion aus #334 (`scripts/checks/tests/run-tests.sh:8409`)
summiert zwei CSV-Werte per `awk` ohne gesetzte Locale. Unter einer Locale mit
Komma-Dezimaltrenner parst BSD-awk `0.05`/`0.08` als `0` **und** formatiert `%.2f` mit
Dezimalkomma – der Vergleich gegen `"0.13"` schlägt fehl (`war: 0,00`).

Die Suite ist dadurch auf einem Rechner mit deutscher Locale rot, obwohl kein echter Defekt
vorliegt; in CI (C-Locale) bleibt sie grün. Nicht gate-blockierend, kostet aber bei jedem
lokalen Lauf eine Fehlersuche.

Spec: [`docs/specs/spec-341-awk-kostensummen-locale.md`](../docs/specs/spec-341-awk-kostensummen-locale.md)

**Reproduktion** (isoliert verifiziert am 2026-09-16, awk version 20200816, derselbe
Ausdruck + zwei CSV-Zeilen mit `0.05`/`0.08` in Spalte 10):

| Umgebung | Ergebnis |
|---|---|
| ambient (`LANG` leer) | `0.13` ✅ |
| `LC_NUMERIC=de_DE.UTF-8` | `0,00` ❌ |
| `LC_ALL=de_DE.UTF-8` | `0,00` ❌ |
| `LC_ALL=C` | `0.13` ✅ |

**Scope-Prüfung:** `:8409` ist die einzige Stelle in `run-tests.sh`, die in awk Dezimalzahlen
parst oder formatiert (Grep über `%.Nf`, `s+=$N`, `sum+=$N` → ein Treffer). Die übrigen
39 awk-Aufrufe sind locale-neutral.

## Akzeptanzkriterien

- [ ] AK1 GIVEN `run-tests.sh` WHEN der Kostensummen-Helfer gelesen wird THEN enthält er den
      awk-Aufruf mit vorangestelltem `LC_ALL=C` und ist die einzige Stelle mit diesem Ausdruck
      (keine Kopie).
- [ ] AK2 GIVEN der Helfer existiert WHEN die #334-Kostensummen-Assertion geprüft wird THEN
      ruft sie den Helfer auf, statt den awk-Ausdruck auszuschreiben (Anker: volle Aufrufzeile,
      kein Fragment).
- [ ] AK3 GIVEN eine Fixture-CSV mit `0.05`/`0.08` in Spalte 10 WHEN der Helfer unter
      `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8` läuft THEN liefert er exakt `0.13`.
- [ ] AK4 GIVEN dieser Regressionstest WHEN das `LC_ALL=C` im Helfer probeweise entfernt wird
      THEN schlägt er unter deutscher Locale fehl (Mutationsbeleg über den vollen Aufrufweg,
      tatsächlich ausgeführt und notiert).
- [ ] AK5 GIVEN eine Umgebung ohne `de_DE.UTF-8` WHEN die Suite läuft THEN überspringt sich der
      Test über die vorhandene Variable `HAS_DE_LOCALE` mit Skip-Meldung im #96-Stil – keine
      zweite/dritte Locale-Verfügbarkeitsprüfung.
- [ ] AK6 GIVEN die vollständige Bash-Self-Test-Suite WHEN sie einmal unter deutscher Locale
      und einmal unter `LC_ALL=C` läuft THEN ist sie in beiden Läufen grün.
- [ ] AK7 GIVEN die Pre-Push-Gates WHEN sie nach der Änderung laufen THEN sind sie grün.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**In `/requirements` entschieden (2026-09-16):**
- Fix-Richtung: `LC_ALL=C` vor den awk-Aufruf – **nicht** Wechsel auf `jq` (wie #96 in
  `metrics.sh`). Grund: `awk` ist mit 40 Aufrufen das etablierte Test-Utility der Suite,
  `jq` nur 18-mal und teils hinter `HAS_JQ` gegated.
- **Kein** suite-weites `LC_ALL=C`: der #96-Test setzt für seinen Prüfling bewusst
  `LC_ALL=de_DE.UTF-8`; ein globales Präfix würde diese Absicht maskieren.
- Test-Ansatz: awk-Ausdruck in einen Summen-Helfer extrahieren, den echte Assertion **und**
  Locale-Test aufrufen – statt den Ausdruck im Test zu kopieren (Drift) oder den ganzen
  `run_334`-Lauf unter de_DE zu wiederholen (Laufzeit).
- Schutz-Umfang: Fix + gezielter Locale-Test. **Kein** projektweiter Content-Scan-Guard
  gegen künftige awk-Dezimal-Aufrufe (verzeichnisweite Content-Scans sind laut
  `lessons/factory-workflow.md` #312/#339 eine wiederkehrende Fehlerquelle).

**Verifizierte Vorbedingungen:**
- `HAS_DE_LOCALE` wird auf Top-Level gesetzt (`run-tests.sh:373`, außerhalb jedes `if`-Blocks
  und jeder Funktion) → an der Fundstelle `:8409` sichtbar, Wiederverwendung möglich.
- `LC_ALL=C`-Präfix ist in derselben Datei bereits etabliert (`:4687`, `:7871`).

## Offene Fragen

- [x] Keine offen – Fix-Richtung, Schutz-Umfang und Test-Ansatz in `/requirements` geklärt.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/341-awk-kostensummen-locale`
Erstellt: 2026-09-16 17:28
