# Review: Task 240

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] `docs/factory/lessons/factory-workflow.md:104-111` (Abschnitt „`.claude/**`-Änderungen
      erfordern Patch-Workflow", aus #91) nannte nach der Implementierung weiterhin
      `Write(.claude/**)` und `Write(*.yml)` als bestehende Regeln, obwohl beide im selben PR
      entfernt wurden – Doku-Drift zwischen zwei Abschnitten derselben Datei zum selben
      Sachverhalt (der bereits korrigierte #224-Abschnitt wenige Zeilen darunter war aktuell,
      dieser Abschnitt nicht). Unabhängig von zwei Review-Runden (Code-Qualität und Architektur)
      gefunden. **Während dieser Review-Runde behoben** (Commit `5445f0a`): Prosa auf
      Vergangenheitsform korrigiert, Regressionstest erneut grün (559/0) verifiziert.

## Nitpicks (optional)

- Redundanz in `run-tests.sh` zwischen dem pauschalen jq-Catch-all
  (`startswith("Write(")` über `allow`+`deny`) und dem jq-unabhängigen Grep-Fallback direkt
  danach – beabsichtigte Doppelabsicherung nach dem etablierten „geparst + Grep-Fallback"-Muster
  (von AK7 der Spec explizit gefordert), keine echte Duplikation. Kein Handlungsbedarf.
- Stilbruch in der AK3-Prüfung (`pnpm-lock.yaml`): vormals ein `for entry in 'Edit(...)'
  'Write(...)'`-Loop, jetzt zwei einzelne direkte `jq`-Aufrufe (Positiv- und Negativ-Assertion
  lassen sich nicht im selben Loop-Body unterbringen). Nachvollziehbar, aber im
  Vorher-Vergleich weniger einheitlich als der AK4-Block, der für die reinen
  Negativ-Checks weiterhin eine Schleife nutzt.

## Positives

- 1:1-Abgleich verifiziert: alle 18 entfernten `Write(...)`-Einträge in `allow` und alle 3 in
  `deny` hatten nachweislich ein `Edit(...)`-Pendant in derselben Liste – kein Funktionsverlust.
- `claude --print`-Verhaltensproben (vorher: 21 „not matched"-Warnzeilen, nachher: 0; Edit
  funktioniert in beiden Fällen ohne Prompt) sind methodisch sauber dokumentiert
  (Vorher/Nachher-MD5, zweifache Prüfung) und belastbar.
- Regressionstest konsequent von „Vorhandensein" auf „Abwesenheit" umgestellt (nicht nur
  ergänzt) – RED (546/13) vor dem Patch, GREEN (559/0) danach, exakt wie von AK7 gefordert.
  `jq`-Ausdrücke korrekt, keine invertierte Logik oder Tautologie.
- Patch-Workflow lehrbuchmäßig eingehalten: programmatisch per `jq` erzeugter Diff,
  `git apply --check` verifiziert, Blocker mit Datum/Grund protokolliert, totes
  Patch-Artefakt nach Anwendung entfernt.
- Scope eingehalten: keine Änderungen an den `Edit(...)`-Regeln selbst, keine Berührung der
  #224-Root-Anker-Entscheidung, keine Routen-Änderungen.
- Out-of-Scope-Fund (fehlender Regressionstest für die vorbestehenden #88-Edit(...)-Einträge)
  als eigenes Issue [#251](https://github.com/nothra/tch-gastro-services/issues/251) ausgelagert
  statt den PR-Scope zu sprengen.

## Empfehlung

APPROVED
