# Spec: `model_tiers.heavy` gegen Override sperren (Härtung zu #241)

## Kontext

Task 241 (`spec-241-config-validation-mindest-tier-security.md`) hat einen Mindest-Tier-Floor
eingeführt: `factory.config.yml` darf `skills.security-review.tier` / `skills.review.tier` nicht
mehr unter `heavy` setzen (Regel 5a) und `security-review` darf kein `tier_by_size` tragen
(Regel 5b). Beide Regeln prüfen aber nur das **Label** `heavy`, nicht das **Modell dahinter**.

`model_tiers.heavy` ist ein struktureller Blatt-Pfad, der bereits in `factory.defaults.yml`
existiert (`model_tiers: { heavy: claude-opus-4-8, light: claude-sonnet-4-6 }`) und damit die
bestehende Unbekannte-Key-Prüfung (Regel 2) besteht. Ein Override wie

```yaml
model_tiers:
  heavy: claude-sonnet-5   # oder ein schwächeres/billigeres Modell
```

passiert alle bestehenden Regeln (2, 4a, 5a, 5b) unverändert, weil sie nur den Tier-**Namen**
`heavy` gegen `skills.<skill>.tier` prüfen — nicht, auf welches Modell `heavy` selbst zeigt.
`run-pipeline.sh` leitet `CLAUDE_MODEL_HEAVY` aus der effektiven `model_tiers.heavy` ab
(`get_model()` → Zeile mit `CLAUDE_MODEL_HEAVY="${CLAUDE_MODEL_HEAVY:-$(... .model_tiers.heavy ...)}"`).
Ein solcher Override lässt `/review`/`/security-review` trotz gepinntem `heavy`-Label auf einem
schwächeren Modell laufen — derselbe Bedrohungsvektor, den Task 241 verhindern sollte, nur über
einen zweiten, damals nicht enumerierten Pfad (PoC in Issue #249 verifiziert, Exit 0 vor diesem
Fix).

**Mit dem Entwickler abgestimmter Zuschnitt (Requirements-Gespräch, 2026-08-01):** `model_tiers.heavy`
wird analog zu `MAX_TURNS_CEILING`/`MIN_TIER_REQUIRED` zur reinen Gate-Policy-Konstante — ein
Override darf diesen Pfad **gar nicht mehr setzen**, unabhängig vom Wert (auch nicht redundant
mit dem Defaults-Wert). Pflege einer neuen `heavy`-Modell-ID läuft künftig ausschließlich über
`factory.defaults.yml` (Template-Update, ADR-009 §1). `model_tiers.light` bleibt unverändert frei
override-bar — genau dieser Pfad wird in `factory.config.yml` bereits legitim für Modell-ID-Pflege
genutzt (`claude-sonnet-4-6` → `claude-sonnet-5`) und darf durch diese Härtung nicht brechen.
Die verworfene Alternative (Allowlist erlaubter starker Modell-IDs, weiterhin override-bar
innerhalb der Liste) wurde bewusst nicht gewählt: zusätzliche Pflegelast bei jeder neuen
Modellgeneration und eine offene Definitionsfrage „was zählt als stark", ohne einen Vorteil zu
bieten, der über das bereits etablierte Muster hinausgeht.

## Scope

**Inbegriffen:**

- Eine neue Werte-Constraint-Regel in `config-validation-check.sh` (Regel 6, läuft nach der
  bestehenden Regel 5): Override-Blatt-Pfad `model_tiers.heavy` wird fail-closed abgelehnt, sobald
  der Override diesen Pfad überhaupt setzt — unabhängig vom Wert. Die Regel ist eine
  Policy-Konstante im Gate-Skript (analog `MAX_TURNS_CEILING`/`MIN_TIER_REQUIRED`), **nicht** Teil
  der merge-baren Config.
- Klare, eigenständige Fehlermeldung, die den Pfad benennt und auf `factory.defaults.yml` als
  einzigen Pflegeweg verweist — nicht die generische „unbekannter Key"-Meldung aus Regel 2
  (`model_tiers.heavy` ist strukturell ein bekannter, aber verbotener Override-Pfad; eine
  Wiederverwendung der Regel-2-Meldung wäre irreführend).
- `model_tiers.light` bleibt explizit unangetastet und override-bar (Nicht-Regression).
- Regressionstest in `scripts/checks/tests/run-tests.sh`, im bestehenden Abschnitt der
  Positiv-/Negativ-Fixtures für `config-validation-check.sh` (yq-gated wie die bestehenden Fälle).
- Aktualisierung von `factory.config.yml.example` (Knopf `model_tiers`): das Beispiel zeigt aktuell
  sowohl `heavy` als auch `light` als überschreibbar — das `heavy`-Beispiel muss entfernt bzw. als
  nicht-override-bar kommentiert werden, sonst lädt die Doku zu einem künftig abgelehnten Override
  ein.

**Nicht inbegriffen:**

- `CLAUDE_MODEL_HEAVY`/`CLAUDE_MODEL` Umgebungsvariablen — laut `factory.defaults.yml`-Kommentar
  ein bewusster, zusätzlicher Kosten-Hebel, der weiterhin alles sticht (auch die Config). Das ist
  eine andere, bereits bekannte Angriffsfläche (erfordert Shell-/CI-Zugriff, nicht nur einen
  Datei-Edit) und explizit außerhalb des Scopes von Issue #249.
- Einschränkung von `model_tiers.light` — bleibt frei override-bar, keine Änderung an dessen
  Verhalten.
- Eine Allowlist erlaubter Modell-IDs für `heavy` (im Requirements-Gespräch verworfene Alternative,
  s. Kontext).
- Eine neue ADR. Die Änderung erweitert das in ADR-010 etablierte Policy-Konstante-Muster (analog
  Task 241) um einen weiteren, nicht override-baren Pfad. Ob `docs/adr/010-config-validation-gate.md`
  §„Konsequenzen" (die den Team-Override-Mechanismus für `model_tiers`-Pfade beschreibt) im selben
  PR nachgezogen werden muss, entscheidet `/architecture`.
- Laufzeit-Enforcement außerhalb des Gates (`run-pipeline.sh` ruft das Gate bereits fail-closed vor
  jeder Nutzung auf — das ist der einzige Aufrufpunkt, den diese Task berührt).

## Akzeptanzkriterien

- [ ] **AK1 – `model_tiers.heavy`-Override wird abgelehnt, unabhängig vom Wert:** GIVEN
      `factory.config.yml` setzt `model_tiers.heavy` auf einen strukturell gültigen, aber
      abweichenden Modell-Namen (z. B. `claude-sonnet-5`) WHEN `config-validation-check.sh` läuft
      THEN schlägt die Validierung fehl (Exit-Code ≠ 0) mit einer Meldung, die den Pfad
      `model_tiers.heavy` benennt und auf `factory.defaults.yml` als Pflegeweg verweist.

- [ ] **AK2 – Auch eine redundante Bestätigung des Default-Werts wird abgelehnt:** GIVEN
      `factory.config.yml` setzt `model_tiers.heavy` exakt auf den in `factory.defaults.yml`
      hinterlegten Wert (keine faktische Schwächung) WHEN `config-validation-check.sh` läuft THEN
      schlägt die Validierung dennoch fehl (Exit-Code ≠ 0) — der Pfad ist grundsätzlich nicht mehr
      Teil der merge-baren Config, unabhängig vom konkreten Wert.

- [ ] **AK3 – `model_tiers.light`-Override bleibt erlaubt (Nicht-Regression):** GIVEN
      `factory.config.yml` setzt `model_tiers.light` auf einen abweichenden Modell-Namen (wie im
      bestehenden `factory.config.yml` der Fall: `claude-sonnet-4-6` → `claude-sonnet-5`) WHEN
      `config-validation-check.sh` läuft THEN bleibt die Validierung erfolgreich (Exit-Code 0).

- [ ] **AK4 – Reiner Default-Lauf bleibt grün:** GIVEN kein Override existiert oder
      `factory.config.yml` lässt `model_tiers` unangetastet WHEN `config-validation-check.sh` läuft
      THEN bleibt die Validierung erfolgreich (Exit-Code 0).

- [ ] **AK5 – Das bestehende, produktive `factory.config.yml` bleibt gültig:** GIVEN das aktuelle
      `factory.config.yml` dieses Repos (überschreibt `model_tiers.light`, nicht `.heavy`) WHEN
      `config-validation-check.sh` läuft THEN bleibt die Validierung erfolgreich (Exit-Code 0) —
      die neue Regel darf den unveränderten, legitimen Ist-Zustand nicht brechen.

- [ ] **AK6 – Die Sperre ist selbst nicht override-bar:** GIVEN ein Override versucht, die
      Sperre über einen neuen, nicht in den Defaults existierenden Config-Key zu steuern (z. B.
      einen Schalter, der Regel 6 abschaltet) WHEN `config-validation-check.sh` läuft THEN wird
      dieser Key bereits durch die bestehende Unbekannte-Key-Prüfung (Regel 2) fail-closed
      abgelehnt — die Sperre selbst lebt ausschließlich als Konstante/Prüf-Logik im Gate-Skript,
      analog zu `MAX_TURNS_CEILING` und der Mindest-Tier-Policy aus Task 241.

- [ ] **AK7 – Regressionstest deckt Positiv- und Negativfälle ab:** GIVEN
      `bash scripts/checks/tests/run-tests.sh` WHEN die yq-abhängigen Gate-Tests laufen THEN sind
      für AK1–AK4 je mindestens ein Fixture-Fall (Positiv **und** Negativ) vorhanden, HAS_YQ-gated
      wie die bestehenden Config-Gate-Tests (kein rotes Failing bei fehlendem `yq`).

- [ ] **AK8 – `factory.config.yml.example` widerspricht der neuen Regel nicht:** GIVEN der
      Beispiel-Kommentar-Block „Knopf: model_tiers" in `factory.config.yml.example` WHEN er nach
      diesem Fix gelesen wird THEN zeigt er `heavy` nicht mehr als überschreibbares Beispiel (nur
      noch `light`, mit einem Hinweis, dass `heavy` als Gate-Policy-Konstante gilt und nur über
      `factory.defaults.yml` gepflegt wird).

## Fehlerszenarien

- [ ] **Fehlermeldung wird mit „unbekannter Key" verwechselt:** Die neue Regel darf nicht einfach
      Regel 2 wiederverwenden, sonst meldet das Gate fälschlich einen Tippfehler statt einer
      bewussten Policy-Sperre — erschwert das Debugging (Entwickler sucht einen Schreibfehler, der
      nicht existiert).
- [ ] **Regel greift zu breit:** Eine zu grob formulierte Prüfung (z. B. „jeder Pfad unter
      `model_tiers.*`") lehnt versehentlich auch `model_tiers.light` ab (Bruch von AK3/AK5) — die
      Regel muss exakt auf den Blatt-Pfad `model_tiers.heavy` zielen, nicht auf das Präfix.
- [ ] **Regel greift zu schmal:** Prüft die neue Regel nur den rohen Override statt (wie die
      bestehenden Regeln 4/5) die effektive Config, könnte ein zweistufiger Merge-Pfad
      unentdeckt bleiben. Da `model_tiers.heavy` aber ohnehin komplett verboten wird (nicht nur
      wertabhängig eingeschränkt), genügt die Prüfung `has("model_tiers.heavy")` auf dem
      **rohen Override** — es gibt keinen effektiven Wert zu prüfen, den der Override nicht selbst
      gesetzt haben müsste.

## Offene Fragen

- [ ] **ADR-010-Drift:** `docs/adr/010-config-validation-gate.md` §„Konsequenzen" beschreibt den
      Team-Override-Mechanismus für `model_tiers`-Pfade, ohne `heavy` als Sonderfall zu nennen.
      `/architecture` entscheidet, ob ein ADR-Nachtrag nötig ist oder ein Kommentar-Update im Gate-
      Skript/den Defaults genügt (kein neuer ADR laut Scope-Entscheidung oben).
