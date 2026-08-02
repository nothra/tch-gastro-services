# Security Review: Task 255

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] [Supply-Chain, vorbestehend, nicht neu] Der neue `config-validation`-Job lädt `yq` per `wget` von `https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64` ohne Checksum-/Signatur-Verifikation, bevor er ihn ausführt (`chmod +x` + späterer Aufruf). Dies ist exakt dasselbe, unveränderte Muster wie im bereits bestehenden `factory-self-test`-Job (`.github/workflows/factory-ci.yml:88-93` vs. `:66-71`) — diese Task dupliziert das Muster, führt es nicht neu ein. Out-of-Scope-Issue autonom angelegt: [#258](https://github.com/nothra/tch-gastro-services/issues/258).

## Verifizierte Punkte (keine Findings, zur Nachvollziehbarkeit dokumentiert)
- **Kein Injection-Vektor:** `on:` nutzt `pull_request` (nicht `pull_request_target`) — kein privilegierter Checkout von PR-Code mit Base-Repo-Secrets. `$GITHUB_WORKSPACE` ist ein von `actions/checkout` gesetzter fixer Pfad, nicht aus PR-Inhalt interpoliert. Selbst verifiziert (Zeilen 17-20 der Workflow-Datei).
- **Fail-closed:** GitHub-Actions-`run:`-Blöcke laufen standardmäßig mit `-eo pipefail` — ein scheiternder `wget` oder ein non-zero Exit von `config-validation-check.sh` färbt den Job rot, kein stiller Erfolg. Das (unveränderte) Gate-Skript selbst beendet sich bei jeder der 6 Regeln explizit über `fail()`/`exit 1`.
- **Keine Secrets:** Der neue Job deklariert keine `env:`-Secrets, erbt nur die globalen Read-Berechtigungen (`contents: read`, `issues: read`), schreibt/committet/pusht nichts.
- **Ruleset-Änderung keine Schwächung:** Live-Zustand (`gh api .../rulesets/19162920`) selbst nachgefragt: `{"approvals":0,"bypass":0,"checks":["lint","test","issue-sync","factory-self-test","pr-closes-issue","config-validation"],"enforcement":"active","merge":["squash"],"strict":false}` — deckungsgleich mit ADR-029-Sollzustand. Gegenüber dem Vorzustand wurde ausschließlich `config-validation` ergänzt; Approvals (0, bewusst für Auto-Merge), Bypass-Actors (0), Merge-Methode (`squash`) und `strict` (false) unverändert. Kein Required-Check entfernt, kein Bypass-Actor hinzugefügt.
- **Task-241/249-Policy real verstärkt:** Vor dieser Task war `model_tiers.heavy` nur indirekt über eine einzelne, fragile Testzeile in der (bereits required) `factory-self-test`-Suite geschützt. Jetzt läuft die Absicherung doppelt: ein eigener, im PR-UI klar diagnostizierbarer Required-Check `config-validation` UND Behavior-Level-Tests (AK1/AK2/AK4) innerhalb der ebenfalls required `factory-self-test`-Suite. Kein Regressionsrisiko mehr durch künftiges Aufräumen der Testdatei.
- **AK4-Testfixture korrekt konstruiert:** echter `yq`-Merge (`yq -i eval '.model_tiers.heavy = "..."'`) statt Duplicate-YAML-Key (Review-Runde-3-Fix) — `model_tiers.light` bleibt im Override erhalten, Gate schlägt weiterhin korrekt fehl.

## Ergebnis
PASSED
