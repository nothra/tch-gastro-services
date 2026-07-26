# Review: Task 142

## Kritische Findings (müssen behoben werden)
- Keine

## Wichtige Findings (sollten behoben werden)
- Keine

## Nitpicks (optional)
- [ ] [app/verwaltung/katalog/schema.ts:15-20] Bestandsartikel mit `name`/`size` > 50 Zeichen (falls vor dieser Härtung über die UI angelegt) würden künftig bei jedem `updateCatalogItemAction`-Aufruf scheitern, auch bei unrelated Feldänderungen (z. B. nur Preis). Reales Risiko gering (Seed-Daten: längster Wert 21 Zeichen), ohne DB-Scan aber nicht ausgeschlossen.
- [x] [app/verwaltung/katalog/schema.test.ts] Kein expliziter Test für die Interaktion `.trim()` + `.max(50)` mit Whitespace über der Grenze (z. B. `" " + "A".repeat(50) + " "` → nach Trim exakt 50 → sollte akzeptiert werden). **Behoben in `/test`:** Test `should_acceptName_when_50CharsAfterTrimmingSurroundingWhitespace` ergänzt.
- [ ] [app/verwaltung/katalog/schema.ts:14,18] Literal `50` für `name` und `size` dupliziert. Keine gemeinsame Konstante zwingend (beide Grenzen sind semantisch unabhängig, eigene Fehlermeldungen) – Developer-Entscheidung. **Bei `/refactor` geprüft:** anders als beim `2_147_483_647`-Fund gibt es hier keine bereits existierende zentrale Konstante, bleibt bewusst Inline-Literal.
- [x] [app/verwaltung/katalog/schema.ts:26,34 (Stand vor Refactor)] **Nachtrag `/refactor`:** Das Inline-Literal `2_147_483_647` (sowohl bestehend bei `priceCents` als auch neu bei `sortOrder`) dupliziert die bereits vorhandene Konstante `INT4_MAX` aus `lib/money.ts` (dort schon für `app/veranstaltung/schema.ts` genutzt). Behoben durch Import von `INT4_MAX` an beiden Stellen.
- [ ] [app/verwaltung/katalog/schema.test.ts:89,94,102,107] `"A".repeat(50)`/`"A".repeat(51)` viermal wiederholt. Bei nur 4 Vorkommen in einer Testdatei kein Helper geboten.

## Positives
- Alle 6 Akzeptanzkriterien aus der Spec sind durch Implementierung und Tests abgedeckt (Grenzwert exakt erreicht → akzeptiert, überschritten → domänenspezifische deutsche Fehlermeldung).
- Keine Regression: bestehende Regeln (`name`-min(1), `size`-optional, `sortOrder`-min(0)) bleiben grün getestet.
- Zod-Kettenreihenfolge (`.trim()` vor `.max()`, `.optional()` nach `.max()`) korrekt – leerer `size`-Wert wird weiterhin korrekt zu `""` transformiert, ohne die Längenprüfung zu durchlaufen.
- Saubere Wiederverwendung des bestehenden `.max()`-Musters von `priceCents` (`2_147_483_647`); `.max()` statt `.refine()` bei `sortOrder` ist technisch korrekt, da die Zod-Kette dort noch eine native `ZodNumber` ist (kein `ZodEffects` wie bei `priceCents` nach `.transform()`).
- Validierung sitzt an der richtigen Schicht (Server-Action-Grenze über `catalogItemSchema`), keine Schicht-Verletzung.
- Scope exakt getroffen: setzt Kern-Kurzregel #4 (`docs/factory/PROJECT-CONTEXT.md`) um, ohne DB-Spaltentypen, Routen oder andere Schemas anzufassen. Kein Gold-Plating.
- Kein ADR nötig – keine der vier Trigger-Kategorien betroffen; Implementierungs-Notizen dokumentieren das korrekt.
- Test-Namenskonvention (`should_[Ergebnis]_when_[Bedingung]`) durchgängig eingehalten, Tests sind AAA-konform und prüfen gegen feste String-Literale (keine Tautologie).
- Task-Datei korrekt geführt (Checkboxen, Implementierungs-Notizen, keine unautorisierte Scope-Erweiterung).
- `docs/routes.md` zu Recht unverändert (kein Routen-Diff).

## Empfehlung
APPROVED
