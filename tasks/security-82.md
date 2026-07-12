# Security Review: Task 82

> Gegenstand: zentraler Issue-Anlage-Seam `scripts/lib/create-issue.sh` +
> Aufrufer (`scripts/start-work.sh`, `scripts/sync-issues.sh`) + Doku (ADR-018,
> Spec-82, Skill-Anweisungen). Reiner Shell-/Doku-Diff, kein TS/JS-Produktcode.
> Analysiert: `git diff main...HEAD` (4× `.sh`, 8× `.md`).

Der OWASP-Webkatalog ist hier nur teilweise einschlägig (kein HTTP/DB/AuthN im
Diff). Bewertet wurden gezielt die Angriffsflächen eines Shell-Seams, der
Werte an `gh` durchreicht: Command/Argument-Injection, Secret-Handling,
Information Disclosure, Sourcing-Pfad, Fail-open-Verhalten und die **neue**
Trust-Boundary „Skills legen autonom Issues an" (ADR-018 §5).

## Kritische Findings (Blocker)

Keine.

Die primären Injection-Flächen sind sauber mitigiert (Begründung siehe unten,
„Sauber mitigiert").

## Wichtige Findings

Keine, die vor dem Merge behoben werden müssen.

## Hinweise

### H-1 · Seam akzeptiert beliebige Labels – auch die Maschinen-Trigger `factory::*` (Trust-Boundary der autonomen Anlage)

- **Kategorie:** Broken Access Control / Trust-Boundary (Aspekt 7).
- **Szenario (Eingabe → Effekt):** Der Seam validiert Labels bewusst **nicht**
  (fail-open pass-through, ADR-018 §3). Damit ist als Aspekt-CSV **jeder**
  String zulässig – auch `factory::run`. Dieses Label ist kein kosmetisches
  Klassifizierungs-Label, sondern der **Eintritts-Trigger** der autonomen
  Pipeline (`factory-poll.sh`, ADR-008; siehe `git-workflow.md` → „`factory::`-Labels").
  Neu in dieser Task ist, dass `codify`/`review`/`security-review` `create_issue`
  **autonom** aufrufen dürfen. Würde ein Skill jemals dazu gebracht, ein
  Aspekt-Label **aus angegriffenem/untrusted Inhalt** (Finding-Text, Diff,
  externe Quelle) abzuleiten, könnte ein eingeschleustes `factory::run` einen
  ungewollten autonomen Pipeline-Lauf anstoßen (Rausch-/Ressourcen-Missbrauch,
  Selbst-Trigger). Anders als bei den kosmetischen Aspekt-Labels greift hier das
  „gates over trust"-Argument tatsächlich, weil `factory::run` privilegienrelevant ist.
- **Aktueller Status – kein ausnutzbarer Pfad:** Die Skill-Docs geben in dieser
  Task **literale, feste** Labels vor (`enhancement "security"` etc.), leiten sie
  also nicht aus Inhalt ab. Der ADR-008-Trigger bleibt zusätzlich hinter Budget-Guard
  (Label-Eintrittstür + Concurrency=1 + Tageskappe). Deshalb Hinweis, kein Blocker.
- **Empfehlung (Härtung, defense-in-depth):**
  1. Skill-Doku explizit anweisen: **Labels sind fixe Literale**, niemals aus
     Finding-/Diff-/Fremdinhalt ableiten (Titel/Body dürfen Inhalt zitieren, Labels nicht).
  2. Optional im Seam eine **schmale Denylist des `factory::`-Präfix** ergänzen
     (nicht die vom ADR bewusst abgelehnte volle Allowlist – nur das
     Trigger-Namespace hart ablehnen bzw. verwerfen). Das schützt genau den
     privilegienrelevanten Wert, ohne die kanonische Label-Liste zu duplizieren.
- **✅ BEHOBEN (im selben Zyklus):** Beide Empfehlungen umgesetzt. (1) Der Seam verwirft
  jetzt Art- **und** Aspekt-Labels mit `factory::`-Präfix (Warnung auf stderr) –
  `scripts/lib/create-issue.sh`, Regressionstest 13 in `run-tests.sh` (kein `factory::`
  erreicht `gh`, legitime Nachbar-Labels bleiben). (2) Die drei Skill-Docs weisen „Labels sind
  feste Literale, nie aus untrusted Inhalt ableiten" an. ADR-018 §3 dokumentiert die Denylist
  als bewusste Ausnahme zur abgelehnten Allowlist. Damit ist der einzige privilegienrelevante
  Punkt strukturell geschlossen.

### H-2 · Fail-open-Label-Degradation kann `security`-Label still fallen lassen

- **Kategorie:** Logging/Visibility (Aspekt 6).
- **Szenario:** Existiert das `security`-Label im Repo nicht, legt der Seam das
  Issue **trotzdem** an (Stufe 3, ohne Label) und warnt auf **stderr**. In einem
  automatisierten Lauf, der stderr nicht sichtbar macht, kann ein
  Security-Finding damit **unbeschriftet** landen und schlechter auffindbar sein.
- **Bewertung:** Das Schutzziel (das Issue = der Fund entsteht) bleibt gewahrt –
  der Fund geht nicht verloren; das Label ist Metadatum, kein Access-Control.
  Darum bewusst Hinweis, nicht Blocker (deckt sich mit ADR-018-Trade-off).
- **Empfehlung:** Die Standard-Labels (`bug`/`enhancement`/`documentation`,
  `security`/`tech-debt`/`test`) im Repo **vorab provisionieren**, damit die
  Degradation im Normalbetrieb nie greift; die stderr-Warnung in
  Pipeline-Läufen sichtbar halten.

### H-3 · `gh`-stderr wird mit `2>/dev/null` unterdrückt (Diagnose-Tradeoff)

- **Kategorie:** Error Handling / Information Disclosure (Aspekt 4).
- **Bewertung:** Sicherheitsseitig **unkritisch/positiv** – es verhindert, dass
  `gh`-Fehlermeldungen (Repo/Auth-Hinweise, Rate-Limit) nach außen gelangen.
  Der einzige Nachteil ist **Debuggability**: Bei einem Anlage-Fehschlag sieht
  der Nutzer nur die generische Seam-Meldung, nicht die `gh`-Ursache. Kein
  Handlungsbedarf aus Security-Sicht; nur der Vollständigkeit halber vermerkt.

---

## Sauber mitigiert (mit Begründung)

- **Command Injection (Aspekt 1): mitigiert.** Alle Werte (`title`, `body`,
  `art-label`, jedes `aspect`, `repo`) werden als **separate, gequotete
  Array-Elemente** an `gh` übergeben (`common=(… --title "$title" --body "$body")`,
  `lbl_full+=(--label "$label")`, Aufruf `_cri_try_create "${common[@]}" "${lbl_full[@]}"`).
  **Kein** `eval`, **keine** Backticks, **keine** Pipeline/`$(…)`, die
  User-Daten re-evaluiert. Das einzige `$(…)` ist der direkte
  `gh issue create "$@"`-Exec und ein `grep -oE '[0-9]+$'` auf dessen Ausgabe –
  beides ohne Shell-Re-Interpretation. Der Self-Test (Test 12, `run-tests.sh`)
  weist per Bracket-Logging nach, dass Titel/Body mit Leerzeichen und Quotes
  **genau ein** Argument bleiben (kein Word-Splitting), inkl. scharfer
  Negativkontrolle.

- **Argument-/Option-Injection in `gh` (Aspekt 2): mitigiert.** Jeder User-Wert
  steht **stets als Wert eines vorangehenden Flags** (`--title`/`--body`/`--label`/`--repo`);
  es entsteht **kein bloßes Positional**. `gh issue create` nimmt keine
  Positionals, und `gh` (Go/pflag) konsumiert bei Space-Form (`--flag wert`) das
  Folge-Token **bedingungslos** als Flag-Wert – auch wenn es mit `-`/`--` beginnt.
  Ein bösartiger Titel/Label wie `--body-file /etc/passwd` oder `--add-assignee`
  wird damit als **Wert** von `--title`/`--label` interpretiert, nicht als neue
  Option. Auch die CSV-Zerlegung und die `${aspects[@]}`/`common`-Zusammensetzung
  erzeugen nur Flag+Wert-Paare (`--label "$label"`). Ein `--`-Terminator ist hier
  mangels Positionals **nicht nötig** (könnte als reine Defense-in-depth ergänzt
  werden, geringer Zusatznutzen). `set -u`-sichere Expansion (`${arr[@]+"…"}`)
  ist korrekt und ändert an der Argument-Integrität nichts.

- **Secret-/Token-Handling (Aspekt 3): mitigiert.** Kein `GH_TOKEN`/`GITHUB_TOKEN`
  wird im Diff referenziert, gesetzt, geloggt oder ge-`echo`t (die einzigen
  „token"-Treffer sind die lokale Schleifenvariable `token` der CSV-Zerlegung –
  kein Credential). `gh` liest sein Token intern aus der Env. **Keine**
  hartkodierten Secrets im Diff (pre-commit-Credential-Check verifiziert nachvollzogen).

- **Path/Sourcing-Sicherheit (Aspekt 5): mitigiert – sogar bewusst gehärtet.**
  `. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/create-issue.sh"` löst
  **relativ zum absoluten Ort des ausführenden Skripts** auf – nicht aus CWD,
  nicht über `PATH`, nicht aus `.`. `BASH_SOURCE[0]` ist Skript-intern, **kein**
  User-Input. Bemerkenswert: es wird **absichtlich nicht** `FACTORY_DIR`
  verwendet (das per Env angreifer-/testkontrolliert sein kann) – dadurch wird
  immer die mitgelieferte Lib gesourct, nicht eine umgelenkte. Den Pfad zu
  subvertieren setzt Schreibzugriff auf `scripts/lib/` voraus = bereits
  kompromittiertes Repo (keine neue Fläche).

- **Fail-closed auf die Anlage (Aspekt 6): korrekt.** Exit ≠ 0 nur, wenn **gar
  kein** Issue entsteht; die fail-**open**-Degradation betrifft ausschließlich
  das kosmetische Label (siehe H-2). Das ist die richtige Richtung: fail-closed
  dort, wo Korrektheit zählt (Fund entsteht), fail-open nur bei Kosmetik.

## Ergebnis
PASSED

Keine kritischen oder wichtigen Findings. Die Injection-Kernflächen (Command,
Argument/Option, Secret, Sourcing-Pfad) sind sauber und teils bewusst gehärtet.
H-1 (der einzige privilegienrelevante Punkt) wurde im selben Zyklus **behoben**:
`factory::`-Denylist im Seam + „feste Literale"-Anweisung in den Skill-Docs +
ADR-Dokumentation, abgesichert durch Regressionstest 13. Verbleibend nur H-2
(Standard-Labels vorab provisionieren – Betrieb) und H-3 (`gh`-stderr-Unterdrückung –
bewusster, sicherheitsseitig positiver Tradeoff) als Hygiene-Hinweise ohne Merge-Bezug.
