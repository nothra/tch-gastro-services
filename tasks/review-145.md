# Review: Task 145

Multi-Persona-Review (Runde 1 Logik · Runde 2 Code-Qualität · Runde 3 Architektur).
Read-only; Verdachtsfälle adversarial verifiziert. Findings in derselben Session behoben.

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- [x] [tasks/task-145-…md] **Task-Datei war stale gegenüber dem Branch-Zustand.** ACs für `/review`
      und `/implement` standen auf `[~]` „als Patch geliefert – Mensch wendet an"; der Patch war aber
      bereits angewendet + committet (`ee17aa8`), `git apply --check` schlägt fehl (verifiziert).
      Verstoß gegen CLAUDE.md „Task-Datei final vor Merge abschließen" + „keine offenen Checkboxen".
      **Behoben:** `[~]`→`[x]`, Blocker als erledigt markiert, stale `tasks/patch-145.diff` entfernt.
- [x] [scripts/checks/routes-doc-check.sh] **Route-Group-Ableitung (`sed -E 's#/\([^)]*\)##g'`) war
      ungetestet** – von der Spec (§ Fehlerszenarien) explizit als „definieren **und testen"** verlangt.
      Meta-Test deckte nur `_private` + `[id]` ab. Zweig funktioniert (verifiziert), aber Coverage-Lücke
      (testing-standards.md 100 %, #114). **Behoben:** Fixture `app/(werbung)/info/page.tsx` → `/info`
      im `#145`-Block ergänzt; negativ verifiziert (sed-Zeile entfernt → Fixture rot).

## Nitpicks (optional)
- [x] [scripts/checks/pre-push.sh] Check-3-Guard `if [ -f … ]` ohne else → still fail-open.
      **Behoben:** sichtbare Warnung im else-Zweig.
- [x] [docs/routes.md] Pfad-Konventionen (Route Groups / private Ordner) im Kopf ergänzt.
- [x] [docs/routes.md] „öffentlich"-Fußnote präzisiert (Seiten via `authorized`-Callback).
- [x] [scripts/checks/tests/run-tests.sh] ungenutztes `out=$(rc_routes)` in Fall 1 entfernt.
- [ ] Drift-Check erzwingt nur Pfade, nicht Zugriff/Funktion-Spalten – bewusst (kuratierte Doku), belassen.
- [ ] spec-145 dupliziert die Routentabelle inhaltlich – Point-in-Time-Spec, akzeptabel, belassen.

## Positives
- Drift-Check-Logik korrekt & fail-closed in beide Richtungen; fehlende Doku → Exit 1.
- Zugriffs-Klassifikation exakt gegen den Code verifiziert (`hasRole`, `proxy.ts`, `auth.config.ts`).
- Portabel (POSIX `grep -E`/`sed -E`, `grep -F`, `comm`); `foo_bar`-Fehlausschluss-Verdacht = Non-Issue.
- Stil-konsistent mit Nachbar-Checks; Namen/Funktionen sauber getrennt.
- Kanonische-Quellen-Regel eingehalten; `manifest.ts` sauber als Prosa-Notiz außerhalb des Drift-Sets.

## Empfehlung
APPROVED

> Runde 1: NEEDS_REWORK (W1 stale Task-Datei/Patch, W2 ungetesteter Route-Group-Zweig). Beide in
> derselben Session behoben + verifiziert, Nitpicks bis auf zwei bewusst belassene erledigt. Der Kern
> war von Anfang an solide.
