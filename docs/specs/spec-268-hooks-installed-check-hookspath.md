# Spec: core.hooksPath-Erkennung in hooks-installed-check.sh (Fail-closed)

## Kontext

Aus /review zu #265 (Runde 1, Logik-Finding), Issue #268.

`scripts/checks/hooks-installed-check.sh` prüft bislang ausschließlich Präsenz +
Ausführbarkeit der drei Factory-Hooks im gemeinsamen Git-Verzeichnis
(`$GIT_COMMON_DIR/hooks`) — bewusst ohne Sonderbehandlung von `core.hooksPath`
(spec-265 „Nicht inbegriffen"). Die dortige Begründung: ein gesetztes
`core.hooksPath` führe automatisch dazu, dass die Hooks im Standardpfad fehlen und
der Check sie korrekt als „fehlend" werte.

Diese Annahme ist **falsch**, wenn im Standardpfad noch ausführbare Datei-Reste
liegen (z. B. von einem Retrofit **vor** dem Setzen von `core.hooksPath`, oder von
einem versehentlichen zweiten `install-hooks.sh`-Lauf). Verifiziert (Issue-Body):

```
git config core.hooksPath .husky
# .git/hooks/{pre-commit,pre-push,commit-msg} existieren noch und sind ausführbar
FACTORY_DIR="$(pwd)" bash scripts/checks/hooks-installed-check.sh
# → ✓ Alle Factory-Git-Hooks … installiert und ausführbar (exit 0) — FALSCH-POSITIV
```

Git ruft diese Dateien wegen `core.hooksPath` aber **nie** auf — der Check meldet
fälschlich grün, obwohl kein Factory-Hook tatsächlich aktiv ist. Der Push-Gate-Check
ist damit im Kernszenario, das er absichern soll, wirkungslos. `install-hooks.sh`
behandelt exakt dieses Szenario bereits fail-closed (ADR-042, `[ -n
"$HOOKS_PATH_CONFIG" ]`-Guard); `hooks-installed-check.sh` muss dieselbe Lücke
schließen.

## Scope

**Inbegriffen:**
- `hooks-installed-check.sh` prüft zusätzlich zur bestehenden Präsenz+Ausführbarkeits-
  Prüfung, ob `core.hooksPath` gesetzt ist (`git config --get core.hooksPath`, liefert
  bereits den über alle Scopes effektiven Wert — kein eigenes Multi-Scope-Handling
  nötig).
- Ist `core.hooksPath` gesetzt (nicht leer), bricht der Check fail-closed ab
  (Exit ≠ 0) — **unabhängig davon**, ob im Standardpfad (`$GIT_COMMON_DIR/hooks`)
  noch Dateien liegen und unabhängig von deren Ausführbarkeit. Diese Prüfung hat
  Vorrang vor der bestehenden Präsenzprüfung.
- Fehlermeldung nennt den konfigurierten Pfad **und** den Scope/die Herkunft
  (lokal/global/system, via `git config --show-origin`) sowie einen
  Remediation-Hinweis (`core.hooksPath` entfernen ODER die Factory-Checks in das
  genannte Verzeichnis einbinden) — konsistent zur bestehenden Meldung in
  `install-hooks.sh`.
- Bestehende Präsenz+Ausführbarkeits-Prüfung (spec-265) bleibt für den Fall
  „`core.hooksPath` nicht gesetzt" unverändert.
- Skript-Header-Kommentar aktualisieren: der bisherige Satz „Kein Inhaltsvergleich…
  (bewusst, siehe spec-265 „Nicht inbegriffen")" beschreibt eine inzwischen
  überholte Entscheidung bzgl. `core.hooksPath` und muss die neue Sonderbehandlung
  nennen (Lesson „falscher WHY-Kommentar/überholte Kausalkette").
- `spec-265` im selben PR auf den jetzt korrigierten Stand bringen: Abschnitt
  „Nicht inbegriffen" nennt dort noch die jetzt falsifizierte Annahme zu
  `core.hooksPath` — Prosa an dieser Stelle korrigieren/auf spec-268 verweisen
  (Lesson factory-workflow.md: Spec-Drift bei geänderter Mechanik im selben PR
  nachziehen).

**Nicht inbegriffen:**
- Keine Änderung an `install-hooks.sh` selbst — dessen `core.hooksPath`-Fail-closed-
  Verhalten ist bereits korrekt (ADR-042) und dient als Vorbild.
- Weiterhin kein Inhaltsvergleich der Hook-Dateien gegen den kanonischen Stand
  (nur Präsenz + Ausführbarkeit + jetzt `core.hooksPath`) — unverändert aus
  spec-265, vermeidet eine zweite synchron zu haltende Stelle.
- Keine automatische Bereinigung/Löschung veralteter Datei-Reste in `.git/hooks` —
  der Check meldet nur, er repariert nicht automatisch (unverändert aus spec-265).
- Keine Anpassung der generischen Banner-Zeile in `pre-push.sh` („Git-Hooks fehlen
  oder sind nicht ausführbar – push blockiert"): Die Detailmeldung des Checks wird
  darunter ohnehin ausgegeben (`sed 's/^/     /'`); eine Verallgemeinerung dieser
  Banner-Formulierung ist optional und nicht Teil dieser Task.

## Akzeptanzkriterien

- [ ] GIVEN `core.hooksPath` ist **nicht** gesetzt UND alle drei Hooks sind im
      gemeinsamen `.git/hooks` vorhanden+ausführbar WHEN `hooks-installed-check.sh`
      läuft THEN meldet der Check weiterhin Erfolg (Exit 0) — bestehendes Verhalten
      (spec-265 AK1) bleibt unverändert.
- [ ] GIVEN `core.hooksPath` ist gesetzt (z. B. auf `.husky`) UND im gemeinsamen
      `.git/hooks` liegen noch ausführbare Reste aller drei Factory-Hooks
      (Kernszenario des Issues) WHEN `hooks-installed-check.sh` läuft THEN bricht
      der Check fail-closed ab (Exit ≠ 0) statt Erfolg zu melden.
- [ ] GIVEN `core.hooksPath` ist gesetzt UND im gemeinsamen `.git/hooks` fehlen die
      Hooks vollständig WHEN der Check läuft THEN bricht er ebenfalls fail-closed
      ab — die `core.hooksPath`-Prüfung greift unabhängig vom Dateizustand im
      Standardpfad.
- [ ] GIVEN `core.hooksPath` ist gesetzt WHEN der Check deswegen fehlschlägt THEN
      nennt die Fehlermeldung den konfigurierten Pfad, den Scope/die Herkunft
      (lokal/global/system) und einen Remediation-Hinweis.
- [ ] GIVEN der Check läuft aus einem beliebigen Git-Worktree dieses Repos WHEN er
      `core.hooksPath` prüft THEN liest er denselben effektiven Wert wie
      `install-hooks.sh` (keine worktree-lokale Abweichung).

## Fehlerszenarien

- [ ] `git config --get core.hooksPath` liefert keinen Wert, weil kein
      Git-Repository vorliegt → bestehendes Fail-closed-Verhalten (spec-265
      Fehlerszenario „kein Git-Repository") hat Vorrang, unverändert.
- [x] ~~`core.hooksPath` ist auf einen leeren String gesetzt → wird wie „nicht
      gesetzt" behandelt (siehe Offene Frage — Vorbild `install-hooks.sh`).~~
      **Korrektur (Rework nach Review-Finding, empirisch mit git 2.51 verifiziert):**
      Diese Annahme war falsch. `core.hooksPath=""` verhält sich NICHT wie „nicht
      gesetzt" – Git löst den Hook-Pfad dann auf das Arbeitsverzeichnis auf und ruft
      `$GIT_COMMON_DIR/hooks` nicht mehr auf (`git rev-parse --git-path hooks` liefert
      `./` statt `.git/hooks`; ein Test-Hook lief in der Probe nachweislich nicht mehr).
      Ein Leerstring wird daher ebenfalls fail-closed behandelt – bewusste Abweichung
      vom Vorbild `install-hooks.sh`, das denselben Blindspot noch hat (Follow-up,
      s. ADR-042 §Consequences).

## Offene Fragen

- [ ] Exit-Code bei `core.hooksPath`-Fail-closed: eigener Code (analog
      `install-hooks.sh` Exit 2) oder Exit 1 wie die bestehenden Präsenz-Fails?
      `pre-push.sh` wertet ohnehin nur Exit 0 vs. ≠ 0 aus (kein
      Verhaltensunterschied nach außen) — Implementierungsdetail, kann in
      `/implement` entschieden werden.
- [ ] Verhalten bei leerem `core.hooksPath`-Wert (`git config core.hooksPath ""`):
      Implementierungsdetail, Vorbild ist der `[ -n "$HOOKS_PATH_CONFIG" ]`-Guard
      in `install-hooks.sh`, der einen Leerstring bereits als „nicht gesetzt"
      behandelt — dieselbe Guard-Logik in `hooks-installed-check.sh` übernehmen.
