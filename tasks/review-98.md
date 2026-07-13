# Review: Task 98

Scope: `.claude/launch.json` (neu), `.claude/commands/implement.md` (Schritt 4 erweitert),
`tasks/task-98-*.md`. Rein Config/Doku, keine Laufzeitlogik. Geprüft in drei Runden
(Logik/Korrektheit · Code-Qualität · Architektur/Konsistenz).

## Kritische Findings (müssen behoben werden)
- (keine)

## Wichtige Findings (sollten behoben werden)
> Beide behoben (Commit auf `chore/98-…`): Stage-3-Absatz in `implement.md` ergänzt;
> `coding-agent.md` Schritt 7 verweist auf `implement.md` als kanonische Quelle.

- [x] [.claude/commands/implement.md:86-97] Der neue Oberflächentest-Abschnitt hat **keine
      Stage-3-/nicht-interaktive Behandlung** (`FACTORY_STAGE=3`). Zwei Teile sind dort nicht
      ausführbar: (a) „Interaktiv: `pnpm dev` … im Browser durchklicken" setzt einen Menschen
      voraus – im `run-pipeline.sh`/`claude --print`-Lauf gibt es keinen; (b) `pnpm test:e2e`
      braucht laufende DB (`pnpm db:up`) + `.env.local`, was ein Pipeline-Runner i. d. R. nicht
      hat. Der Rest der Datei behandelt Stage 3 explizit (ADR-Trigger, Schritt 0). Begründung:
      Ohne Hinweis läuft ein Stage-3-Lauf entweder ins Leere oder blockiert unklar –
      Inkonsistenz zur sonst sorgfältigen Stage-3-Führung der Datei. Empfehlung: einen Satz
      ergänzen (z. B. „In Stage 3 automatisierte E2E nur, wenn DB/Server verfügbar; interaktive
      Browser-Verifikation entfällt bzw. wird als Blocker/Nachtest vermerkt").
- [x] [docs/factory/agents/coding-agent.md:33-40] Die Persona, die `/implement` ausführt,
      beschreibt „Implementierungs-Reihenfolge" (Schritt 7: „Lokale Quality Gates ausführen")
      und die Regel „Quality Gates lokal prüfen", **erwähnt die neue Oberflächentest-Pflicht
      aber nicht**. Nach der Codify-Regel W-02/W-03 („Kanonische Quellen immer referenzieren":
      taucht eine Regel an mehreren Stellen auf, müssen alle Kopien synchronisiert werden bzw.
      auf die kanonische Quelle verweisen) sollte die Persona die Oberflächentests bei
      UI-Tasks benennen oder auf `implement.md` als kanonische Quelle verweisen. Sonst driftet
      der Persona-Text beim nächsten Update auseinander. (Datei ist editierbar – nicht `.claude/**`.)

## Nitpicks (optional)
- [ ] [.claude/commands/implement.md:96-97] „werden in der Task-Datei als erledigt vermerkt" –
      es bleibt offen, *wie* (eigene Checkbox? Notiz?). Für Determinismus ggf. eine
      Akzeptanz-Checkbox pro UI-Task-Konvention nennen. Klein, nicht blockierend.

## Positives
- `.claude/launch.json` ist valides JSON und entspricht exakt dem von `preview_start`
  erwarteten Schema (`version`, `configurations[].name/runtimeExecutable/runtimeArgs/port`).
- Fachlich korrekt: `pnpm test:e2e` startet lokal (Stage `dev` → `localhost`) den Dev-Server
  tatsächlich selbst über die `webServer`-Config in `playwright.config.ts` – die Beschreibung
  deckt sich mit dem echten Setup (inkl. `reuseExistingServer` außerhalb CI).
- Sauber abgegrenzt: Oberflächentests explizit als *zusätzlich* zu den pre-push-Gates
  (Lint + `pnpm test`) markiert, nicht als deren Ersatz – kein falscher Eindruck einer
  Gate-Verankerung.
- Rationale mit #63 belegt (Handler-Direktaufruf umging `proxy.ts`) – gute WHY-Begründung.
- Kleiner, fokussierter Diff; kein Scope-Creep; Gates grün (Lint + 29 Tests).

## Empfehlung
APPROVED (nach Rework)

Erst-Verdict war NEEDS_REWORK wegen zweier wichtiger Konsistenz-Findings (Stage-3-Führung,
Persona-Sync W-02/W-03). Beide wurden im selben interaktiven Lauf behoben und verifiziert:
- `implement.md` Schritt 4 hat jetzt einen Stage-3-Absatz (`FACTORY_STAGE=3`): interaktive
  Verifikation entfällt, E2E nur bei verfügbarer DB/Server, sonst Blocker + `/post-merge-verify`.
- `coding-agent.md` Schritt 7 verweist auf `implement.md` als kanonische Quelle.
Der Nitpick bleibt offen (unkritisch).
