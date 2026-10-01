## Codify-Report: Task 369

Task: Veranstaltung-Detailseite neu ordnen (Kacheln, ein „+ Teilnehmer"-Dialog, Zeilenmenü, Dialog-
Bausteine). Pipeline-Verlauf: `/implement` 2× Turn-Limit, Rework 1× Turn-Limit, `/review` 3 Iterationen
(7 wichtige → 1 wichtiges → APPROVED), Abbruch an der Stale-Verdict-Wache, manueller Fortsatz bis
`/security-review` (PASSED).

### Neue Regeln hinzugefügt
- `docs/factory/lessons/frontend-react.md` + Index – **`setState` am Anfang einer Form-Action wird erst
  mit ihrem Ende sichtbar**: „läuft gerade" aus `onSubmit` melden, Ende im `finally`; Test nur mit nie
  auflösendem Promise aussagekräftig. Wegen: erster Wurf der Dialog-Sperre blieb rot (/implement-Selbstfund).
- `docs/factory/lessons/frontend-react.md` + Index – **Verhaltensvertrag eines geteilten Bausteins in den
  Baustein legen**, alle Konsumenten prüfen. Wegen: Escape-vs-`pending` in Iteration 1 nur am `ConfirmDialog`
  gefixt, der schwerere Geschwister-Defekt blieb eine Review-Iteration länger stehen.
- `docs/factory/lessons/testing.md` + Index – **Nicht diskriminierendes Test-Double** (jsdom-`SVGElement` hat
  ein wirkungsloses `focus()`) und **Mutationsbeleg in drei Schritten**; BSD-`sed -i` ohne Suffix scheitert
  still und ließ einen grünen Lauf wie Beleg aussehen. Wegen: Review-Iteration-3-Nitpick + eigener Fehlversuch.
- `docs/factory/lessons/factory-workflow.md` + Index – **Turn-Limit, fünftes Vorkommnis** (sehr großer Task,
  auch der Rework reißt das Budget, Abbruch an der Stale-Verdict-Wache; Faustwerte > 25 AK / > 40 Dateien
  → Task teilen oder manuell fahren) inkl. Klarstellung, dass der „Merge branch 'main' into …"-Commit von
  `gh pr update-branch` gewollt ist (ADR-019 §1) und nicht bereinigt werden muss.
- `docs/factory/lessons/factory-workflow.md` + Index – **Aussagen über den eigenen PR-Beitrag in
  `kleinfunde.md`** gegen `git diff --stat`/`git cat-file -e origin/main:<pfad>` belegen (Familie #291/#351).
- `docs/factory/lessons/build-tooling.md` + Index-Ergänzung – Rezidiv „`next dev` schreibt Agent-Rules-Block in
  `CLAUDE.md`": der Block rät selbst zum Mitcommitten, die Lesson gilt.

### Keine Änderungen nötig
- `CLAUDE.md`, Guidelines und `scripts/checks/`: keine neue universelle Regel und kein automatisierbarer
  Fehler, der nicht schon durch Gate/Hook abgedeckt wäre. Der @import-Dauerkontext bleibt unter der Grenze
  (912 von 1100 Zeilen).
- Review-/Security-Funde ohne Lernwert über die Einträge oben hinaus (ADR-053-Drift, Namenskonstante,
  Kommentar-Position) sind Einmalfunde und im Code behoben.

### Folge-Arbeit (außerhalb des Scopes)
- **#385** `hasSqlState` im Katalog prüft `cause` nicht, **#386** „Entfernen" löscht Verzehr ohne Warnung
  (beide aus `/review` Iteration 1), **#387** Status-Prüfung und Schreibzugriff sind nicht atomar (aus
  `/security-review`).
- `docs/factory/kleinfunde.md`: „Neuer Gast" baut `TeilnehmerFields` nach; Anleitungs-Screenshots `05`–`07`;
  E2E-Helfer `login`/`createVeranstaltung` in drei Specs kopiert.

### Empfehlung für nächste Features
- Sehr große Tasks (> 25 AK) vor dem Pipeline-Start teilen oder `/implement` und Rework manuell in frischen
  Sessions fahren; die Telemetrie fehlt für manuelle Stage-2-Fortsetzungen.
- Geteilte UI-Bausteine mit Verhaltensvertrag (Dialog) früh gegen **alle** geplanten Konsumenten testen –
  #372 bringt vier weitere Dialoge auf denselben Baustein.
- Offen aus dem Review, bewusst nicht umgesetzt: CloseWatcher-Härtung im `Dialog` (vorher im Browser prüfen)
  und ein Fokus-Ersatzziel nach „Entfernen".
