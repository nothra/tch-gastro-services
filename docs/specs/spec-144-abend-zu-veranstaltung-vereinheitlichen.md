# Spec: Begriff „Abend" durchgängig zu „Veranstaltung" vereinheitlichen

## Kontext

Der kanonische Fachbegriff der Ubiquitous Language ist **„Veranstaltung"** (feminin),
nicht „Abend" (die alte Excel-/Montagsrunden-Sprache). In #53 wurde die Terminologie in
`spec-53-auslagen.md` und der zugehörigen Task-Datei bereits vereinheitlicht; im übrigen
Repo lebt „Abend" aber noch in **115 Vorkommen über 28 Dateien** weiter.

Inkonsistente Terminologie in den lebenden Docs untergräbt die Ubiquitous Language: Agenten
und Menschen lesen zwei Begriffe für dieselbe Entität und reproduzieren die Uneinheitlichkeit
im Code. Diese Task ist die rein **dokumentarische** Bereinigung – **kein Code betroffen**
(`app/`, `db/`, `lib/`, `e2e/`, `components/` wurden in #53 verifiziert und sind sauber).

Abgespalten aus #53 (`/requirements`), damit der dortige Feature-Branch schlank blieb.

## Scope

**Inbegriffen** – lebende Doku, hier wird „Abend" → „Veranstaltung" angeglichen (mit korrekter
Grammatik: die/der, Zusammensetzungen wie „Veranstaltungs-Ebene", „Veranstaltungs-Gesamt­abrechnung",
„je Veranstaltung"):

- `docs/factory/PROJECT-CONTEXT.md` (Ubiquitous Language: Synonym-Paar „Veranstaltung/Abend" auflösen)
- `docs/specs/README-montagsrunde.md`
- Aktive/künftig relevante Specs:
  `spec-48`, `spec-49`, `spec-50`, `spec-52`, `spec-54`, `spec-55`, `spec-116`, `spec-127`
- `docs/specs/spec-51-abend-anlegen.md` (Inhalt anpassen, **Dateiname belassen**)
- `docs/specs/spec-120-route-schnitt-abrechnung-veranstaltung.md` (Inhalt anpassen)

**Vorsichtig behandeln / im Zweifel unangetastet** – Historie, keine rückdatierte Glättung:

- ADRs `docs/adr/021`, `022`, `023`, `024` – Entscheidungs-**Records**. Historische
  Formulierungen nicht umschreiben; höchstens aktive Passagen angleichen, sonst belassen.
- Abgeschlossene Task-/Review-/Codify-Records: `tasks/task-48/49/50/51/120/127/130`,
  `tasks/review-116/127/130`, `tasks/codify-127` – Historie, unangetastet lassen.

**Nicht inbegriffen:**

- Code-/UI-/Test-Änderungen (`app/`, `db/`, `lib/`, `e2e/`, `components/`) – dort keine Treffer.
- Rückdatiertes Umschreiben historischer ADR-Entscheidungen.
- **Umbenennen von Dateien** mit „abend" im Namen (`spec-51-abend-anlegen.md`,
  `task-51-abend-anlegen-fuehren.md`). Entscheidung (Task 144): Dateinamen **bleiben**, nur der
  Inhalt von `spec-51` wird angeglichen – damit brechen keine der 4 Referenzen auf
  `spec-51-abend-anlegen` (in ADR-023, README, spec-120, task-51) und die Historie bleibt stabil.

## Akzeptanzkriterien

- [ ] GIVEN `docs/factory/PROJECT-CONTEXT.md` mit dem Synonym-Paar „Veranstaltung/Abend"
      WHEN die Terminologie vereinheitlicht ist
      THEN nennt die Datei „Veranstaltung" als alleinigen Begriff (Paar aufgelöst) und
      `git grep -w -i abend -- docs/factory/PROJECT-CONTEXT.md` liefert 0 Treffer.
- [ ] GIVEN `docs/specs/README-montagsrunde.md` und die aktiven Specs (`spec-48/49/50/52/54/55`,
      `spec-116/127`, `spec-51`, `spec-120`)
      WHEN die Vereinheitlichung abgeschlossen ist
      THEN verwenden sie durchgängig „Veranstaltung" in der Prosa; die **einzigen** verbleibenden
      `git grep -w -i abend`-Treffer sind die Markdown-Links auf `spec-51-abend-anlegen.md`
      (README Z. 11/33, spec-120 Z. 17/53) – die dokumentierte Ausnahme aus der „Datei nicht
      umbenennen"-Entscheidung. Sonst 0 Treffer.
- [ ] GIVEN die Ersetzungen in den inbegriffenen Dateien
      WHEN „Abend" grammatisch korrekt ersetzt wurde
      THEN stimmen Artikel/Genus (die Veranstaltung) und Zusammensetzungen
      („Veranstaltungs-Ebene", „je Veranstaltung") – keine mechanischen Fehlformen
      wie „der Veranstaltung" statt „die Veranstaltung" oder „Veranstaltungsrunde".
- [ ] GIVEN die als „vorsichtig behandeln" markierten ADRs und abgeschlossenen Task-Records
      WHEN die Task abgeschlossen ist
      THEN bleiben sie inhaltlich unverzerrt; jede bewusst angefasste Historie-Datei wird mit
      Begründung in der Task-Datei dokumentiert.
- [ ] GIVEN die Dateinamen `spec-51-abend-anlegen.md` und `task-51-abend-anlegen-fuehren.md`
      WHEN die Task abgeschlossen ist
      THEN sind sie **nicht umbenannt** und alle 4 Referenzen auf `spec-51-abend-anlegen` bleiben intakt.
- [ ] GIVEN der gesamte Code-Baum (`app/`, `db/`, `lib/`, `e2e/`, `components/`)
      WHEN die Task abgeschlossen ist
      THEN gibt es dort keine Änderungen (der Diff berührt ausschließlich `docs/` und `tasks/`).

## Fehlerszenarien

- [ ] Mechanische Ersetzung erzeugt falsche Grammatik (Genus/Kompositum) → jede Ersetzung im
      Satzkontext prüfen, nicht per globalem `sed`.
- [ ] Legitime historische Erwähnung von „Abend" (z. B. Zitat der alten Excel-Sprache, bewusste
      Abgrenzung „vormals Abend") wird fälschlich ersetzt → solche Stellen bewusst belassen und
      als Ausnahme in der Task-Datei notieren.
- [ ] `git grep -w -i abend` matcht auch Wortbestandteile in anderer Bedeutung (z. B. Eigennamen)
      → vor jeder Ersetzung Treffer im Kontext lesen.

## Offene Fragen

- [ ] Keine offenen Fragen. Die Dateinamen-Entscheidung ist getroffen (Namen belassen, nur Inhalt).
