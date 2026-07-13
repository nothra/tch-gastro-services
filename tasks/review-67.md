# Review: Task 67

Reviewt: Arbeitsbaum (`lib/rate-limit.ts`, `lib/rate-limit.test.ts`,
`app/api/health/route.ts`, `app/api/health/route.test.ts`) gegen Spec-67 + ADR-020.
Hinweis: Der committete Branch-Diff (`main...HEAD`) enthält nur die Docs (ADR/Spec/Task);
der Implementierungscode liegt uncommitted im Arbeitsbaum – Review erfolgte darauf.

## Kritische Findings (müssen behoben werden)
- [ ] Keine. Feature ist korrekt, alle Akzeptanzkriterien sind abgedeckt.

## Wichtige Findings (sollten behoben werden)
- [ ] `lint-out.tmp.txt` + `scripts/lint-debug.tmp.sh` — Debug-Artefakte im Arbeitsbaum
  **vor dem Commit entfernen** (nicht mit-committen). Sie sind nicht in `.gitignore`, würden
  also beim `git add .` ins Repo wandern. `scripts/lint-debug.tmp.sh` schreibt zudem in eine
  fest verdrahtete `.tmp`-Datei – reines Wegwerf-Tooling, gehört nicht in den PR.
  (Randnotiz: das eingecheckte `lint-out.tmp.txt` zeigt einen **veralteten** Lint-Fehler
  `prefer-const` auf `rate-limit.test.ts:6` – im aktuellen Code bereits als `const clock = 0`
  behoben; Lint sollte jetzt grün sein. Bitte `pnpm lint` + `pnpm vitest run` final bestätigen,
  da ich sie in dieser Sandbox nicht ausführen durfte.)
- [ ] FS-2 nur teilweise geschlossen (`route.ts:15`, ADR-020 §Frage 2/4): Bei **globalem**
  Zähler + fail-open schützt fail-open nur den *Störungsfall* des Limiters – ein anhaltender
  Prod-Flood, der die 30 Reads/Fenster korrekt erschöpft, kann den **einzelnen** Gate-`curl`
  im selben Fenster mit `429` treffen → falscher Deploy-Fehlschlag. Bewusst in ADR-020
  akzeptiert („großzügiger Schwellwert + fail-open entschärft"), aber der Gate-Pfad selbst hat
  keine Absicherung (z. B. 1× Retry des Healthchecks). Empfehlung: als eigenständiges
  Follow-up bewerten (Gate-Retry oder Gate-Request-Ausnahme), nicht in diesem PR erzwingen.

## Nitpicks (optional)
- [ ] Fixed-Window-Rand: an der Fenstergrenze sind bis zu `2×limit` Reads in kurzer Zeit möglich
  (Limit am Fensterende + Limit am nächsten Fensterstart). Inhärent für Fixed-Window und in
  ADR-020 als Best-Effort akzeptiert; AK-3 („≤ Schwellwert **pro Fenster**") bleibt wörtlich erfüllt.
- [ ] `route.test.ts`: Der `stage`-Wert wird nur für den Default `"dev"` geprüft; der Zweig
  `process.env.NEXT_PUBLIC_STAGE ?? "dev"` mit gesetztem Env ist untested (vorbestehende Zeile,
  gering). Ein Fall mit gesetztem `NEXT_PUBLIC_STAGE` würde die Branch-Coverage schließen.

## Positives
- Saubere Factory/DI: injizierbare Uhr → deterministische Tests ohne echten Timer/DB.
  `tryAcquire()` ist reine O(1)-Arithmetik ohne I/O (FS-3 strukturell erfüllt), Guard sitzt
  korrekt **vor** dem DB-Read.
- Strikte `toEqual`-Asserts verhindern DB-Datenleck im Body; `selectSpy not.toHaveBeenCalled`
  belegt AK-4 hart (Throttle ohne Neon-Roundtrip).
- Route bleibt dünn, importiert nur die Singleton-Instanz; `dynamic="force-dynamic"` bleibt,
  kein `runtime="edge"` – konsistent mit ADR-020.
- `proxy.ts`-Matcher nimmt `api/health` bereits explizit aus (deckt das #63-Codify-Learning ab)
  → Gate-Healthcheck bekommt weiterhin live `200`/`503` (AK-5/AK-6).
- ADR-020 dokumentiert alle vier offenen Fragen mit Alternativen und Trade-offs; Task-AKs sind
  auf konkrete Tests gemappt.

## Empfehlung
APPROVED

> Auflage vor Commit: Die beiden `.tmp`-Debug-Dateien entfernen und `pnpm lint` + `pnpm vitest run`
> grün bestätigen. Das FS-2-Follow-up (Gate-Retry) als separates Backlog-Item erwägen – kein
> Blocker für diesen PR.
