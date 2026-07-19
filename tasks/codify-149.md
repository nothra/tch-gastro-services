## Codify-Report: Task 149

### Neue Regeln hinzugefügt
- **docs/factory/guidelines/bash-gotchas.md §8** – `${VAR-default}` vs `${VAR:-default}`:
  leerer Wert als bewusster Opt-out. Wegen Fehler-Muster: In `/implement` zuerst `:-` gewählt,
  in der Annahme, `FACTORY_FORMAT_COMMAND=""` würde das Gate deaktivieren – tatsächlich fällt
  `:-` bei leerem Wert still auf den enforcing Default zurück (Test rot). Korrigiert auf `-`.
  Die Regel bündelt zusätzlich den Querbezug zu §7/#114: der Struktur-Guard muss den
  vollständigen `${VAR-default}`-Ausdruck pinnen (code-eindeutig, nicht die Prosa-Bezeichner) –
  das verifiziert zugleich den Default-Literal, den ein Verhaltens-Test mit stets explizit
  gesetztem Override nicht abdeckt.

### Bereits codifiziert – kein neuer Eintrag (Muster wiederholte sich)
- **Struktur-Grep matchte Kommentar-Prosa** (Review-Nitpick): abgedeckt durch
  bash-gotchas.md §7 („spezifischster String") und PROJECT-CONTEXT #114 („Kommando ≠
  Prosa-Erwähnung"). Beobachtung: Die Regel existierte, wurde aber erst **reaktiv** in `/test`
  angewandt statt proaktiv in `/implement`. Kein neuer Rule-Text (würde nur duplizieren) –
  §8 verstärkt den Bezug am konkreten Default-Gate-Fall. Learning für die nächste Iteration:
  beim Schreiben eines Struktur-Grep sofort prüfen, ob der Suchstring auch in Prosa/Kommentar
  desselben Files vorkommt.

### Keine Änderungen an CLAUDE.md / PROJECT-CONTEXT „Stolpersteine"
- Der Kern-Fund ist ein generischer Shell-Gotcha (nicht projektspezifisch) → gehört in
  bash-gotchas.md, nicht in die projektspezifischen Stolpersteine. Kein neuer Check nötig:
  der Selbsttest in `run-tests.sh` deckt das Gate bereits struktur- und verhaltensseitig ab.

### Kein Out-of-Scope-Issue angelegt
- Erwogen: „Quality-Gates (format/typecheck) zusätzlich in CI" (pre-push ist per `--no-verify`
  umgehbar). Bewusst **nicht** angelegt – gilt gleichermaßen fürs bestehende Typecheck-Gate,
  war in Spec-149 bewusst aus dem Scope, und wäre ein systemischer Eigen-Task, kein #149-Rest.
  Als informative Anmerkung in `tasks/review-149.md` / `tasks/security-149.md` vermerkt.

### Empfehlung für nächste Features
- Bei jedem neuen Env-Override-Gate: `-` vs `:-` bewusst wählen (bash-gotchas §8) und im
  Struktur-Test den vollständigen Expansion-Ausdruck pinnen – nicht den bloßen Bezeichner.
