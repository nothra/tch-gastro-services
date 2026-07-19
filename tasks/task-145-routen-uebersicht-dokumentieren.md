# Task 145: routen-uebersicht-dokumentieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

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
- [x] `/review`-Kriterium prüft die Doku-Aktualisierung – Anker via Patch geliefert, **angewendet + committet** (`ee17aa8`).
- [x] `/implement`-Checkliste erinnert an die Doku-Aktualisierung – Anker via Patch geliefert, **angewendet + committet** (`ee17aa8`).

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
- **Blocker [2026-07-18] – ERLEDIGT [2026-07-18]:** `.claude/commands/{review,implement}.md` sind
  hard-denied (`Edit(.claude/**)`). Die beiden Prozess-Anker wurden als Patch geliefert
  (programmatisch via `difflib`, `git apply --check` verifiziert) und **angewendet + committet**
  (`ee17aa8`). Kein offener Handlungsbedarf; die stale Patch-Datei `tasks/patch-145.diff` wurde
  entfernt (Review-Finding W1).
- **Blocker [2026-07-18] – OFFEN (CI_FAILURE, /pr-shepherd Schritt 4):** Alle GitHub-Actions-Jobs
  (`lint`, `test`, `issue-sync`, `pr-closes-issue`, `factory-self-test`) **starten nicht** – GitHub
  meldet je Job: „The job was not started because recent account payments have failed or your
  spending limit needs to be increased." Ursache liegt **außerhalb des Codes** (Actions-Billing/
  Spending-Limit des Accounts), kein Test-/Lint-Fehler. Lokale Gates sind grün (Tests 376,
  Typecheck, Lint, Drift-Check). Re-Run ist zwecklos (Jobs können nicht starten). Branch ist
  mergeable (Konflikt gelöst, `4482699`), aber `mergeStateStatus=UNSTABLE`.
  **Erforderliche Aktion des Menschen:** GitHub → Settings → Billing & plans klären
  (Zahlung/Spending-Limit), dann CI neu triggern (`gh run rerun <id>` oder leerer Push); **oder**
  bewusst per Admin ohne CI mergen (umgeht die pr-shepherd-Regel „kein Auto-Merge bei rotem CI").
  Kein Auto-Merge durch den Agenten freigegeben.
- **ERLEDIGT [2026-07-18]:** Nach der Billing-Klärung blieb CI rot (startup_failure, null Jobs).
  Eigentliche Ursache: **Repo-Actions-Policy `allowed_actions=local_only`** blockierte
  `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` und
  `pnpm/action-setup@v4` (alle Marketplace-Actions) → Workflow-Startabbruch. **Fix (mit Freigabe):**
  Policy auf `selected` gesetzt mit `github_owned_allowed=true` + `patterns_allowed=[pnpm/action-setup@*]`
  (enge Allowlist). Danach CI **vollständig grün** (factory-self-test, issue-sync, lint,
  pr-closes-issue, test), post-merge-verify skipped (nur auf main-Push).

## Offene Fragen
- Keine offen. (Einbindungsstelle des Drift-Checks entschieden → `pre-push.sh`, siehe Techn. Notizen.)

## Review-Findings
Siehe [review-145.md](review-145.md). Runde 1 NEEDS_REWORK (W1 stale Task-Datei/Patch,
W2 ungetesteter Route-Group-Zweig) → beide behoben + verifiziert → **APPROVED**.

## Test-Vollständigkeit (/test)
- Kein neuer TS-Code → vitest-Coverage für die Änderung nicht aussagekräftig. Abdeckung des
  Gate-Verhaltens liegt in der Bash-Meta-Suite `scripts/checks/tests/run-tests.sh` (#145-Block).
- Getestete Fälle: in-sync (grün); Drift beide Richtungen (Route ohne Doku / Doku ohne Route,
  jeweils fail-closed + benannt); fehlende `docs/routes.md`; `_private`-Ausnahme; dynamisches
  `[id]`; Route-Group `(name)`→`/info`; **`foo_bar` (Unterstrich mitten im Segment ≠ privat)**;
  Push-Gate-Verdrahtung. Route-Group- und `foo_bar`-Fall zusätzlich **negativ verifiziert**
  (Muster gezielt gebrochen → Fixture rot). Suite: 293 grün.
- Bewusst nicht maschinell getestet: Übereinstimmung der Spalten Zugriff/Funktion (kuratierte
  Doku; der Drift-Check prüft nur Pfade – Review-Nitpick, dokumentiert).

## Refactoring (/refactor)
Kein neues Verhalten – nur interne Struktur (`scripts/checks/routes-doc-check.sh`):
- Duplikation entfernt: die zwei fast identischen Drift-Ausgabe-Blöcke in einen Helfer
  `report_drift <meldung> <liste>` zusammengeführt (clean-code.md „Keine Code-Duplikation").
- Sprechende Namen: Schleifen-Variablen `f`/`r` → `file`/`route`.
Verifiziert: Meta-Suite 293 grün (unverändert), Real-Check grün, Drift-Ausgabe identisch.

## Codify-Notizen
Siehe [codify-145.md](codify-145.md). Zwei Learnings → PROJECT-CONTEXT „Bekannte Stolpersteine":
(1) `.claude/**`-Patch nach Anwendung abgleichen (`[~]`→`[x]`, Blocker erledigt, stale Patch
entfernen) – aus Review-W1; (2) App-Router-Routen jenseits `page.tsx`/`route.ts` (Metadaten wie
`manifest.ts`) liegen außerhalb des Drift-Checks → manuell pflegen. Out-of-Scope: #149
(format:check-Drift). W2 durch bestehende Regeln abgedeckt – keine Duplikat-Regel.

## PR-Shepherd (/pr-shepherd)
- PR-Shepherd [2026-07-18]: Auto-Merge freigegeben – alle Gates grün.
- Merge-Konflikt mit `main` (#144 vs. #145 Stolperstein in PROJECT-CONTEXT) via Merge gelöst
  (beide behalten, kein Force-Push, `4482699`).
- CI-Blocker gelöst: Actions-Policy `local_only` → `selected` (github-owned + `pnpm/action-setup@*`).
  CI danach vollständig grün (Run 29647720009). PR aus Draft geholt, `Closes #145` im Body.

---
Branch: `feature/145-routen-uebersicht-dokumentieren`
Erstellt: 2026-07-18 06:38
