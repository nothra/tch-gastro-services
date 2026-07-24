## Codify-Report: Task 176

### Muster / Beobachtung
- **Selbst-referenzielle Doku-Drift:** Der Fix (#176) machte genau die Lesson stale, die den
  ursprünglichen Bug (#161) beschrieb – zwei Formen: (1) eine **Präsens**-Aussage über das
  Ist-Verhalten der Skills und (2) ein Satz, der die Umstellung als **offenen Follow-up (#176)**
  auswies. `/implement` pflegte Task + Spec, fing die Prosa aber nicht; `/review` fand den Drift.
  → Das bestehende #211/#55-Prinzip („beschriebene Mechanik im selben PR mitpflegen") gilt breiter
  als nur für ADRs, auch für `lessons/**` + `PROJECT-CONTEXT.md`.
- **Was gut lief:** Patch-Workflow lief in einem Zyklus sauber (programmatisch via difflib/UTF-8,
  `git apply --check` + Akzeptanz-Grep gegen Temp-Anwendung vor Übergabe, dann Human-Apply +
  Reconciliation) – die Lessons aus #91/#94/#145/#212 haben gegriffen, kein zweiter Apply-Zyklus.
- **Kein neues Learning nötig für:** Scope-Disziplin, best-effort-Formulierung, proportionaler
  Review/Test/Refactor bei Doku-only – lief regelkonform.

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/factory-workflow.md`] Neue Lesson „Auch Lesson-/Kontext-Doku im selben PR
  nachziehen: Präsens-Mechanik + benannter Follow-up (#N) werden stale" (erweitert #211 über ADRs
  hinaus; historische Vorfall-Narrative bleiben unverändert) – wegen: selbst-referenzielle
  Doku-Drift oben.
- [`docs/factory/PROJECT-CONTEXT.md`] Index-Zeile dazu mit „Laden bei"-Trigger (`/codify`, `/review`
  – bei Doku, die die geänderte Mechanik / einen erledigten Follow-up beschreibt).

### Erledigte Doku-Pflege (TODO aus Review #176)
- [`factory-workflow.md:307-308`] Präsens „laden … per `git diff main...HEAD`" → „luden **vormals** …
  seit **#176** `origin/main...HEAD`".
- [`factory-workflow.md:323-325`] „als Follow-up erfasst (#176)" → „wurden in **#176** … umgestellt".
- [`factory-workflow.md:136`] generischer Branch-Diff im Patch-Kontext `main...HEAD` → `origin/main...HEAD`
  (Konsistenz-Nitpick aus Review).
- [`PROJECT-CONTEXT.md:266`] Index-Titel um „(Skill-Vorlagen seit #176 auf `origin/main...HEAD`)" ergänzt.
- Verbleibende `main...HEAD` in `docs/factory/` sind bewusst historisch/zitiert (Vorfall-Narrativ +
  Lehr-Beispiel in der neuen Lesson); Spec-176 beschreibt den Vorher-Zustand der Task und bleibt.

### Keine Änderungen an
- `CLAUDE.md` (kein neues fundamentales Prinzip), `guidelines/` (nicht universell, projektspezifisch),
  kein neuer Check (bewusste YAGNI-Entscheidung der Spec – reine Doku-Umstellung), kein Out-of-Scope-Issue.

### Empfehlung für nächste Features
- Bei einem Fix, der einen **benannten Follow-up (#N)** erledigt: im `/codify` gezielt
  `grep -rn "#<id>" docs/factory/` **und** nach dem alten Mechanik-Term sweepen, bevor der PR schließt.
