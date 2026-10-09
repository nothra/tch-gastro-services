# Review: Task 372

Iteration 2 · Schwerpunkt Rework-Diff `f894c0c..HEAD` (35 Dateien) im Kontext von
`origin/main...HEAD` (81 Dateien) · drei Runden: Logik, Code-Qualität, Architektur.
Im Review gelaufen: `pnpm vitest run app/components app/veranstaltung app/verwaltung eslint`
→ 78 Dateien, 1215 Tests grün; `pnpm lint` → 0 Fehler (1 Warnung aus einer ungetrackten
Wegwerf-Datei, siehe Nitpicks). `pnpm typecheck` wurde nicht freigegeben und lief nicht; E2E und
DB-Integrationstests liefen im Review nicht erneut (Ergebnisse dazu in der Task-Datei).

## Kritische Findings (müssen behoben werden)

Keine.

## Wichtige Findings (sollten behoben werden)

Keine. Alle acht wichtigen Findings aus Iteration 1 sind behoben und im Code nachgeprüft (siehe
„Verlauf" unten).

## Nitpicks (optional)

- [ ] [app/components/useBestaetigung.ts:16-36; app/components/FormularDialog.tsx:40-65] Der
  Erfolgs-Fokus-Vertrag steht zweimal: `oeffnen` setzt die Erfolgsmarke zurück,
  `schliessenNachErfolg` setzt sie und schließt – wortgleich in `useBestaetigung` und
  `useFormularDialog`. Geteilt ist nur `useErsatzFokusBeimAushaengen`, das außerdem aus einer
  Komponenten-Datei exportiert wird. Möglich: Der Helfer liefert `markiereErfolg`/`zuruecksetzen`
  (oder ein eigenes Modul), beide Hooks rufen ihn auf (Lesson #373).
- [ ] [docs/adr/058-toast-rueckmeldung-react-hot-toast-bestaetigen-sperrgruende.md:224-226]
  „Konsequenzen" nennt bei den geänderten Signaturen weiter nur `removeAuslageAction`/
  `setAuslageStatusAction`. `setTeilnehmerActiveAction` fehlt, D2 nennt sie inzwischen (W1 aus
  Iteration 1 bat um D2 **und** Konsequenzen).
- [ ] [app/veranstaltung/actions.ts:58] `const LIST_PATH = VERANSTALTUNG_LISTE_PATH;` gibt
  derselben Konstante einen zweiten Namen – das gleiche Muster wie das in Iteration 1 entfernte
  `sendeAb = klickeIm`. Direkt `VERANSTALTUNG_LISTE_PATH` nutzen.
- [ ] [app/veranstaltung/loeschSperren.test.ts:108-114] Zur Laufzeit prüft
  `expect(aufruf).toBeTypeOf("function")` nichts. Die Garantie kommt allein aus
  `@ts-expect-error` + `pnpm typecheck` (pre-push). Klarer wäre `expectTypeOf` aus Vitest oder ein
  Testname, der sagt, dass dies ein reiner Typ-Test ist.
- [ ] [docs/factory/kleinfunde.md:487] Der Anker `ZeilenMenue.tsx:26-90` deckt nicht alles ab,
  was der Eintrag behauptet: `bestaetigungOffen` steht in `:21`, `returnFocusRef` in `:96`.
  Richtig ist `:21-96` (Lesson #351).
- [ ] [playwright-372.tmp.config.ts] Die gitignorete Wegwerf-Config aus `/implement` liegt noch im
  Worktree und erzeugt die einzige Lint-Warnung. Vor dem Merge löschen (Lesson aus #374,
  `build-tooling.md`).

## Positives

- **W2 Fokus-Pause** sauber gelöst: Die Pause-Handler kommen aus `useToaster` und teilen sich mit
  `<Toasts>` ein Optionsobjekt (sonst griffe für `success` die Vorgabe von 2 s). Die Pause endet bei
  Blur, beim Ausblenden und beim Aushängen. Die Restzeit ist exakt getestet (3 999/1 ms), ebenso der
  Fall „Portalwechsel hängt die fokussierte Karte aus". Die verbleibende Grenze (Maus verlässt den
  Toast, während er den Fokus hat) steht ehrlich in ADR-058.
- **W4 404-Zwischenbild** wirklich belegt: `MutationObserver` vor dem Klick, mit Positivkontrolle.
  Die App hat keine eigene `not-found.tsx`, der Next-Standard `<h1>404</h1>` ist also das richtige
  Erkennungsmerkmal (geprüft).
- **W3/D3** `hatVerzehr` ist die eine Quelle für Katalogwechsel und Löschen. Der nicht-leere Typ
  `LoeschSperren` mit dem Typwächter `istGesperrt` schließt den Satz „… ist undefined." schon im
  Typ aus.
- **W6/W7** `useBestaetigung` und `FormularDialog` sind route-neutral, haben eigene Verhaltenstests
  (Fokus-Rückgabe, frischer Zustand je Öffnen, Ersatz-Fokusziel nach Erfolg) und werden an allen
  fünf neuen bzw. umgestellten Stellen genutzt. `FormularImDialog` ist restlos entfernt.
- **W8** Resolve-Liste + `afterEach` in `act` konsistent in `AuslageRow.test.tsx` und
  `CatalogControls.test.tsx`; neue Busy-/Sperr-Tests für Umbenennen, Duplizieren und Aktivieren.
- Doku-Drift abgeräumt: Nachträge in ADR-052/055/056 im etablierten Format. Alle 13 verschobenen
  Glossar-Anker stimmen mit dem Ist-Stand (Zeile für Zeile nachgeprüft). Alte Pfade/Namen
  (`lib/veranstaltung-loesch-sperren`, `FormularImDialog`, exportiertes `NOTICE_BASE_CLASSES`)
  kommen per `git grep` nicht mehr vor.
- Routen unverändert, `docs/routes.md` stimmt weiter.

## Out-of-Scope

Keine neuen Funde. Aus Iteration 1 bleiben Issue #402 und die Einträge in
`docs/factory/kleinfunde.md` (im Rework angepasst: Bestätigungs-Steuerung auf zwei Stellen
reduziert, neu „Theke angelegt").

## Empfehlung

APPROVED

---

## Verlauf

### Iteration 1 (2026-10-09) – 0 kritisch, 8 wichtig, 15 Nitpicks

Volltext im Commit `f894c0c` (`git show f894c0c:tasks/review-372.md`). Wichtige Findings, alle im
Rework behoben und in Iteration 2 nachgeprüft:

- W1 ADRs 052/055/056/058 beschrieben die geänderte Mechanik im alten Stand → Nachträge (#372).
- W2 Toast pausierte nur bei Hover, nicht bei Fokus → Fokus-Pause über `useToaster`-Handler.
- W3 Verzehr-Regel `menge > 0` an zwei Stellen → `hatVerzehr` in `app/veranstaltung/loeschSperren.ts`.
- W4 404-Zwischenbild nach „Veranstaltung löschen" nicht belegt → `MutationObserver` im E2E.
- W5 Flaky: zwei gleiche Toasts „Katalog deaktiviert" → `schliesseToast`-Helfer.
- W6 Bestätigungs-Steuerung zweimal kopiert → Hook `useBestaetigung`.
- W7 `FormularImDialog` duplizierte `AnlegeDialog` → route-neutraler Baustein `FormularDialog`.
- W8 Offen gehaltene Action nur in der letzten Testzeile aufgelöst → Resolve-Liste + `afterEach`.

Nitpicks: behoben oder eingeordnet (Portal-Remount als Konsequenz in ADR-058, „Theke angelegt" als
Kleinfund, `wrappedAction()`-Kopien in anderen Testdateien bewusst unverändert).
