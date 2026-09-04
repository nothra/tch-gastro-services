# Spec: Session-Empfehlung nach start-work.sh auf den realen Normalfall ausrichten

## Kontext

`start-work.sh` wird in der Praxis fast immer bereits in einer frischen, noch task-freien
Claude-Session ausgeführt. Trotzdem endet die Skript-Ausgabe aktuell (Zeilen ~417–419) mit der
Empfehlung, für die Task **zusätzlich** eine neue Claude-Session zu öffnen – und zwar *bevor*
überhaupt `/requirements` gelaufen ist.

`docs/factory/guidelines/git-workflow.md` → „Eine Task = Eine Session" dokumentiert bereits eine
Ausnahme („start-work.sh und das anschließende `/requirements` … dürfen in derselben, noch
task-freien Session laufen"), aber:

- diese Ausnahme ist als **Sonderfall** formuliert, obwohl sie laut Issue-Beschreibung der
  **Regelfall** ist,
- die Skript-Ausgabe selbst spiegelt die Ausnahme nicht wider und widerspricht damit der
  Guideline,
- `CLAUDE.md` (Guardrails) übernimmt die unqualifizierte Formulierung,
- `docs/factory/OPERATING.md` → „Die zwei Phasen der Factory" (Abschnitt 1.1) muss auf Drift zur
  neuen Formulierung geprüft werden,
- bestehende Guards in `scripts/checks/tests/run-tests.sh` (u. a. #267 AK1–AK5, Zeilen ~2294–2320
  und ~5642–5699) prüfen den *aktuellen* Wortlaut und die aktuelle Trennung von Worktree-Fakt und
  Session-Empfehlung; sie müssen auf den neuen Wortlaut mitgezogen werden.

**Nicht Ziel dieser Task:** den eigenen Worktree je Task in Frage zu stellen – das bleibt die
technische Git-Sicherheitsmaßnahme (`docs/factory/guidelines/git-workflow.md` → „Parallele
Sessions: eigener Worktree (nicht verhandelbar)") und ist von diesem Issue ausdrücklich
unangetastet.

## Scope

**Inbegriffen:**
- `scripts/start-work.sh`: Abschluss-Ausgabe (aktuell Zeilen ~399–419) so umformulieren, dass
  - der Wechsel in den ausgegebenen Worktree **und** die direkte Fortsetzung mit
    `/requirements <id>` **in derselben Session** als Normalfall erscheinen (keine
    Session-Empfehlung an dieser Stelle mehr),
  - die Empfehlung „starte eine neue Claude-Session" beim **Implementierungsschritt**
    (`/implement <id>`, aktuell Schritt 2) steht – also am Übergang von Phase 1
    (Requirements/Architecture) zu Phase 2 (Umsetzung),
  - der bestehende Worktree-Fakt („kein geteilter HEAD" / parallele Sessions kollidieren nicht,
    #267 AK5) inhaltlich erhalten bleibt, aber nicht mehr an die jetzt entfallende
    Direkt-nach-start-work-Empfehlung gekoppelt ist.
- `docs/factory/guidelines/git-workflow.md` → „Eine Task = Eine Session": den bisherigen
  Ausnahme-Absatz vom Sonderfall zum dokumentierten Regelfall hochziehen (start-work.sh +
  `/requirements`, ggf. `/architecture`, in derselben, noch task-freien Session ist der erwartete
  Ablauf). Die Grenze („nicht die nächste Task in derselben Session beginnen") und die
  Worktree-Pflicht bleiben inhaltlich unverändert und weiterhin klar erkennbar getrennt.
- `CLAUDE.md` (Guardrails): Formulierung der Session-Empfehlungszeile an die aktualisierte
  Guideline anpassen; der Verweis auf `git-workflow.md` als kanonische Quelle bleibt bestehen.
- `docs/factory/OPERATING.md` → „Die zwei Phasen der Factory" (Abschnitt 1.1 und ggf. Abschnitt 2
  „Empfohlen: eine Task = eine Claude-Session"): auf Drift zur aktualisierten Formulierung prüfen
  und bei Bedarf angleichen.
- Bestehende Guards in `scripts/checks/tests/run-tests.sh`, die den bisherigen Wortlaut oder die
  bisherige Struktur der Skript-Ausgabe bzw. der Guideline-Prosa prüfen (insbesondere die
  #267-Guards), auf den neuen Wortlaut ausrichten – inkl. einer Mutationskontrolle, die die *alte*
  (jetzt überholte) Formulierung als Negativ-Fall erkennt.

**Nicht inbegriffen:**
- Der Worktree-Default (`FACTORY_NO_WORKTREE`) und die Worktree-Pflicht selbst bleiben
  unangetastet.
- Keine Änderung an den Skills `/requirements` oder `/implement` selbst (nur an der Doku/Ausgabe,
  die auf sie verweist).
- Kein neues technisches Gate, das eine Session-Trennung erzwingt – die Session-Empfehlung bleibt
  eine Empfehlung, kein Automatismus.

## Akzeptanzkriterien

- [ ] GIVEN `start-work.sh` ist im Worktree-Modus fertig gelaufen WHEN die Abschluss-Ausgabe
      angezeigt wird THEN wird der Wechsel in den Worktree gefolgt von `/requirements <id>` in
      derselben Session als der zu erwartende nächste Schritt dargestellt, ohne dass zuvor eine
      neue Claude-Session empfohlen wird.
- [ ] GIVEN dieselbe Abschluss-Ausgabe WHEN sie den Implementierungsschritt (`/implement <id>`)
      nennt THEN steht dort (bzw. unmittelbar daran anschließend) die Empfehlung, für den
      Implementierungsschritt eine neue Claude-Session zu öffnen – weiterhin klar als Empfehlung,
      nicht als Pflicht, gekennzeichnet.
- [ ] GIVEN der bisherige Worktree-Fakt („kein geteilter HEAD", #267 AK5) WHEN die Ausgabe
      geprüft wird THEN ist dieser Fakt weiterhin enthalten, aber nicht mehr in derselben
      Formulierung mit einer Sofort-Session-Empfehlung verknüpft.
- [ ] GIVEN `docs/factory/guidelines/git-workflow.md` → „Eine Task = Eine Session" WHEN der
      Abschnitt gelesen wird THEN ist der Ablauf „start-work.sh + `/requirements` (ggf.
      `/architecture`) in derselben, noch task-freien Session" als dokumentierter Regelfall
      formuliert (nicht mehr als abgegrenzte Ausnahme), während die Grenze („keine Folge-Task in
      derselben Session") und die Worktree-Pflicht unverändert und weiterhin klar von der
      Session-Empfehlung getrennt bestehen bleiben.
- [ ] GIVEN `CLAUDE.md` (Guardrails) WHEN die Session-Empfehlungszeile gelesen wird THEN ist sie
      konsistent mit der aktualisierten Formulierung in `git-workflow.md` und verweist weiterhin
      auf `git-workflow.md` als kanonische Quelle für Ausnahmen/Grenzen.
- [ ] GIVEN `docs/factory/OPERATING.md` → „Die zwei Phasen der Factory" (Abschnitt 1.1 und
      Abschnitt 2) WHEN die Beschreibung des Ablaufs start-work.sh → `/requirements` →
      `/implement` gelesen wird THEN gibt es keinen Widerspruch zur aktualisierten Formulierung in
      `git-workflow.md`/`start-work.sh` (Normalfall vs. Phasenübergang identisch beschrieben).
- [ ] GIVEN die bestehenden #267-Guards in `scripts/checks/tests/run-tests.sh`
      (Abschluss-Ausgabe-Trennung UND Doku-Prosa-Guards) WHEN die Wortlaut-Änderung umgesetzt ist
      THEN sind diese Guards auf den neuen Wortlaut angepasst und bestehen weiterhin (inkl.
      Mutationskontrolle gegen die jetzt überholte alte Formulierung als Negativ-Fall).
- [ ] GIVEN die Worktree-Pflicht („Parallele Sessions: eigener Worktree (nicht verhandelbar)")
      WHEN die gesamte Änderung umgesetzt ist THEN bleibt dieser Abschnitt inhaltlich und in der
      Überschrift unverändert (Negativ-Test: keine Aufweichung der Pflicht).

## Fehlerszenarien

- [ ] GIVEN `FACTORY_NO_WORKTREE=1` (kein Worktree-Modus) WHEN die Abschluss-Ausgabe von
      `start-work.sh` angezeigt wird THEN bleibt die Formulierung sinnvoll (kein Verweis auf einen
      Worktree-Wechsel, der nicht stattfindet) und die neue Platzierung der Session-Empfehlung
      beim Implementierungsschritt gilt unverändert.
- [ ] GIVEN ein Aufruf ohne PR-Erstellung (`PR_CREATED=0`, manueller PR-Hinweis) WHEN die
      Abschluss-Ausgabe zusammengesetzt wird THEN bleibt die Reihenfolge/Zuordnung der
      Session-Empfehlung zum Implementierungsschritt unabhängig davon bestehen.

## Offene Fragen

_Keine – Scope, betroffene Dateien und Abgrenzung sind durch das Issue #322 bereits präzise
vorgegeben._
