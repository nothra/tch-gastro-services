# Review: Task 254

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [x] [scripts/checks/tests/run-tests.sh:~1358, "Gate #254 AK6"] **Behoben.** Der Test rief `bash "$GATE" "$DEFAULTS" >/dev/null 2>&1` **ohne** zweites Argument auf. `config-validation-check.sh` defaultet `$OVERRIDE` dann aber nicht auf "kein Override vorhanden", sondern auf `$REPO_ROOT/factory.config.yml` (Zeile 58: `OVERRIDE="${2:-$REPO_ROOT/factory.config.yml}"`) — und diese Datei existiert im Repo-Root real und ist ein gültiger Mapping-Override. Der Test bewies damit **nicht** den in AC6 behaupteten Skip-Pfad (Root-Typ-/Multidoc-Guards werden übersprungen, weil kein Override existiert) isoliert, sondern war inhaltlich deckungsgleich mit AK5 (Positiv-Fixture) — ein zufällig grüner Test statt eines Beweises für den Skip-Pfad. Fix: Test übergibt jetzt `$GTMP/does-not-exist.yml` (garantiert nicht existierender Pfad) als `$2`, damit `override_present()` nachweislich `false` liefert. Volle Suite weiterhin 599/599 grün.

## Nitpicks (optional)
- [ ] [scripts/checks/config-validation-check.sh:14-17] Kopf-Regelkatalog listet die neuen Sub-Regeln als `1a.` und `1c.`, überspringt aber `1b.` (YAML-Parse, nur inline bei Zeile ~91 dokumentiert) — wirkt beim Überfliegen wie eine Lücke.
- [ ] [scripts/checks/config-validation-check.sh:84] `sort -u` in `yq eval-all 'document_index' … | sort -u | wc -l` ist redundant, da `document_index`-Werte je Dokument bereits eindeutig sind — ohne Kommentar unklar, ob das eine bewusste Absicherung oder ein Überbleibsel ist.
- [ ] [scripts/checks/config-validation-check.sh:85-87] Der `case`-Guard für `override_doc_count` fällt bei nicht-numerischem Output still auf `0` zurück statt `fail()`en, anders als die übrigen Integer-Guards im selben File (`max_turns` Z.142, `threshold` Z.162). Unschädlich (Regel 1b fängt kaputtes YAML ohnehin ab), aber die Asymmetrie zum sonst durchgehaltenen fail-closed-Stil ist unkommentiert.
- [ ] [scripts/checks/config-validation-check.sh:94-97] Case-Statement in Regel 1c matched die *guten* Fälle (`!!map`/`!!null`) und failt im `*)`-Zweig — umgekehrt zur Polarität der übrigen Guards im File, die die *schlechten* Fälle matchen. Sachlich nötig (Tag-Werte sind nicht als endliche "böse" Menge aufzählbar), aber ohne Kommentar zur Asymmetrie leicht verwirrend.
- [ ] [scripts/checks/tests/run-tests.sh, "Gate #254 AK5"] Läuft mit demselben `ok.yml`-Fixture wie der bereits bestehende "sauberer Override"-Test (Zeile ~1186-1189) — bewusst für AK-Rückverfolgbarkeit gewählt, aber faktisch doppelte Coverage.

## Positives
- Guard-Reihenfolge (Mehrdokument-Guard → YAML-Parse → Root-Typ-Guard → Regel 2/6) ist korrekt und mit klaren WHY-Kommentaren begründet, inkl. der Begründung, warum die Reihenfolge genau so sein muss (Multidoc-Mapping würde sonst am generischen Root-Typ-Vergleich falsch scheitern).
- Der etablierte Grenzfall "leerer Override ist gültig" (Tag `!!null`) bleibt bei beiden neuen Guards korrekt erhalten — keine Regression.
- Alle 5 in der Spec genannten Fehlerszenarien (Skalar/Bool/Sequence/Multidoc/gültiger Override) sind mit dedizierten Positiv-/Negativ-Fixtures abgedeckt, inklusive Message-Unterscheidbarkeits-Assertions (Negativ-Kontrolle: die jeweils andere Meldung darf NICHT auftauchen).
- CLI-Signatur und Exit-Code-Vertrag bleiben unverändert; der einzige Aufrufer (`run-pipeline.sh`) prüft nur den Exit-Code und ist damit unberührt.
- ADR-Trigger-Einschätzung im Task ("kein ADR nötig") hält der Nachprüfung stand: kein neues Tool, kein neues Architekturmuster, kein Schnittstellen-Bruch, trivial rückbaubar.
- Volle Gate-Test-Suite bleibt grün (599/599 vor Fix der Wichtig-Finding), keine Regression an Gate #241/#249.
- Naming (`override_doc_count`, `override_root_tag`) konsistent mit bestehenden Namen im File.

## Empfehlung
APPROVED

(Ursprünglich NEEDS_REWORK wegen der einen Wichtig-Finding zu AK6 — nach dem Fix in
derselben Session [x] siehe oben. Verbleibende Nitpicks sind optional, Developer
entscheidet.)
