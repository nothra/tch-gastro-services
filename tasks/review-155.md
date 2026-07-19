# Review: Task 155

Scope: reine Dokumentation (ADR-029 + Querverweise + Doc-Guard). Kein Produktionscode.
Review inkl. **Live-Verifikation** gegen das echte Ruleset (`gh api …/rulesets/19162920`)
und Pfad-Auflösung der Querverweise.

## Kritische Findings (müssen behoben werden)
- _Keine._

## Wichtige Findings (sollten behoben werden)
- [x] **Behoben (Runde 2):** zweite Assertion (`umgehbar`) ergänzt; Unabhängigkeit per
      Negativ-Nachweis belegt (Framing entfernt → Rationale-Guard rot, Verweis-Guard grün).
- [x] [scripts/checks/tests/run-tests.sh – Guard `#155`] Der Guard prüft nur die **Präsenz**
      des Tokens `ADR-029` in `git-workflow.md`, nicht die im AC3 mitverlangte **Einordnung**
      (pre-push-Hook = lokales Feedback vs. Ruleset = server-seitige Durchsetzung). AC3
      bündelt eine Direktive (Verweis) **und** ihre Rationale (Framing) auf getrennt
      editierbaren Zeilen – nach der codifizierten Regel aus **#117** braucht jeder
      separierbare Teil eine eigene Assertion. Aktuell: löscht jemand den Framing-Absatz,
      lässt aber „ADR-029" stehen, bleibt der Guard **grün** (fail-open fürs Framing).
      **Empfehlung:** zweite Assertion ergänzen, die ein distinktives Framing-Token
      zusammen mit dem Verweis prüft (z. B. `grep -q 'server-seitig' … && grep -q 'protect-main' …`),
      plus Negativ-Nachweis (Framing entfernen → neuer Guard rot, Token-Guard grün).

## Nitpicks (optional)
- [x] **Behoben (Runde 2):** auf Plain-Text `(ADR-029)` umgestellt (Datei-Konvention).
- [x] [docs/factory/guidelines/git-workflow.md:41] Der Verweis ist als Markdown-Link
      `[ADR-029](../../adr/…)` gesetzt, während die **lokale Konvention dieser Datei** ADRs
      als reinen Text nennt (`(ADR-013)`, `(ADR-018)`). Der Link ist nützlicher (klickbar),
      weicht aber vom Datei-Stil ab – bewusst so lassen oder an den Fließtext-Stil angleichen.

## Positives
- **ADR-029 deckt sich exakt mit dem Live-Ruleset** (verifiziert): `enforcement:active`,
  `bypass:0`, Checks `lint/test/issue-sync/factory-self-test/pr-closes-issue`, `strict:false`,
  `merge:["squash"]`, `approvals:0`, Rule-Typen `deletion/non_fast_forward/…`. Kein Drift
  zwischen Doku und Realität.
- **TDD sauber belegt:** Guard `#155` war RED vor dem Verweis, GREEN danach; folgt dem
  etablierten Muster (`bash-gotchas.md`/`create-issue.sh`).
- **Querverweise korrekt:** beide relativen Pfade lösen auf; referenzierte ADRs (008/013/017)
  und der interne Anker existieren.
- **Kanonische-Quellen-Regel (W-02/W-03) eingehalten:** die main-Push-Regel wird in
  `git-workflow.md` **und** `CLAUDE.md` auf dieselbe kanonische Quelle (ADR-029) bezogen.
- **Scope-Disziplin:** docs-only, keine Routen-/API-Änderung, Routen-Doku unberührt; die
  bewusst verworfene IaC-Variante ist in ADR-029 (Option D2) begründet.

## Empfehlung
NEEDS_REWORK

> Begründung: ein Wichtig-Finding, das direkt der codifizierten #117-Regel (Direktive +
> Rationale je eigene Assertion) entspricht und billig zu beheben ist. Genau der Fall, den
> Review fangen soll, nachdem Implement ihn übersah (#116/#117-Muster). Der Nitpick ist
> optional. Nach dem Fix ist die Task aus Review-Sicht APPROVED-reif.
