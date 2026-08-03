# Security Review: Task 268

**Scope:** `git diff origin/main...HEAD` (8 Dateien, +683/−12) – Änderung an einem lokalen
Quality-Gate-Shell-Skript (`scripts/checks/hooks-installed-check.sh`) + Tests + Doku.
Kein Anwendungscode (`app/`, `db/`, `lib/`) berührt, keine Routen, keine Server Actions,
keine Dependencies. Angriffsfläche daher: **Entwickler-/CI-lokale Shell-Ausführung**,
nicht die PWA-Laufzeit.

**Geprüfte Dateien:**
`scripts/checks/hooks-installed-check.sh`, `scripts/checks/tests/run-tests.sh`,
`docs/adr/042-*.md`, `docs/factory/guidelines/git-workflow.md`, `docs/specs/spec-265*`,
`docs/specs/spec-268*`, `tasks/*`.

---

## Kritische Findings (Blocker)

_Keine._

---

## Wichtige Findings

_Keine._

Explizit geprüft und **nicht** zutreffend:

- **Command Injection:** Der config-kontrollierte Wert (`core.hooksPath`) und `FACTORY_DIR`
  landen nirgends in `eval`, einer Subshell-Kommandozeile oder einer unquotierten Expansion.
  Alle Verwendungen sind quotierte Parameter-Expansions in `echo`/`printf`/`cd`/`[ -n … ]`
  (`hooks-installed-check.sh:47,78,85,93–96`). Der Schlüsselname bei `git config --get
  core.hooksPath` ist ein Literal – kein `--`-Bedarf (die `clean-code.md`-Regel zu variablen
  Suchwerten greift hier nicht, weil kein Wert als Argument vor einen Optionsparser gelangt).
- **Fail-open im Gate:** Der neue Guard läuft **vor** der Präsenzprüfung und deckt alle drei
  `git config --get`-Exit-Klassen ab (`0` = gesetzt → Exit 1, `1` = nicht gesetzt → weiter,
  sonst → Exit 1). `set -uo pipefail` + direkte `$?`-Erfassung in `HOOKS_PATH_RC` sind
  korrekt (keine dazwischenliegende Anweisung, die `$?` überschreibt).
- **Secrets/Credentials:** Keine Literale, keine Env-Var-Ausgabe von Secrets; Diff-Grep auf
  `password|secret|token|api_key|PRIVATE KEY` ohne Treffer.
- **Dependencies:** Keine neue oder geänderte Dependency (kein `package.json`/Lockfile im Diff).
- **Test-Fixtures:** `mktemp -d` + quotierte `rm -rf "$TMP_HI"`; die neue Isolation
  `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null` (`run-tests.sh:4120`) verhindert,
  dass ambiente Entwickler-Config in die Fixture leckt – Härtung, kein Risiko.

---

## Hinweise

- [ ] **[Output-Integrität / Escape-Interpretation]** `hooks-installed-check.sh:93`
      interpoliert den config-kontrollierten Wert in ein `echo -e`; Backslash-Escapes im Wert
      werden dadurch interpretiert (in dieser Session reproduziert: ein Wert mit `\n` erzeugt
      zwei Ausgabezeilen). **Kein Gate-Bypass** – der Exit-Code bleibt 1 und `pre-push.sh:118`
      wertet ausschließlich den Exit-Code aus (die Ausgabe wird nur per `sed` eingerückt unter
      ein eigenes rotes Fehler-Banner gedruckt). Auswirkung begrenzt auf Aussagekraft der
      Meldung (verstümmelter Windows-/WSL-Pfad, bzw. eingeschmuggelte Zusatzzeile inkl. ANSI).
      Lösung: Farbcodes von Daten trennen (`printf '%b✗%b … %s …\n'` mit dem Wert als
      Argument). Dieselbe Stelle existiert als Vorbild in `install-hooks.sh:51`, das #268
      bewusst nicht anfasst. → **bereits getrackt als Issue #280** (aus `/review` Runde 4);
      kein neues Issue angelegt. `security`-Aspekt-Label dort ergänzt.
- [ ] **[Fail-open in der Geschwister-Stelle]** `install-hooks.sh` behandelt
      `core.hooksPath=""` weiterhin als „nicht gesetzt" (`[ -n "$HOOKS_PATH_CONFIG" ]`) und
      installiert dann Hooks nach `$GIT_COMMON_DIR/hooks`, die Git in diesem Zustand nicht
      aufruft – d. h. die Kette „`pre-commit` scannt hartkodierte Credentials" wäre still
      inaktiv. Außerhalb des Scopes von #268 (das den Blindspot in ADR-042 §Consequences
      dokumentiert und im neuen Check bewusst abweichend fail-closed löst). → **bereits
      getrackt als Issue #279**; `security`-Aspekt-Label dort ergänzt.
- [ ] **[Gate-Ergonomie → Bypass-Gewöhnung]** Der Check ist bei gesetztem `core.hooksPath`
      dauerhaft rot, auch bei global gesetztem Wert (`--get` liest global/system mit) und ohne
      Opt-out. Auf einer Maschine mit `git config --global core.hooksPath …` (verbreitetes
      husky-/dotfiles-Muster) blockiert damit **jeder** Push, was zur Gewöhnung an
      `git push --no-verify` führen kann – und das umgeht *alle* pre-push-Gates, nicht nur
      diesen. Bewusste YAGNI-Entscheidung, dokumentiert in ADR-042 §Consequences. → **bereits
      getrackt als Issue #278** (Opt-out, z. B. `FACTORY_HOOKS_PATH_ACK`). Kein Blocker: die
      server-seitige Grenze bleibt das Ruleset `protect-main` (ADR-029), das unabhängig von
      lokalen Hooks greift.
- [ ] **[Information Disclosure – vernachlässigbar]** Die Meldung nennt Herkunft/Scope aus
      `git config --show-origin` (z. B. `file:/Users/<name>/.gitconfig`) und den absoluten
      `$GIT_COMMON_DIR`. Für die Remediation notwendig, kein sensibler Inhalt (Pfad/Benutzername,
      kein Secret); in CI-Logs ohnehin ubiquitär. Keine Änderung empfohlen.

---

## Security-Positiv (Wirkung dieses PRs)

Der PR schließt eine **Fail-open-Lücke in einem sicherheitsrelevanten Gate**: bislang meldete
`hooks-installed-check.sh` bei gesetztem `core.hooksPath` grün, wenn im Standardpfad noch
ausführbare Hook-Reste lagen – obwohl Git keinen einzigen Factory-Hook aufrief. Damit war
u. a. der Credential-Scan des `pre-commit`-Hooks (hartkodierte Credentials) still inaktiv,
während das Push-Gate Sicherheit signalisierte. Der neue Guard läuft mit Vorrang vor der
Präsenzprüfung und fail-closed, inklusive des Leerstring-Falls. Defense-in-depth-Ebene
(lokales Gate) verbessert; die verbindliche server-seitige Ebene (ADR-029) ist unberührt.

---

## Ergebnis

PASSED
