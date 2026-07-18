# Task 145: routen-uebersicht-dokumentieren

## Status
- [ ] In Bearbeitung
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
- [ ] Je Route: Pfad, Typ (Seite/API), Kurzbeschreibung/Funktion, Zugriff (öffentlich / angemeldet / `veranstalter` / `verwalter`).
- [ ] Vollständig **und** exakt gegen `app/**/page.tsx` + `app/api/**/route.ts` (Stand `main`).
- [ ] Dokumentierter Zugriff entspricht dem `hasRole(...)`-Gate im `page.tsx` (bzw. `proxy.ts`-Ausnahme für öffentliche API-Routen).

**Referenzen (keine Duplikate):**
- [ ] PROJECT-CONTEXT „Architektur" verweist auf `docs/routes.md` (ohne Tabellen-Kopie).
- [ ] README „Projektstruktur (Auszug)" nennt + verlinkt `docs/routes.md` (Kurzsatz, ohne Tabellen-Kopie).

**Prozess-Verankerung:**
- [ ] CLAUDE.md-Guardrails enthalten die Regel „bei jeder Routen-Änderung `docs/routes.md` aktualisieren".
- [ ] `/review`-Kriterium prüft die Doku-Aktualisierung (Patch, `.claude/**` hard-denied).
- [ ] `/implement`-Checkliste erinnert an die Doku-Aktualisierung (Patch, `.claude/**` hard-denied).

**Automatischer Drift-Check (`scripts/checks/`):**
- [ ] Übereinstimmung → Exit 0; Drift (Datei ohne Doku-Eintrag oder umgekehrt) → fail-closed Exit ≠ 0, benennt die Route(n).
- [ ] Im Push-Gate eingebunden (`pre-push.sh` bzw. `run-tests.sh`), blockiert bei Drift.
- [ ] Eigener Gate-Test (Positiv- **und** Negativ-Fixture), POSIX-portabel (kein `\s`/`\d`/`\w`, kein PCRE-Lookahead).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
- **Patch-Workflow für `.claude/**`:** `/review`- und `/implement`-Änderungen als `tasks/patch-145.diff` liefern (programmatisch via `git diff` erzeugen, nicht von Hand tippen; mit `git apply --check` verifizieren). Mensch wendet an.
- Drift-Check: dynamische Segmente (`[id]`, `[...nextauth]`) sauber mappen; Route Groups `(name)` / private `_`-Ordner nicht als Route zählen.

## Offene Fragen
- [ ] Einbindungsstelle des Drift-Checks: eigener Check in `pre-push.sh` vs. Fall in `scripts/checks/tests/run-tests.sh` – entscheidet `/implement` nach Nachbar-Konvention (kein Blocker).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/145-routen-uebersicht-dokumentieren`
Erstellt: 2026-07-18 06:38
