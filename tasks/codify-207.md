## Codify-Report: Task 207

### Muster erkannt

Der Zyklus lief pipeline-konform durch (Implement → Review NEEDS_REWORK → Rework → Re-Review
APPROVED → Test → Refactor → Security PASSED). Alle Review-Findings waren **selbst verursachte
Test-Coverage-Lücken** rund um eine neue Bash-Funktion mit Exit-Code-Kontrakt + Defensiv-Guards,
plus ein veralteter Modul-Header. Zwei davon sind **neue** Muster, zwei bereits codifiziert.

| Finding | Muster | Status |
|---------|--------|--------|
| W1 – Header „stellt EINE Funktion bereit" nach Zweit-Funktion falsch | zähl-nennender Header wird stale | **neu** → code-style.md |
| W3 – `set -euo pipefail` nur auf dem Happy-Path getestet | strict-mode-Bugs leben im Fehler-/No-Match-Zweig | **neu** → testing.md |
| W2 – Defensiv-Guard (`''\|*[!0-9]*)`) ungetestet | Guard-Branch braucht dedizierten Test | bereits: testing.md #51 + code-style.md #197 |
| W4 – F2 (delegierte Degradation) über den Wrapper ungetestet | „durch Codelesen belegt" ≠ Testabdeckung | bereits: testing.md #187 |

### Neue Regeln hinzugefügt

- **`docs/factory/lessons/testing.md`** – „Strict-mode-/Umgebungs-Kontrakt-Tests gehören auf die
  Fehler-/No-Match-Zweige, nicht den Happy-Path" (aus W3). Die errexit-empfindlichen Konstrukte
  (`x=$(…) || return`, `while read`, Array-Expansion unter `set -u`) liegen im Fehler-/No-Match-/
  Fail-open-Zweig – ein strict-mode-Test auf dem früh-returnenden Treffer-Pfad belegt nichts.
  + Index-Zeile in `PROJECT-CONTEXT.md` (Trigger: `/implement`, `/test` beim Testschreiben/Coverage).
- **`docs/factory/lessons/code-style.md`** – „Zähl-/Aufzählungs-nennender Modul-Header wird beim
  Hinzufügen einer Einheit zur Lüge" (aus W1). Ein Header, der eine Anzahl/Aufzählung öffentlicher
  Einheiten nennt, ist Teil des Vertrags → im selben Commit mitpflegen, besser zählungsfrei
  formulieren. Dieselbe Drift-Klasse wie die ADR-Mechanik-Regel (#211/#55).
  + Index-Zeile in `PROJECT-CONTEXT.md` (Trigger: `/refactor`, `/review` Clean-Code).

### Keine Änderungen nötig

- W2/W4 sind Instanzen bereits vorhandener Lessons (testing.md #51/#187, code-style.md #197) –
  bewusst **kein** Duplikat angelegt (hält den Index schlank, ADR-037).
- Security-Review: PASSED ohne Findings – kein Learning.
- Kein Out-of-Scope-Issue: alle Findings waren in-scope und wurden im PR behoben.

### Empfehlung für nächste Features

Bei einer neuen Funktion mit **dokumentiertem Exit-Code-Kontrakt** (0/1/2 o. ä.) im ersten
`/implement`-Testpass die **Zweige enumerieren** (Treffer / kein Treffer / jeder Fehlercode /
Defensiv-Guard) und je Zweig einen Test schreiben – das hätte W2/W3/W4 in einer Runde erledigt,
statt sie dem Review zu überlassen. Der Happy-Path ist der am wenigsten aussagekräftige Testfall.
