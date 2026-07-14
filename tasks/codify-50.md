## Codify-Report: Task 50

### Neue Regeln hinzugefügt

Keine neuen Regeln – beide Findings sind bereits als CLAUDE.md-Regeln erfasst:

- **`Drizzle UPDATE/DELETE: .returning() liefert T | undefined, nicht T`** (CLAUDE.md, „aus #50, Refactoring-Finding"): Regel wurde von der Review-Persona korrekt ausgelöst und das Finding daraufhin im Refactoring behoben. Regel greift — kein neuer Eintrag nötig.
- **`Zod-Schema: Obergrenze für text-Spalten`** (CLAUDE.md, „aus #50, Security-Hint"): Regel greift — `schema.ts` enthält `.max(200, "Anzeigename ist zu lang.")` bereits. Security-Review hat das Finding als Hinweis (kein Blocker) protokolliert; die Behebung war im selben PR.

### Regelanwendung bestätigt (Positiv-Bestätigung)

- `useCallback`-Wrapper statt `useEffect` für Inline-Edit-Erfolgsfall korrekt präventiv angewendet (CLAUDE.md-Regel aus #49, kein Finding).
- Soft-Delete via `active` (kein Hard-Delete) und RBAC-Doppelabsicherung (serverseitig fail-closed + UI-Anzeige-Gate) konsistent mit bestehenden Mustern.
- Schicht-Trennung (Drizzle-Queries nur in `db/`, RBAC als erste Zeile jeder Action) sauber durchgehalten.

### Offene Folgearbeit (Issue zu erstellen)

**Blocker für das Issue-Anlegen:** `gh issue create` war in dieser Session permission-gated.
Bitte manuell anlegen:

```
gh issue create \
  --repo nothra/tch-gastro-services \
  --title "firstIssueMessage-Helfer: Zod-Fehlerextraktion in lib/ zentralisieren" \
  --label "enhancement,tech-debt" \
  --body "Die Hilfsfunktion firstIssueMessage(issues) ist wortgleich in
app/verwaltung/katalog/actions.ts (Z. 26-28) und app/verwaltung/teilnehmer/actions.ts
(Z. 26-28) vorhanden. Kandidat fuer lib/form-utils.ts. Gefunden in Review #50."
```

Hintergrund: Nitpick aus Review #50 — `firstIssueMessage` ist über zwei Features dupliziert.
Wird mit jedem weiteren Feature schlimmer; Helfer in `lib/` wäre der richtige Ort.

### Empfehlung für nächste Features

- Vor dem Implementieren neuer Actions prüfen, ob `firstIssueMessage` (und ähnliche kleine
  Zod-/Fehler-Helfer) bereits im Katalog-Feature oder anderswo existieren — solange kein
  gemeinsamer Helfer in `lib/` existiert, explizit auf Duplikation hinweisen.
- Die Drizzle-Return-Type-Regel ist im Review-Prompt gut verankert und greift zuverlässig.
  Beim Anlegen neuer Data-Layer-Funktionen direkt `Promise<T | undefined>` als Rückgabetyp
  für `update`/`delete` notieren — spart eine Refactoring-Runde.
