# Spec: Mindest-Tier für sicherheitsrelevante Skills im Config-Gate erzwingen

## Kontext

`scripts/checks/config-validation-check.sh` validiert `factory.config.yml` (Team-Override) gegen
`factory.defaults.yml` (ADR-009/ADR-010): unbekannte Keys, `schemaVersion`-Mismatch, `tier ∈
model_tiers`, `max_turns ∈ [1, MAX_TURNS_CEILING]`, `tier_by_size`-Form. Das Gate prüft aber nur,
ob ein Wert **strukturell** gültig ist – nicht, ob er für einen bestimmten Skill **sicherheitshalber
zu schwach** ist.

**Beobachtung aus dem Security-Review von Task 224** (fix/224-top-level-yaml-edit-allow): Seit #224
darf ein nicht-interaktiver Stage-3-Agent `factory.config.yml` selbst per `Edit(*.yml)`-Allow-Regel
ändern (vorher hart durch einen Permission-Prompt blockiert). `factory.defaults.yml` setzt
`skills.security-review: { tier: heavy, max_turns: 14 }` **bewusst fix**, explizit **ohne**
`tier_by_size` – der Begründungs-Kommentar am Knopf sagt wörtlich: „ein übersehenes Finding ist
teurer als der Token-Aufpreis, unabhängig von der Diff-Größe" (ADR-038). Ein Override könnte diesen
Fail-Safe unbemerkt aushebeln, z. B.:

```yaml
skills:
  security-review: { tier: light, max_turns: 1 }
```

Das bestehende Gate akzeptiert das: `light` ist ein gültiger Schlüssel in `model_tiers`, `1` liegt
innerhalb `[1, MAX_TURNS_CEILING]`. Die GitHub-Branch-Protection (ADR-029) verlangt 0 Approvals
(damit Auto-Merge funktioniert) – das automatisierte `/security-review` ist damit faktisch die
**einzige** Instanz, die eine echte Schwachstelle noch fängt. Ein derart geschwächter Lauf
untergräbt genau die Kontrolle, die ihn hätte verhindern sollen, **bevor** er überhaupt läuft.

Zusätzlich zum statischen `tier`-Feld gibt es seit ADR-038 einen zweiten Hebel: `tier_by_size`
(größenabhängige Tier-Wahl). Für `review` ist das **gewollter** Bestandteil der Defaults
(`{ signal: diff, threshold: 150 }` – kleine Diffs dürfen `light` laufen). Für `security-review`
fehlt `tier_by_size` in den Defaults **mit Absicht** (s. o.); ein Override könnte es dennoch
einführen (z. B. `tier_by_size: { signal: diff, threshold: 999999 }`) und damit faktisch immer
`light` erzwingen – dieselbe Schwächung über einen zweiten Pfad, den die reine `tier`-Prüfung nicht
abdeckt.

**Mit dem Entwickler abgestimmter Zuschnitt** (Requirements-Gespräch, 2026-08-01):

- Die Mindest-Tier-Pflicht (`heavy`) gilt für **`security-review` UND `review`** – beide sind
  Gates ohne automatisierten Backstop (ADR-009 §G: „Gibt es ein automatisiertes Gate für den
  Output des Schritts?" → nein bei review/security-review), `review` entscheidet zusätzlich über
  die Merge-Freigabe.
- Bei `security-review` ist **zusätzlich** jedes `tier_by_size` im Override verboten – die Defaults
  lassen es bewusst weg, ein Override darf diese Entscheidung nicht unterlaufen.
- Bei `review` bleibt `tier_by_size` als Override-Feld **erlaubt** (ADR-038 gilt hier unverändert
  fort) – nur das **statische** `tier`-Feld (der Fail-Safe, der greift, wenn die Diff-Größe nicht
  bestimmbar ist) unterliegt der Mindest-Tier-Pflicht.

## Scope

**Inbegriffen:**

- Eine zusätzliche Werte-Constraint-Regel in `config-validation-check.sh`, analog zum bereits
  bestehenden `MAX_TURNS_CEILING`-Muster (ADR-009 §6 / ADR-010): die Mindest-Tier-Schwelle
  (aktuell: der Tier-Name `heavy`) ist eine **Policy-Konstante im Gate-Skript**, **nicht** Teil der
  merge-baren Config – sonst könnte ein Override sein eigenes Minimum wieder aushebeln.
- Prüfung des **statischen** `tier`-Felds der effektiven (gemergten) Config für `security-review`
  und `review`: muss `heavy` sein.
- Zusätzlich für `security-review`: Ablehnung, wenn der Override (oder die effektive Config) ein
  `tier_by_size` für diesen Skill enthält – unabhängig davon, ob `signal`/`threshold` für sich
  genommen gültig wären.
- Regressionstest in `scripts/checks/tests/run-tests.sh`, im bestehenden Abschnitt der
  Positiv-/Negativ-Fixtures für `config-validation-check.sh` (yq-gated wie die bestehenden Fälle).

**Nicht inbegriffen:**

- Änderungen an anderen Skills (`implement`, `bug-fix`, `test`, `refactor`, `codify`,
  `pr-shepherd`) – deren Tier-Wahl bleibt unverändert.
- Einschränkung von `tier_by_size` bei `review` (Schwelle/Signal) – das bleibt wie in ADR-038
  vorgesehen frei override-bar; ein etwaiges „Threshold darf nicht angehoben werden" ist explizit
  **kein** Teil dieser Task (im Requirements-Gespräch verworfen zugunsten des einfacheren, mit dem
  Entwickler abgestimmten Zuschnitts).
- Laufzeit-Enforcement außerhalb des Gates (`run-pipeline.sh` ruft das Gate bereits fail-closed vor
  jeder Nutzung auf, ADR-010 – das ist der einzige Aufrufpunkt, den diese Task berührt).
- Eine neue ADR. Die Änderung erweitert das in ADR-010 bereits etablierte Muster (Policy-Konstante
  im Gate-Skript, analog `MAX_TURNS_CEILING`) um eine weitere Constraint-Klasse – sie ändert keine
  bestehende Entscheidung. Ob dennoch ein ADR-Nachtrag sinnvoll ist, entscheidet `/architecture`.
- Erweiterbarkeit auf künftige, heute nicht existierende Tier-Namen (nur `heavy`/`light` sind
  aktuell definiert, ADR-010: neue Tiers kommen ohnehin nur über ein Template-Update der Defaults).

## Akzeptanzkriterien

- [ ] **AK1 – `security-review.tier` unter `heavy` wird abgelehnt:** GIVEN `factory.config.yml`
      setzt `skills.security-review.tier` auf einen von `heavy` abweichenden, aber strukturell
      gültigen Wert (z. B. `light`) WHEN `config-validation-check.sh` läuft THEN schlägt die
      Validierung fehl (Exit-Code ≠ 0) mit einer Meldung, die den Skill-Namen und die
      Mindest-Tier-Anforderung benennt.

- [ ] **AK2 – `review.tier` unter `heavy` wird abgelehnt:** GIVEN `factory.config.yml` setzt
      `skills.review.tier` auf `light` WHEN `config-validation-check.sh` läuft THEN schlägt die
      Validierung fehl (Exit-Code ≠ 0), analog zu AK1.

- [ ] **AK3 – `tier_by_size` bei `security-review` wird abgelehnt, auch mit gültigem
      Signal/Threshold:** GIVEN `factory.config.yml` setzt
      `skills.security-review.tier_by_size: { signal: diff, threshold: 150 }` (für sich genommen
      eine laut Regel 4c gültige `tier_by_size`-Form) WHEN `config-validation-check.sh` läuft THEN
      schlägt die Validierung dennoch fehl (Exit-Code ≠ 0), weil `security-review` laut Policy
      keine größenabhängige Tier-Wahl haben darf.

- [ ] **AK4 – `review.tier_by_size` bleibt erlaubt (Nicht-Regression zu ADR-038):** GIVEN
      `factory.config.yml` setzt `skills.review.tier_by_size` auf einen abweichenden, gültigen
      Threshold (z. B. `{ signal: diff, threshold: 300 }`) **und** lässt `skills.review.tier`
      unverändert bei `heavy` WHEN `config-validation-check.sh` läuft THEN bleibt die Validierung
      erfolgreich (Exit-Code 0) – die Mindest-Tier-Pflicht schränkt bei `review` ausschließlich das
      statische `tier`-Feld ein, nicht `tier_by_size`.

- [ ] **AK5 – Reiner Default-Lauf bleibt grün:** GIVEN kein Override existiert oder
      `factory.config.yml` lässt `skills.security-review` und `skills.review` unangetastet WHEN
      `config-validation-check.sh` läuft THEN bleibt die Validierung erfolgreich (Exit-Code 0) –
      die neue Regel darf den unveränderten Ist-Zustand nicht brechen.

- [ ] **AK6 – Explizite Bestätigung des Minimums bleibt gültig:** GIVEN `factory.config.yml` setzt
      `skills.security-review.tier: heavy` (redundant zum Default) WHEN
      `config-validation-check.sh` läuft THEN bleibt die Validierung erfolgreich (Exit-Code 0).

- [ ] **AK7 – Die Mindest-Tier-Schwelle ist nicht override-bar:** GIVEN ein Override versucht, die
      Policy-Schwelle selbst zu unterlaufen, indem er einen neuen, nicht in den Defaults
      existierenden Config-Key setzt, der die Mindest-Tier-Prüfung steuern soll WHEN
      `config-validation-check.sh` läuft THEN wird dieser Key bereits durch die bestehende
      Unbekannte-Key-Prüfung (Regel 2) fail-closed abgelehnt – die Mindest-Tier-Schwelle lebt
      analog zu `MAX_TURNS_CEILING` ausschließlich als Konstante im Gate-Skript.

- [ ] **AK8 – Regressionstest deckt Positiv- und Negativfälle ab:** GIVEN
      `bash scripts/checks/tests/run-tests.sh` WHEN die yq-abhängigen Gate-Tests laufen THEN sind
      für AK1–AK5 je mindestens ein Fixture-Fall (Positiv **und** Negativ je Regel) vorhanden,
      HAS_YQ-gated wie die bestehenden Config-Gate-Tests (kein rotes Failing bei fehlendem `yq`).

## Fehlerszenarien

- [ ] **Fehlermeldung ist unspezifisch:** Das Gate lehnt korrekt ab, nennt aber nicht, welcher
      Skill/welches Feld betroffen ist – erschwert das Debugging eines abgelehnten Override analog
      zu den bestehenden Fehlermeldungen (z. B. „ungültiges tier '…' bei '…'").
- [ ] **Regel greift zu breit:** Eine zu grob formulierte Prüfung lehnt versehentlich auch
      `review.tier_by_size`-Overrides ab (Bruch von AK4) oder erlaubt versehentlich
      `security-review.tier_by_size` (Bruch von AK3) – deshalb decken AK3/AK4 beide Richtungen für
      denselben Mechanismus (`tier_by_size`) an unterschiedlichen Skills separat ab.
- [ ] **Nur `tier`, nicht die effektive (gemergte) Config geprüft:** Prüft die neue Regel nur den
      rohen Override statt der effektiven Config (Defaults * Override), könnte ein Override, der
      `tier` unerwähnt lässt, aber über einen anderen Mechanismus wirkt, unentdeckt bleiben – die
      bestehenden Regeln 4a/4b prüfen bereits die effektive Config; die neue Regel folgt demselben
      Muster.

## Offene Fragen

_Keine – Scope wurde im Requirements-Gespräch mit dem Entwickler geklärt (Skills: security-review +
review; tier_by_size-Sperre: nur security-review, review ausgenommen)._
