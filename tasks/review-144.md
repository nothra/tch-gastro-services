# Review: Task 144

Multi-Persona-Review (3 Runden: Korrektheit · Doku-Qualität · Architektur/ADR-Konsistenz)
einer reinen Dokumentations-Task (Begriff „Abend" → „Veranstaltung"). Findings, die **im
Review behoben** wurden, sind abgehakt; out-of-scope-Funde als Folge-Issue ausgelagert.

## Kritische Findings (müssen behoben werden)

- Keine.

## Wichtige Findings (sollten behoben werden)

- [x] **spec-120:120 / :206 — F7-Route-Beispiel widersprach ADR-024** (Runde 3, W1). Die
  Implement-Ersetzung `app/abend/[token]/` → `app/veranstaltung/[token]/` kollidierte mit dem
  laut ADR-024 D1 **authentifizierten** Bereich `app/veranstaltung/`, während Z. 206 sie als
  „(top-level, public)" auswies – ein Widerspruch zur beschlossenen öffentlichen F7-Route
  `theke/[token]` (ADR-023 D6/ADR-024). **Behoben:** beide Stellen auf `app/theke/[token]/`
  geändert (terminologisch „Abend"-frei **und** faktisch ADR-konform).
- [x] **task-144:Change-Record — README-Notiz ungenau** (Runde 2, W1). Die Task-Notiz zählte den
  README-Begriffshinweis unter „entfernte" Übergangs-Notizen; tatsächlich wurde er nur **gekürzt**
  (Synonym-Klausel weg, Datum/`theke`-Block bleibt). **Behoben:** Change-Record präzisiert.
- [→ #148] **README/spec-49/50/54 — Rollen-Vokabel `Abrechner` vs. `veranstalter`** (Runde 3, W2).
  ADR-024 benannte die Rolle `abrechner` → `veranstalter` um, propagierte das aber nur in
  spec-48/PROJECT-CONTEXT/spec-52/54/55 – README (kanonische Fachquelle), spec-49, spec-50, spec-54
  blieben zurück. **Vorbestehend & out-of-scope für #144** (nur Abend→Veranstaltung); bewusst
  nicht angefasst. Als Folge-Task ausgelagert → **Issue #148**.

## Nitpicks (optional)

- [x] **spec-51:147 — durchgestrichenes Alt-Kompositum „abendweit"** (Runde 1, N1). Vom `-w`-Grep
  konstruktionsbedingt nicht erfasst. **Behoben:** „abendweit einheitlich" → „je Veranstaltung
  einheitlich" (Historien-Text bleibt `~~…~~ überholt`).
- [ ] **Doppelartikel „der der …"** (Runde 2, N1): README:72, spec-55:33 grammatisch korrekt
  (Genitiv + Relativbezug), lesen sich aber holprig. Belassen – Umbau brächte keinen Mehrwert.
- [ ] **README:7 Überschrift „Begriff (seit 2026-07-15):"** (Runde 2, N2) nach Synonym-Auflösung
  eher Wiederholung als „seit"-Hinweis. Harmlos, belassen.
- [ ] **Redundante Begriffs-Definition** (Runde 2, N4): „Der Fachbegriff ist durchgängig
  Veranstaltung" steht in README, spec-51 und PROJECT-CONTEXT – nach der Vereinheitlichung alle
  **konsistent** (keine widersprüchliche Definition; CLAUDE.md-Regel gewahrt). Belassen.
- [ ] **Vorbestehende Bindestrich-Inkonsistenz** (Runde 2, N5): „Veranstaltungstyp" vs.
  „Veranstaltungs-Typ" – nicht Teil des #144-Diffs, nur zur Kenntnis.

## Positives

- Alle 12 inbegriffenen Dateien bearbeitet, keine übersehen; **keine** historische Datei (ADR
  021–024, abgeschlossene task-/review-/codify-Records) fälschlich angefasst (per `git diff
  --name-only` bestätigt).
- Grammatik durchgängig korrekt: Genus/Kasus/Komposita/Pronomen (spec-55: „ihn" → „sie wieder
  öffnet"); Fehlform-Greps (`(einen|diesen|dem) Veranstaltung`, `Veranstaltungsrunde|
  Veranstaltungsabend`) → 0.
- Komposita konsistent mit der kanonischen spec-53 („Veranstaltungs-Ebene",
  „Veranstaltungs-Gesamtabrechnung").
- spec-127-Behandlung nachvollziehbar: Terminologie angeglichen, technische/historische Aussage
  unverzerrt; keine Falschbehauptung über die alte „Abend"-Nutzung.
- Diff ausschließlich `docs/`; `git diff main...HEAD -- app/ db/ lib/ e2e/ components/` leer.
- Dokumentierte Ausnahmen (Filename-Links, spec-127, F7-Route) begründet und zitierte
  Zeilennummern verifiziert.

## Empfehlung

APPROVED
