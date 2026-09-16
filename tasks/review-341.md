# Review: Task 341

## Kritische Findings (müssen behoben werden)
Keine.

## Wichtige Findings (sollten behoben werden)
Keine.

## Nitpicks (optional)
- [scripts/checks/tests/run-tests.sh:8438] `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8` als Prefix ist redundant (`LC_ALL` überschreibt `LC_NUMERIC`), macht die Testabsicht (Dezimaltrenner) aber explizit lesbar – exakt der in Spec/Task vereinbarte Wortlaut (Analogie zu #96), bewusst so übernommen.
- [scripts/checks/tests/run-tests.sh:8202-8211] Kommentar über der Helper-Funktion ist mit drei Absätzen für eine 3-Zeilen-Funktion lang, aber vollständig WHY (Zweck, Locale-Fehlverhalten, Präzedenz-Zeilenverweise) – kein echtes Problem.
- [scripts/checks/tests/run-tests.sh:8434-8437] `run_timestamp` in der Fixture-CSV ist mit dem heutigen Datum (2026-09-16) statt einem erkennbar synthetischen Platzhalter belegt; Feld wird vom Helfer nicht ausgewertet, könnte aber später verwechselt werden.
- [scripts/checks/tests/run-tests.sh:8210] `tele_cost_sum_334` trägt die Nummer der ursprünglichen Assertion (#334), deckt jetzt aber auch #341 ab – rein kosmetisch, kein Umbenennungszwang (Historie im Namen ist in dieser Datei üblich).

## Positives
- AK1: `tele_cost_sum_334()` (:8209-8211) ist per Grep verifiziert die einzige Stelle mit diesem awk-Ausdruck; `LC_ALL=C` steht korrekt vor dem `awk`-Aufruf.
- AK2: Die echte #334-Assertion (:8420) und der neue #341-Regressionstest (:8438) rufen denselben Helfer über die volle Aufrufzeile auf – kein Fragment-Anker, Drift-Risiko konstruktiv ausgeschlossen.
- AK3/AK6: Fixture-CSV mit 0.05/0.08 in Spalte 10 liefert unter `LC_ALL=de_DE.UTF-8 LC_NUMERIC=de_DE.UTF-8` `0.13`; volle Bash-Self-Test-Suite lief unter ambienter `de_DE.UTF-8`-Locale UND unter `LC_ALL=C` grün (je 1561 grün, 0 rot).
- AK4: Mutationsbeleg ist keine Fragment-Prüfung, sondern echte, per `sed` unverändert aus der Datei extrahierte Helfer-Definition, mit entferntem `LC_ALL=C` über denselben Aufrufweg ausgeführt (0,00 rot ohne Fix → 0.13 grün mit Fix) – erfüllt die Kausalitäts-Anforderung aus `lessons/testing.md`/`lessons/factory-workflow.md`.
- AK5: Nutzt die bereits vorhandene `HAS_DE_LOCALE`-Variable (:376), keine zweite/dritte Locale-Verfügbarkeitsprüfung; Skip-Meldung im #96-Stil.
- AK7: `pre-push.sh`-Gates (Tests/Typecheck/Format/Routen-Doku/Hooks/@import-Grenze) grün.
- Konsistenz: `LC_ALL=C`-Präfix folgt etablierter Präzedenz in derselben Datei (:4687, :7871); kein globales `LC_ALL=C`, kein Wechsel auf `jq`, kein Content-Scan-Guard – exakt wie in Spec/Requirements festgelegt.
- Keine ADR beschreibt die Bash-Self-Test-Suite-Architektur selbst – die #211/#176-Lesson-Regel (ADR-Drift bei geänderter Mechanik) greift hier korrekt nicht.
- Reiner Test-Code, keine Schicht-Verletzung, `docs/routes.md` unberührt (keine Routen-Änderung im Diff).
- `LC_ALL=C awk ...` ist POSIX-portabel (BSD- und GNU-awk gleich).
- Scope exakt eingehalten: keine Änderung an den 39 übrigen locale-neutralen awk-Aufrufen.

## Out-of-Scope-Kandidaten
Keine gefunden – der Diff ist minimal und deckt sich vollständig mit Spec-Scope/Nicht-Scope.

## Empfehlung
APPROVED
