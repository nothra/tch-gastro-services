# Task 241: config-validation-mindest-tier-security

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`scripts/checks/config-validation-check.sh` erzwingt für sicherheitsrelevante Skills
(`security-review`, `review`) eine Mindest-Tier-Schwelle (`heavy`), damit ein Override diese
Gates nicht unbemerkt schwächen kann (weder über das statische `tier`-Feld noch – bei
`security-review` – über `tier_by_size`). Details, Kontext und Abgrenzung: siehe
[spec-241-config-validation-mindest-tier-security.md](../docs/specs/spec-241-config-validation-mindest-tier-security.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 – `security-review.tier` unter `heavy` wird abgelehnt
- [ ] AK2 – `review.tier` unter `heavy` wird abgelehnt
- [ ] AK3 – `tier_by_size` bei `security-review` wird abgelehnt, auch mit gültigem Signal/Threshold
- [ ] AK4 – `review.tier_by_size` bleibt erlaubt (Nicht-Regression zu ADR-038)
- [ ] AK5 – Reiner Default-Lauf bleibt grün
- [ ] AK6 – Explizite Bestätigung des Minimums (`tier: heavy`) bleibt gültig
- [ ] AK7 – Die Mindest-Tier-Schwelle ist nicht override-bar (Policy-Konstante im Gate-Skript)
- [ ] AK8 – Regressionstest deckt Positiv- und Negativfälle ab (yq-gated)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

**ADR-Trigger-Check (Spec-002/ADR-002), 2026-08-01 – keine Kategorie zutreffend:**

| # | Kategorie | Zutreffend? | Begründung |
|---|-----------|-------------|------------|
| 1 | Technologiewahl | Nein | Keine neue Library/Framework/DB/externer Dienst – reines Bash/`yq` im bestehenden Gate-Skript, bereits Prerequisite (ADR-009 §A). |
| 2 | Architekturmuster | Nein | Erweitert ein **bereits entschiedenes** Muster (ADR-010: Policy-Konstante im Gate-Skript, analog `MAX_TURNS_CEILING`) um eine weitere Werte-Constraint-Regel derselben Klasse – kein neuer Schichtungs-/Datenfluss-Ansatz. |
| 3 | Schnittstellen-Vertrag | Nein | `config-validation-check.sh` ist internes Factory-Tooling ohne Außenwirkung auf Teams/Services; die "Schnittstelle" (Aufruf-Signatur, Exit-Code-Semantik) ändert sich nicht, nur eine zusätzliche interne Ablehnungsregel kommt hinzu. |
| 4 | Irreversible Konsequenz | Nein | Reversibel durch Editieren des Gate-Skripts; keine Datenmigration, keine öffentliche API, keine Persistenz-Strategie betroffen. |

**Nicht-ADR 2026-08-01:** Mindest-Tier-Constraint für `security-review`/`review` im
Config-Gate – bewusst kein neues ADR (Begründung: reine Erweiterung des in ADR-010 bereits
etablierten Musters "Policy-Konstante im Gate-Skript, nicht Teil der merge-baren Config" um
eine weitere Constraint-Klasse; keiner der vier Trigger aus Spec-002/ADR-002 greift, s. o.).
Referenz bleibt ADR-009 §6 / ADR-010 – kein ADR-Nachtrag nötig, da keine bestehende Aussage
dieser ADRs geändert wird (nur ergänzt).

**Implementierungs-Hinweise für `/implement`:**

- **Ort:** `scripts/checks/config-validation-check.sh`, neue Regel **5** nach der bestehenden
  Regel 4c (`tier_by_size`-Form), operiert wie 4a/4b/4c auf der bereits berechneten
  `effective`-Config (gemergte Defaults * Override) – nicht auf dem rohen Override, sonst
  greift die Regel nicht bei einem Override, der den Wert nur indirekt beeinflusst.
- **Policy-Konstanten am Skriptkopf** (analog `MAX_TURNS_CEILING`, mit Verweis auf diese ADR-Notiz
  statt einer neuen ADR-Nummer):
  - Ein Bezeichner für die geforderte Mindest-Tier (aktuell: der String `heavy`).
  - Eine Liste der Skills, die dieser Mindest-Tier-Pflicht unterliegen: `security-review review`.
  - Eine (Teil-)Liste der Skills, bei denen zusätzlich **kein** `tier_by_size` gesetzt sein darf:
    `security-review` (nicht `review` – AK4).
- **Prüf-Logik:**
  1. Für jeden Skill aus der Mindest-Tier-Liste: `cfg_skill_field <skill> tier` (bzw. äquivalenter
     `yq`-Pfad auf `effective`) muss exakt der geforderten Tier-Konstante entsprechen; sonst `fail`
     mit Skill-Name + Ist-Wert + geforderter Wert in der Meldung (Stil wie bestehende Regel 4a:
     „ungültiges tier '…' bei '…'").
  2. Für `security-review` zusätzlich: existiert `skills.security-review.tier_by_size` in der
     effektiven Config (`yq eval '.skills."security-review" | has("tier_by_size")'`), `fail` –
     unabhängig davon, ob Regel 4c den Inhalt für sich genommen als gültig einstufen würde.
- **Reihenfolge der Regeln beachten:** Diese neue Regel darf **nicht** vor 4a (tier ∈ model_tiers)
  greifen, sonst würde z. B. `tier: unbekannt` bei `security-review` mit der falschen
  Fehlermeldung ("unter Mindest-Tier" statt "ungültiges tier") abbrechen. Reihenfolge: 4a → 4b →
  4c → **5 (neu)**.
- **Tests:** `scripts/checks/tests/run-tests.sh`, im bestehenden `HAS_YQ`-Block direkt nach den
  vorhandenen Config-Gate-Fixtures (vgl. Zeilen ~1178–1235) – je AK1–AK5 ein Fixture, im
  bestehenden Stil (`printf ... > "$GTMP/<name>.yml"`, `assert_true`).
- **Keine Änderung** an `run-pipeline.sh` nötig – das Gate wird dort bereits fail-closed vor jeder
  Nutzung aufgerufen (ADR-010, `load_config()`), die neue Regel wirkt automatisch mit.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine – Scope im Requirements-Gespräch geklärt (siehe Spec).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/241-config-validation-mindest-tier-security`
Erstellt: 2026-08-01 07:46
