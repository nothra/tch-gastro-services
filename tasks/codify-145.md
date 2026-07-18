## Codify-Report: Task 145

Feature: Routen-Übersicht (`docs/routes.md`) + fail-closed Drift-Check + Prozess-Verankerung.

### Muster-Analyse

**Fehler-Muster (aus Review):**
- **W1 – Task-Datei stale nach Patch-Anwendung.** Der `.claude/**`-Patch wurde geliefert, dann vom
  Menschen angewendet+committet – aber die Task-Datei blieb auf `[~]`/„Mensch wendet an" stehen und
  die stale `tasks/patch-145.diff` lag als totes Artefakt herum (`git apply --check` schlägt danach
  fehl). Der bestehende `.claude/**`-Patch-Workflow beschrieb das *Liefern*, nicht das *Abgleichen
  nach Anwendung*. → **echte Lücke, codifiziert.**
- **W2 – Defensiver Zweig ohne Test.** Die Route-Group-Ableitung war implementiert (für einen
  Konstrukt-Typ, den der Baum noch gar nicht enthält), aber ungetestet. Bereits abgedeckt durch
  `testing-standards.md` („Exhaustiveness-Guards / nicht über normalen Input erreichbare Zweige
  brauchen eigenen Test") + #114 („Gate gegen driftendes Fixture testen") – **keine neue Regel,**
  im Review behoben (Fixture + Negativ-Verifikation).

**Was gut funktionierte (Design-Wissen, nicht Fehler):**
- App Router erzeugt Routen aus mehr Dateikonventionen als `page.tsx`/`route.ts`
  (`manifest.ts`, `sitemap.ts`, …). Die bewusste Scope-Grenze des Drift-Checks ist nicht
  offensichtlich → als Stolperstein festgehalten, damit künftige Metadaten-Routen nicht still
  aus der Doku fallen.

### Neue Regeln hinzugefügt
- [docs/factory/PROJECT-CONTEXT.md → „`.claude/**`-Änderungen erfordern Patch-Workflow"]
  **Nach dem Anwenden: Task-Datei + Patch-Datei abgleichen** – `[~]`→`[x]`, Blocker als „erledigt"
  markieren, stale `tasks/patch-<id>.diff` entfernen, vor Merge committen. Wegen: W1 (stale
  Task-Datei/Patch nach Anwendung, Guardrail-Verstoß „final vor Merge abschließen").
- [docs/factory/PROJECT-CONTEXT.md → neuer Stolperstein „App-Router erzeugt Routen aus mehr als
  `page.tsx`/`route.ts`"] Metadaten-Routen (`manifest.ts`/`sitemap.ts`/`robots.ts`/`icon.*`/…)
  liegen außerhalb des Drift-Check-Sets → manuell in die Prosa-Notiz von `docs/routes.md`; wer den
  Check erweitert, testet das Muster per Fixture. Wegen: nicht-offensichtliche Scope-Grenze des
  Checks (Design-Wissen aus dieser Task).

### Keine Änderungen nötig
- W2 (ungetesteter Defensiv-Zweig) ist durch bestehende Regeln (`testing-standards.md`
  Exhaustiveness + #114) abgedeckt – keine Duplikat-Regel angelegt.
- Nitpicks (nur-Pfade-Check, spec-interne Tabellen-Kopie) bewusst belassen, kein Rule-Bedarf.

### Out-of-Scope (bereits als Issue angelegt)
- **#149** – „format:check-Drift beheben (38 Dateien nicht Prettier-konform)" (`enhancement`,
  `tech-debt`). Vorbestehend auf `main`, unabhängig von #145; im `/test`-Schritt ausgelagert.

### Empfehlung für nächste Features
- Folge-Task **#148** (Rollen-Rename `abrechner`→`veranstalter` in Doku) ist ein Terminologie-Sweep
  – die #144-Regel (Doppel-Grep `-w` **und** Substring, Pfad-Beispiele gegen ADRs prüfen) direkt
  anwenden.
- Bei jedem `.claude/**`-Patch künftig direkt an die neue „Nach dem Anwenden abgleichen"-Regel
  denken – die Reconciliation ist Teil des Abschlusses, nicht optional.
