## Codify-Report: Task 55

### Neue Regeln hinzugefügt

- **`docs/factory/PROJECT-CONTEXT.md` → „Guarded UPDATE bei Status-Transition-Actions: `undefined`-
  Rückgabe auswerten, nicht `{ok:true}` annehmen" (aus Review-Runde-1-Finding W1).** Der erste
  Entwurf von `setStatusAction` ignorierte den `undefined`-Rückgabewert des guarded UPDATE
  (TOCTOU-Schutz gegen Doppel-Abschluss) und meldete bei einem nebenläufigen Zweitaufruf
  fälschlich Erfolg. Generalisiert die bestehende #50-Regel („`.returning()` liefert
  `T | undefined`") von der Signatur-Ebene auf die **Aufrufer**-Pflicht, den `undefined`-Fall
  explizit als eigenen Fehlerzustand zu behandeln. Ist ein wiederkehrbares Muster – jede künftige
  Status-Transition-Action mit optimistischem Concurrency-Guard ist betroffen.

- **`docs/factory/PROJECT-CONTEXT.md` → „ADR nach Review-Rework auf Drift prüfen – nicht nur
  `docs/routes.md`" (aus Review-Runde-2-Finding).** Review-Runde 1 entfernte zwei Funktionen
  (`setStatus`, `logEreignis`); ADR-033 beschrieb sie danach weiter als bestehend – erst Runde 2
  fand den Drift. Der bestehende Routen-Doku-Guardrail deckt nur `docs/routes.md` ab, kein
  äquivalenter Check existierte für ADRs, die während eines Review↔Implement-Zyklus überholt
  werden. Neue Faustregel: `git grep -n <entfernter-Funktionsname> docs/adr/<aktuelle-adr>.md`
  vor dem Schließen eines Fixes, der eine im ADR konkret benannte Architektur ändert.

- **`docs/factory/PROJECT-CONTEXT.md` → Ergänzung am bestehenden #48-Eintrag „NextAuth v5:
  Custom-Session-/JWT-Claims typisieren".** `auth.config.ts` (`authorized`/`jwt`/`session`) blieb
  seit Einführung in #48 über mehrere Folge-Tasks bei 0 % Coverage, obwohl die Callbacks reine,
  ohne next-auth-Laufzeit direkt testbare Funktionen sind. Erst die `/test`-Coverage-Analyse bei
  #55 deckte es auf. Ergänzt die bestehende Regel um: Test sofort bei Einführung/Änderung eines
  Callbacks schreiben, nicht auf eine spätere Coverage-Analyse verlassen.

### Keine Änderungen nötig

- **Dead-Code-Funde (W2/W3, `setStatus`/`logEreignis`)**: bereits durch die bestehende
  YAGNI-Prinzip-Formulierung in `clean-code.md` abgedeckt; kein neues, generalisierbares Muster
  über „Review findet toten Code nach einem Action-Refactor" hinaus.
- **Untestete Guard-Clause-Branches (W4) und fehlende Ablehnungs-Assertion (W5)**: exakte
  Instanzen der bereits kodifizierten #51- bzw. #116-Regeln (Guard-Clause-Tests, Ablehnungs- vs.
  Meldungs-Test) – keine neue Regel nötig, die bestehenden griffen bereits, wurden hier nur
  nicht konsequent angewendet.
- **Security-Review (PASSED, keine kritischen/wichtigen Findings)**: Die drei Hinweise
  (Phantom-Ereignis-TOCTOU, Append-only nur konventionell, Session-Claim-Exposition) sind bereits
  als akzeptierte MVP-Trade-offs in ADR-033 D3 dokumentiert bzw. Backlog #57 zugeordnet – kein
  Codify-Bedarf, kein neues Issue.
- **Coverage-Lücken (auth.config.ts, Fallback-Branches in `actions.ts`/`page.tsx`)**: durch die
  bestehende `/test`-Phase selbst geschlossen; einzig `auth.config.ts` begründet die obige neue
  Ergänzung, die übrigen Fallback-Lücken sind normale Diff-Coverage-Arbeit ohne Muster-Charakter.

### Empfehlung für nächste Features

- Bei jeder neuen Status-Transition-Action mit optimistischem Concurrency-Guard (analog
  `abschliessenVeranstaltung`/`wiedereroeffnenVeranstaltung`) die neue Regel direkt beim
  Implementieren anwenden, nicht erst im Review nachbessern.
- Wird ein ADR-referenziertes Architekturdetail durch einen Review-Fix geändert, den
  `git grep`-Check auf das ADR sofort im selben Fix mitlaufen lassen.
