# Review: Task 241

## Kritische Findings (müssen behoben werden)
- (keine)

## Wichtige Findings (sollten behoben werden)
- (keine)

## Nitpicks (optional)
- [ ] `scripts/checks/config-validation-check.sh:128–136` — Der Kommentar behauptet als
      Korrektheits-Invariante, dass ein strukturell ungültiges `tier` (z. B. `medium`) bei einem
      MIN_TIER-Skill zuerst die 4a-Meldung erhält und **nicht** fälschlich als „unter Mindest-Tier"
      abgelehnt wird. Diese Ordering-Invariante ist durch Datei-Reihenfolge + `exit 1` in `fail()`
      strukturell garantiert, aber **kein Test pinnt sie** (die AK1/AK2-Tests isolieren nur die
      Regel-5-Richtung). Ein kleiner Negativtest `review.tier: medium` → Meldung enthält `ungültiges
      tier`, **nicht** `Mindest-Tier` würde die Invariante gegen künftige Umsortierung absichern
      (#214-Muster: Ziel-Pfad isolieren + pfadspezifisches Signal). Nicht blockierend — die
      Reihenfolge ist strukturell sicher.
- [ ] `scripts/checks/config-validation-check.sh:132,140` — Regel 5 nutzt `for skill in $LISTE`
      (Wort-Splitting), während 4a/4b/4c das Idiom `while IFS= read -r … < <(yq …)` verwenden. Rein
      stilistisch; die Skill-Listen sind feste Policy-Konstanten (kein Injection-/Whitespace-Risiko),
      daher unkritisch.

## Positives
- **Korrektheit verifiziert, nicht nur behauptet:** Gate direkt gegen alle AK-Szenarien geprüft
  (AK1/AK2 fail-closed mit korrekter Meldung, AK3b isoliert Regel 5b, AK4/AK5/AK6 exit 0) und die
  volle Bash-Suite läuft **565 grün / 0 rot** — die in der Task-Notiz erwähnten „umgebungsbedingten"
  E2E-Fehlschläge treten in dieser Umgebung nicht auf. Alle 10 `#241`-Assertions grün.
- **Regel-Reihenfolge sauber gelöst:** Regel 5 sitzt bewusst nach 4a/4b/4c, sodass ein strukturell
  ungültiges `tier` die passende 4a-Meldung erhält statt einer irreführenden „unter Mindest-Tier"-
  Meldung — im Code kommentiert und begründet.
- **Policy-Konstante statt merge-barer Config (AK7):** `MIN_TIER_REQUIRED`/`MIN_TIER_SKILLS`/
  `NO_TIER_BY_SIZE_SKILLS` leben analog zu `MAX_TURNS_CEILING` am Skriptkopf; ein Override-Versuch,
  die Schwelle selbst zu setzen, fällt bereits durch die bestehende Unbekannte-Key-Regel 2 — die
  Schwelle ist nicht override-bar. Konsistent mit dem in ADR-010 etablierten Muster.
- **Effektive (gemergte) Config geprüft, nicht der rohe Override** — folgt 4a/4b/4c und schließt das
  in den Fehlerszenarien der Spec benannte Leck („nur `tier`, nicht effektive Config").
- **Test-Isolation nach #214:** AK3b deklariert den `tier_by_size`-Pfad in Custom-Defaults, damit
  Regel 5b (nicht Regel 2) fällt, und assertiert das pfadspezifische Signal (`tier_by_size` +
  `security-review` in der Meldung). AK3a dokumentiert explizit, dass gegen reale Defaults Regel 2
  greift (Defense-in-Depth).
- **Header-Kommentar-Block synchron gepflegt:** Die Regel-Aufzählung (1–5) und die Policy-Begründung
  im Skriptkopf wurden mit der neuen Regel mitgezogen (Clean-Code: aufzählender Modul-Header).
- **ADR-Trigger sauber geprüft:** Die 4-Kategorien-Abwägung (Spec-002/ADR-002) im Task-File begründet
  nachvollziehbar, warum kein neues ADR nötig ist (reine Erweiterung des ADR-010-Musters). Adressiert
  direkt die Codify-Lesson aus #224 (Issue #241).
- **Scope eingehalten:** `review.tier_by_size` bleibt override-bar (AK4, Nicht-Regression ADR-038);
  die bewusst ausgeklammerte „always-light-via-hoher-Threshold"-Restlücke bei `review` ist in der
  Spec dokumentiert und mit dem Entwickler abgestimmt — kein Gold-Plating.

## Empfehlung
APPROVED
