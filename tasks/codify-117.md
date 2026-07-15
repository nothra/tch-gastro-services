## Codify-Report: Task 117

### Muster-Analyse
- **Review #117:** 0 Findings. **Security #117:** 0 Findings. Kein Fehler-Muster in den
  Review-/Security-Runden.
- **Ein echter Selbstfund in `/test`:** Der in `/implement` geschriebene Guard deckte nur AC1
  (Seam-**Kommando** in Schritt 2), nicht AC2 (die **fail-closed-Begründung mit ADR-019**).
  Beide Kriterien stehen im selben Absatz auf getrennten, einzeln entfernbaren Zeilen – ein
  Presence-Grep auf das Kommando ließ die Begründung ungetestet. Generalisierbar → neue Regel.

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` → „AC mit Direktive + Begründung: je separierbaren Teil eine
  eigene Assertion (aus #117, /test-Selbstfund)" – wegen: Doc-/Config-Guard testet nur den
  auffälligsten Token (Kommando) und nimmt die begleitende Rationale als mitgetestet an, obwohl
  sie separat entfernbar ist. Erweitert den #51-Smell („Wenn ich es entferne, schlägt kein Test
  fehl") auf den Fall bündelnder Akzeptanzkriterien; Pflicht-Negativ-Nachweis der Unabhängigkeit.

### Keine Änderungen nötig
- **Patch-Workflow für `.claude/**` (#94):** korrekt angewandt – Diff programmatisch via `difflib`
  erzeugt, `git apply --check` read-only bestätigt, kein handgetippter Diff. Bestehende Regel hat
  gegriffen.
- **Section-scoped Guard statt globalem Grep (#114, „Kommando ≠ Prosa"):** von Anfang an beachtet
  (Guard prüft den Schritt-2-Abschnitt, nicht global). Bestehende Regel hat gegriffen.
- **Commit/Push über `factory-commit.sh` (ADR-019):** durchgehend genutzt; die Task selbst hat
  genau diese Konsistenz für Schritt 2 hergestellt.
- Keine Out-of-Scope-Folgearbeit → **kein** neues Issue nötig. Kein neuer Check nötig (der
  Guard existiert bereits in `run-tests.sh`). Kein CLAUDE.md-/Guideline-Eingriff (projektspezifisch,
  daher PROJECT-CONTEXT.md).

### Empfehlung für nächste Features
- Beim Schreiben eines Doc-/Config-Guards die Akzeptanzkriterien zuerst in ihre **separierbaren
  Teile** zerlegen (Kommando | Rationale | Warnung) und je Teil eine Assertion planen – der
  Negativ-Nachweis (einen Teil entfernen, nur dessen Guard darf rot werden) gehört in denselben
  Arbeitsschritt, nicht erst in `/test`.
