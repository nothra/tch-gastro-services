# Review: Task 116

Multi-Persona-Review (Logik/Korrektheit · Code-Qualität · Architektur) des Branch-Diffs
`main...HEAD` für die additive Katalog-Kategorie `essen`.

## Kritische Findings (müssen behoben werden)
- [ ] Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] [app/verwaltung/katalog/schema.ts:23 + schema.test.ts:72] Die produktiv geänderte Zod-Fehlermeldung („Kategorie muss Getränk, Kaffee oder **Essen** sein.") ist ungetestet. spec-116 (Scope Z.29-30) fordert ausdrücklich, dass die Meldung **alle drei** gültigen Kategorien nennt; `should_rejectCategory_when_notInEnum` prüft aber nur `result.success === false`. Smell (CLAUDE.md #51/#117): „Streiche ich ‚Essen' wieder aus der Meldung – wird ein Test rot?" → nein. Eine Assertion gegen ein unabhängiges Literal fehlt, z. B. `expect(...message).toBe("Kategorie muss Getränk, Kaffee oder Essen sein.")`. Deckt sich mit testing-standards („je Kriterium ein Test", „gegen erwartetes Literal prüfen").

## Nitpicks (optional)
- [ ] [db/migrations/0008_salty_tiger_shark.sql:1] Kein erklärender Kommentar-Header und kein abschließender Newline (anders als das hand-geschriebene 0007). Für ein triviales `ADD VALUE` vertretbar. Nebenbei: die Task-Notiz „Migration im Muster von 0007" ist leicht ungenau – 0007 (`RENAME VALUE`) musste hand-geschrieben werden (#48), 0008 (`ADD VALUE`) ist auto-generiert.
- [ ] [app/verwaltung/katalog/page.tsx:7-8] Modul-Kommentar bricht mitten in der Phrase um („Die UI-Sperre / ist Anzeige-Komfort;") – rein kosmetisch, Inhalt (WHY, Defense in Depth) korrekt.
- [ ] [app/verwaltung/katalog/schema.ts:23] Die Kategorie-Aufzählung in der Fehlermeldung ist ein hart kodierter Prosa-String, unabhängig von `CATEGORY_LABEL`/Enum – bei einer 4. Kategorie manuell nachzuziehen. Per AC bewusst so gewollt, nur als Hinweis (kanonische-Quellen-Regel).
- [ ] [app/verwaltung/katalog/CatalogFields.tsx:4] `CATEGORY_LABEL` („kanonische Quelle") liegt in einer UI-Komponentendatei statt in eigenem Modul. Reine Präsentation, lag bereits vor #116 so – akzeptabel; Beobachtung, falls die Map wächst.
- [ ] [CatalogFields.test.tsx:8-21] Leichte Überlappung: `should_offerAllThreeCategories` prüft bereits die Präsenz von `essen`, `should_labelEssenOption` zusätzlich das Label. Vertretbar (Wert-Liste vs. Anzeige-Label sind getrennte Belange).

## Positives
- Scope exakt eingehalten, rein additiv, kein Gold-Plating; alle 7 AC + 3 Fehlerszenarien gegen Code verifiziert.
- Echte Single-Source: `CATEGORY_LABEL` treibt `<select>`-Options **und** Zeilen-Label (`CatalogRow`); Zod leitet über `catalogCategory.enumValues` ab – kein verstreutes Kategorie-Literal. Grep bestätigt: keine zweite hart kodierte Kategorie-Liste im Repo.
- Enum durchgängig konsistent: `["getraenk","kaffee","essen"]` identisch in `db/schema.ts`, `0008_snapshot.json` und Migration; Journal-Eintrag idx 8 vorhanden.
- ADR-023 §D4/§D7 exakt umgesetzt (Katalogartikel mit festem Preis, **kein** `essenpreis` an der Veranstaltung – im Schema/Specs explizit belegt); Verzicht auf neuen ADR sauber begründet.
- Migration korrekt/verlustfrei: `ALTER TYPE … ADD VALUE` additiv, transaktionssicher (Neon PG14+, Wert wird in derselben Migration nicht verwendet); Migration-vor-Deploy-Reihenfolge hier benigne (fail-closed, kein Lockout wie beim RENAME #120).
- Guter beidseitiger Rename-Nachweis: `page.test.tsx:58` prüft Anwesenheit „Katalog" **und** Abwesenheit „Getränke-Katalog".
- `should_rejectCategory`-Test korrekt umgedreht (`essen` → `snack`) statt nur ergänzt; positiver Accept-Fall separat.
- spec-49 vollständig entwidersprüchlicht („Essen ist nicht hier" entfernt, nicht neben neuer Aussage stehen gelassen); Blocker (Migrations-Live-Lauf) konform protokolliert (Datum + Grund + Aktion).

## Empfehlung
NEEDS_REWORK

> Einziger substantieller Punkt: die eine fehlende Assertion auf den Fehlermeldungstext
> (Wichtig-Finding). Das Verhalten ist korrekt implementiert – es fehlt nur der Test, den die
> projekteigenen Regeln (#117, testing-standards „neuer Code 100 %") ausdrücklich verlangen.
> Ein Ein-Zeilen-Nachzug in `schema.test.ts`. Alles andere sind Nitpicks (kein Merge-Blocker).
