# Task 149: format-check-drift-beheben

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
`pnpm format:check` meldet 38 nicht Prettier-konforme Dateien (`app/`, `db/`, `lib/`).
Ursache: `format:check` ist an keinem Gate verdrahtet (pre-commit/pre-push/CI). Scope
(mit Entwickler bestätigt): (1) Drift beheben **und** (2) Format-Gate in `pre-push.sh`
nachrüsten, damit der Drift nicht wiederkehrt – analog zum Typecheck-Gate aus #137.

Spec: `docs/specs/spec-149-format-check-drift-und-gate.md`

## Akzeptanzkriterien
- [x] AC1 – Drift behoben: `pnpm format` angewandt (38 Dateien), `pnpm format:check` → Exit 0.
- [x] AC2 – Nur Formatierung: Diff an `app/`/`db/`/`lib/` enthält ausschließlich Prettier-
  Formatierung (Zeilenumbruch/Whitespace, Trailing-Commas beim Wrappen, ein `{" "}`-JSX-
  Space-Token in `page.tsx`) – keine Logik-/Identifier-Änderung. Token-Vergleich gegen HEAD
  (Whitespace+Kommas entfernt) + Sichtprüfung der 6 Rest-Diffs.
- [x] AC3 – Gate greift fail-closed: Prettier-Drift → `pre-push.sh` Exit 1 (Verhaltens-Test
  in `run-tests.sh`, Temp-Repo, `FACTORY_FORMAT_COMMAND=false`).
- [x] AC4 – Env-Override: `FACTORY_FORMAT_COMMAND` übersteuert den Default `pnpm format:check`
  (Verhaltens-Test: `false`→blockt, `true`→passt).
- [x] AC5 – Selbsttest: `run-tests.sh` prüft strukturell, dass `pre-push.sh` das Format-Gate
  (`FACTORY_FORMAT_COMMAND` + `format:check`) enthält. Gesamt 289 grün, 0 rot.
- [x] Fehlerfall: leerer `FACTORY_FORMAT_COMMAND=""` → Gate deaktiviert, Push zugelassen
  (nicht blockierend). Realisiert via `${FACTORY_FORMAT_COMMAND-…}` (einfaches `-`), damit
  ein bewusst leerer Wert ein echter Opt-out ist statt still auf den Default zurückzufallen.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Nicht-ADR [2026-07-18]: Format-Gate in pre-push.sh – bewusst kein ADR (Begründung: keine
der 4 Trigger-Kategorien; Prettier bereits im Einsatz, Shell-Gate ist kein Architekturmuster,
kein Schnittstellen-Vertrag, voll reversibel; spiegelt 1:1 das Typecheck-Gate #137, das
ebenfalls keinen ADR bekam).

**Keine ADR nötig.** Reversible, musterfolgende Änderung ohne neue Komponente/Abhängigkeit/
Datenmodell. Das Format-Gate spiegelt 1:1 das bestehende Typecheck-Gate (#137), das ebenfalls
keine ADR bekam (ADRs hier = Domänen-/Architektur-Entscheidungen, siehe `docs/adr/`). Gate-
Nachrüstungen sind CLAUDE.md-Regel + Selbsttest, kein ADR-Material.

**Umsetzung (3 Bausteine):**

1. **Drift beheben:** `pnpm format` ausführen → 38 Dateien werden Prettier-konform. Danach
   `pnpm format:check` (Exit 0) und `git diff --stat` prüfen (nur Whitespace/Umbrüche, AC2).

2. **Gate in `scripts/checks/pre-push.sh`** – neuer Block als **Check 3** direkt nach dem
   Typecheck (Quality-Gates gruppiert), Branch-Guard rückt auf Check 4. Struktur exakt wie
   Typecheck-Gate:
   ```bash
   FORMAT_COMMAND="${FACTORY_FORMAT_COMMAND:-pnpm format:check}"
   if [ -n "$FORMAT_COMMAND" ]; then
     echo -e "  ${YELLOW}→${NC} Format: $FORMAT_COMMAND"
     if eval "$FORMAT_COMMAND"; then
       echo -e "  ${GREEN}✓${NC} Format bestanden"
     else
       echo -e "  ${RED}✗${NC} Format-Drift – push blockiert"
       echo -e "     Beheben mit: pnpm format"
       FAILED=1
     fi
   else
     echo -e "  ${YELLOW}⚠${NC}  Format: deaktiviert (FACTORY_FORMAT_COMMAND leer)"
   fi
   ```
   - **Output NICHT nach `/dev/null`** (Abweichung vom Typecheck): `prettier --check` listet
     bei Drift die betroffenen Dateien (`[warn] …`) – direkt umsetzbar für den Entwickler.
     tsc ist verbose, prettier `--check` ist knapp/aktionabel.
   - `eval` (nicht Direktaufruf) wie bei Test/Typecheck, damit ein leerer Override den Block
     via `[ -n … ]` sauber deaktivieren kann (AC4 + Fehlerfall „leerer Befehl").
   - `FAILED=1` statt `exit 1` – konsistent mit den anderen Checks (alle Checks laufen,
     Sammel-Exit am Ende).

3. **Selbsttest in `scripts/checks/tests/run-tests.sh`** – Struktur-Assertion (Template:
   #101-Block, Zeilen ~1558): greppt `pre-push.sh` auf `FACTORY_FORMAT_COMMAND` **und**
   `format:check`. Deckt AC5. Wenn ohne großen Aufwand machbar zusätzlich ein Verhaltens-
   Test (Temp-Repo, gedriftete Datei → `pre-push.sh` Exit 1) für AC3 – analog zum
   #101-Verhaltens-Test; sonst genügt die Struktur-Assertion + manuelle AC3-Verifikation.

**Nicht anfassen:** `.prettierignore` / Prettier-Config (Factory-Inhalte `docs/`, `tasks/`,
`scripts/` bewusst ungeprüft), `pre-commit.sh`, CI-Workflows.

## Offene Fragen
- Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->
Review: APPROVED (0 kritisch, 0 wichtig, 2 Nitpicks) – `tasks/review-149.md`.

/test [2026-07-18]: Struktur-Assertion in `run-tests.sh` gehärtet – von zwei Bezeichner-Greps
(die auch Kommentar-Prosa matchen, Review-Nitpick #114) auf einen distinktiven Code-Grep
`grep -qF '${FACTORY_FORMAT_COMMAND-pnpm format:check}'`. Schließt zugleich eine Coverage-
Lücke: der Verhaltens-Test setzt den Override immer explizit, der **Default** (unset →
`pnpm format:check`) war ungetestet – ein versehentlich auf `true` geänderter Default wäre
grün geblieben. Neuer Grep verifiziert Default + Single-Dash-Semantik; rot gegen manipulierten
Default und gegen Prosa-only verifiziert. Selbsttests 289 grün. TS-Coverage 84,39 % Stmts /
83,98 % Lines (≥ 80 %), 376 Tests grün.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/149-format-check-drift-beheben`
Erstellt: 2026-07-18 08:35
