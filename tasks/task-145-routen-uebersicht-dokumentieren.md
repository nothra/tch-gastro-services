# Task 145: routen-uebersicht-dokumentieren

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Eine gepflegte **Routen-Übersicht** (`docs/routes.md`) für alle Seiten (`app/**/page.tsx`) und
API-Route-Handler (`app/api/**/route.ts`), je Route mit Pfad, Typ, Funktion und Zugriff. Die
Pflege wird per Prozessregel (CLAUDE.md-Guardrails, `/review`, `/implement`) und einem
**automatischen Drift-Check** (`scripts/checks/`, fail-closed) verbindlich verankert.

Kanonische Liste = `docs/routes.md`; PROJECT-CONTEXT und README **verweisen** nur (kein Duplikat).

Details: [spec-145](../docs/specs/spec-145-routen-uebersicht-dokumentieren.md)

## Akzeptanzkriterien

**Routen-Übersicht (`docs/routes.md`):**
- [x] Je Route: Pfad, Typ (Seite/API), Kurzbeschreibung/Funktion, Zugriff (öffentlich / angemeldet / `veranstalter` / `verwalter`).
- [x] Vollständig **und** exakt gegen `app/**/page.tsx` + `app/api/**/route.ts` (Stand `main`) – belegt durch `routes-doc-check.sh` (grün, 11 Routen).
- [x] Dokumentierter Zugriff entspricht dem `hasRole(...)`-Gate im `page.tsx` (bzw. `proxy.ts`-Ausnahme für öffentliche API-Routen).

**Referenzen (keine Duplikate):**
- [x] PROJECT-CONTEXT „Architektur" verweist auf `docs/routes.md` (ohne Tabellen-Kopie).
- [x] README „Projektstruktur (Auszug)" nennt + verlinkt `docs/routes.md` (Kurzsatz, ohne Tabellen-Kopie).

**Prozess-Verankerung:**
- [x] CLAUDE.md-Guardrails enthalten die Regel „bei jeder Routen-Änderung `docs/routes.md` aktualisieren".
- [~] `/review`-Kriterium prüft die Doku-Aktualisierung – **als Patch geliefert** (`tasks/patch-145.diff`), Mensch wendet an (siehe Blocker).
- [~] `/implement`-Checkliste erinnert an die Doku-Aktualisierung – **als Patch geliefert** (`tasks/patch-145.diff`), Mensch wendet an (siehe Blocker).

**Automatischer Drift-Check (`scripts/checks/`):**
- [x] Übereinstimmung → Exit 0; Drift (Datei ohne Doku-Eintrag oder umgekehrt) → fail-closed Exit ≠ 0, benennt die Route(n). (`scripts/checks/routes-doc-check.sh`)
- [x] Im Push-Gate eingebunden (`pre-push.sh`, Check 3), blockiert bei Drift.
- [x] Eigener Gate-Test (Positiv- **und** Negativ-Fixture, beide Drift-Richtungen), POSIX-portabel (kein `\s`/`\d`/`\w`, kein PCRE-Lookahead). (`run-tests.sh` → 8 Fälle, grün)

## Technische Notizen
- **Verortung entschieden (/requirements):** kanonische Liste = `docs/routes.md`; PROJECT-CONTEXT
  + README verweisen nur (kein Duplikat) → „Kanonische Quellen immer referenzieren".
- **Einbindungsstelle Drift-Check (offene Frage geklärt):** als **eigener Check in `pre-push.sh`**
  (Check 3, fail-closed, blockiert Push) – analog zu Check 1 (Tests) / Check 2 (Typecheck). Der
  **Meta-Test** des Checks liegt in `scripts/checks/tests/run-tests.sh` (verifiziert beide
  Drift-Richtungen + private-Ordner-Ausnahme + dynamische Segmente).
- **`manifest.ts`:** `app/manifest.ts` erzeugt `/manifest.webmanifest`, ist aber kein
  `page.tsx`/`route.ts` → **nicht** im Drift-Check-Set. In `docs/routes.md` als Prosa-Notiz
  geführt (nicht als parsebare Tabellenzeile), damit der Check keinen Fehl-Drift meldet.
- **Drift-Check-Mapping:** dynamische Segmente (`[id]`, `[...nextauth]`) bleiben 1:1 im Pfad
  (grep `-F`); Route Groups `/(name)` werden entfernt; Pfade mit `/_`-Segment (private Ordner)
  übersprungen.

## Blocker / Patch-Übergabe
- **Blocker [2026-07-18]: `.claude/commands/{review,implement}.md` sind hard-denied
  (`Edit(.claude/**)`) – der Agent kann sie nicht direkt ändern.** Die beiden Prozess-Anker sind
  als Patch geliefert: **`tasks/patch-145.diff`** (programmatisch via `difflib` erzeugt, **nicht**
  von Hand getippt). Verifiziert: `git apply --check tasks/patch-145.diff` = OK **und** grün nach
  Apply auf Temp-Kopien (Assertions: beide eingefügten Zeilen vorhanden).
  **Erforderliche Aktion des Menschen:** im Worktree
  `git apply tasks/patch-145.diff` ausführen, dann mit-committen (die beiden `.md`-Anker gehören
  in denselben PR wie die übrige Verankerung).

## Offene Fragen
- Keine offen. (Einbindungsstelle des Drift-Checks entschieden → `pre-push.sh`, siehe Techn. Notizen.)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/145-routen-uebersicht-dokumentieren`
Erstellt: 2026-07-18 06:38
