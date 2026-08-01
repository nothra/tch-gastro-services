# Task 249: model-tiers-heavy-floor

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

**PR-Shepherd 2026-08-01:** Merge freigegeben – alle Gates grün. Keine offenen Review-
Kommentare/Reviews, Branch bereits aktuell zu `origin/main` (`gh pr update-branch` meldete
„already up-to-date"), alle CI-Checks grün (`post-merge-verify` erwartungsgemäß übersprungen,
läuft nur auf `main`), keine Pflicht-Approvals ausstehend (ADR-029). PR #250 aus Draft geholt
(`gh pr ready`). `mergeStateStatus: CLEAN` → direkter Squash-Merge (kein `--auto`, s. ADR-030).

## Beschreibung
Härtung zu #241: `model_tiers.heavy` (der Blatt-Pfad in `factory.defaults.yml`, der das Modell
hinter dem Tier-Label `heavy` bestimmt) bleibt aktuell über `factory.config.yml` override-bar. Ein
Override wie `model_tiers.heavy: claude-sonnet-5` passiert alle bestehenden Gate-Regeln (2, 4a,
5a, 5b aus Task 241) unverändert und lässt `/review`/`/security-review` trotz gepinntem
`heavy`-Label auf einem schwächeren Modell laufen (PoC in Issue #249 verifiziert). Diese Task
sperrt `model_tiers.heavy` als reine Gate-Policy-Konstante (analog `MAX_TURNS_CEILING` /
`MIN_TIER_REQUIRED`) — Details siehe `docs/specs/spec-249-model-tiers-heavy-floor.md`.

Siehe Spec für vollständigen Kontext: `docs/specs/spec-249-model-tiers-heavy-floor.md`

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 – `model_tiers.heavy`-Override wird abgelehnt, unabhängig vom Wert
- [x] AK2 – Auch eine redundante Bestätigung des Default-Werts wird abgelehnt
- [x] AK3 – `model_tiers.light`-Override bleibt erlaubt (Nicht-Regression)
- [x] AK4 – Reiner Default-Lauf bleibt grün
- [x] AK5 – Das bestehende, produktive `factory.config.yml` bleibt gültig
- [x] AK6 – Die Sperre ist selbst nicht override-bar (Regel 2 fängt neue Steuer-Keys)
- [x] AK7 – Regressionstest deckt Positiv- und Negativfälle ab (yq-gated)
- [x] AK8 – `factory.config.yml.example` widerspricht der neuen Regel nicht

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**ADR-Trigger-Check (Spec-002/ADR-002), 2026-08-01 – keine Kategorie zutreffend:**

| # | Kategorie | Zutreffend? | Begründung |
|---|-----------|-------------|------------|
| 1 | Technologiewahl | Nein | Keine neue Library/Framework/DB/externer Dienst – reines Bash/`yq` im bestehenden Gate-Skript, bereits Prerequisite (ADR-009 §A). |
| 2 | Architekturmuster | Nein | Erweitert das **bereits entschiedene** Muster aus ADR-010 (Policy-Konstante im Gate-Skript, analog `MAX_TURNS_CEILING`, seit Task 241 auch für Tier-Label-Floors genutzt) um eine weitere Constraint-Klasse derselben Art – kein neuer Schichtungs-/Datenfluss-Ansatz. |
| 3 | Schnittstellen-Vertrag | Nein | `config-validation-check.sh` ist internes Factory-Tooling ohne Außenwirkung auf Teams/Services; Aufruf-Signatur und Exit-Code-Semantik ändern sich nicht, nur eine zusätzliche interne Ablehnungsregel kommt hinzu. |
| 4 | Irreversible Konsequenz | Nein | Reversibel durch Editieren des Gate-Skripts; keine Datenmigration, keine öffentliche API, keine Persistenz-Strategie betroffen. Sicherheitsrelevant (Label `security`), aber wie bei Task 241 kein Trigger für eine *architektonische* Konsequenz – die Änderung ist eine zusätzliche Werte-Constraint, kein neuer Sicherheits-*Mechanismus*. |

**Nicht-ADR 2026-08-01:** Sperre von `model_tiers.heavy` gegen Team-Override im Config-Gate –
bewusst kein neues ADR (Begründung: reine Erweiterung des in ADR-010 bereits etablierten Musters
„Policy-Konstante im Gate-Skript, nicht Teil der merge-baren Config" um eine weitere
Constraint-Klasse; keiner der vier Trigger aus Spec-002/ADR-002 greift, s. o.; identische
Einordnung wie bei Task 241, s. `tasks/task-241-config-validation-mindest-tier-security.md`).
Referenz bleibt ADR-009 §6 / ADR-010 – kein ADR-Nachtrag nötig.

**ADR-010-Drift-Frage (aus der Spec) entschieden:** Kein Nachtrag an
`docs/adr/010-config-validation-gate.md` nötig. Geprüft: der ADR-Text behauptet an keiner Stelle,
dass `model_tiers.heavy` (oder ein anderer bestehender Blatt-Pfad) frei override-bar bleiben *muss*
– §„Konsequenzen" beschreibt nur, dass *neue* Pfade (`model_tiers.medium`, neue Skill-Keys) über
Regel 2 abgelehnt werden. Diese Aussage bleibt nach dem Fix unverändert wahr; die neue Regel 6
ergänzt eine zusätzliche Ablehnung für einen *bestehenden* Pfad, widerspricht also keiner
bestehenden ADR-Aussage (kein Drift-Fall im Sinne des Codify-Learnings zu #211/#176 – das greift
nur, wenn eine ADR-Prosa-Zeile durch die Änderung faktisch falsch wird).

**Implementierungs-Hinweise für `/implement`:**

- **Ort:** `scripts/checks/config-validation-check.sh`, neue Regel **6**, physisch am Ende des
  Skripts nach der bestehenden Regel 5b (Task 241) und vor `exit 0` — analog zur Konvention, dass
  neue Task-Regeln sequenziell angehängt werden, nicht in eine bestehende Nummerierung
  eingeschoben werden (vgl. Task 241 → Regel 5 nach 4a–4c).
- **Operiert auf dem ROHEN `$OVERRIDE`, nicht auf `effective`:** Anders als Regel 4/5 braucht
  Regel 6 keinen gemergten Wert — der Pfad ist laut Spec (AK1/AK2) bereits verboten, sobald der
  Override ihn überhaupt *setzt*, unabhängig davon, ob der Wert vom Default abweicht. Guard wie
  bei Regel 2/3: nur prüfen, wenn `[ -n "$OVERRIDE" ] && [ -f "$OVERRIDE" ]`.
- **Prüf-Logik (Wiederverwendung der vorhandenen `leaf_paths`-Funktion, kein neues yq-Idiom):**
  ```bash
  # 6. model_tiers.heavy ist nicht override-bar (Task 249 — Härtung zu Task 241: das Label
  #    'heavy' darf nicht durch ein Remapping auf ein schwächeres Modell unterlaufen werden).
  LOCKED_MODEL_TIER_PATH="model_tiers.heavy"
  if [ -n "$OVERRIDE" ] && [ -f "$OVERRIDE" ]; then
    grep -qxF -- "$LOCKED_MODEL_TIER_PATH" <<< "$(leaf_paths "$OVERRIDE")" \
      && fail "'$LOCKED_MODEL_TIER_PATH' ist nicht override-bar (Gate-Policy, Task 249). Modell-ID-Pflege für 'heavy' läuft ausschließlich über factory.defaults.yml (Template-Update)."
  fi
  ```
  Die Override-Blatt-Pfade wurden für Regel 2 bereits berechnet — sofern dort in eine Variable
  extrahiert wird (`override_paths="$(leaf_paths "$OVERRIDE")"`), diese hier wiederverwenden statt
  `leaf_paths` ein zweites Mal aufzurufen (Performance/DRY, kein neues Verhalten).
- **`LOCKED_MODEL_TIER_PATH` ist eine Policy-Konstante am Skriptkopf** (analog
  `MIN_TIER_REQUIRED`), **nicht** Teil der merge-baren Config — sonst könnte ein Override die
  Sperre selbst wieder aushebeln (AK6, bereits strukturell durch Regel 2 abgesichert, falls jemand
  versucht, einen neuen Steuer-Key einzuführen).
- **Header-Kommentar aktualisieren:** Die Regel-Liste am Skriptkopf (aktuell 1–5) um
  „6. model_tiers.heavy ist nicht override-bar (Task 249)." ergänzen, konsistent mit dem
  bestehenden Stil der Regel-5-Beschreibung.
- **`factory.defaults.yml`:** Kommentar am `model_tiers`-Block (Zeilen ~30–39) um einen Hinweis
  ergänzen, dass `heavy` seit Task 249 nicht mehr per Team-Override änderbar ist (nur `light`) –
  Modell-ID-Pflege für `heavy` läuft künftig ausschließlich hier.
- **`factory.config.yml.example`:** Beispielblock „Knopf: model_tiers" (Zeilen ~27–33) – die
  `heavy:`-Beispielzeile entfernen (nur noch `light:` als Beispiel), Kommentar ergänzen, dass
  `heavy` eine Gate-Policy-Konstante ist und nicht override-bar.
- **Tests:** `scripts/checks/tests/run-tests.sh`, im bestehenden `HAS_YQ`-Block direkt nach den
  vorhandenen Regel-5-Fixtures (Task 241) – je AK1–AK4 mindestens ein Fixture (Positiv **und**
  Negativ je Regel), im bestehenden Stil (`printf ... > "$GTMP/<name>.yml"`, `assert_true`/
  `assert_false`). AK2 (redundante Bestätigung des Default-Werts) braucht ein eigenes Fixture, das
  `model_tiers.heavy` exakt auf den Defaults-Wert setzt, um zu zeigen, dass auch das abgelehnt wird
  (nicht nur ein abweichender Wert).
- **Keine Änderung an `run-pipeline.sh` nötig** – das Gate wird dort bereits fail-closed vor jeder
  Nutzung aufgerufen (ADR-010, `load_config()`), die neue Regel wirkt automatisch mit.

**Refactor-Zusammenfassung (2026-08-01, `/refactor`):** Zwei optionale Nitpicks aus `tasks/review-249.md`
angewendet, kein neues Verhalten (589 grün/0 rot vor und nach dem Refactoring, Verhalten zusätzlich
manuell an drei Fixtures gegengeprüft):
- `scripts/checks/config-validation-check.sh`: die zuvor doppelt ausgeschriebene Guard-Bedingung
  `[ -n "$OVERRIDE" ] && [ -f "$OVERRIDE" ]` (Regel 1b/2-Block und Regel 6) in eine sprechend
  benannte Helper-Funktion `override_present()` extrahiert, ohne die Ausführungsreihenfolge der
  Regeln zu ändern (Regel 6 bleibt bewusst am Skriptende, wie von der Spec verlangt).
- `scripts/checks/tests/run-tests.sh`: Kommentar bei AK2 ergänzt, der begründet, warum
  `default_heavy` dynamisch aus den Defaults gelesen wird statt literal wie bei AK1 (Robustheit
  gegen künftige Modell-ID-Änderungen, keine Tautologie – siehe Review-Finding).
- Die übrigen beiden Nitpicks (Kommentar-Redundanz über drei Dateien, macOS-Prozesssubstitutions-
  Stolperstein) waren rein redaktionell bzw. kein Code-Finding – bewusst nicht angefasst
  (Scope-Grenze, kein Gold-Plating).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] ADR-010-Drift: `docs/adr/010-config-validation-gate.md` §„Konsequenzen" ggf. nachziehen –
      **entschieden (2026-08-01, /architecture): kein Nachtrag nötig**, s. Technische Notizen oben.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/249-model-tiers-heavy-floor`
Erstellt: 2026-08-01 15:48
