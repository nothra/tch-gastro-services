# Test-/Coverage-Report: Task 196

## Art der Task

Reine **Kontext-/Doku-Umschichtung** (ADR-037): Stolperstein-Volltext aus dem @import-Pfad nach
`docs/factory/lessons/`, Index + 4 Kern-Kurzregeln inline, `/codify`-Skill + Querverweise angepasst.

**Kein Produktionscode im Diff** (`git diff --name-only origin/main...HEAD` enthält nur `*.md`).
Damit gibt es keine neuen/geänderten Code-Pfade → **keine Vitest-Coverage-Delta**; die
80-%-Schwelle bzw. „100 % bei neuem Code" ist mangels neuem Code trivial erfüllt.

Kein neuer Check/Gate hinzugefügt: Der wiederkehrende Auslöser (erneutes Zuwachsen des
@import-Pfads durch `/codify`) ist an der Quelle behoben (codify.md-Anpassung, AC5). Ein
zusätzliches Gate wäre YAGNI (`token-efficiency.md`: „Kein Check-Skript aus Reflex") und außerhalb
des Task-Scopes.

## Akzeptanzkriterien – Verifikation (Doku-Integrität statt Unit-Tests)

Die Fehlerszenarien der Spec sind grep-/count-basierte Doku-Invarianten. Skript-verifiziert gegen
`origin/main` (kanonischer Ausgangszustand):

| Kriterium | Prüfung | Ergebnis |
|-----------|---------|----------|
| AC1 – Volltext raus aus @import | Kein `### `-Volltext-Eintrag mehr in der Sektion (nur Sub-Header „Kern-Kurzregeln" + „Index") | ✅ |
| AC3 – kein Verlust (lossless) | Reconstruction aus 7 Lessons **byte-identisch** zur Original-Sektion | ✅ |
| AC3 – Count 45 → 45 | 45 Original-Header → 45 Lesson-Einträge | ✅ |
| „Doppelte Wahrheit" / „Verlorenes Learning" | Index-Bullet-Set ≡ Original-Header-Set (mengengleich, keine Dublette/keine Lücke), 45 Bullets | ✅ |
| AC4 – Kern-Kurzregeln inline | 4 Regeln, jede verlinkt auf `lessons/db-drizzle.md` | ✅ |
| „Toter Verweis" / AC6 | Einzige Relativ-Links (`ADR-029/030`) auf `../../adr/` angepasst, beide Ziele existieren; keine weiteren Links im Bestand | ✅ |
| AC5 – `/codify` → lessons/ | Skill verweist auf `lessons/<thema>.md` + Index + ADR-037, kein alter „Bekannte Stolpersteine"-Ziel-Verweis | ✅ |

Reproduktion: die Assertions in `/review 196` bzw. `/test 196` (Python-Snippet gegen
`git show origin/main:…` + die Lesson-Dateien).

## Finale Test-Ausführung

`pnpm test` (via pre-push-Gate bei jedem Push dieses Branches): **609 passed | 59 skipped**,
Typecheck grün, Prettier `format:check` grün, Routen-Doku-Drift grün. Keine vorher-grünen Tests
rot geworden (kein Code angefasst).

## Ergebnis

Alle Akzeptanzkriterien verifiziert; Test-Suite grün; Coverage-Schwelle nicht betroffen (kein
neuer Code). Keine offenen Test-Lücken.
