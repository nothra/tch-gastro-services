## Codify-Report: Task 142

### Neue Regeln hinzugefügt
- [`docs/factory/lessons/code-style.md`](../docs/factory/lessons/code-style.md) – „Magic-Number-Konsistenz-Bewertung braucht projektweiten Grep, nicht nur Datei-/PR-lokalen Vergleich" + Index-Zeile in `docs/factory/PROJECT-CONTEXT.md` (Trigger: `/review`, `/refactor`) – wegen: `/review` Runde 2 bewertete das duplizierte Literal `2_147_483_647` (`priceCents`/`sortOrder`) fälschlich als „konsistent, kein Fix nötig", weil nur innerhalb derselben Datei verglichen wurde. Tatsächlich existierte bereits die Konstante `INT4_MAX` in `lib/money.ts` (genutzt in `app/veranstaltung/schema.ts`) – erst `/refactor` fand sie per codebase-weitem Grep. Reviews zu Magic-Number-Findings müssen künftig projektweit suchen, nicht nur lokal vergleichen.

### Keine Änderungen nötig
- ADR-Trigger-Check (`/implement` Schritt 0): korrekt als „kein Trigger" erkannt und ohne Rückfrage weitergelaufen – reine Zod-Härtung ist keine der vier Kategorien. Kein Anpassungsbedarf an der Trigger-Logik.
- Der Whitespace-Grenzfall-Test (`.trim()` + `.max(50)`), den `/review` als Nitpick fand und `/test` sofort ergänzte, ist ein Einzelfall ohne erkennbares Wiederholungsmuster (keine früheren Codify-Einträge zu ähnlichen Zod-Ketten-Interaktionen) – keine neue Lesson nötig, um die Lessons-Datei nicht mit Einzelfällen zu überladen.
- Security-Review lief ohne Findings durch (PASSED); keine Lücke im Prüfkatalog erkennbar.

### Empfehlung für nächste Features
Bei Findings zu duplizierten Magic Numbers/Literalen im Review immer zuerst `grep -rn "<Wert>"` sowie eine Suche nach naheliegenden Konstantennamen über das ganze Repo laufen lassen, bevor „konsistent mit bestehendem Muster" als Begründung für „kein Fix nötig" akzeptiert wird.
