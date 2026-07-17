# Review: Task 116

Multi-Persona-Review (Logik/Korrektheit · Code-Qualität · Architektur) des Branch-Diffs
`main...HEAD` für die additive Katalog-Kategorie `essen`.

**Runde 2** (nach NEEDS_REWORK aus Runde 1). Das einzige substantielle Finding aus Runde 1
(ungetestete Zod-Fehlermeldung) ist in Commit `1336da2` behoben. Alle drei Personas empfehlen
in Runde 2 **APPROVED**. 32/32 Katalog-Tests grün.

## Kritische Findings (müssen behoben werden)
- [ ] Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] Keine **im Scope** dieses PRs.
- [ ] [OUT-OF-SCOPE · docs/factory/PROJECT-CONTEXT.md:36,38-39] Die kanonische Domänen-Quelle
  beschreibt noch das **alte** Essen-Modell: Zeile 36 nennt „Essenpreis" als Property der
  Veranstaltung, Zeile 38-39 „**Essen** pro Abend festgelegt". Das widerspricht dem in
  ADR-023 §D4/§D7 (spec-51/#120, spec-116) beschlossenen Modell (kein Essenpreis je Abend;
  Essen = Katalogartikel mit festem Preis). `README-montagsrunde.md` und `spec-49` sind bereits
  gezogen — PROJECT-CONTEXT ist der letzte Ausreißer (verstößt gegen CLAUDE.md „Kanonische
  Quellen immer referenzieren", W-02/W-03). **Vorbestehend** und **außerhalb** des in spec-116
  deklarierten Scopes (dort nur spec-49-Update genannt) → **kein Merge-Blocker für #116**,
  gehört in ein Follow-up-Issue. Die autonome Issue-Anlage über den Seam
  (`create_issue … documentation tech-debt`) war in dieser Session durch die
  Berechtigungs-/Sandbox-Grenze blockiert; bitte manuell anlegen:
  ```bash
  source scripts/lib/create-issue.sh
  create_issue "PROJECT-CONTEXT: veraltetes Essen-Modell an neues Katalog-Modell anpassen" \
    "PROJECT-CONTEXT.md Zeile 36 (Essenpreis) + 38-39 (Essen pro Abend) an ADR-023 §D4/§D7 ziehen; gefunden im /review von #116, out-of-scope." \
    documentation "tech-debt"
  ```

## Nitpicks (optional)
- [ ] [db/migrations/0008_salty_tiger_shark.sql:1] Kein erklärender Kommentar-Header und kein
  abschließender Newline (anders als das hand-geschriebene 0007). Für ein triviales,
  auto-generiertes `ADD VALUE` vertretbar.
- [ ] [app/verwaltung/katalog/page.tsx:7-8] Modul-Kommentar bricht mitten in der Phrase um
  („Die UI-Sperre / ist Anzeige-Komfort;") – rein kosmetisch, Inhalt (WHY, Defense in Depth) korrekt.
- [ ] [app/verwaltung/katalog/schema.ts:23] Die Kategorie-Aufzählung in der Fehlermeldung ist ein
  hart kodierter Prosa-String, unabhängig von `CATEGORY_LABEL`/Enum – bei einer 4. Kategorie
  manuell nachzuziehen. Per AC bewusst so; jetzt durch Test abgesichert (Drift → rot).
- [ ] [app/verwaltung/katalog/CatalogFields.tsx:4] `CATEGORY_LABEL` („kanonische Quelle") liegt in
  einer UI-Komponentendatei statt in eigenem Modul. Lag bereits vor #116 so – akzeptabel;
  Beobachtung, falls die Map wächst.
- [ ] [CatalogFields.test.tsx:11] `should_offerAllThreeCategories` prüft `toEqual([...])` und
  koppelt so an die Options-Reihenfolge. Da die Dropdown-Reihenfolge nutzersichtbar ist,
  vertretbar; ein Set-Vergleich wäre robuster, falls die Reihenfolge fachlich egal ist.

## Positives
- Scope exakt eingehalten, rein additiv, kein Gold-Plating; alle 7 AC + 3 Fehlerszenarien gegen
  Code + Test verifiziert.
- Runde-1-Finding sauber geschlossen: `schema.test.ts:should_nameAllThreeCategoriesInMessage_when_categoryInvalid`
  prüft gegen ein **unabhängiges Literal** via `firstIssueMessage` (kein tautologisches Assert);
  separat von `should_rejectCategory_when_notInEnum` → Meldungs- und Ablehnungs-Kriterium haben
  je eine eigene Assertion (CLAUDE.md #117, testing-standards).
- Echte Single-Source: `CATEGORY_LABEL` treibt `<select>`-Options **und** Zeilen-Label
  (`CatalogRow`); Zod leitet über `catalogCategory.enumValues` ab – kein verstreutes Literal.
- Enum durchgängig konsistent: `["getraenk","kaffee","essen"]` identisch in `db/schema.ts`,
  `0008_snapshot.json` (Z.599-601) und Migration; Journal-Eintrag idx 8 vorhanden.
- ADR-023 §D4/§D7 exakt umgesetzt (kein `essenpreis`-Feld an der Veranstaltung – im Schema belegt);
  Verzicht auf neuen ADR sauber begründet (additiver Enum-Wert, kein Drop-and-recreate #48).
- Migration verlustfrei & deploy-sicher: `ALTER TYPE … ADD VALUE` additiv, transaktionssicher
  (Neon PG≥12, Wert wird in derselben Migration nicht verwendet). Anders als der RENAME-Fall aus
  #120 **kein Lockout-Risiko** bei Code-vor-Migration (fail-closed: nur ein `essen`-Insert
  scheiterte bis zur Migration).
- Beidseitiger Rename-Nachweis: `page.test.tsx` prüft Anwesenheit „Katalog" **und** Abwesenheit
  „Getränke-Katalog". spec-49 vollständig entwidersprüchlicht (ausschließender Satz entfernt).
- Blocker (Migrations-Live-Lauf mangels `docker`) konform protokolliert (Datum + Grund + Aktion);
  Risiko wegen additiver Natur gering, deferrable an CI-Migrate-Step / `/post-merge-verify`.

## Empfehlung
APPROVED

> Alle in-scope Akzeptanzkriterien und Fehlerszenarien sind funktional und testseitig erfüllt
> (32/32 grün), das Runde-1-Finding ist behoben und der Independenz-Nachweis geführt. Das einzige
> Wichtig-Finding (veraltetes Essen-Modell in PROJECT-CONTEXT.md) ist vorbestehend und außerhalb
> des deklarierten spec-116-Scopes → als Follow-up-Issue erfassen, kein Merge-Blocker. Alles
> andere sind Nitpicks.
