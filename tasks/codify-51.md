## Codify-Report: Task 51

### Neue Regeln hinzugefügt

**`docs/factory/PROJECT-CONTEXT.md` → Bekannte Stolpersteine**

1. **IDOR: Data-Layer DELETE/UPDATE müssen Parent-ID einschließen** –
   `removeZeile(zeileId)` filterte nur über `id` ohne `veranstaltungId`. Ein
   manipulierter Request konnte über eine offene Veranstaltung eine Zeile aus einer
   anderen Veranstaltung/Theke löschen. Fix: `and(eq(id,…), eq(veranstaltungId,…))`.
   Regel: jede DELETE/UPDATE-Operation auf Zeilen-Tabellen (FK-Parent) bindet den
   Parent-Key im WHERE ein. Nur `id` allein ist ein IDOR-Risiko.

2. **Soft-Delete: `active`-Prüfung nach Laden by ID** –
   `getTeilnehmer(id)` gab soft-gelöschte Teilnehmer zurück; `addZeileAction` prüfte
   `active` nicht → ein manipulierter Request konnte einen inaktiven Teilnehmer erfassen.
   Regel: Jede Funktion, die per `id` lädt und das Ergebnis in Schreiboperationen nutzt,
   prüft danach explizit `active`.

3. **`vi.clearAllMocks()` löscht keine Mock-Implementierungen** –
   `clearAllMocks()` im `beforeEach` löscht nur Call-History, nicht
   `mockReturnValue`/`mockRejectedValue`. Führte zu Reihenfolge-Abhängigkeit zwischen
   `describe`-Blöcken. Fix: `vi.resetAllMocks()`. (Ergänzung zum bestehenden Vitest-Eintrag.)

4. **Guard-Clause-Branches in Server Actions brauchen Tests** –
   Die `!id || !veranstaltungId`-Guards an Action-Grenzen hatten keine Tests; ein
   Entfernen wäre von keinem Test bemerkt worden. Regel: Jeder Guard-Clause-Branch
   an der Action-Grenze ist mit einem eigenen Testfall abzudecken.

### Empfehlung für nächste Features

- **Tech-Debt-Issue manuell anlegen** (Seam in dieser Session blockiert):
  `isUniqueViolation` ist byte-gleich in `app/abrechnung/veranstaltung/actions.ts` und
  `app/verwaltung/katalog/actions.ts` dupliziert. In `lib/db-errors.ts` zentralisieren
  (analog #105/#108). Kommando (als Mensch ausführen):
  ```bash
  source scripts/lib/create-issue.sh
  create_issue "isUniqueViolation-Helfer zentralisieren (23505-Prüfung)" \
    "Byte-gleiche Duplikate: app/abrechnung/veranstaltung/actions.ts:30-37 und app/verwaltung/katalog/actions.ts. Analog #105/#108 in lib/db-errors.ts zentralisieren (nicht lib/utils, Codify #105); optional runWithUniqueCheck-Wrapper mitvereinheitlichen." \
    enhancement "tech-debt"
  ```

- Review-Nitpick: Snapshot-Test `expect(refetched.anzeigename).toBe(zeile.anzeigename)`
  ist tautologisch (prüft gegen das Objekt-under-Test). Sauberer: `toBe(person.name)` –
  belegt Snapshot-Treue direkt gegen den Ursprungswert. Bereits in testing-standards.md
  dokumentiert; hier als konkretes Muster für Snapshot-Tests festgehalten.

- Review-Nitpick: `ensureThekeForKasse` – check-then-insert ist nicht nebenläufigkeitssicher.
  Doc-Kommentar überzeichnet die Idempotenz-Garantie. Für #52 nachschärfen wenn
  Nebenläufigkeit realistisch wird.
