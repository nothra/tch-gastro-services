# Review: Task 261

> 2. Review-Durchlauf. 1. Durchlauf: NEEDS_REWORK (1 Wichtig-Finding zu Testguard-Präzision,
> siehe Git-Historie dieser Datei). Das Finding wurde in `/implement` behoben (awk-Block-
> Extraktion analog zur Job-Block-Isolation aus #255 + Schärfe-Beweis-Test); alle drei
> Review-Runden bestätigen die Behebung unabhängig.

## Kritische Findings (müssen behoben werden)
- (keine)

## Wichtige Findings (sollten behoben werden)
- (keine) – das Wichtig-Finding aus Durchlauf 1 (Test-Guard
  `scripts/checks/tests/run-tests.sh` war datei-weit auf das Fragment `done || true`
  gebunden statt an die konkrete Codify-Pipeline, Lesson #114/#265) ist behoben: die
  awk-Extraktion (Zeile ~1109) bindet jetzt präzise an den Block zwischen der
  Codify-Pipeline-Zeile und ihrem `done`; ein zusätzlicher Schärfe-Beweis (Zeile
  ~1114-1122) zeigt, dass ein unabhängiges `done || true` an anderer Stelle im Skript
  den Guard nicht täuscht. Von allen drei Runden unabhängig verifiziert (inkl. eigener
  Bash-Nachstellung der awk-Extraktion und der Mutation).

## Nitpicks (optional)
- [ ] [scripts/checks/tests/run-tests.sh:1109 und 1119] Der awk-Regex-Literal für die
      Block-Grenze ist wortgleich an zwei Stellen dupliziert (reguläre Assertion und
      Schärfe-Beweis gegen die Mutations-Kopie). Eine gemeinsame Shell-Variable
      (`codify_block_start_pattern="..."`) würde das Wartungsrisiko senken, dass bei
      einer künftigen Anpassung des Idioms nur eine der beiden Kopien mitgezogen wird.
      Auseinanderlaufen wäre fail-closed (Guard schlägt dann rot, nicht still grün) –
      daher reines Wartungs-Nitpick, keine Korrektheitsgefahr.
- [ ] [scripts/checks/tests/run-tests.sh:1105-1108] Der Kommentar nennt die neue
      Block-Extraktion "analog zur Job-Block-Isolation aus #255", verschweigt aber,
      dass sie bewusst *inklusive* Start- und Endzeile arbeitet (das Precedent
      `cv_job_block`/`ci_selftest_block` schließt beide Grenzzeilen aus) – notwendig,
      weil hier gerade die `done`-Zeile selbst geprüft werden muss. Ein kurzer Zusatz
      würde die stilistische Abweichung transparent machen statt sie als reine
      Wiederholung darzustellen.
- [ ] (aus Durchlauf 1, weiterhin optional) [scripts/checks/tests/run-tests.sh:1095]
      `ZERO2` ist im Kontext von `ZERO` verständlich, aber generisch benannt (z. B.
      `ZERO_WHILE_LOOP` wäre sprechender).
- [ ] (aus Durchlauf 1, weiterhin optional) [scripts/checks/tests/run-tests.sh:1095]
      Das Fehlerszenario „Datei existiert, ist aber leer (0 Bytes)" wird durch eine
      Header-only-Datei abgedeckt, nicht durch eine literal 0-Byte-Datei – funktional
      gleichwertig (grep liefert in beiden Fällen Exit 1), daher nur ein Nitpick.

## Positives
- Der Fix (`done || true` in `scripts/run-pipeline.sh:390`) ist korrekt, strukturell
  identisch mit dem etablierten `rule_count`-Idiom, und verhaltensneutral im
  Treffer-Fall (`||` greift nur bei vorangehendem Fehlschlag).
- Der neue Testguard bindet jetzt präzise an die reale Codify-Pipeline statt an ein
  datei-weites Kommando-Fragment – Lesson #114/#265 korrekt angewendet.
- Schärfe-Beweis funktioniert nachweislich: eine unabhängige `done || true`-Zeile
  andernorts im Skript täuscht den Block-Guard nicht.
- Rework ist exakt scope-begrenzt: nur `scripts/checks/tests/run-tests.sh` (Testschicht)
  und die Task-Datei geändert – kein Anfassen von `rule_count`, `verify_final_state()`,
  ADR-040 oder produktivem Verhalten.
- Keine ADR/Doku-Stelle benennt das konkrete Grep-Idiom oder Testmuster namentlich –
  kein Nachpflegebedarf ausgelöst.
- Task-Datei dokumentiert die Rework-Notiz akkurat (Finding, Fix-Ansatz, bewusst nicht
  angefasste Nitpicks mit Begründung).
- Volle Bash-Testsuite lokal grün: 782/782, keine Regression gegenüber Durchlauf 1.
- Circuit Breaker: Diskussion konvergiert sauber im 2. Durchlauf – kein Anzeichen für
  einen ungelösten Konflikt.

## Empfehlung
APPROVED
