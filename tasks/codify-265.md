## Codify-Report: Task 265

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/factory-workflow.md`] Neuer Eintrag: „Neuer pre-push.sh-Check, der
  lokalen Installationszustand voraussetzt, bricht bestehende Selbsttests in CI" – wegen: der
  neue `hooks-installed-check.sh`-Check (Task 265) hing von realem lokalem Installationszustand
  ab; ein bestehender Self-Test (`#149`) ruft `pre-push.sh` echt gegen das reale `FACTORY_DIR`
  auf – in einem frischen CI-Checkout ist dieser Zustand nie erfüllt, der CI-Job wurde rot (vom
  Menschen gemeldet, nicht selbst bemerkt). Fix: CI stellt den Zustand vor der Self-Test-Suite
  selbst her (`bash scripts/install-hooks.sh`-Schritt), statt den Check abzuschwächen.
  Index-Zeile in `PROJECT-CONTEXT.md` ergänzt (Trigger: `/implement`, `/review` – bei neuem
  lokalem-Zustand-abhängigem `pre-push.sh`/`pre-commit.sh`-Check).

- [`docs/factory/lessons/testing.md`] Neuer Eintrag: „Neuer git-Repo-Fixture-Helper, der
  committet, braucht lokale Git-Identität – auch wenn er lokal zufällig ohne sie durchläuft" –
  wegen: Review-Finding, dass `hi_repo()` (neuer #265-Testhelper) `git commit` ohne gesetzte
  `user.email`/`user.name` aufrief, anders als >15 bestehende Helper in derselben Datei; lokal
  unauffällig (Fallback auf `whoami@hostname`), in identitätsloser Umgebung reproduzierbar
  fehlgeschlagen (`fatal: empty ident name`). Index-Zeile ergänzt.

- [`docs/factory/lessons/factory-workflow.md`, Nachtrag am bestehenden #114-Eintrag
  „Reihenfolge-Guards: Kommando ≠ Prosa-Erwähnung"] – wegen: Rezidiv im selben Skill (eigener
  Selbstfund), diesmal nicht in Skill-Doku, sondern in einem neu geschriebenen CI-YAML-
  Reihenfolge-Test: ein erklärender Kommentar oberhalb des neuen Workflow-Schritts erwähnte den
  Namen des Folgeschritts in Prosa und pollutete den `grep -n … | head -1`-Positionsanker. Sofort
  per Gegenprobe (Schritte testweise vertauscht) selbst bemerkt, nicht erst im Review. Regel
  generalisiert: Anker ist die exakte Aufruf-Zeile, unabhängig vom Dokumenttyp. Index-Zeile
  entsprechend erweitert (Trigger jetzt auch „CI-Wiring-Tests").

### Keine Änderungen nötig

- Der Out-of-Scope-Fund zu `core.hooksPath` (Issue [#268](https://github.com/nothra/tch-gastro-services/issues/268))
  ist bereits als Issue getrackt (aus `/review`, um `security`-Label ergänzt in
  `/security-review`) – keine weitere Codify-Regel nötig, da es sich um eine bewusste
  Spec-Scope-Grenze handelt, nicht um einen wiederkehrenden Prozessfehler.
- Keine neue CLAUDE.md-Regel oder Guideline-Ergänzung nötig: alle drei Learnings sind
  projektspezifisch (Bash-Testsuite/CI-Konventionen dieses Repos), keine universellen
  Prinzipien.
- Kein neuer automatisierbarer Check nötig über die bereits in `/implement`/`/refactor`
  geschriebenen Regressions-Tests hinaus (CI-Ordering-Wiring-Test, Boundary-Test) – die
  Learnings sind bereits durch Tests abgesichert, nicht nur durch Prosa.

### Empfehlung für nächste Features

- Wird ein neuer Check in `pre-push.sh`/`pre-commit.sh` verdrahtet, der von echtem lokalem
  Zustand abhängt (nicht nur Repo-Inhalt): vor dem Verdrahten kurz prüfen, ob ein bestehender
  Self-Test das Gate-Skript real (ohne Fixture-Isolation) gegen `FACTORY_DIR` aufruft – sonst
  wiederholt sich das #265-Muster bei jedem künftigen umgebungsabhängigen Check.
- Beim Schreiben eines neuen commit-erzeugenden Testfixture-Helpers immer zuerst einen
  bestehenden Helper in derselben Datei als Vorlage kopieren (inkl. `git config`-Zeilen), statt
  minimal neu zu schreiben – die Git-Identität-Zeile ist leicht zu vergessen, wenn man „nur
  schnell" ein `git init` + `git commit` zusammenstellt.
