# Review: Task 390

Diff-Basis: `git diff origin/main...HEAD` (nach `git fetch origin`). Geändert: `package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts/checks/tests/run-tests.sh`, Spec, Task-Datei.
Die drei Runden (Logik, Code-Qualität, Architektur) liefen wegen des kleinen Diffs (6 Dateien,
keine App-Code-Änderung) direkt im Orchestrator-Kontext, nicht als Sub-Agenten.

Gegengeprüft im Lockfile: `next@16.3.8`, `brace-expansion@1.1.21/2.1.7/5.0.12`, `undici@7.30.0`
(keine 6.x-Kopie), `postcss@8.5.23/8.5.26`, `sharp@0.35.4`. Kein `next dev`-Block in `CLAUDE.md`
(Lesson #337). PR #395 trägt `Closes #390`.
Advisory-Volllisten (`gh api advisories/…`) konnten in dieser Session nicht erneut abgefragt
werden (Freigabe fehlte). Die Floors 1.1.21 / 2.1.7 / 3.0.9 / 5.0.12, 7.29.1 und 6.28.1 stammen
deshalb aus den Notizen von `/implement` und sind hier nicht unabhängig nachgemessen.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] [scripts/checks/tests/run-tests.sh:5635] **Die undici-6.x-Linie hat keinen Vorsorge-Floor-Fall, obwohl dieser PR ihre bisherige Deckung entfernt.** Bis jetzt griff `undici@<7.29.0` auch auf eine 6.x-Kopie: Sie wäre zwar über die Major-Grenze gehoben, aber nicht verwundbar geblieben. Nach der korrekten Eingrenzung auf `>=7.0.0 <7.29.1` würde eine künftig hereingezogene `undici@6.x` unter dem eigenen Fix 6.28.1 (GHSA-r53p-7pc4-xj5r, so im PR-Kommentar `run-tests.sh:5789` und `pnpm-workspace.yaml:96–99` genannt) **still** einziehen. Override und Floor-Guard sehen dann beide weg. Das ist genau die Lage, für die #339 den Fall `brace-expansion|3|…|Vorsorge` samt Mutationsbeleg (`run-tests.sh:5660–5673`) eingeführt hat: „Für Major 3 ist dieser Fall die EINZIGE Deckung". **Fix:** in `floor_cases_291` den Fall `"undici|6|6.28.1|Vorsorge, heute keine 6.x-Kopie im Baum, kein Override-Selektor (#390)"` ergänzen. Den Mutationsbeleg nach dem Muster des Major-3-Falls bauen, also eine Fixture mit `undici@6.28.0` plus einer `undici@7.30.0`-Nachbarzeile. Sie muss genau `6.28.0` melden und gegen Floor 6.28.0 sauber sein. Dazu den Satz in `pnpm-workspace.yaml:98–99` um den Guard-Verweis ergänzen, analog zu Zeile 90–92 bei brace-expansion. Vor dem Eintragen den höchsten 6.x-Floor über **alle** sechs undici-Advisories bestätigen, nicht nur über GHSA-r53p (Lesson #231).

## Nitpicks (optional)

- [x] [pnpm-workspace.yaml:22] Das Beispiel für die Caret-Ausnahme zitiert den Override noch in der alten Form `brace-expansion@>=4.0.0 <5.0.9 → ^5.0.9`. Der echte Eintrag lautet jetzt `<5.0.12 → ^5.0.12`. Der Absatz dient ausdrücklich als „Prosa-Anker", deshalb sollte er dem aktuellen Eintrag entsprechen. Wer es lieber historisch hält, ergänzt „(Stand #339)" (Lesson #211/#176).
- [x] [scripts/checks/tests/run-tests.sh:5618] Der Kommentar nennt den Selektor noch als `(>=4.0.0 <5.0.9)`, der aktuelle Selektor ist `<5.0.12`. Entweder auf den aktuellen Wert ziehen oder als „(#339: …)" kennzeichnen.
- [x] [pnpm-workspace.yaml:75] Die Zeile ist rund 115 Zeichen lang, der Block bricht sonst bei etwa 100 Zeichen um. Den Umbruch hinter „bereits erfüllte." setzen.
- [x] [pnpm-workspace.yaml:55] Beim postcss-Eintrag steht ein Nachtrag „Neu bewertet in #390 (next 16.3.8)", beim sharp-Eintrag fehlt er, obwohl die Task-Notiz dafür gemessen 0.35.4 unter 16.3.8 nennt. Für die Symmetrie einen Halbsatz ergänzen.

## Positives

- Die Floors wurden **angehoben statt daneben gestellt**, im bestehenden Guard (`floor_cases_291`, Konditionalitäts- und Caret-Guards). Das ist konsequent nach dem dokumentierten Muster aus #169/#291/#337. TDD ist nachvollziehbar: RED mit 8 roten Fällen, dann GREEN.
- Der undici-Selektor ist **nach unten begrenzt** (`>=7.0.0`). Damit ist die Major-Sprung-Gefahr, die #291 beim 2er-Selektor von brace-expansion empirisch belegt hat, für undici proaktiv geschlossen und per `grep -qxF`-Assertion abgesichert.
- Den 5.x-Floor auf 5.0.12 zu heben, ohne dass ein eigener Alert dafür vorlag, ist richtig begründet: Die volle Advisory-Liste wurde geprüft, nicht nur die Alert-Range (Lesson #231), und minimatch@10 deklariert nur `^5.0.5`.
- `next` ist exakt gepinnt, `eslint-config-next` läuft im Lockstep mit, und der Lockfile-Abgleich (genau eine aufgelöste Version gleich dem Pin) ist durch bestehende Assertions gedeckt.
- Die Laufzeit-Verifikation ist sauber gebaut: `next start` auf einem eigenen Port statt `next dev`, das vermeidet die Fallen aus Lesson #368 und #337. Der `/_next/image`-Rauchtest läuft gegen einen Matcher-ausgenommenen Pfad mit Negativ-Gegenprobe (Lesson #337).
- Abweichungen von der Spec sind ehrlich vermerkt, im selben PR (Lesson #388): Dependabot-AK erst nach dem Merge prüfbar, PWA-AK auf das Manifest angepasst.
- Die historische No-op-Messung aus #339 ist ausdrücklich als „bezieht sich auf Floor 5.0.9" gekennzeichnet und wurde nicht still umgeschrieben.

## Empfehlung
NEEDS_REWORK
