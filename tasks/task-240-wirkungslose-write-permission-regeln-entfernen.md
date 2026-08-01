# Task 240: wirkungslose-write-permission-regeln-entfernen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Entferne alle wirkungslosen `Write(...)`-Permission-Regeln aus `permissions.allow` und
`permissions.deny` in `.claude/settings.json`. Laut #224-Verhaltensprobe (`claude --print`,
CLI 2.1.218) wertet die installierte Claude-Code-Version `Write(pfad)`-Regeln gar nicht aus –
nur `Edit(pfad)` deckt Edit- und Write-Tool-Aufrufe ab. Die separate `Write(...)`-Liste ist
komplett wirkungslos (dead config), erzeugt aber bei jedem Stage-3-Lauf unnötige
stderr-Warnungen. Details, Scope und Akzeptanzkriterien:
[`docs/specs/spec-240-wirkungslose-write-permission-regeln-entfernen.md`](../docs/specs/spec-240-wirkungslose-write-permission-regeln-entfernen.md).

Lieferung zwingend über den Patch-Workflow (`.claude/**` ist hard denied für den Agenten,
#88-Grenze): `tasks/patch-240.diff`, programmatisch erzeugt, `git apply --check` verifiziert.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [~] AK1 – `Write(...)` ist aus `permissions.allow` entfernt (alle 18 Einträge) – als Patch
      geliefert (`tasks/patch-240.diff`), Mensch wendet an
- [~] AK2 – `Write(...)` ist aus `permissions.deny` entfernt (alle 3 Einträge) – als Patch
      geliefert, Mensch wendet an
- [x] AK3 – Kein Funktionsverlust: jeder entfernte `Write(pfad)`-Eintrag hat ein
      `Edit(pfad)`-Pendant in derselben Liste – 1:1-Abgleich vor Patch-Erzeugung verifiziert
      (keine fehlenden Pendants, siehe Blocker-Abschnitt)
- [~] AK4 – `settings.json` bleibt valides JSON mit unveränderter Grundstruktur
      (`hooks`/`permissions.allow`/`permissions.deny`) – im Patch-Ziel (`jq`-validiert),
      finale Bestätigung nach dem Anwenden
- [x] AK5 – Verhaltensprobe (`claude --print`, `FACTORY_STAGE=3`) bestätigt vor der Entfernung
      dieselbe „Write(<pfad>) is not matched"-Warnung wie in #224 (CLI jetzt 2.1.220,
      21 Warnzeilen, siehe Blocker-Abschnitt)
- [~] AK6 – Nach der Entfernung: kein neuer Permission-Prompt für zuvor per `Write(pfad)`
      "erlaubte" Pfade (Edit-Regel deckt weiterhin ab) – erst nach Anwenden des Patches prüfbar
- [x] AK7 – Regressionstest in `scripts/checks/tests/run-tests.sh` geändert (nicht nur ergänzt):
      prüft Abwesenheit von `Write(...)` (jq-geparst + Grep-Fallback), alte
      "Vorhandensein"-Assertions aus #91/#224 entfernt/ersetzt. RED bestätigt (13 Assertions rot
      gegen die noch nicht gepatchte Datei); GREEN-Logik gegen eine bereinigte Scratch-Kopie
      standalone verifiziert (siehe Blocker-Abschnitt) – finaler GREEN-Lauf nach Anwenden des
      Patches noch ausstehend.
- [x] AK8 – Stale Prosa in `docs/factory/lessons/factory-workflow.md` (#224-Abschnitt)
      korrigiert: Präsens-Aussage zur "existierenden" Write-Liste + "Cleanup-Kandidat: Issue
      #240"-Verweis auf erledigt aktualisiert

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Blocker

Blocker [2026-08-01]: Die Fachänderung liegt in `.claude/settings.json`, das für den Agenten
hard denied ist (`Edit(.claude/**)`/`Write(.claude/**)`, #88-Grenze). Lieferung als
`tasks/patch-240.diff` – programmatisch per `jq` erzeugt (nicht von Hand getippt, aus #94),
Pfad-Header über `git diff --no-index --no-prefix` + Sed-Korrektur auf `a/.claude/settings.json`
/ `b/.claude/settings.json` gesetzt, read-only mit `git apply --check tasks/patch-240.diff`
verifiziert (Ergebnis: „APPLY-CHECK OK", zweimal geprüft – gegen die Scratch-Kopie und erneut
gegen die im Branch committete Patch-Datei).

**Was der Mensch tun muss:** `git apply tasks/patch-240.diff` im Worktree ausführen (danach
`tasks/patch-240.diff` entfernen und die `[~]`-Checkboxen oben auf `[x]` setzen, aus #145/#212 –
kein totes Patch-Artefakt vor dem Merge).

**1:1-Edit-Pendant-Abgleich (AK3), vor Patch-Erzeugung durchgeführt:** Für jeden der 18
`Write(...)`-Einträge in `allow` und der 3 in `deny` wurde per `jq` verifiziert, dass ein
identischer `Edit(pfad)`-Eintrag in derselben Liste existiert (`comm -23` gegen die erwartete
vs. tatsächliche Edit-Menge – beide Ausgaben leer). Kein Funktionsverlust.

**`claude --print`-Verhaltensprobe (AK5), durchgeführt 2026-08-01 vor der Entfernung:**
`FACTORY_STAGE=3 claude --print "Hänge in docs/routes.md die Zeile '<!-- probe-240 -->' an ..." --max-turns 3`
im Worktree gegen die **unveränderte** `.claude/settings.json`. Ergebnis: `docs/routes.md`
wurde tatsächlich geändert (MD5 vorher `8ac445a1…`, nachher `98566e47…`, danach mit
`git checkout -- docs/routes.md` zurückgesetzt) – kein Permission-Prompt für die `Edit`-Regel.
Das Log enthielt **21** Zeilen der Form „Write(<pfad>) is not matched by file permission checks
— only Edit(path) rules are …" (18 aus `allow` + 3 aus `deny`) – identisch zum #224-Befund auf
CLI 2.1.218, jetzt bestätigt auf CLI 2.1.220. Damit ist belegt: Die Entfernung der
`Write(...)`-Einträge verändert das reale Permission-Verhalten **nicht**.

**Regressionstest (AK7), RED→GREEN-Beleg ohne Zugriff auf die hard-denied Live-Datei:** Die
angepassten Assertions in `run-tests.sh` wurden zweifach verifiziert: (1) voller Testlauf gegen
die **unveränderte** `.claude/settings.json` → 546 grün, 13 rot – exakt die erwarteten neuen
„Write(...) darf nicht mehr vorkommen"-Assertions (kein unerwarteter Kollateralschaden an den
übrigen 546). (2) Dieselbe `jq`-/`grep`-Logik standalone gegen eine bereinigte Scratch-Kopie von
`settings.json` (nicht die Live-Datei) ausgeführt → alle Prüfungen liefern das erwartete
GREEN-Ergebnis. Der finale Lauf gegen die tatsächlich gepatchte Live-Datei steht nach dem
`git apply` durch den Menschen noch aus (erwartet: 559 grün, 0 rot).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Reicht die schlanke Bestätigungsprobe (AK5) oder ist eine vollständige Neuaufnahme der
      `claude --print`-Verhaltensdokumentation wie in #224 erwartet? Geklärt: schlanke Probe
      durchgeführt (siehe Blocker-Abschnitt) und ausreichend – bestätigt exakt den #224-Befund
      auf CLI 2.1.220 (21 identische Warnzeilen), kein abweichendes Verhalten.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/240-wirkungslose-write-permission-regeln-entfernen`
Erstellt: 2026-08-01 14:55
