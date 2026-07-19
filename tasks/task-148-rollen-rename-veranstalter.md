# Task 148: rollen-rename-veranstalter

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Reine Doku-Aufgabe: Die per ADR-024 (#120) umbenannte Owner-Rolle `abrechner` → **`veranstalter`**
in **allen lebenden Fach-Docs** nachziehen, damit die kanonische Fachquelle
(`README-montagsrunde.md`) nicht länger von PROJECT-CONTEXT/spec-48 divergiert. Nur die
**Rolle/Person** `Abrechner` wird ersetzt – die **Tätigkeit** `Abrechnung`/`Abrechnungs-` bleibt.
Historische Records (spec-120, ADRs, Task-Records, PROJECT-CONTEXT-Historie) bleiben unberührt.

Vollständige Spec inkl. Scope & Fallen: [spec-148](../docs/specs/spec-148-rollen-rename-veranstalter.md).

**Entscheidungen (Requirements-Session 2026-07-19):**
- Scope-Breite: **voll konsistent** über alle lebenden Specs (README, spec-49/50/51/52/53/54/55)
  + `git-workflow.md` Z. 93 – nicht nur die im Issue wörtlich genannten Dateien (halbe Ersetzung
  war der Auslöser dieses Issues).
- Header-Notizen (spec-52/53/54/55): auf einen **kurzen ADR-024-Pointer eindampfen** (wie spec-48).

## Akzeptanzkriterien

Kanonische Liste in [spec-148](../docs/specs/spec-148-rollen-rename-veranstalter.md); hier gespiegelt:

- [ ] AC1 – README: Rollen-Tabelle Z. 20 + Prosa Z. 10/88/96 → „Veranstalter"
- [ ] AC2 – spec-49 Z. 53 → „Veranstalter"
- [ ] AC3 – spec-50 Z. 40/54/60 → „Veranstalter"
- [ ] AC4 – spec-51: alle Rollen-Vorkommen → „Veranstalter" (Komposita inkl.); „Abrechnungsvorgang" bleibt
- [ ] AC5 – spec-52/53/55: Fließtext-Rollen → „Veranstalter"
- [ ] AC6 – spec-54: Fließtext-Rollen → „Veranstalter"
- [ ] AC7 – Header-Notizen spec-52/53/54/55 auf ADR-024-Pointer eingedampft (kein „…meint diese Rolle" mehr)
- [ ] AC8 – git-workflow.md Z. 93 → „Verwalter vs. Veranstalter"
- [ ] AC9 – Konsistenz-Guard: `git grep -i abrechner` über die Dateimenge → nur noch sanktionierte historische Rename-Pointer
- [ ] AC10 – Substring-Sweep (`-w` **und** Substring) deckt sich mit der AC9-Erlaubnismenge
- [ ] AC11 – kein `Abrechnung`/`Abrechnungs-` verändert (Tätigkeit bleibt)
- [ ] AC12 – spec-120 / ADRs / tasks / PROJECT-CONTEXT-Historie unberührt
- [ ] AC13 – kanonische Übereinstimmung mit spec-48 + PROJECT-CONTEXT

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Kein `/architecture` nötig (reine Doku, keine technische Entscheidung). Guard-Verifikation
per `git grep` (POSIX-Regex, siehe clean-code.md „Portabilität in Gate-Skripten").

## Offene Fragen

Keine – Scope & Header-Notiz-Behandlung entschieden (siehe oben).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/148-rollen-rename-veranstalter`
Erstellt: 2026-07-19 06:12
