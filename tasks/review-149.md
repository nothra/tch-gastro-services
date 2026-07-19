# Review: Task 149

Umfang: Prettier-Drift auf 38 Dateien behoben (rein mechanisch, token-level verifiziert)
+ neues Format-Gate in `scripts/checks/pre-push.sh` (Check 3) + Selbsttest in
`scripts/checks/tests/run-tests.sh`. Reviewed gegen `docs/specs/spec-149-format-check-drift-und-gate.md`.

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- Keine.

## Nitpicks (optional)
- [ ] [scripts/checks/tests/run-tests.sh:1642] Die **strukturelle** Assertion greppt
  `pre-push.sh` auf `FACTORY_FORMAT_COMMAND` und `format:check` – beide Strings kommen
  im Gate auch in **Kommentar-Prosa** vor. Würde der Gate-Code entfernt, ein Kommentar
  aber stehen bleiben, bliebe die Struktur-Assertion grün (vgl. codifiziertes Learning
  #114 „Kommando ≠ Prosa-Erwähnung"). **Mitigiert:** Der begleitende **Verhaltens**-Test
  (Temp-Repo, `false`→Exit 1) würde eine echte Gate-Entfernung fangen, ist also der
  eigentliche Beweis. Optionale Härtung: die Struktur-Assertion auf die distinktive
  **Code**-Zeile richten, z. B. `grep -q 'FORMAT_COMMAND="\${FACTORY_FORMAT_COMMAND'`
  statt auf den auch in Prosa vorkommenden Bezeichner.
- [ ] [scripts/checks/tests/run-tests.sh:1656] Der `else`-Zweig (Gate deaktiviert) wird
  nur über den Exit-Code (0) geprüft, nicht über den Warntext. Konsistent mit den
  Sibling-Gate-Tests (auch dort kein Text-Assert) – daher bewusst belassen.

## Positives
- **Ursache statt Symptom:** Nicht nur `pnpm format` ausgeführt, sondern die eigentliche
  Gate-Lücke geschlossen (format:check war an keinem pre-commit/pre-push/CI-Gate verdrahtet)
  – analog zum Typecheck-Gate #137. Verhindert Wiederkehr fail-closed.
- **Bewusste, dokumentierte Design-Entscheidung:** Einfaches `-` statt `:-` beim Env-Override
  macht `FACTORY_FORMAT_COMMAND=""` zu einem echten Opt-out (statt still auf den Default
  zurückzufallen) und den `else`-Zweig erreichbar/testbar (kein Dead Code). Begründung als
  WHY-Kommentar am Gate.
- **TDD sichtbar:** Selbsttest zuerst rot (2 rot), dann grün (289 grün, 0 rot). Struktur-
  **und** Verhaltens-Assertion, Positiv- und Negativfall (drift→block, konform→pass,
  leer→deaktiviert) – deckt sich mit der Positiv-/Negativ-Regel aus `clean-code.md`.
- **AC2 rigoros belegt:** Formatierungs-Only nicht nur behauptet, sondern per Token-Vergleich
  gegen HEAD (Whitespace+Kommas entfernt) + Sichtprüfung der 6 Rest-Diffs (Line-Collapse,
  ein `{" "}`-JSX-Space-Token) nachgewiesen – keine Logik-/Identifier-Änderung.
- **Pattern-Konsistenz:** Gate spiegelt Struktur/Numerierung/Stil des Typecheck-Gates;
  `.prettierignore`/Prettier-Config unangetastet; kein ADR (korrekt, #137-Präzedenz).
- Alle Quality-Gates grün auf dem realen Branch: Tests 376, Typecheck, Format, Lint.

## Anmerkung (kein Finding, informativ)
- Das Gate hängt – wie das bestehende Typecheck-Gate – nur am **pre-push-Hook**, nicht in CI.
  pre-push ist per `--no-verify` umgehbar und nicht garantiert bei allen Contributors installiert.
  Das ist ein **vorbestehender, systemischer** Punkt (gilt gleichermaßen für Typecheck) und war
  in der Spec bewusst aus dem Scope genommen – daher hier **kein** Finding und **kein** Auto-Issue
  (Rauschvermeidung). Falls gewünscht, wäre „Quality-Gates zusätzlich in CI" ein eigener Task.

## Empfehlung
APPROVED
