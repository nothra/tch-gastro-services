## Codify-Report: Task 105

Task 105 (Extraktion des duplizierten `firstIssueMessage`-Helfers nach `lib/`) lief ohne
Factory-Fehler durch (keine Pipeline-Interrupts, keine kritischen/wichtigen Blocker im
Review oder Security-Review). Zwei Muster wurden aber im Review gefunden – beides Dinge,
die der Agent selbst eingeführt hat und die generalisierbar sind:

### Neue Regeln hinzugefügt

- **`docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine):** Neue `lib/`-Module
  domänenspezifisch benennen, kein generisches `utils`.
  – wegen: Der Helfer wurde zunächst als `lib/form-utils.ts` angelegt (so im Issue-Titel
  vorgeschlagen), was mit der `lib/`-Konvention (durchweg domänenbenannte Module) kollidiert
  und im Review Rework (Rename → `form-errors.ts`) auslöste. Muster: ein im Issue notierter
  generischer Name wird als bindend missverstanden.

- **`docs/factory/guidelines/testing-standards.md` (Arrange-Act-Assert):** Gegen einen
  erwarteten Wert (Literal) prüfen, nicht gegen das Objekt-under-Test selbst.
  – wegen: Die erste Testfassung asserte `toBe(result.error.issues[0].message)` – der
  Soll-Wert wurde aus derselben Quelle gelesen, die die Funktion verarbeitet (nahezu
  tautologisch). Häufiger LLM-Test-Fehler, daher als generische Regel aufgenommen.

### Keine Änderungen nötig
- Kein neuer Check in `scripts/checks/` nötig: Beide Regeln sind Design-/Review-Urteile
  (Modulname bzw. Assertion-Semantik), nicht mechanisch grep-/lint-bar ohne hohe
  False-Positive-Rate. Sie gehören in die Review-Perspektive, nicht in ein Gate.
- Kein Folge-Issue (ADR-018): kein Learning mit eigenem Umsetzungsaufwand offen; beide
  Findings sind in diesem PR vollständig behoben.

### Empfehlung für nächste Features
- Bei „Extract-Helper"-Tasks den vom Issue vorgeschlagenen Dateinamen als Vorschlag, nicht
  als Vorgabe behandeln – vor dem Anlegen kurz gegen die `lib/`-Namenskonvention prüfen.
- Was überraschend gut lief: strukturell-minimaler Parametertyp (Zod-entkoppelt) machte den
  Helfer trivial testbar (100 % Coverage, edge-sicher) – als Muster für weitere Grenz-Helfer
  wiederverwendbar.
