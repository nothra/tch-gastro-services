# Codify-Report: Task 49 – Getränke-Katalog Preise

## Neue Regeln hinzugefügt

### 1. `docs/factory/PROJECT-CONTEXT.md` – `useActionState` + Inline-Toggle: ESLint `react-hooks/set-state-in-effect`

**Fehler-Muster:** Beim Inline-Edit-Formular in `CatalogRow.tsx` wurde `setEditing(false)` initial
in einem `useEffect` aufgerufen (`if (state?.ok) setEditing(false)`). ESLint flaggt dies als
kaskadierende Re-Render-Falle (`react-hooks/set-state-in-effect`).

**Neue Regel:** Action in einem `useCallback` wrappen, der die Server Action awaitet und `setState`
direkt nach dem Ergebnis aufruft. `useActionState` akzeptiert jeden async `(prev, formData) => State`-Wrapper.
Dieses Muster tritt bei jedem `useActionState`-Formular auf, das bei Erfolg UI-State toggelt (Modal/Inline-Edit schließen).

### 2. `docs/factory/PROJECT-CONTEXT.md` – Zod-Schema: Obergrenze für Integer-mapped Inputs fehlt

**Fehler-Muster (Security-Hint):** `EURO_INPUT_RE` in `lib/money.ts` validiert Format, aber nicht
Magnitude. Extrem große Eingaben (`99999999999`) überlaufen `int4`, der DB-Fehler wird nicht als
fachlicher Fehler erkannt → generischer 500 statt Nutzer-Hinweis.

**Neue Regel:** Nach `.transform(parseEuroToCents)` immer `.refine((c) => c <= 2_147_483_647, "...")`
ergänzen. Gilt analog für alle Zod-Felder, die auf PostgreSQL-`int4`-Spalten mappen.

## Keine weiteren Änderungen nötig

- **`runWithUniqueCheck`-Helper** (Refactoring): Gutes Muster für das Übersetzen von SQLSTATE `23505`
  in Nutzer-Feedback. Bereits im Code etabliert, kein zusätzlicher Guidelines-Eintrag nötig.
- **Stammdaten als idempotente SQL-Datenmigration**: Das `ON CONFLICT DO NOTHING`-Muster für
  Referenzdaten (nicht via `db/seed.ts`) hat reibungslos funktioniert. Ist in den Tech-Notizen
  von Task 49 dokumentiert; kein weiterer Stolperstein-Eintrag nötig.
- **`CATEGORY_LABEL` – kanonische Konstante im Field-Komponenten**: Positive Refactoring-Entscheidung
  (eine Quelle für Enum-Labels, Import statt Duplikat). Kein Regelungsbedarf.

## Empfehlung für nächste Features

- Die Zod-Obergrenze für `price_cents` sollte in `app/verwaltung/katalog/schema.ts` nachgezogen
  werden (Security-Hint aus dem Review). Umfang: eine Zeile `.refine(...)`. Kann in F5 (#52) beim
  Aufgreifen des Katalogs erledigt werden oder als eigenes Mini-Fix-Issue.
- Das `useActionState`-Wrapper-Muster ist auf `app/verwaltung/` beschränkt – bei zukünftigen
  Inline-Edit-Formularen (F4 Essen, F5 Verzehr) direkt so einsetzen.
