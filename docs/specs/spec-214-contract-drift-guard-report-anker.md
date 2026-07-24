# Spec: Contract-Drift-Guard für die Anker-Überschriften der Report-Skills

## Kontext

Die Verdict-/Section-Parser der Pipeline koppeln **hart** an die Anker-Überschriften,
die in den Report-Contracts (`.claude/commands/review.md`, `.claude/commands/security-review.md`)
kanonisch definiert sind:

| Parser-Konstante | Ort | erwartete Anker-Überschrift | kanonische Quelle |
|---|---|---|---|
| `report_verdict` (review) | `scripts/lib/report-verdict.sh` | `## Empfehlung` | `review.md` |
| `report_verdict` (security-review) | `scripts/lib/report-verdict.sh` | `## Ergebnis` | `security-review.md` |
| `count_section_items` | `scripts/run-pipeline.sh` | `## Kritische Findings`, `## Wichtige Findings`, `## Nitpicks` | `review.md` |

**Problem:** Kein Test prüft, dass Contract und Parser-Konstanten übereinstimmen. Benennt
jemand eine Überschrift im Command um (oder verschiebt sie), findet die Parser-Konstante den
Anker nicht mehr:
- `report_verdict` liefert **still** ein leeres Verdict → fail-closed → der Review-Loop landet
  dauerhaft im Rework, ohne dass ein Test rot wird.
- `count_section_items` zählt still `0` Findings.

Das ist ein **stiller Bruch** – der gefährlichste Fehlertyp, weil keine Gate-Prüfung greift.

Bezug: #211 (Out-of-Scope-Fund der Review), Codify-Learning #55. Analog zur Projektregel
„Gate-Regex durch einen Positiv- **und** einen Negativ-Test absichern" (`clean-code.md`,
„Portabilität in Gate-Skripten") wird die Kopplung durch einen Drift-Guard-Test abgesichert.

## Scope

**Inbegriffen:**
- Ein Drift-Guard-Test in `scripts/checks/tests/run-tests.sh`, der die **echten** Quellen liest
  (`.claude/commands/review.md`, `.claude/commands/security-review.md` **und** die
  Parser-Skripte `report-verdict.sh` / `run-pipeline.sh`) und assertet, dass jede der fünf
  Parser-Konstanten als Anker-Überschrift im zugehörigen Command auffindbar ist.
- Abdeckung **aller drei** Parser: `report_verdict` (review + security-review) und
  `count_section_items` (die drei Findings-Sektionen der review).
- Ein Negativ-Fall im selben Test, der belegt, dass der Guard bei simuliertem Drift
  (umbenannte Überschrift) tatsächlich rot wird – sonst ist der Guard selbst wertlos.
- Die Fundlogik des Tests respektiert die jeweilige Parser-Semantik: exakte Anker-Zeile bei
  `report_verdict`, Teilstring/Präfix bei `count_section_items` (dessen awk-Muster unankert
  matcht, z. B. `## Kritische Findings` in `## Kritische Findings (müssen behoben werden)`).

**Nicht inbegriffen:**
- Jede Änderung an den Command-Überschriften, an `report-verdict.sh` oder an
  `count_section_items` – die Konstanten sind heute konsistent; die Task fügt **nur** einen
  Test hinzu, kein neues Verhalten (Label `tech-debt` + `test`).
- Bidirektionale Prüfung (dass keine „unbekannte" Command-Überschrift ohne Parser existiert) –
  bewusst ausgeschlossen: redaktionelle Überschriften wie `## Positives`/`## Hinweise` sind
  legitim und dürfen keinen False-Positive auslösen.
- Verdrahtung als zusätzliches CI-/pre-push-Gate über `run-tests.sh` hinaus. Kein Gold-Plating;
  `run-tests.sh` ist der etablierte Ort für Struktur-/Contract-Selbsttests (analog #101, #149).

## Akzeptanzkriterien

- [ ] **AC1 – review-Verdict-Anker:** GIVEN `report-verdict.sh` liest den Verdict der review
  unter `## Empfehlung`, WHEN der Drift-Guard läuft, THEN assertet er, dass `## Empfehlung` als
  exakte Anker-Überschrift in `.claude/commands/review.md` vorhanden ist.
- [ ] **AC2 – security-Verdict-Anker:** GIVEN `report-verdict.sh` liest den Verdict der
  security-review unter `## Ergebnis`, WHEN der Drift-Guard läuft, THEN assertet er, dass
  `## Ergebnis` als exakte Anker-Überschrift in `.claude/commands/security-review.md` vorhanden ist.
- [ ] **AC3 – count_section_items-Anker:** GIVEN `count_section_items` zählt Findings zwischen
  `## Kritische Findings`, `## Wichtige Findings` und `## Nitpicks`, WHEN der Drift-Guard läuft,
  THEN assertet er, dass alle drei Sektions-Überschriften in `.claude/commands/review.md`
  auffindbar sind (Teilstring-Semantik wie im awk-Muster).
- [ ] **AC4 – Negativ-Fall greift (fail-closed):** GIVEN eine Kopie des Command-Contracts, in der
  eine Anker-Überschrift umbenannt ist (Drift simuliert), WHEN der Drift-Guard gegen diesen Stand
  läuft, THEN meldet er den Bruch (Exit ≠ 0 / rote Assertion) mit einer Meldung, die die
  betroffene Konstante nennt.
- [ ] **AC5 – In die Suite integriert:** GIVEN `scripts/checks/tests/run-tests.sh` läuft, WHEN der
  Drift-Guard Teil der Suite ist, THEN führt ein Ausführen von `run-tests.sh` den Guard mit aus und
  endet bei Drift mit Non-Zero-Exit (der Guard ist nicht nur definiert, sondern verdrahtet).
- [ ] **AC6 – Verankerung an echten Quellen:** GIVEN der Test, WHEN er die erwarteten Konstanten
  bestimmt, THEN liest er sie aus den echten Parser-Skripten (nicht aus im Test duplizierten
  Literalen), sodass eine Änderung auf **beiden** Seiten (Command **oder** Parser) erkannt wird.

## Fehlerszenarien

- [ ] **Fehlende Command-Datei:** GIVEN `.claude/commands/review.md` fehlt (oder ist leer),
  WHEN der Guard läuft, THEN schlägt er fehl (fail-closed) statt still „bestanden" zu melden.
- [ ] **Anker vorhanden, aber nicht als Überschrift:** GIVEN der Konstanten-Text kommt nur im
  Fließtext des Commands vor (nicht als `## `-Überschriftszeile), WHEN der Guard läuft, THEN gilt
  das **nicht** als Treffer für den exakt-verankerten `report_verdict`-Fall (kein False-Negative
  des Drift-Guards).
- [ ] **Portabilität:** GIVEN der Guard läuft lokal (macOS/BSD) und in CI (GNU/Alpine), WHEN er
  Muster matcht, THEN nutzt er ausschließlich POSIX-Regex / portables awk (kein `\s`/`\d`,
  kein `grep -P`), konsistent mit den übrigen Gate-Skripten.

## Offene Fragen

- [ ] Keine. Scope in Rücksprache bestätigt: alle drei Parser abdecken, ein-direktional
  (Parser-Konstante → im Command auffindbar), inkl. verpflichtendem Negativ-Fall.
