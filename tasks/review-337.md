# Review: Task 337

## Kritische Findings (müssen behoben werden)
- [x] [PR #338 Body] `Closes #329` fehlte im PR-Body (Spec verlangt es explizit für die
      Duplikat-Schließung von #329) — behoben
- [x] [tasks/task-337-next-16-3-3-rce.md] Auth-E2E- und `/_next/image`-Rauchtest-ACs waren
      unbelegt — nachgeholt: Auth-E2E grün (3 passed/2 skipped), `/_next/image`-Rauchtest deckt
      einen Reachability-Befund auf (siehe Task-Datei „Reachability-Korrektur 2"), mit Nutzer
      abgestimmt: dokumentierter Befund, kein Blocker
- [x] [tasks/task-337-next-16-3-3-rce.md] Alle Status-/AK-Checkboxen waren offen — behoben
- [x] [CLAUDE.md] Scope-fremder, automatisch von `next dev` erzeugter
      `nextjs-agent-rules`-Block war mitcommittet — aus dem Commit entfernt (out of scope für
      einen reinen Security-Dependency-Bump)

## Wichtige Findings (sollten behoben werden)
- [ ] [scripts/checks/tests/run-tests.sh:5748] `ovr_count_337` hat keinen eigenen synthetischen
      Mutationsbeleg (nur die Diskriminierungs-Kontrolle über den real vorhandenen
      undici-Override) — geringes Restrisiko, da die Diskriminierungs-Kontrolle bereits belegt,
      dass derselbe Ausdruck einen vorhandenen Override findet. Optional für einen künftigen
      `/refactor`-Pass.

## Nitpicks (optional)
- [ ] [pnpm-workspace.yaml:20-50] Kommentarblock ist inzwischen sehr lang (drei Abschnitte) —
      Lesbarkeit, kein Korrektheitsproblem
- [ ] [scripts/checks/tests/run-tests.sh] Sektionslabel weiterhin `#291/#337` auch dort, wo AK1
      strenggenommen nur noch #337 betrifft — kosmetisch
- [ ] [pnpm-workspace.yaml:25] nanoid-Kommentar referenziert vorausschauend den weiter unten
      stehenden postcss-Abschnitt — inhaltlich korrekt, liest sich beim ersten Durchgang
      rückwärtsreferenzierend

## Positives
- Entfernte Overrides (postcss/sharp/js-yaml) sind gemessen, nicht vermutet (No-op-Kriterium
  aus `lessons/build-tooling.md` sauber angewendet, Messergebnisse im Kommentar dokumentiert)
- Neue Mutationsbelege + Diskriminierungskontrollen für den quotierten Scoped-Key-Fix
  (`@vitest/mocker`) folgen exakt dem in `lessons/testing.md` geforderten Muster
- POSIX-konforme grep/awk/sed-Ausdrücke, keine PCRE-Konstrukte
- Kein Code-Duplikations-Rezidiv: neue Entfernungs-Schleife nutzt einen extrahierten Helper
  (`ovr_count_337`) statt drei Kopien
- Reachability-Korrektur zu GHSA-2xp9 in der Task-Datei ist präzise und überschreibt nicht die
  historische #291-Entscheidungs-Historie
- Alle drei Review-Perspektiven bestätigen: keine Schicht-Verletzungen, `docs/routes.md`
  korrekt unberührt, Scope hält sich an die Spec ("Nicht inbegriffen" eingehalten)

## Empfehlung
APPROVED
