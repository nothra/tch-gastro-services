# Review: Task 412

## Kritische Findings (müssen behoben werden)
(keine)

## Wichtige Findings (sollten behoben werden)
- [ ] tasks/task-412-source-map-js-heben.md (AK2, Technische Notizen): AK2 verlangt `pnpm why` nach Neuauflösung **ohne Alt-Lockfile** (Spec: „gemessen, nicht aus Parent-Ranges angenommen"). Gemessen wurde nur `pnpm install` gegen das bestehende Lockfile; die Checkbox ist trotzdem abgehakt und die Notiz „Gemessen: pnpm why → ausschließlich 1.2.2" suggeriert die Frisch-Auflösung. Entweder Messung nachholen (Lockfile entfernen, `pnpm install`, `pnpm why source-map-js`, danach Lockfile wiederherstellen) oder die Checkbox/Notiz ehrlich auf „gegen bestehendes Lockfile" einschränken. Zugleich ist damit das No-op-Kriterium aus `pnpm-workspace.yaml`/Lesson `build-tooling.md` für den neuen Override nicht belegt.

## Nitpicks (optional)
- [ ] pnpm-workspace.yaml:114: Kommentar „ein Refresh löst heute 1.2.2 auf" ist eine Tatsachenbehauptung, die dieselbe Frisch-Auflösungs-Messung braucht (siehe oben).

## Positives
- Override in konditionaler Caret-Form innerhalb der 1.x-Linie, konsistent mit den Regeln im Dateikopf; Begründung samt Parents, Advisory und Erreichbarkeit dokumentiert.
- Floor-Fall in `floor_cases_291` plus Mutationsbeleg mit Nachbarzeile (1.2.2 darf nicht mitzählen) nach dem etablierten Muster; Gates laut Task grün (lint, tsc, test, build, run-tests).
- Lockfile-Diff minimal (nur source-map-js 1.2.1 → 1.2.2), kein Scope-Creep; Erreichbarkeit per Grep belegt; Nach-Merge-Prüfung von Alert #82 korrekt offen gelassen.

## Empfehlung
NEEDS_REWORK
