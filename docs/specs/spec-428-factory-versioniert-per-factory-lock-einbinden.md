# Spec: Factory versioniert per `factory.lock` einbinden (T2a)

> **Detail-Spec zu T2** des Epics #424 ([spec-424](spec-424-factory-in-eigenes-repo-auslagern.md)).
> Der AK-Volltext von AK2.1–AK2.13 und F1–F4/F7/F8 steht dort; hier steht er **verfeinert auf den
> Ist-Stand nach T1b** (v0.6.0 ist veröffentlicht) und um die Bootstrap-Fälle ergänzt, die das Epic
> nicht kannte. Technische Grundlage: [ADR-063](../factory/adr/063-factory-eigenes-repo-vendored-manifest.md)
> D1, D2, D4, D7, D10 und Nachträge. Verfeinerung, kein Widerspruch zur Epic-Spec.

> **Schnitt (2026-10-24, zweimal; ADR-063 Nachtrag „Zweiter Schnitt von T2a"):** T2 ist in **T2a** und
> **T2b** ([#441](https://github.com/nothra/tch-gastro-services/issues/441)) geteilt; T2a wiederum in vier
> nacheinander laufende Tasks, die diese Spec als **gemeinsame Kriterien-Quelle** teilen:
>
> | Task | Repo | Kriterien |
> |---|---|---|
> | T2a-1 Konsumenten-Vertrag | dev-factory [#22](https://github.com/nothra/dev-factory/issues/22) | AK2.15a–c, AK2.16a–b |
> | T2a-2 Abholen, Manifest, Gate | dev-factory [#23](https://github.com/nothra/dev-factory/issues/23) | AK2.1a–c, 2.2a–c, 2.3, 2.3b, 2.5a–d, 2.6, 2.8, F2, F4, F7, FS-T2.1/.2/.4 |
> | T2a-3 Update-PR | dev-factory [#24](https://github.com/nothra/dev-factory/issues/24) | AK2.2d, 2.4, 2.4b, F1, F3, FS-T2.3 |
> | **T2a-4 Erst-Einbindung = diese Task (#428)** | TCH | AK2.14a–c, AK2.15d, AKE.1, AKE.2 |
>
> **In #428 umgesetzt werden nur die Kriterien der Zeile T2a-4.** Alle anderen stehen hier unverändert
> als Quelle für die Factory-Tasks und werden dort in deren eigene Specs übernommen. T2b (AK2.7,
> AK2.9–AK2.13, F8, #441) bleibt zurückgestellt. Messbasis ist ab jetzt `v0.6.1`.

## Kontext

Seit T1a (#426, #431, #432) ist die Trennlinie gezogen (`docs/factory/OWNERSHIP.md`, 111 Dateien auf
Seite `factory`), seit T1b (#427, #436) liegt die Factory mit Historie als öffentliches Repo
`nothra/dev-factory`; `v0.6.0` ist veröffentlicht, das Release trägt das Asset `factory-release.json`.
TCH führt die Factory-Dateien aber weiterhin als **eigene Dateien**: es gibt kein `factory.lock`, kein
Werkzeug zum Abholen einer Version, kein Gate gegen lokale Änderungen und keinen Weg, Factory-Funde
ins Factory-Repo zu geben. Ein Fix an einer Factory-Datei in TCH würde heute unbemerkt vom
Factory-Repo wegdriften – das Epic-Ziel („wiederverwendbares Werkzeug") ist erst mit T2 erreicht.

**Warum jetzt:** T3 (Issues, ADRs, Lessons umziehen, Label-Wechsel) setzt voraus, dass TCH die Factory
nur noch als versionierte Kopie führt (AK3.5 greift auf AK2.5).

## Scope

**Inbegriffen:**
- **Manifest** `factory.lock` im TCH-Repo (einzige Stelle der eingebundenen Version) und
  **Abhol-Werkzeug** für eine Version (atomar, Anpassungsstellen unberührt).
- **Update-Workflow:** neue Factory-Version → ein Update-PR im TCH-Repo, nie automatisch gemergt.
- **Änderungs-Gate** gegen lokale Änderungen/Löschungen übernommener Dateien: lokal (offline) und
  in CI als Required Check `factory-integrity`.
- **Fund-Ablage ins Factory-Repo:** Seam-Erweiterung für Issues im Factory-Repo (Funde oberhalb
  und unterhalb der Issue-Schwelle, generische Learnings) samt Fallback in die Task-Datei;
  Labels `kleinfund` und `lesson-vorschlag` im Factory-Repo.
- **Neues Projekt aufsetzen:** `--init`-Modus des Abhol-Werkzeugs, Vorlagen der Anpassungsstellen,
  Anleitung und wiederholbarer Nachweis (Self-Test + einmal echt).
- **Erst-Einbindung:** TCH wechselt von „eigene Dateien" auf „eingebundene Version laut `factory.lock`".

**Nicht inbegriffen:**
- Umzug offener Issues, Factory-ADRs, Factory-Lessons, Label-Wechsel (`factory-pipeline` →
  `build-pipeline`), Verweis-Check – das ist **T3 (#429)**.
- Inhaltliche Weiterentwicklung der Factory (neue Skills/Gates/Verhalten) – nur was Versionierung,
  Update, Änderungs-Gate und Fund-Ablage neu brauchen.
- Auto-Merge von Update-PRs; Push-Modell; Plugin-Verteilung; andere Plattformen als GitHub.
- Änderungen an der TCH-App (`app/`, `db/`, `lib/`) und an TCH-Deploy-Abläufen.
- Ein zweites echtes Konsumenten-Projekt außer dem Nachweis-Wegwerf-Repo.
- Release-Prozess im Factory-Repo (steht seit T1b; T2 nutzt ihn nur).

## Akzeptanzkriterien

> Nummerierung folgt dem Epic (AK2.x); Unterpunkte (`a`/`b`) trennen prüfbare Teile. Die Spalte
> „Beleg" nennt, womit der AK im Test nachgewiesen wird.

### Einbindung und Version

- [ ] **AK2.1a** GIVEN TCH nach T2 WHEN man `factory.lock` liest THEN nennt es Quell-Repo, genau eine
  Version (Tag), den Commit-SHA und je übernommener Datei Pfad + SHA-256; keine zweite Stelle im Repo
  trägt eine Versionsangabe, die davon abweichen könnte (die Versionszeile in `FACTORY.md` ist selbst
  eine übernommene Datei und stimmt mit dem Tag überein). *Beleg: Test liest Lock + `FACTORY.md`.*
- [ ] **AK2.1b** GIVEN `factory.lock` WHEN das Gate läuft THEN entspricht jede übernommene Datei im
  Arbeitsbaum Byte für Byte dem eingetragenen Hash, und die Menge der Manifest-Pfade ist genau die
  Menge, die das Release-Manifest der Version für Seite `factory` nennt. *Beleg: Test + Gegenprobe
  (Datei ergänzt/entfernt).*
- [ ] **AK2.1c** GIVEN `docs/factory/OWNERSHIP.md` und `factory.lock` WHEN beide gelesen werden THEN
  widersprechen sie sich nicht: jeder Pfad im Lock trifft ein `factory`-Muster, und kein Pfad der
  Seite `project` steht im Lock (Besitz ist eindeutig, ADR-063 D3).

### Abholen (Sync)

- [ ] **AK2.2a** GIVEN eine veröffentlichte Version WHEN man das Abhol-Werkzeug mit ihr aufruft THEN
  lädt es **den Tag** aus dem Factory-Repo (öffentlich, ohne Token), prüft jede Datei gegen das
  Release-Manifest und schreibt `factory.lock` neu.
- [ ] **AK2.2b** GIVEN der Lauf bricht an irgendeiner Stelle ab (Netz, Hash-Abweichung, Schreibfehler)
  WHEN man den Arbeitsbaum ansieht THEN ist **nichts** verändert – weder übernommene Dateien noch
  `factory.lock` (keine halbe Aktualisierung; F4). *Beleg: Test bricht die Messung (Stub), nicht nur
  den Input – Lesson aus #319.*
- [ ] **AK2.2c** GIVEN eine Datei entfällt in der neuen Version WHEN abgeholt wird THEN wird sie im
  Projekt-Repo gelöscht; GIVEN eine neue kommt hinzu THEN wird sie angelegt.
- [ ] **AK2.3** GIVEN ein Abhol-Lauf oder Update-PR WHEN man die geänderten Dateien ansieht THEN ist
  keine Anpassungsstelle darunter (`CLAUDE.md`, `factory.config.yml`, `docs/factory/PROJECT-CONTEXT.md`,
  `.claude/settings.project.json`, `.gitignore.project`, `scripts/project/**`, `docs/project/**`,
  `docs/adr/**`, `docs/specs/**`, `tasks/**`, projekteigene Workflows, App-Code).
  *Beleg: Fixture mit allen Stellen; Hashes vor/nach gleich. Gegenprobe: ein Release-Manifest, das
  eine Anpassungsstelle liefern würde, wird **abgelehnt**, nicht überschrieben.*
- [ ] **AK2.3b** GIVEN die zusammengesetzten Dateien (`.claude/settings.json`, `.gitignore`) WHEN
  abgeholt wird THEN werden sie aus den dann aktuellen Fragmenten neu zusammengesetzt (bestehender
  Modus `--compose`), und der Lauf endet nur grün, wenn das Ergebnis den Fragmenten entspricht.

### Update-PR

- [ ] **AK2.2d** GIVEN `factory.lock` nennt Version N WHEN Version N+1 veröffentlicht ist und der
  Update-Workflow läuft (täglich + manuell auslösbar) THEN entsteht ohne menschliches Zutun ein
  PR, der Version, Dateien und Lock auf N+1 hebt und die Release Notes von N+1 im Body zeigt.
- [ ] **AK2.4** GIVEN ein Update-PR WHEN CI läuft THEN laufen dieselben Gates wie bei jedem PR (der
  PR wird mit einem Token erstellt, der `pull_request`-Workflows auslöst); der Update-PR wird nie
  automatisch gemergt, der Workflow aktiviert kein Auto-Merge.
- [ ] **AK2.4b** GIVEN der Workflow findet keine neuere Version, oder die neueste ist schon
  eingebunden WHEN er läuft THEN bleibt alles unverändert, kein PR, Lauf grün.
- [ ] **F3 (AK)** GIVEN mehrere Versionen erscheinen, bevor ein Update-PR gemergt ist WHEN der Workflow
  mehrfach läuft THEN gibt es höchstens **einen** offenen Update-PR, und er zeigt auf die neueste
  Version (fester Branch, wird neu aufgebaut).

### Änderungs-Gate

- [ ] **AK2.5a** GIVEN eine übernommene Datei wird lokal geändert **oder gelöscht** (F7) WHEN
  committet/gepusht wird THEN lehnt das lokale Gate ab (offline), nennt die Datei und den Hinweis
  „Änderung gehört nach `nothra/dev-factory`".
- [ ] **AK2.5b** GIVEN dieselbe Änderung kommt per PR (Hook umgangen, `--no-verify`) WHEN CI läuft
  THEN schlägt der Required Check `factory-integrity` fehl. Er greift auch, wenn **Datei und
  Hash im Lock gemeinsam** geändert wurden, weil das Lock gegen das Release-Manifest des
  eingetragenen Tags im Factory-Repo geprüft wird. *Beleg: Test mit gestubtem Factory-Repo-Zugriff +
  Mutationsbeleg (Check weglassen → Test rot).*
- [ ] **AK2.6** GIVEN ein Update-PR WHEN das Gate läuft THEN besteht er beide Stufen (Version, Hashes und
  Dateien sind konsistent auf einen echten Tag gehoben); das Update wird nicht als „lokale Änderung"
  abgelehnt.
- [ ] **F2 (AK)** GIVEN ein Update-PR kollidiert mit einer verbotenen lokalen Änderung WHEN abgeholt
  wird THEN meldet das Werkzeug die Datei und bricht ab: kein stilles Überschreiben, kein stilles
  Behalten.
- [ ] **AK2.5c** GIVEN das Gate läuft im **Factory-Repo selbst** (kein `factory.lock`) WHEN es
  aufgerufen wird THEN ist es ein No-op mit Hinweis, kein Fehler.
- [ ] **AK2.5d** GIVEN das Factory-Repo ist für die CI-Stufe nicht erreichbar WHEN `factory-integrity`
  läuft THEN schlägt er **fail-closed** fehl (nicht still grün), mit klarer Meldung; die lokale
  Stufe bleibt offline nutzbar.

### Offline-Betrieb

- [ ] **AK2.8** GIVEN das Factory-Repo ist nicht erreichbar WHEN im Projekt-Repo entwickelt, getestet
  und die Pipeline gefahren wird THEN funktioniert alles wie gewohnt; nur Abholen, Update-PR und die
  CI-Stufe des Gates sind betroffen (F4: klarer Fehler im Update-Lauf, nichts halb aktualisiert).

### Factory-Funde aus Projekt-Arbeit — **T2b (#441)**

- [ ] **AK2.9** GIVEN ein Skill findet einen Fund oberhalb der Issue-Schwelle (ADR-043), der eine
  Datei aus `factory.lock` betrifft WHEN er ihn ablegt THEN entsteht das Issue im **Factory-Repo**
  (nicht in TCH), mit vorangestelltem Herkunftsblock (Projekt-Slug, Task-ID, PR-Link); die Task-Datei
  in TCH verweist auf das Factory-Issue.
- [ ] **AK2.10** GIVEN ein Fund unterhalb der Schwelle WHEN er abgelegt wird THEN landet er als Issue
  mit Label `kleinfund` im Factory-Repo und nie in einer übernommenen Datei des Projekt-Repos
  (kein `kleinfunde.md`-Schreibweg von außen); Funde zu Projekt-Dateien bleiben in
  `docs/project/kleinfunde.md`.
- [ ] **AK2.11** GIVEN `/codify` extrahiert ein Learning, das die Factory betrifft (Pipeline, Skills,
  Gates, generische Guidelines) WHEN es abgelegt wird THEN entsteht ein Issue mit Label
  `lesson-vorschlag` im Factory-Repo; ein projektspezifisches Learning bleibt in
  `docs/project/lessons/`.
- [ ] **AK2.12** GIVEN ein Fund WHEN ein Skill „Factory oder Projekt" entscheidet THEN folgt er der
  dokumentierten Regel: Datei steht im `factory.lock` → Factory; Pipeline-/Skill-Verhalten ohne
  Dateibezug → im Zweifel Factory; sonst Projekt. Die Regel steht an **einer** Stelle, auf die alle
  fünf Skills (`/review`, `/security-review`, `/test`, `/refactor`, `/codify`) verweisen.
- [ ] **AK2.13a** GIVEN ein Fund wird übertragen WHEN der Body Treffer der Credential-Heuristik von
  `pre-commit.sh` enthält THEN wird die Anlage **abgelehnt**, nichts wird gesendet.
- [ ] **AK2.13b** GIVEN dasselbe WHEN der Body personenbezogene Daten (E-Mail-Adresse) oder
  Inhalte aus Projekt-Env-Dateien enthält THEN gilt dasselbe wie in AK2.13a.
- [ ] **F8 (AK)** GIVEN das Factory-Issue lässt sich nicht anlegen (nicht erreichbar, keine
  Berechtigung, Stage-3-Lauf) WHEN der Skill den Fund ablegt THEN steht der Fund mit Warnung im
  Abschnitt „Factory-Funde (nicht übertragen)" der Task-Datei, **Exit 0** mit leerem stdout; der
  Lauf bricht daran nicht ab.

### Neues Projekt aufsetzen — **T2b (#441)**

- [ ] **AK2.7a** GIVEN ein leeres neues Git-Repo WHEN man es nach `docs/factory/NEW-PROJECT.md`
  mit dem `--init`-Modus aufsetzt THEN hat es eine eingebundene Version samt `factory.lock`, installierte
  Hooks (`install-hooks.sh`), Vorlagen der Anpassungsstellen und sonst nichts aus TCH.
- [ ] **AK2.7b** GIVEN dieses Repo WHEN `start-work.sh` und die Gates laufen THEN sind sie grün
  (Selbst-Test **offline** gegen ein Temp-Repo mit Fixture-Release).
- [ ] **AK2.7c** GIVEN der echte Nachweis WHEN er einmal gegen ein Wegwerf-Repo und die echte
  Version läuft THEN steht Anleitung **und** Ergebnis (Version, Befehle, grün/rot) im T2-PR; das
  Wegwerf-Repo ist danach gelöscht.
- [ ] **AK2.7d** GIVEN `--init` wird in einem Repo aufgerufen, das schon eine Factory-Version trägt
  (oder nicht leer ist) THEN bricht es ab und ändert nichts (kein Überschreiben fremder Arbeit).

### Erst-Einbindung (neu, nicht im Epic)

- [ ] **AK2.14a** GIVEN TCH heute (eigene Dateien, kein Lock) WHEN T2 gemergt ist THEN existiert
  `factory.lock`, `main` besteht alle Gates inkl. `factory-integrity`, und **jede** Datei der
  Seite `factory` ist durch das Lock gedeckt (AK2.1c).
- [ ] **AK2.14b** GIVEN die TCH-Fassung weicht von der Fassung im Factory-Repo ab (Bereinigung in T1b)
  WHEN die Erst-Einbindung läuft THEN ist **jede Abweichung entweder** Teil der eingebundenen Version
  **oder** als „gehört nach `nothra/dev-factory`" ins Factory-Repo gegeben – es gibt keinen
  stillen Verlust und keine neue stille Abweichung. Das Ergebnis ist im PR dokumentiert
  (Dateiliste Vorher/Nachher).
- [ ] **AK2.14c** GIVEN `protect-main` WHEN T2 abgeschlossen ist THEN führt das Ruleset
  `factory-integrity` als Required Check; die bisherigen Check-Namen sind unverändert
  (Nachtrag in ADR-029).

### Konsumenten-Vertrag (neu, ADR-063 Nachtrag Q7/Q8)

- [ ] **AK2.15a** GIVEN ein Repo mit `factory.lock` WHEN `ownership-check.sh` läuft THEN gilt als Seite
  `factory` genau die Pfadmenge des Locks, der Rest als Projekt; der Check braucht keine
  `docs/factory/OWNERSHIP.md` und ist grün, ohne dass das Projekt eine Zuordnungstabelle pflegt.
- [ ] **AK2.15b** GIVEN dasselbe WHEN ein Lock-Pfad nicht existiert oder ein Pfad einer Anpassungsstelle
  im Lock steht THEN schlägt der Check fehl und nennt den Pfad.
- [ ] **AK2.15c** GIVEN das Factory-Repo (kein Lock) WHEN der Check läuft THEN gilt weiter die Tabelle
  `OWNERSHIP.md` wie bisher (Quelle, Modus bleibt).
- [ ] **AK2.15d** GIVEN die Erst-Einbindung WHEN sie abgeschlossen ist THEN ist TCHs `OWNERSHIP.md`
  entfernt und kein Skill-/Doku-Text verweist mehr darauf als Quelle der Zuordnung (Verweis zeigt auf
  `factory.lock`).
- [ ] **AK2.16a** GIVEN ein Repo mit eingebundener Factory WHEN die ausgelieferte Self-Test-Suite
  (`factory-self-test`) läuft THEN ist sie grün, ohne dass der Zustand des Factory-Repos vorausgesetzt
  wird (kein Bezug auf dessen `ci.yml`, `release.yml`, Dateizahlen).
- [ ] **AK2.16b** GIVEN die Factory-Repo-spezifischen Prüfungen WHEN sie geschnitten werden THEN laufen
  sie nur im Factory-Repo (`scripts/project/tests/`), und keine Prüfung ist dabei ersatzlos entfallen
  (Vorher/Nachher-Liste der Testgruppen im Factory-PR). *Beleg: Mutations-/Zählvergleich.*

### Epic-weit

- [ ] **AKE.1** GIVEN T2a ist gemergt WHEN TCH die Pipeline fährt (Stage 2/3) THEN verhält sie sich wie
  zuvor; Self-Tests und App-Gates sind grün, die Required-Check-Namen sind bis auf die Ergänzung
  `factory-integrity` unverändert.
- [ ] **AKE.2** GIVEN T2a WHEN gearbeitet wird THEN läuft sie als eigener PR mit eigenem Issue (#428)
  und gilt erst nach grünen Gates in **beiden** Repos als fertig; die Reihenfolge ist Factory-PR →
  Release `v0.7.0` → TCH-PR (ADR-063 Nachtrag Q1).

## Fehlerszenarien

- [ ] **F1** Neue Version macht die TCH-Gates rot → Update-PR bleibt offen und rot; TCH-`main`
  unverändert und arbeitsfähig. *(Verhalten folgt aus AK2.4/AK2.2d; kein eigener Code, aber ein
  Test, dass der Workflow bei roter CI nichts anfasst.)*
- [ ] **F2**, **F3**, **F4**, **F7**, **F8** – siehe oben bzw. Epic-Spec (F4 → AK2.2b/AK2.8,
  F7 → AK2.5a).
- [ ] **FS-T2.1** Das Release-Manifest fehlt, ist kein gültiges JSON oder hat ein unbekanntes
  `schema` → Abbruch mit klarer Meldung, nichts geändert.
- [ ] **FS-T2.2** Hash einer heruntergeladenen Datei weicht vom Release-Manifest ab (Manipulation
  oder Übertragungsfehler) → Abbruch, nichts geändert.
- [ ] **FS-T2.3** Der Update-Workflow läuft ohne gültiges `FACTORY_SYNC_TOKEN` (fehlt/abgelaufen) →
  klarer Fehler im Lauf, kein halber PR, kein Fallback auf einen Token, der Gates nicht auslöst.
- [ ] **FS-T2.4** Ein Tag existiert, hat aber kein Release/kein Manifest-Asset → wird nicht
  eingebunden, Lauf meldet es.

## Offene Fragen

> Für `/architecture` (ADR-Trigger ist in ADR-063 schon beantwortet; hier Detailfragen mit
> Auswirkung auf Umfang oder Reihenfolge) bzw. vor `/implement`.

- [x] **Q1 · Wo entstehen die neuen Dateien?** → **ADR-063 Nachtrag Q1:** Factory-Repo zuerst, Release `v0.7.0`, dann TCH-PR. *(Frage:)* Laut ADR-063 sind `factory-sync.sh`,
  `factory-integrity-check.sh`, `factory-update.yml`, Seam und `NEW-PROJECT.md` **übernommene**
  (Seite `factory`) Dateien, gehören also ins **Factory-Repo** – dort aber hat TCH sie heute nicht
  (v0.6.0 enthält nur den Stand aus T1a). Folge: T2 braucht **mindestens einen Factory-PR + Release
  (v0.7.0?)** *vor* dem TCH-PR, in dem TCH `factory.lock` einführt. Reihenfolge und Release-Nummer
  festlegen. *Eskalation:* ändert den Zuschnitt dieser Task (zwei Repos, zwei PRs).
- [x] **Q2 · Woraus entsteht das erste `factory.lock`?** → **Nachtrag Q2/Q9:** Wechsel auf `v0.7.0`, Änderungsstopp, kein TCH-Delta (gemessen: 50 von 74 Abweichungen nur Qualifizierung). *(Frage:)* v0.6.0 enthält die **bereinigte** Fassung
  (T1b-2 hat Wortlaut und Verweise in den Factory-Dateien angepasst); TCH-`main` hat die alte Fassung.
  Wird TCH bei der Erst-Einbindung auf die neue Fassung **gesetzt** (jede TCH-Abweichung verloren,
  AK2.14b) oder wird zuerst das Delta ins Factory-Repo gegeben? → AK2.14b sichert nur, dass nichts
  still verloren geht; die Strategie legt `/architecture` fest.
- [ ] **Q3 · `FACTORY_SYNC_TOKEN`** (bleibt menschlicher Schritt, Nachtrag Q3/Q5): muss der Entwickler als Fine-grained PAT anlegen
  (Projekt-Repo *contents:write* + *pull-requests:write*; `nothra/dev-factory` *issues:write*) und
  als Secret hinterlegen. **Menschlicher Schritt** vor dem ersten Workflow-Lauf; Ablaufdatum +
  Rotation in `OPERATING.md`. Ohne Token ist FS-T2.3 die erwartete Antwort.
- [x] **Q4 · Ruleset:** → **Nachtrag Q4:** erst **nach** dem Merge von T2a. *(Frage:)* `factory-integrity` als Required Check in `protect-main` ist eine
  Repo-Einstellung (kein Code) – wer ändert sie, und **wann relativ zum Merge**? Zu früh blockiert
  jeden PR (der Check existiert noch nicht), zu spät lässt den Merge ohne Gate durch.
- [ ] **Q5 · Echter Neuprojekt-Nachweis (AK2.7c, jetzt T2b):** legt ein Wegwerf-Repo auf GitHub an (öffentlich
  oder privat?) und löscht es wieder – braucht ausdrückliche Freigabe des Entwicklers im Chat.
- [x] **Q6 · Größe:** → **entschieden 2026-10-24:** Teilung T2a (#428) / T2b (#441). *(Frage:)* 35 Kriterien, zwei Repos, vier Workflow-/Skript-Bausteine. Das liegt **über**
  der Turn-Limit-Schwelle (> 25 AK, Lesson #369). Vorschlag zur Prüfung in `/architecture`:
  Teilung in **T2a** (Abholen + Manifest + Gate + Update-PR) und **T2b** (Fund-Ablage + Neuprojekt),
  beide hinter v0.7.0. Entscheidung des Entwicklers.
- [x] **Q7 · Skill-Texte:** → gehören zu T2b (AK2.12), Factory-PR vor Update-PR. *(Frage:)* `/review`, `/security-review`, `/test`, `/refactor`, `/codify`
  sind Factory-Dateien – ihre Änderung (AK2.12) ist ebenfalls ein Factory-PR und fällt in Q1.

## Zuordnung zu den Teil-Tasks

Siehe Tabelle im Kopf. Kennzahlen: T2a-1 **5**, T2a-2 **19**, T2a-3 **6**, T2a-4 **6** Kriterien (alle
unter der Turn-Limit-Schwelle von 25 AK); T2b **11**.

## Zuordnung zum Epic

| Epic-AK | Hier |
|---|---|
| AK2.1 | AK2.1a–c |
| AK2.2 | AK2.2a–d, AK2.4b |
| AK2.3 | AK2.3, AK2.3b |
| AK2.4 | AK2.4 |
| AK2.5 | AK2.5a–d |
| AK2.6 | AK2.6 |
| AK2.7 | AK2.7a–d |
| AK2.8 | AK2.8 |
| AK2.9–AK2.13 | AK2.9–AK2.13b |
| F1–F4, F7, F8 | F1, F2, F3, F4 (→AK2.2b), F7 (→AK2.5a), F8 |
| neu | AK2.14a–c, AK2.15a–d, AK2.16a–b, FS-T2.1–FS-T2.4 |
