# Coverage-Report: Task 286

## Einordnung

Task 286 ist reine Doku-/Prompt-Änderung (`git-workflow.md`, `kleinfunde.md`, ADR-018/-043,
`.claude/commands/{review,security-review,codify}.md`) plus ein Bash-Test-Guard-Block
(„Task 286“) in `scripts/checks/tests/run-tests.sh`. Es gibt **keine** Änderung an `app/`,
`lib/`, `db/`, `e2e/` – `pnpm test:coverage` (Vitest/Istanbul) misst TypeScript-Code und ist
für diesen Diff nicht aussagekräftig; die 80%-Coverage-Schwelle aus `PROJECT-CONTEXT.md`
bezieht sich auf diese Schicht, nicht auf Bash-Skripte oder Markdown.

Die relevante „Test-Suite" für diese Task ist der Bash-Guard selbst
(`scripts/checks/tests/run-tests.sh`, Abschnitt „Task 286"). Coverage bedeutet hier: **jedes
Akzeptanzkriterium aus `docs/specs/spec-286-kleinfunde-sammeldatei.md` hat eine konkrete,
automatisierte Assertion.**

## AK-zu-Assertion-Abdeckung

Eine Testing-Persona-Prüfung (Explore-Agent, nur Lesezugriff) ist jede AK-Zeile der Spec
einzeln gegen den bestehenden Guard-Block durchgegangen. Ergebnis vor dieser `/test`-Runde:
**15 von 22 AK direkt abgedeckt**, 7 Lücken/Schwachstellen gefunden. Alle sieben wurden in
dieser Runde geschlossen:

| Lücke | Fix |
|-------|-----|
| Schwellen-Tabelle: nur Abschnitts-Überschrift geprüft, nicht die vier tatsächlichen Zeilen | 4 neue Assertions je Tabellenzeile (`Merge-Blocker im aktuellen PR`, `Echtes Sicherheitsrisiko`, `Funktionaler Defekt mit reproduzierbarem Auslöser`, `Alles andere`) |
| „existiert genau einmal" nie geprüft | Repo-weiter Eindeutigkeits-Zähler auf die Tabellenkopfzeile (`Fund-Art`) |
| `/security-review` Aspekt-Label `security` am Aufruf nie geprüft | Neue Assertion auf `"security"` in der `create_issue_idempotent`-Zeile |
| „kritisches Finding im Scope bleibt Merge-Blocker" nie geprüft | Je Skill (review/security-review) eigene Assertion auf den tatsächlichen Satz |
| „funktionaler Defekt mit reproduzierbarem Auslöser" (review/codify) nie geprüft | Neue Assertion je Skill – deckte einen **echten Bug** im Guard selbst auf (s. u.) |
| Vier Bestandseinträge (#279/#280/#282/#283) nur implizit über „keine Nummerierung" geprüft | 4 Assertions auf die Herkunfts-Referenzen |
| Schema-Felder Wo/Was/Fix/Herkunft nur als Gesamtsatz, nicht einzeln geprüft | 4 Assertions je Feld |

**Zusätzlich selbst gefunden (Review-Runden 1–3, vor `/test`):** Mutationsbeleg für den
Abwesenheits-Guard führte nicht den echten Assert-Ausdruck aus (nur eine tautologische
Ergänzungsprüfung) – gefixt, führt jetzt denselben Ausdruck gegen die Fixture aus. Fehlerfall-
Satz war dreifach in den Skill-Dokus kopiert statt zentral in `kleinfunde.md` – zentralisiert.

**Zusätzlich in dieser `/test`-Runde selbst gefunden:** die neue `funktionaler Defekt mit
reproduzierbarem Auslöser`-Assertion für `/review` schlug initial fehl – nicht weil der Inhalt
fehlte, sondern weil `grep -qF` gegen eine Prosa-Phrase lief, die durch einen Markdown-
Zeilenumbruch mitten im Satz getrennt war (exakt die in `docs/factory/lessons/factory-workflow.md`
dokumentierte „grep -qF-Fixed-String-Regressionstest gegen Markdown-Prosa"-Falle). Fix: alle
Mehrwort-Prosa-Checks im Task-286-Block laufen jetzt über einen `flat_286()`-Helper
(Zeilenumbrüche → Leerzeichen vor dem Matchen), statt die Skill-Doku selbst umzuformulieren –
robuster gegen künftige Zeilenumbrüche in beide Richtungen.

**Neu ergänzt (Reihenfolge, die zentrale Anforderung der ganzen Task):** ein Guard, der
verifiziert, dass die Klassifikations-Anweisung in jeder der drei Skill-Dokus tatsächlich VOR
dem `create_issue_idempotent`-Aufruf steht (Zeilenposition, nicht nur Textpräsenz) – plus eine
Negativ-Kontroll-Fixture, die belegt, dass der Guard bei vertauschter Reihenfolge tatsächlich
fehlschlägt (Mutationsbeleg).

## Bewusst nicht getestet (bleibt AK-Lücke, dokumentiert statt verschwiegen)

- **AK 5 (Teil 2):** „ruft NICHT `create_issue_idempotent` auf" für den Unterhalb-der-Schwelle-
  Fall ist nicht automatisiert prüfbar – der Aufruf-Text steht in der Doku für BEIDE Zweige
  (Schritt A enthält ihn immer, Schritt B enthält ihn nie); ob ein Agent zur Laufzeit den
  richtigen Zweig wählt, ist Prompt-Verhalten. ADR-043 Decision 5 benennt das explizit: die
  Durchsetzungsebene ist der Prompt, nicht die Laufzeit. Der Ordering-Guard oben ist der
  stärkste an dieser Stelle mögliche Proxy.

## Ergebnis

```
Ergebnis: 925 grün, 0 rot
```

`pre-commit.sh` (Lint) und `pre-push.sh` (Tests/Typecheck/Format/Routen-Doku/Hooks) laufen
zusätzlich grün – unverändert, da kein App-Code betroffen ist.
