## Codify-Report: Task 211

### Neue Regeln hinzugefügt

- **`docs/factory/lessons/testing.md`** (+ Index-Zeile in PROJECT-CONTEXT, Trigger `/implement`,
  `/test` beim Testschreiben) – „Spiegel-/Symmetrie-Akzeptanzkriterien: beide Richtungen explizit
  assertieren". Wegen: AK6 (Security-Gate blockiert **nicht** bei Fließtext-`NEEDS_FIXES`) war nur
  transitiv über einen Wiring-/Abwesenheits-Guard belegt, nicht durch eine eigene Laufzeit-
  Assertion – die Gegenrichtung eines getesteten AK per Symmetrie anzunehmen ist keine Abdeckung.

- **`docs/factory/lessons/factory-workflow.md`** (+ Index-Zeile, Trigger `/implement`, `/review` –
  bei Code-Änderung, die eine ADR beschreibt) – „PR ändert die von einer ADR namentlich
  beschriebene Mechanik → ADR-Beschreibung im selben PR mitpflegen". Wegen: ADR-019 §4 beschrieb
  wörtlich den ersetzten `grep -oE … | tail`-Mechanismus; `/implement` pflegte Task/Spec, aber
  nicht die ADR (erst `/review` fand den Drift). Ergänzt das #55-Learning um den Fall, dass **Code**
  geändert wird, das eine ADR beschreibt – der #55-Trigger („bei ADR-Datei-Änderung") feuerte hier
  nicht.

### Bewusst nicht als Regel codifiziert

- **Wiring-Guard-Brittleness** (Review-W2): `grep -qF 'grep -q "APPROVED"'` fängt nur die
  wortwörtliche Wiederkehr des alten Volltext-Greps, nicht die Muster-Klasse (andere Quotierung
  bliebe unentdeckt). Für den Scope als Tripwire akzeptiert; die eigentliche Absicherung ist die
  Single-Source-Funktion + ihre direkten Unit-Tests. Kein eigenes Learning, da bereits von der
  clean-code-Regel „Gate-Regex durch Positiv-/Negativ-Test absichern" abgedeckt.

### Autonome Folge-Issues

- **#214** (`enhancement` + `test`/`tech-debt`) – Contract-Drift-Guard: Test, der die echten
  `.claude/commands/{review,security-review}.md`-Anker-Überschriften gegen die Parser-Konstanten
  in `report-verdict.sh` / `count_section_items` prüft (Out-of-Scope-Fund aus dem Review).

### Was gut funktioniert hat

- Sauberer TDD-Zyklus (6 gezielte RED-Fails → GREEN), fail-closed konsequent umgesetzt.
- Der Multi-Persona-Review fand beide echten Lücken (ADR-Drift, AK6-Testlücke); beide waren in
  einer Rework-Runde in-scope schließbar.

### Empfehlung für nächste Features

- Beim `/implement` einer Verhaltens-/Mechanik-Änderung reflexartig `grep -rn` in `docs/adr/` nach
  den geänderten Symbol-/Mechanik-Namen laufen lassen – ADR-Drift früher fangen als im Review.
- Bei symmetrischen Gate-Entscheidungen von vornherein **beide** Polaritäten als benannte
  Assertion anlegen, nicht die permissive Richtung der Symmetrie überlassen.
</content>
