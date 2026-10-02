# Review: Task 370

> Review-Runde 3 (3 Personas: Logik, Code-Qualität, Architektur), 2026-10-02. Diff-Basis
> `origin/main` **inklusive Working Tree** – der Rework nach Runde 2 ist noch **nicht committet**
> (`git status`: 10 geänderte Dateien). Alle Findings vom Orchestrator gegen den Code
> nachverifiziert. Runde 2 (4 wichtig, 12 Nitpicks) ist vollständig abgearbeitet bzw. bewusst
> offen gelassen (Konstanten vs. Literale F5/F7, `gewaehlteKategorie` nach „inaktiv", `wechsleZu`
> auf aktiven Chip) – siehe Git-Historie dieser Datei. Gates im Orchestrator (Working Tree):
> `pnpm lint` grün, `prettier --check .` grün, `tsc --noEmit` grün, Vitest für `app/_verzehr`,
> `app/theke`, `app/veranstaltung/[id]/verzehr` grün (186 Tests, 1 skipped = Wegwerf-Sonde).
> Mutationsbeleg „ohne `key` alle 5 Positionszustand-Tests rot" nicht neu gelaufen; gestützt auf
> die Task-Notiz und das Codelesen zweier Personas (React-19-Quelltext zum Async-Action-Scope
> gegengelesen).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [docs/adr/026-verzehr-soft-geloeschter-artikel.md:70-76] D3 beschreibt im Präsens „`VerzehrErfassung` rendert je Zeile zusätzlich die Positionen mit `active === false` … in einem eigenen, sichtbar abgesetzten Abschnitt"; Status `:4` ist „Accepted" ohne Banner. Auf `origin/main` stimmte das noch – erst dieser PR löscht `VerzehrErfassung.tsx` und ersetzt den Abschnitt durch den Umschalter-Eintrag „Nicht mehr im Katalog" (`app/_verzehr/kategorien.ts`, ADR-054 D4 `:117-119`). ADR-054 verweist nur einseitig auf ADR-026 D3, die Drift-Liste (`:203-212`) nennt ADR-026 nicht. Gleiche Fund-Klasse wie Runde 2 W1–W3 (Lesson #211). Fix: Banner an ADR-026 D3 („Darstellung geändert durch ADR-054 D4 (#370): Umschalter-Eintrag ‚Nicht mehr im Katalog' statt eigenem Abschnitt; Regeln – nur `menge > 0`, ±1, `editable` – gelten fort"), Statuszeile ergänzen, ADR-026 in die Drift-Hinweise von ADR-054 aufnehmen.
- [ ] [app/_verzehr/tmp-debug.test.tsx] Untracked Wegwerf-Sonde aus `/implement` (`it.skip("tmp")`, Kommentar „bitte löschen"). Nicht von `.gitignore` gedeckt (`*.tmp.*` passt nicht), wird von Vitest eingesammelt und landet bei `git add app/_verzehr/` bzw. `-A` im Rework-Commit. Fix: `rm -f app/_verzehr/tmp-debug.test.tsx` vor dem Commit, danach `git status` prüfen.

## Nitpicks (optional)
- [ ] [docs/adr/039-verzehrerfassung-fokusliste-route-neutral.md:4] Statuszeile „D2, D3 und D4 **teilweise** abgelöst … D1 gilt **unverändert** fort" passt nicht zu den eigenen Bannern (D2 `:74` und D3 `:89` „Abgelöst", nur D4 `:108` „Teilweise"; D1-Banner `:42-44` „Namen geändert") und nicht zu ADR-054 `:204` („D2/D3/D4 abgelöst"). Fix: „D2/D3 abgelöst, D4 teilweise; D1 gilt fort (Namen geändert)" – gleichlautend in ADR-039 und ADR-054.
- [ ] [docs/adr/034-selbstbedienung-token-zugang.md:42, :61-64] ADR-034 D1/D4 nennen `VerzehrErfassung` (mit `editable={false}`, als Server-Children des `IdentityGate`) im Präsens. Ältere Drift (seit #183/#187), durch die Löschung in diesem PR aber endgültig gegenstandslos – im selben Banner-Zug mitnehmen.
- [ ] [docs/specs/spec-370-verzehr-erfassung-kompakt.md:126-127, :192-194] AK4.4 und FS1 sprechen ohne Einschränkung von der „betroffenen Position/Zeile"; die Grenze „gilt, solange die Person angezeigt wird" steht nur in ADR-054 D2 und im Key-Kommentar, die Rückweg-Tests erzwingen sie aber. Spec im selben PR entstanden (Lesson #253). Fix: an AK4.4/FS1 je „gilt, solange die Person angezeigt wird (ADR-054 D2)".
- [ ] [app/_verzehr/VerzehrEinzelansicht.positionszustand.test.tsx:128-139] `should_dropError_when_itArrivesAfterSwitchingAway` weist nicht nach, dass die Aktion vor dem Wechsel läuft (Geschwistertests prüfen `toBeDisabled()`). Löste der Klick keine Aktion aus, leerte `antworte` ein leeres Array und beide Abwesenheits-Assertions wären trivial grün. Fix: `expect(… "Menge erhöhen").toBeDisabled()` nach `tippePlus()`.
- [ ] [app/_verzehr/VerzehrEinzelansicht.positionszustand.test.tsx:38, :48] Auflöse-Zeile `act(async () => offeneAntworten.splice(0).forEach(...))` zweimal fast identisch; der `forEach`-Parameter `antworte` verschattet den gleichnamigen Rückgabe-Helfer, und `antworte` löst **alle** offenen Aktionen der Datei auf, nicht nur die eigene (heute korrekt, am Namen nicht erkennbar). Fix: ein Helfer `loeseOffeneAktionen(zustand)`.
- [ ] [app/_verzehr/VerzehrEinzelansicht.tsx:101-104] „Er gilt, solange die Person angezeigt wird" – „Er" bezieht sich grammatisch auf „Key", gemeint ist der Zustand. Fix: „Der Zustand gilt, solange …".
- [ ] [docs/adr/035-selbstbedienung-erfasser-ziel-fokus.md:59-60] „Der Rest von D2 … bleibt gültig (überholt durch ADR-054)" widerspricht sich im selben Satz. Fix: „… blieb gültig; inzwischen ebenfalls abgelöst durch ADR-054."

## Positives
- Alle vier Wichtig-Findings aus Runde 2 behoben: ADR-054 D1 nennt `fussleisteClassName` (`:63`), ADR-035 D5 trägt ein Teil-Banner mit gleichlautender Statuszeile und ADR-054-Drift-Absatz, ADR-039 D4 sagt „`VerzehrErfassung` entfällt", die Grenze des Positionszustands steht als bewusste Entscheidung (kein Datenverlust, keine Regression, YAGNI) in ADR-054 D2 und im Key-Kommentar.
- Rückweg-Tests A → B → A legen die Grenze fest statt sie nur zu beschreiben; „Spiegel-Richtung" korrekt zu „Gegenrichtung" umbenannt.
- Starker Selbstfund: der Test „später eintreffender Fehler" war zunächst grün aus dem falschen Grund (offener React-19-Async-Action-Scope durch nie auflösende Promises der Vortests). An der Ursache behoben (`offeneAktion()` + Auflösen im `afterEach`, vor `cleanup()`), WHY-Kommentar zutreffend, als `/codify`-Kandidat notiert.
- Alle Runde-2-Nitpicks umgesetzt (Leerzeilen nach Bannern, `initialeZeileId`-Hinweis, D4-Überschrift, ADR-052-Satz eingegrenzt, Kommentarbreiten, Fußleisten-Test nur `px-6`, Testimporte, `KATEGORIE_LABEL` im Kopf, E2E-Namen/Einmalmessung).
- Code hält ADR-054 ein: `app/_verzehr/` route-neutral, keine Feature-Imports, keine rohen Farben/`dark:`, in `eslint/ui-token-files.mjs`; `docs/routes.md` stimmt (keine Routenänderung).

## Empfehlung
NEEDS_REWORK

> **Circuit Breaker erreicht – Eskalation an den Menschen.** Das ist die dritte Review-Runde auf
> denselben Code; laut `CLAUDE.md` wird nicht weiter automatisch iteriert. Es gibt **keinen
> Code-Defekt** und keinen ungelösten Konflikt zwischen Review und Implementierung – offen sind
> nur Doku (ADR-026-Banner + Drift-Eintrag in ADR-054) und Commit-Hygiene (Sonde löschen, Rework
> committen). Vorschlag an den Menschen: diese beiden Wichtig-Punkte (plus nach Wahl die Nitpicks)
> als letzten Rework ohne weitere volle Review-Runde übernehmen und dann mit `/test` weitermachen.
