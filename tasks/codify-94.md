## Codify-Report: Task 94

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` → „`.claude/**`-Änderungen erfordern Patch-Workflow" erweitert:
  **„Patch NICHT von Hand schreiben (aus #94)"** – wegen des Fehler-Musters, dass der
  hand-getippte Unified-Diff korrupt war (falscher Hunk-Header-Count `@@ -88,6 +88,20 @@` statt
  `+88,19`; leere Kontextzeilen ohne führendes Leerzeichen → `git apply`: „corrupt patch at
  line 35"). Neue Regel: Diff **programmatisch** aus Temp-Kopien erzeugen (`difflib`/
  `git diff --no-index`), read-only mit `git apply --check` verifizieren und Assertions gegen
  Temp-Kopien laufen lassen.

### Keine Änderungen nötig
- **Review** (`tasks/review-94.md`): APPROVED, nur 2 Nitpicks (bewusst akzeptiert) – kein
  Fehler-Muster.
- **Security** (`tasks/security-94.md`): PASSED, ein informativer Hinweis (`:*`-Argument-Scope),
  konsistent zu ADR-019 – kein Härtungsbedarf.
- Die eigentliche Domänen-Regel (granulare `gh`-Verben pflegen) ist bereits in ADR-019 §3
  codifiziert; diese Task war ihre **Anwendung**, kein neuer Verstoß.

### Empfehlung für nächste Features
- Sobald erneut eine Task `.claude/**` berührt, greift jetzt die #94-Regel: Patch generieren,
  nicht tippen. Kandidat für später: ein kleiner Helfer `scripts/lib/make-claude-patch.sh`, der
  Temp-Kopie + `git diff --no-index` + `--check` kapselt (nicht in diesem Scope – kein Issue
  angelegt, da geringe Frequenz; bei Wiederholung erwägen).
