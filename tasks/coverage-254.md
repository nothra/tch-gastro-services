# Coverage-Report: Task 254

## Scope-Hinweis
Task 254 ändert ausschließlich `scripts/checks/config-validation-check.sh` (Bash-Gate)
und dessen Testdatei `scripts/checks/tests/run-tests.sh`. **Kein** `app/**`- oder
`lib/**`-TypeScript-Code ist betroffen (`git diff origin/main...HEAD --stat` bestätigt:
nur `scripts/checks/*`, `tasks/*`, `docs/specs/*`). Die App-Coverage-Schwelle (80 %,
`pnpm test:coverage`, Vitest) ist daher für diesen Task nicht der relevante Maßstab —
sie misst TS-Code, der hier unverändert bleibt. Die relevante Test-Suite für dieses
Bash-Gate ist `scripts/checks/tests/run-tests.sh` (aufgerufen ohne Vitest/Istanbul,
daher kein numerischer Zeilen-Coverage-Prozentwert; stattdessen AK-Vollständigkeit +
Verhaltens-Assertions, s.u.).

## AK-Vollständigkeit (spec-254)

| AK | Beschreibung | Test | Positiv/Negativ | Status |
|----|--------------|------|------------------|--------|
| AK1 | Skalar-Root → explizite "kein Mapping"-Meldung | Gate #254 AK1 (2 Assertions) | Negativ + Message-Isolation (schließt `max_turns` explizit aus) | ✅ |
| AK2 | Boolean-Root → dieselbe Meldung | Gate #254 AK2 (2 Assertions) | Negativ + Message | ✅ |
| AK3 | Sequence-Root → dieselbe Meldung | Gate #254 AK3 (2 Assertions) | Negativ + Message | ✅ |
| AK4 | Mehrdokument-YAML → eigene, unterscheidbare Meldung | Gate #254 AK4 (2 Assertions) | Negativ + Message-Isolation (schließt "kein YAML-Mapping" explizit aus) | ✅ |
| AK5 | Gültiger Override (1 Dokument, Mapping-Root) → unverändertes Verhalten | Gate #254 AK5 + bestehender "sauberer Override"-Test | Positiv (Nicht-Regression) | ✅ |
| AK6 | Kein Override-File → neue Checks übersprungen | Gate #254 AK6 | Positiv (mit garantiert fehlendem Pfad, s. Review-Fix) | ✅ |

Alle 6 Akzeptanzkriterien aus `docs/specs/spec-254-config-validation-root-typ-guard.md`
sind 1:1 auf einen eigenen, benannten Testfall abgebildet (kein Sammel-Assert über
mehrere ACs hinweg).

## Test-Qualität (Checkliste `/test`)

- **Happy Path:** AK5 (gültiger Override bleibt grün), AK6 (kein Override bleibt grün).
- **Fehlerfälle:** AK1–AK4 decken alle in der Spec genannten Root-Typ-Fehler ab.
- **Boundary-Werte:** Dokumentanzahl-Grenze 1 (gültig, AK5) vs. 2 (ungültig, AK4) explizit
  gegenübergestellt — das ist die eigentliche Grenze der neuen Mehrdokument-Regel
  (`-gt 1`). Der `!!null`-Grenzfall (leerer Override) ist bereits durch den
  bestehenden "leerer Override ist gültig"-Test abgedeckt; ein zusätzlicher Test mit
  kommentar-only/explizitem `null`-Inhalt wurde geprüft (manuell, `yq eval-all
  document_index` liefert identisch `0`/`!!null`) und **bewusst nicht** als
  Duplikat-Test ergänzt (kein neuer Codepfad, nur derselbe `!!null`-Zweig).
- **Unabhängigkeit:** Jeder Testfall erzeugt seine eigene Fixture-Datei in `$GTMP`,
  kein geteilter mutable State zwischen Assertions.
- **Determinismus:** Keine Zeit-/Zufalls-Abhängigkeit, reine Datei-Fixtures.
- **Verhalten statt Implementierung:** Tests rufen das Gate als Subprozess auf
  (Black-Box: Exit-Code + stderr-Text), keine internen Funktionen direkt aufgerufen.
- **Message-Isolation:** AK1 und AK4 prüfen zusätzlich per Negativ-Grep, dass die
  jeweils andere (falsche) Fehlermeldung NICHT auftaucht — verhindert grün-aus-
  falschem-Grund (vgl. `lessons/testing.md`, Negativ-Test-Isolation).

## Finale Ausführung

```
bash scripts/checks/tests/run-tests.sh
→ Ergebnis: 599 grün, 0 rot
```

Keine Regression an Gate #241/#249 oder anderen Suiten-Teilen. Keine Produktionscode-
Änderung in diesem Schritt (nur Testdatei bereits im Review-Schritt korrigiert, s.
`tasks/review-254.md`).

## Fazit
Keine Test-Lücken gefunden. Keine neuen Tests in diesem Schritt nötig.
