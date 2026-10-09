# Review: Task 372

Iteration 1 · Diff `origin/main...HEAD` (72 Dateien) · drei Runden: Logik, Code-Qualität, Architektur.
Unit-Suiten der betroffenen Bereiche grün (1311 Tests in `app/components`, `app/veranstaltung`,
`app/verwaltung`, `lib/`); E2E und DB-Integrationstests im Review nicht erneut gelaufen.

## Kritische Findings (müssen behoben werden)

Keine.

## Wichtige Findings (sollten behoben werden)

- [ ] [docs/adr/056-detailseite-kopfaktionen-symbol-schaltflaechen.md:71-72, :88; docs/adr/055-kassieren-spende-live-abschluss-im-kopf.md:63; docs/adr/052-ui-grundlage-eigene-bausteine-tokens-farb-gate.md:56; docs/adr/058-…:83-88, :199-200] **ADRs beschreiben die geänderte Mechanik im alten Stand** (Lessons #211/#55/#176). ADR-056 D3 „Die Formulare zeigen ihre bestehende Erfolgsmeldung im Dialog" → jetzt Toast im Dialog; ADR-056 D4 „Bei Erfolg leitet die Action wie bisher selbst um" → jetzt `{ ok: true }` + Client-`router.replace` (`actions.ts:319`, `VeranstaltungLoeschen.tsx:103`); ADR-055 „Die Meldung ist ein `Notice`" → Toast (`KassiereZeileForm.tsx:41-44`); ADR-052 „Keine neuen npm-Abhängigkeiten" ohne Rückverweis auf ADR-058 (Muster: „Nachtrag (#369)" in ADR-052:49-51). ADR-058 selbst nennt `setTeilnehmerActiveAction` nicht unter den umgestellten Actions (`app/verwaltung/teilnehmer/actions.ts:66-79`) und behauptet, die Aufrufer liefen „unverändert weiter" – tatsächlich wurden alle auf das Optionsobjekt umgestellt. Fix: je ein „Nachtrag (#372)" in ADR-052/055/056, ADR-058 D2 + Konsequenzen korrigieren.
- [ ] [app/components/ui/Toaster.tsx:24-34; docs/adr/058-…:59-60] **Toast pausiert nur bei Hover, nicht bei Fokus – ADR behauptet „Hover/Fokus pausiert".** `react-hot-toast` verdrahtet nur `onMouseEnter`/`onMouseLeave` (`node_modules/react-hot-toast/dist/index.mjs`, kein `onFocus` – im Review nachgeprüft). Wer per Tastatur auf „Meldung schließen" geht, verliert nach 5 s den Fokus an `<body>`; auf Touch gibt es kein Hover. Fix: in `ToastKarte` Fokus/Blur ans Pausieren binden (über `useToaster`/`toast`-API) und mit Test belegen – oder den ADR-Satz korrigieren und die Einschränkung bewusst festhalten.
- [ ] [app/veranstaltung/actions.ts:131-134; lib/veranstaltung-loesch-sperren.ts:32] **Verzehr-Regel `menge > 0` wieder an zwei Stellen.** Katalogwechsel prüft über `hatErfasstenVerzehr`, Löschen über `loeschSperren`; der alte Kommentar „zwei Kopien würden lautlos divergieren" wurde umgeschrieben, statt die Kopie zu vermeiden – im Widerspruch zu ADR-058 D3. Fix: `hatVerzehr(positionen)` aus dem Sperren-Modul exportieren und in beiden nutzen.
- [ ] [app/veranstaltung/actions.ts:316-319; e2e/veranstaltung-bearbeiten-loeschen.spec.ts:165-168] **404-Zwischenbild nach „Veranstaltung löschen" nicht belegt** (ADR-058 D2: „im E2E prüfen"). `revalidatePath` in der Action lässt Next die aktuelle Route `/veranstaltung/[id]` mitrendern, die in `notFound()` läuft (`[id]/page.tsx:50`); der Reducer übernimmt diesen Baum vor dem `router.replace` aus `useSchliessendeAction`. Der E2E prüft „404" erst nach dem URL-Wechsel, sieht also nur den Endzustand. Fix: Zwischenbild wirklich prüfen (z. B. `MutationObserver` per `page.evaluate` vor dem Klick); bei Flash die Abhilfe aus ADR-058 umsetzen, sonst Ergebnis mit Begründung in der Task-Datei festhalten.
- [ ] [e2e/bestaetigen-rueckmelden.spec.ts:170, :181] **Flaky: zwei gleiche Toasts „Katalog deaktiviert" innerhalb von 5 s.** Zwischen beiden liegen nur Aktivieren + eine Prüfung; der erste Toast steht noch (`STANDZEIT_MS` 5000), `toast(page, …)` trifft dann zwei `role="status"`-Elemente → Strict-Mode-Fehler bei `toBeVisible()`. Fix: ersten Toast vor dem Aufräum-Deaktivieren schließen oder auf `toHaveCount(0)` warten.
- [ ] [app/veranstaltung/AuslageRow.tsx:123-148; app/verwaltung/katalog/[id]/CatalogControls.tsx:170-212] **Bestätigungs-Steuerung zweimal neu kopiert, in zwei Varianten.** Offen-Zustand + `durchlauf`-`key` + `returnFocusRef` + `ConfirmDialog` stand schon dreimal im Code; `AuslageLoeschen` nutzt dafür `useFormularDialog` nur wegen des Ersatz-Fokus (Steuerung/`schliessbar` ungenutzt), `CatalogControls` baut es per `useState`. Lesson #369: Verhaltensvertrag in den Baustein. Fix: Hook (z. B. `useBestaetigung(ersatzFokusId?)`) in `app/components/` und die beiden neuen Stellen darauf; die drei älteren sind als Kleinfund erfasst.
- [ ] [app/verwaltung/katalog/[id]/CatalogControls.tsx:116-136] **`FormularImDialog` dupliziert `AnlegeDialog`** (`app/components/FormularDialog.tsx:129-154`): gleicher Aufbau Auslöser + `ausloeserRef` + `<Dialog {...dialogProps}>{children(steuerung)}</Dialog>`, nur `variant`/`beschreibung`/Seitenkopf-Id unterscheiden sich. Fix: route-neutralen Baustein mit diesen Props in `FormularDialog.tsx`, `AnlegeDialog` darauf aufsetzen.
- [ ] [app/verwaltung/katalog/[id]/CatalogControls.test.tsx:171-185; app/veranstaltung/AuslageRow.test.tsx:234-249] **Offen gehaltene Action-Promise wird nur in der letzten Testzeile aufgelöst** – scheitert vorher eine Assertion, bleibt der Action-Scope für Folgetests offen (Lesson #370). `VeranstaltungLoeschen.test.tsx:22-56` macht es im selben PR richtig. Fix: dasselbe Muster (Resolve-Liste + `afterEach` in `act`).

## Nitpicks (optional)

- [ ] [docs/ux/glossar.md:139-159] Abweichungsliste: die verbleibenden #401-Anker sind durch diesen PR verschoben (z. B. `KatalogWechsel.tsx` :44→:47, `ThekeSetup.tsx` :21/:32→:24/:35, `VeranstaltungAnlegen.tsx` :75→:79, `TeilnehmerAnlegen.tsx` :47→:51, `ArtikelAnlegen.tsx` :46→:50, `AuslageForm.tsx` :146→:142, `KassiereZeileForm.tsx` :63/:49→:67/:53, `e2e/listenseiten.spec.ts` :148→:149); Stand-Hinweis `:134` mitziehen (Lesson #375).
- [ ] [app/components/ui/Toaster.tsx:34] Wechsel `createPortal(…, dialog)` ↔ direktes Rendern remountet `<Toasts>` samt Live-Region – passiert bei jedem Erfolg, der einen Dialog schließt (Toast erst in den noch offenen Dialog, nach `dialog.close()` in den Body). Screenreader-Wirkung ungeprüft. Fester Container-Knoten, der per `appendChild` umgehängt wird, oder in ADR-058 „Konsequenzen" nennen.
- [ ] [app/components/ui/Toaster.tsx:39-41, :56-62] Kommentar/ADR sagen „zuletzt geöffneter Dialog", `obersterOffenerDialog` nimmt den letzten in Dokumentreihenfolge (= innerster bei Verschachtelung). Kommentar präzisieren.
- [ ] [app/components/ui/Toaster.tsx:72] `py-0 pr-0` soll `px-3 py-2` aus `NOTICE_BASE_CLASSES` überschreiben; `joinClasses` merged nicht, es entscheidet die Stylesheet-Reihenfolge. Eigene Abstandsklassen statt Überschreiben.
- [ ] [app/components/FormularDialog.tsx:89-93] `useDialogFormular(action, steuerung, erfolgsMeldung)` – dritter Positionsparameter, während `useSchliessendeAction` bewusst ein Optionsobjekt bekam (ADR-058 D2). Konsistent als Optionsobjekt.
- [ ] [lib/veranstaltung-loesch-sperren.ts] Reine Veranstaltungs-Fachregel mit drei Nutzern nur in `app/veranstaltung/` – Projektmuster wäre `app/veranstaltung/` (vgl. `kassierSummen.ts`, `auslagenSummen.ts`); ADR-058:97 nennt zudem einen anderen Dateinamen (`lib/veranstaltungLoeschSperren.ts`). Verschieben oder in D3 begründen + Namen angleichen.
- [ ] [lib/veranstaltung-loesch-sperren.ts:44-52] `loeschSperrenBeschreibung([])` liefert „… ist undefined.". Nicht-leeren Tupel-Typ oder Guard.
- [ ] [app/veranstaltung/[id]/VeranstaltungLoeschen.tsx:25] `LIST_PATH = "/veranstaltung"` doppelt zu `app/veranstaltung/actions.ts:57`.
- [ ] [app/verwaltung/teilnehmer/actions.ts:75] „Teilnehmer nicht gefunden." inline neben der neuen Konstante `NO_TEILNEHMER` (`:17`).
- [ ] [app/veranstaltung/AuslageForm.test.tsx:22] Neuer Helfer `wrappedAction()`, die vier Inline-Kopien derselben Datei (`:169`, `:188`, `:214`, `:236`) bleiben; wortgleich in vier weiteren Testdateien.
- [ ] [app/verwaltung/katalog/[id]/CatalogControls.test.tsx:68] `const sendeAb = klickeIm;` – zweiter Name für dieselbe Funktion.
- [ ] [app/verwaltung/katalog/[id]/CatalogControls.test.tsx] Busy-Text nur für „Anlegen …" belegt; „Umbenennen …"/„Duplizieren …" und `disabled={pending}` am Aktivieren-Knopf (`CatalogControls.tsx:197`) ohne Test.
- [ ] [app/components/ui/Toaster.test.tsx:62] `getByRole("status").parentElement!` hängt am DOM-Aufbau; Karte über Rolle/Namen finden.
- [ ] [app/verwaltung/theke/ThekeSetup.tsx:18] `ensureThekeAction` ist idempotent – „Theke angelegt" erscheint auch, wenn sie schon existierte.
- [ ] [docs/factory/lessons/frontend-react.md:8-24] Lesson #49 empfiehlt im Präsens einen handgebauten `useCallback`-Wrapper; Verweis auf `useSchliessendeAction` als den einen Weg ergänzen (Lesson #176).

## Positives

- Server Actions: `removeAuslageAction`/`setAuslageStatusAction`/`setTeilnehmerActiveAction` prüfen Rolle → Ids → offene Veranstaltung → guarded UPDATE/DELETE mit Parent-Key und werten `undefined` aus; jeder neue Zweig hat einen eigenen Test. Keine neuen Mehrfach-Writes (Neon-HTTP unkritisch).
- Löschsperren (AK9–AK11): eine reine Funktion für Seite und Action, ohne Zusatzabfrage, feste Reihenfolge getestet; Sperr-Dialog auf `Dialog` statt Sonderfall in `ConfirmDialog` (ADR-058 D3); `sperren` Pflicht-Prop (FS4).
- `react-hot-toast` sauber gekapselt (nur `Toaster.tsx`/`meldung.ts`), 18 Testdateien mocken nur `meldung`; `STANDZEIT_MS` benannt, Grenze 4999/5000 ms exakt getestet; 5-s-Dauer greift auch für `toast.success` (Bibliothek nachgeprüft).
- Toast genau einmal und nur bei `result.ok`, Text aus der Render-Closure des Absendens.
- Fokus: Ersatzziel für „Auslage löschen" samt Erfolgsfall-Test (Lessons #371/#373); `AktivSchalter` behält seinen Knoten über den Statuswechsel.
- Portal-Lösung für FS6 mit Mutationsbeleg im E2E und Nachtrag in ADR-058 – genau die Art Nachweis, die die Lessons verlangen.
- `CatalogModal`/`useCloseOnSuccess` vollständig abgeräumt; gelöschte Tests haben je einen verhaltensbasierten Ersatz.
- AK18: alle neuen Texte glossar-konform, die vier #372-Abweichungen gestrichen; `AuslageRow.tsx` im Farb-Gate mit Wiring-Test.
- Routen unverändert, `docs/routes.md` stimmt weiter.

## Out-of-Scope

- Issue **#402** – `useSchliessendeAction` nach seiner Rolle als Rückmelde-Hook umbenennen (sieben Aufrufer schließen nichts; ~20 Dateien + ADRs).
- `docs/factory/kleinfunde.md`: rohe Farbklassen in `AuslageForm`/`auslagen/page`/`TeilnehmerRow`; die drei älteren Kopien der Bestätigungs-Steuerung; kein Lint-Gate gegen direkte `react-hot-toast`-Importe; vierte `login`-Kopie am bestehenden E2E-Helfer-Eintrag ergänzt.

## Empfehlung

NEEDS_REWORK
