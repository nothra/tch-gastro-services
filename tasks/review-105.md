# Review: Task 105

Multi-Persona-Review (Logik & Korrektheit · Code-Qualität · Architektur & Konsistenz)
des Diffs `main...HEAD`. Scope: Extraktion des duplizierten Zod-Fehler-Helfers
`firstIssueMessage` nach `lib/form-utils.ts`. Kein neues Verhalten.

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- [x] **Behoben.** `lib/form-utils.ts` (Modulname): `-utils` war der einzige generische
      Name im sonst domänenspezifisch benannten `lib/` (`authz`, `money`, `credentials`,
      `rate-limit`, `stage`). Auf Entscheidung des Menschen umbenannt zu
      `lib/form-errors.ts` (benennt das WAS statt der technischen Kategorie „utils",
      konsistent mit der `lib/`-Konvention). Import-Pfad in beiden Actions + Test
      aktualisiert; Gates erneut grün.

## Nitpicks (optional)
- [ ] `lib/form-utils.test.ts:10,19`: Assertion `toBe(result.error.issues[0].message)`
      vergleicht gegen dieselbe Quelle, aus der die Funktion liest (Einzel-Issue-Fall
      dadurch nahezu tautologisch). Aussagekraft trägt der `multipleIssues`-Ordering-Test.
      Verhaltensorientierter wäre eine konkrete erwartete Meldung
      (`z.string("Name fehlt")` → `toBe("Name fehlt")`).
- [ ] `lib/form-utils.ts:5`: Letzter Kommentar-Halbsatz „Fällt zurück, wenn kein Issue
      vorliegt." ist leicht WHAT (steht im `??`-Code). Die Sätze davor erklären sauber
      das WHY. Entbehrlich, kein echtes #67-Problem.
- [ ] `app/verwaltung/{katalog,teilnehmer}/actions.ts:5`: neuer Import zwischen
      `@/lib/authz` und `@/db/*` — konsistent mit bestehendem Stil (lib vor db), rein
      kosmetisch, kein Handlungsbedarf.
- [ ] Fallback-String `"Ungültige Eingabe."` wörtlich in Modul (`:9`) und Test (`:23`).
      Für einen einzelnen Wert vertretbar; Export als Konstante wäre Over-Engineering-Grenze.

## Positives
- Textbook-Extraktion: beide Kopien vollständig entfernt (nicht neben der neuen belassen),
  Verhalten 1:1 (Signatur, Optional-Chaining, Fallback-String inkl. Umlaut/Punkt identisch).
- Typ-Kompatibilität an allen 4 Aufrufstellen verifiziert (`ZodError.issues` → minimaler
  struktureller Parametertyp); Produktionscode bleibt Zod-entkoppelt und edge-sicher
  (kein `db`/`bcrypt`-Import).
- Guter WHY-Kommentar am Modul (bewusst struktureller Parametertyp statt `ZodError`-Bindung
  → ohne Zod-Aufbau testbar) — im Stil von `money.ts`, konform zum #67-Learning.
- Tests decken die 3 Verzweigungen (single / multiple / empty→Fallback) — 100 % der neuen
  Public-Funktion; Test-Namen im Projektschema `should_..._when_...`, AAA eingehalten.
- Schicht-Grenze korrekt: querschnittlicher Helfer gehört nach `lib/`, nicht in `db/`.
- Kein ADR-Trigger (kein Technologie-/Interface-/irreversibler Entscheid) — Erwartung bestätigt.

## Empfehlung
APPROVED
