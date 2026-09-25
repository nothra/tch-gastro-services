## Codify-Report: Task 352

Analysebasis: `tasks/task-352-veranstaltung-bearbeiten-loeschen.md` (vollständige Historie über
vier Review-Runden + Circuit Breaker + manuelle Rework-Runde), `tasks/review-352.md`,
`tasks/security-352.md`.

### Neue Regeln hinzugefügt

- **`docs/factory/lessons/frontend-react.md`** – Reset-Handler, der einen gültigen Submit
  begleiten soll, gehört an `onSubmit` des `<form>`, nicht an `onClick` des Buttons: `onClick`
  feuert unabhängig von der nativen Pflichtfeld-Validierung, `onSubmit` nur bei bestandener
  Constraint-Validierung. Wegen: Review-Runde 3 fand genau diesen Fehler in
  `VeranstaltungMetaForm.tsx` – der Reset lief auch bei leerem Pflichtfeld und ließ eine alte
  Erfolgsmeldung fälschlich wieder erscheinen. Index-Zeile in `PROJECT-CONTEXT.md` ergänzt
  (**Laden bei:** `/implement`, `/review` bei React/UI-Komponenten mit `useActionState`).

- **`docs/factory/lessons/testing.md`** (Rezidiv-Ergänzung zur bestehenden
  Spiegel-/Symmetrie-Lesson aus #211) – Die Symmetrie-Pflicht („beide Richtungen eines
  Verhaltens-Paares brauchen je eine eigene Assertion") gilt nicht nur für Spec-AK-Paare,
  sondern für jeden Bugfix, der einen Code-Zweig in zwei Verhaltensweisen aufspaltet. Wegen: Der
  eigene manuelle Rework-Fix (Reset-Handler-Verschiebung) testete nur den gemeldeten Bug-Pfad
  (ungültiges Feld); die Gegenrichtung (gültiges Feld → Reset muss feuern) blieb ungetestet, bis
  der `/test`-Coverage-Lauf die nie ausgeführte `onSubmit`-Zeile zeigte. Zweite Lektion:
  Coverage-Lauf nach einem selbst geschriebenen Fix ist kein Nice-to-have.

- **`docs/factory/lessons/code-style.md`** (Rezidiv-Ergänzung zur bestehenden
  Erzwingungs-Behauptungs-Lesson aus #319/#59) – Bei einer Aufzählung mehrerer Funktionen mit
  einer gemeinsamen Eigenschaftsbehauptung (hier: „kein `requireRole`") jede einzeln öffnen,
  nicht nur eine als Repräsentant der Gruppe – verschärft, wenn die Behauptung eine
  Sicherheitseinstufung trägt. Wegen: Ein WHY-Kommentar zur TOCTOU-Risikoakzeptanz benannte
  `kassiereZeileAction` fälschlich als unauthentifiziert über den Theke-Link erreichbar; sie
  verlangt tatsächlich selbst `requireRole`. Der Fehler entstand beim Zusammenfassen zweier
  ähnlicher Action-Namen zu einer Aufzählung, ohne die zweite Funktion einzeln zu prüfen – erst
  `/security-review` fand es.

Alle drei Änderungen sind Volltext-Ergänzungen in `docs/factory/lessons/` + Index-Zeile in
`PROJECT-CONTEXT.md` (ADR-037), keine `@import`-Dauerkontext-Erweiterung über die Index-Zeilen
hinaus. `@import`-Kontext bleibt mit 903 von 1100 Zeilen deutlich unter der Grenze
(`import-context-limit-check.sh`).

### Keine Änderungen nötig

- **Circuit Breaker (3x `NEEDS_REWORK` in Folge, Review-Runde 3):** Verhalten war exakt wie in
  CLAUDE.md spezifiziert – nach der dritten Runde stoppte `run-pipeline.sh` und eskalierte an den
  Menschen, statt einen vierten automatischen Rework zu starten. Kein Regel-Fix nötig, das
  System hat funktioniert.
- **Zwei bewusste Risikoakzeptanzen (Kassenwechsel ohne Sperre, TOCTOU beim Hard-Delete):**
  Beide wurden vom Menschen entschieden (2a/3b), von drei Review-Personas und einem
  Security-Review unabhängig als vertretbar bestätigt. Kein neues Muster – der übliche Weg
  „dokumentieren statt automatisch code-technisch lösen" funktionierte wie vorgesehen.
- **Manuelle Fortsetzung nach Circuit Breaker außerhalb von `run-pipeline.sh`:** Die
  Telemetrie-Lücke (ADR-049, kein OTEL für manuelle Stage-2-Schritte) ist bereits bekannt und in
  `lessons/factory-workflow.md` dokumentiert (aus #346) – keine neue Lesson nötig, nur der übliche
  Hinweis in der Task-Datei vermerkt.

### Empfehlung für nächste Features

- Bei jedem Bugfix, der einen `onClick`/`onSubmit`-artigen Event-Handler verschiebt: sofort
  beide Verhaltensrichtungen testen, nicht nur den gemeldeten Fall – ein Coverage-Lauf direkt
  nach dem Fix (nicht erst im separaten `/test`-Schritt) hätte die Lücke schon in der manuellen
  Rework-Runde selbst gefunden.
- Bei Risikoakzeptanz-Kommentaren, die mehrere Funktionsnamen in einer Aufzählung nennen: jede
  Funktion einzeln im Editor öffnen, bevor die Aufzählung geschrieben wird – besonders wenn der
  Kommentar eine Sicherheits- oder Architekturentscheidung begründet.
