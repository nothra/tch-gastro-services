# Task 148: rollen-rename-veranstalter

## Status
- [x] In Bearbeitung → Implementierung abgeschlossen (alle 13 AC grün)
- [x] Review bestanden (APPROVED, `tasks/review-148.md`)
- [x] Tests vollständig (reine Doku: keine Unit-Tests; ACs per `git grep`-Guards belegt – `/test` gegenstandslos)
- [x] Security-Review bestanden (PASSED, `tasks/security-148.md`)
- [x] Refactoring abgeschlossen (n/a – kein Produktionscode; Text bereits minimal/konsistent)
- [x] Codify ausgeführt (`tasks/codify-148.md`; Homograph-Regel in PROJECT-CONTEXT ergänzt)
- [x] Fertig / PR erstellt (Draft-PR #154; Freigabe/Merge über `/pr-shepherd`)

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

- [x] AC1 – README: Rollen-Tabelle Z. 20 + Prosa Z. 10/88/96 → „Veranstalter"
- [x] AC2 – spec-49 Z. 53 → „Veranstalter"
- [x] AC3 – spec-50 Z. 40/54/60 → „Veranstalter"
- [x] AC4 – spec-51: alle Rollen-Vorkommen → „Veranstalter" (Komposita inkl.); „Abrechnungsvorgang" bleibt
- [x] AC5 – spec-52/53/55: Fließtext-Rollen → „Veranstalter"
- [x] AC6 – spec-54: Fließtext-Rollen → „Veranstalter"
- [x] AC7 – Header-Notizen spec-52/53/54/55 auf ADR-024-Pointer eingedampft (kein „…meint diese Rolle" mehr)
- [x] AC8 – git-workflow.md Z. 93 → „Verwalter vs. Veranstalter"
- [x] AC9 – Konsistenz-Guard: `git grep -i abrechner` (spec-120/spec-148 ausgeschlossen) → nur noch sanktionierte Pointer (spec-48 + 52/53/54/55)
- [x] AC10 – Substring-Sweep (`-w` **und** Substring) deckt sich mit der AC9-Erlaubnismenge (identische Ausgabe, kein Kompositum übersehen)
- [x] AC11 – kein `Abrechnung`/`Abrechnungs-` verändert (Tätigkeit bleibt; „Abrechnung"-Count in README/spec-51 unverändert 4/7)
- [x] AC12 – spec-120 / ADRs / PROJECT-CONTEXT-Historie unberührt (`git diff --quiet` grün)
- [x] AC13 – kanonische Übereinstimmung mit spec-48 + PROJECT-CONTEXT (Rollen-Vokabel „Verwalter/Veranstalter" deckungsgleich)

### Implementierungs-Notiz (2026-07-19)

Reine Textänderung, kein Produktionscode → kein TDD-Zyklus; Verifikation über `git grep`-Guards
(POSIX, portabel). Umsetzung: (1) Header-Notizen in spec-52/53/54/55 manuell auf den ADR-024-
Pointer eingedampft, (2) danach Bulk-Replace `Abrechner` → `Veranstalter` (nur Groß, die Rolle)
über die 8 lebenden Specs + git-workflow.md. `Abrechnung`/`Abrechnungs-` (Tätigkeit) enthält den
Teilstring nicht und blieb unangetastet. **Zwei Fallen aus #144 aktiv abgesichert:** Doppel-Grep
(`-w` **und** Substring, identische Ausgabe) + Pfad-/Identifier-Beispiele gegen die ADRs geprüft
(spec-120 als Entscheidungs-Record bewusst unberührt). Keine UI-/Routen-Berührung → keine
E2E-/Browser-Verifikation nötig.

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
