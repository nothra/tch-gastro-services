# Task 341: awk-kostensummen-locale

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
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

- [x] AK1 GIVEN `run-tests.sh` WHEN der Kostensummen-Helfer gelesen wird THEN enthält er den
      awk-Aufruf mit vorangestelltem `LC_ALL=C` und ist die einzige Stelle mit diesem Ausdruck
      (keine Kopie).
- [x] AK2 GIVEN der Helfer existiert WHEN die #334-Kostensummen-Assertion geprüft wird THEN
      ruft sie den Helfer auf, statt den awk-Ausdruck auszuschreiben (Anker: volle Aufrufzeile,
      kein Fragment).
- [x] AK3 GIVEN eine Fixture-CSV mit `0.05`/`0.08` in Spalte 10 WHEN der Helfer unter
      `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8` läuft THEN liefert er exakt `0.13`.
- [x] AK4 GIVEN dieser Regressionstest WHEN das `LC_ALL=C` im Helfer probeweise entfernt wird
      THEN schlägt er unter deutscher Locale fehl (Mutationsbeleg über den vollen Aufrufweg,
      tatsächlich ausgeführt und notiert).
- [x] AK5 GIVEN eine Umgebung ohne `de_DE.UTF-8` WHEN die Suite läuft THEN überspringt sich der
      Test über die vorhandene Variable `HAS_DE_LOCALE` mit Skip-Meldung im #96-Stil – keine
      zweite/dritte Locale-Verfügbarkeitsprüfung.
- [x] AK6 GIVEN die vollständige Bash-Self-Test-Suite WHEN sie einmal unter deutscher Locale
      und einmal unter `LC_ALL=C` läuft THEN ist sie in beiden Läufen grün.
- [x] AK7 GIVEN die Pre-Push-Gates WHEN sie nach der Änderung laufen THEN sind sie grün.

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

## Bug-Fix (2026-09-16)

**Root Cause:** `scripts/checks/tests/run-tests.sh:8409` (vor dem Fix) – der Kostensummen-awk-
Aufruf lief ohne gesetzte Locale; unter `de_DE.UTF-8` parst BSD-awk `0.05`/`0.08` als `0` und
formatiert `%.2f` mit Dezimalkomma statt -punkt.

**Reproduktion (RED):** Helfer `tele_cost_sum_334()` zunächst ohne `LC_ALL=C` extrahiert +
neuer Locale-Regressionstest (`#341`) dagegen geschrieben und committet
(`fix: reproducing test for task-341`) – isoliert wie im Beschreibungsteil verifiziert:
Ergebnis `0,00` unter `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8`.

**Fix (GREEN):** `LC_ALL=C` vor den `awk`-Aufruf in `tele_cost_sum_334()` gesetzt
(`scripts/checks/tests/run-tests.sh:8209-8211`). Die echte #334-Assertion (`:8420`) und der
neue Regressionstest rufen denselben Helfer auf – kein zweites Vorkommen des awk-Ausdrucks.

**Mutationsbeleg (AK4):** die reale Helfer-Definition per `sed` unverändert aus der Datei
extrahiert, `LC_ALL=C` daraus entfernt und über denselben Aufrufweg (Fixture-CSV,
`LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8`) ausgeführt → Ergebnis `0,00` (rot), mit
`LC_ALL=C` → `0.13` (grün). Tatsächlich ausgeführt, nicht vermutet.

**Verifikation:**
- Volle Bash-Self-Test-Suite unter ambienter `de_DE.UTF-8`-Locale: `1561 grün, 0 rot`.
- Volle Bash-Self-Test-Suite unter `LC_ALL=C`: `1561 grün, 0 rot`.
- `pnpm`-Pre-Push-Gates (Tests/Typecheck/Format/Routen-Doku/Hooks/@import-Grenze): grün.

**Hinweis für `/codify`:** Musterfehler war ein locale-abhängiger `awk`-Dezimal-Aufruf ohne
`LC_ALL=C` – bereits als Kern-Kurzregel-Kandidat für `lessons/testing.md` (Klasse: `%.Nf`/
`s+=$N`-awk-Ausdrücke brauchen denselben `LC_ALL=C`-Schutz wie #96 für bash-`printf`).

## Review-Findings
<!-- Wird durch /review befüllt -->

Siehe [`tasks/review-341.md`](review-341.md) – alle drei Runden (Backend/Logik,
Code-Qualität, Architektur) APPROVED, keine kritischen/wichtigen Findings, keine
Out-of-Scope-Kandidaten.

## Test-Vollständigkeit (2026-09-16, `/test`)

Kein Produktionscode geändert – nur `scripts/checks/tests/run-tests.sh`. Deshalb kein
`pnpm test:coverage`-Delta zu erwarten; Baseline zur Kontrolle erneut gemessen:
`90.14 % Statements` (Schwelle 80 %, unverändert gegenüber main, kein Rückgang).

**AK-Abdeckungsmatrix:**
- AK1/AK2 (strukturell): per Grep in `/review` verifiziert – einzige Stelle, echter
  Aufruf über die volle Zeile, keine erneute Prüfung nötig.
- AK3/AK6/AK7 (Verhalten): finaler Suite-Lauf auf dem committeten Stand erneut grün
  (`1561 grün, 0 rot`, `#341`-Assertion `war: 0.13`); Pre-Push-Gates grün.
- AK4 (Mutationsbeleg): bereits im Bug-Fix-Abschnitt oben dokumentiert und tatsächlich
  ausgeführt – bewusst kein dauerhafter Mutationstest im Skript (Spec-Entscheidung).
- AK5 (Skip-Pfad): trivialer `else`-Zweig, deckungsgleich mit dem bereits ungetesteten
  `#96`-Skip-Muster in derselben Datei – kein Testgap, keine neue Konvention.

Keine fehlenden Tests identifiziert, keine neuen Testdateien nötig.

## Refactor-Notizen (2026-09-16, `/refactor`)

Kein Refactoring durchgeführt – Checkliste (Naming, Funktionsgröße/SRP, Duplikation, Magic
Numbers, Verschachtelung, WHY-Kommentare) gegen `git diff origin/main...HEAD` geprüft, keine
Verstöße gefunden: `tele_cost_sum_334()` ist eine 1-Zeilen-Funktion ohne Flag-Parameter, der
awk-Ausdruck kommt weiterhin nur einmal vor (Grep erneut bestätigt), Kommentare sind WHY.

Die vier Nitpicks aus `tasks/review-341.md` wurden geprüft und bewusst NICHT umgesetzt:
- `LC_ALL=…  LC_NUMERIC=…`-Redundanz: entspricht wörtlich der in `/requirements`
  festgelegten Analogie zu #96 – Abweichung würde die Test-Lesbarkeit verschlechtern.
- Kommentarlänge über dem Helfer: reines WHY, keine Redundanz zum Code.
- `run_timestamp` mit heutigem statt synthetischem Datum: entspricht der bestehenden
  Konvention dieser Datei (z. B. `:7988` nutzt ebenfalls ein reales Beobachtungsdatum statt
  eines Platzhalters wie `1970-01-01`) – eine Änderung würde von dieser Konvention abweichen,
  nicht sie einhalten.
- Helfer-Name `tele_cost_sum_334` trägt die Nummer des Ursprungs-Issues: konsistent mit dem
  `_310`/`_314`/`_334`-Namensmuster in derselben Datei, keine Umbenennung nötig.

Tests unverändert grün (kein Code geändert, siehe `/test`-Abschnitt oben).

## Security-Review (2026-09-16, `/security-review`)

Siehe [`tasks/security-341.md`](security-341.md) – Ergebnis PASSED, keine kritischen/wichtigen
Findings, keine Out-of-Scope-Kandidaten. Geprüft: Command Injection, Freitext-Ablage-Kanal
(Fixture-CSV), Locale-Env-Var-Injection, Temp-Datei-Handling, Secrets/PII, Dependencies,
Error Handling – alle nicht anwendbar bzw. unauffällig für diesen reinen Test-Suite-Fix.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Siehe [`tasks/codify-341.md`](codify-341.md) – neue Lesson „Locale-abhängige
Zahlenformatierung/-parsing in Shell-Test-Utilities" (`lessons/testing.md`, aus #96/#341) +
Index-Zeile in `PROJECT-CONTEXT.md`. Keine Review-/Security-Findings, die eine weitere Regel
rechtfertigen.

---
Branch: `fix/341-awk-kostensummen-locale`
Erstellt: 2026-09-16 17:28
