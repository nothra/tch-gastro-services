## Codify-Report: Task 253

### Neue Regeln hinzugefügt

- **`docs/factory/lessons/testing.md`** – „Positions-/Zustand-Freeze-Test ohne vorherige
  Divergenz-Aktion ist nicht diskriminierend" – wegen: In drei aufeinanderfolgenden Review-Runden
  (1, 2, 3) wurde an drei verschiedenen Testorten (`page.test.tsx` StatusToggle-Test,
  `EingefroreneZeilenListe.test.tsx` Fehlerszenario-Test) derselbe Fehler gefunden: `render`/
  `rerender` mit identischen bzw. nicht-divergierenden Props macht Reihenfolge- **und**
  Status-Assertionen nicht-diskriminierend (grün, egal ob der Freeze-Code existiert). Ein
  Spezialfall von Lesson #214 („grün aus dem falschen Grund"), aber spezifisch genug (Freeze-/
  Unverändert-Tests brauchen eine vorgeschaltete, echte state-ändernde Aktion), um als eigener
  Eintrag mit eigenem Smell aufzunehmen – der bestehende #214-Text deckt Fail-Pfad-Isolation ab,
  nicht Zustands-Divergenz.
  Index-Zeile in `PROJECT-CONTEXT.md` unter der `testing.md`-Gruppe ergänzt.

- **`docs/factory/lessons/factory-workflow.md`** – „Frisch im selben PR erstellte/geänderte Spec
  braucht denselben Drift-Check wie ADRs" – wegen: Review-Runde 3 fand, dass `spec-253` (in
  derselben PR-Session von `/requirements` geschrieben) eine engere Mechanik beschrieb
  („kassier-lokaler" Freeze) als die tatsächlich gebaute und per Test zementierte
  (mount-/session-basierter Freeze). Runde 1 und 2 prüften ADRs auf Drift (Sweep über
  `docs/adr/**`), aber nie die eigene Spec-Prosa gegen das reale Ergebnis. Erweitert die
  bestehende #211-/#176-Kette (ADR-/Lessons-Drift) explizit um `docs/specs/*.md`.
  Index-Zeile in `PROJECT-CONTEXT.md` unter der `factory-workflow.md`-Gruppe ergänzt (mit
  „Laden bei"-Trigger: `/review` – bei Spec, die im selben PR entstanden/geändert wurde).

### Keine Änderungen nötig

- Der Produktionscode selbst hatte in **keiner** der drei Review-Runden ein Finding – die
  `useState`-Initializer-Lösung wurde als korrekt bestätigt (kein Hydration-Mismatch, kein
  Strict-Mode-Problem, kein Reconciliation-Fehler). Kein Regel-Bedarf auf Code-Ebene.
  Bestätigt zugleich die bestehende Lesson „`useActionState` + Inline-Toggle" bzw. das generelle
  Muster „`useState`-Initializer statt `useEffect`" (Lesson #49) als weiterhin richtig.
  → keine neue Regel, nur implizite Bestätigung.
- Der Security-Review (PASSED, keine Findings) bestätigte bestehende Praxis (Map/Set statt
  Plain-Object-Lookup, serverseitige Rollen-/IDOR-Prüfung unberührt) – kein neues Learning, da
  keine neue Angriffsfläche entstand.
- Die zwei Out-of-Scope-Findings aus Review-Runde 3 (#272 „Kassierseite: Listendarstellung
  aufräumen", #273 „Eingefrorene Reihenfolge berücksichtigt parallel geänderte/neue Zeilen nicht")
  wurden bereits vom Review-Schritt selbst als Issues angelegt (ADR-018-Seam) – kein weiterer
  Codify-Bedarf, nur Verlinkung hier: [#272](https://github.com/nothra/tch-gastro-services/issues/272),
  [#273](https://github.com/nothra/tch-gastro-services/issues/273).

### Empfehlung für nächste Features

- Bei jedem Freeze-/„bleibt unverändert"-Test (Position, Sortierung, Zustand über einen Rerender)
  zuerst prüfen: „Erzeugt irgendein Schritt vor der Ziel-Assertion eine echte Divergenz zwischen
  den zwei Zuständen, die der Test unterscheiden soll?" – das hätte alle drei Vorkommnisse in
  dieser Task schon beim Schreiben verhindert, nicht erst im Review.
- Wird in einer Task sowohl eine Spec neu geschrieben/geändert **als auch** in derselben Session
  implementiert, gehört ein expliziter Abgleich „Spec-Wortlaut ↔ tatsächlich gebautes und
  getestetes Verhalten" in die Review-Checkliste – nicht nur ein ADR-Sweep.
