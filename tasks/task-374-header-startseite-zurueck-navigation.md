# Task 374: header-startseite-zurueck-navigation

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Header mit Wortmarke und Konto-Menü, Startseite mit offenen Veranstaltungen, `PublicHeader` auf `/theke/[token]`, einheitlicher `PageHeader` samt Zurück-Link auf Unterseiten, Kacheln „Verzehr erfassen"/„Auslagen erfassen". Spec: `docs/specs/spec-374-header-startseite-zurueck-navigation.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1.1–1.6 Header: Wortmarke, Navigation, Konto-Menü (Aufklapp), 375-px-tauglich
- [x] AK2.1–2.6 Startseite: Liste offener Veranstaltungen (nur `veranstalter`), Leer-Hinweis, Kacheln darunter
- [x] AK3.1–3.4 `PublicHeader` auf `/theke/[token]` (nicht bei ungültigem Token, nicht auf `/login`)
- [x] AK4.1–4.7 `PageHeader` + Zurück-Link auf Verzehr/Auslagen; Titel-Header auf Liste/Teilnehmer/Katalog-Index; „Kassieren" ohne Pfeil
- [x] AK5.1–5.3 Kacheln „Verzehr erfassen"/„Auslagen erfassen"
- [x] AK5.4 Anleitung + Screenshots aktualisiert – erst nach erfolgreichem `/implement` und `/review`
- [x] AK6 Lint, Tests, `routes-doc-check` grün; `docs/routes.md` aktuell
- [x] AK7 `docs/ux/ux-issue-entwuerfe.md` UX-7 angeglichen (in `/requirements` erledigt)

## Technische Notizen
ADR: `docs/adr/057-header-konto-menue-startseite-oeffentlicher-header.md` (ergänzt ADR-031).
- **Konto-Menü:** natives Popover (`popover` + `popovertarget`), keine eigene Fokus-Logik; Positionierung `fixed` oben rechts mit Safe-Area. Mindestbrowser Chrome 114 / Safari 17 / Firefox 125.
- **Header:** Hamburger · Wortmarke (`Link` auf `/`) · Desktop-Nav · `ml-auto` · Konto-Knopf; Hamburger/Konto `shrink-0`, Wortmarke `truncate`. `AppNav`-Props bleiben (`label` nur noch im Menü).
- **Startseite:** neue `listOffeneVeranstaltungen()` (DB-Filter `status='offen'`, `typ='veranstaltung'`, `datum DESC, created_at DESC`); nur aufrufen, wenn Rolle `veranstalter`; `try/catch` um genau diesen Aufruf, bei Fehler Hinweis + Kacheln. Liste als Komponente `app/veranstaltung/OffeneVeranstaltungen.tsx`. `docs/routes.md` Zeile `/` anpassen.
- **`PublicHeader`:** in `app/theke/[token]/page.tsx` nach dem `notFound()`-Check, `contextLabel={bezeichnung}`; auf Token-Klassen umstellen.
- **AK4:** `PageHeader` auf Verzehr/Auslagen (back = „Zur Veranstaltung“), Liste, Teilnehmer; „Kassieren“ ohne Pfeil. Farb-Gate (`eslint/ui-token-files.mjs`) nur um vollständig umgestellte Dateien erweitern (`AppNav`, `KontoMenue`, `PublicHeader`, `app/page.tsx`, `OffeneVeranstaltungen`); die vier Seiten folgen mit #373.
- **Tests:** jsdom kennt die Popover-API nicht, deshalb prüfen Unit-Tests Attribute und Verdrahtung, Öffnen/Escape/Fokus prüft Playwright. DB-Integrationstest für `listOffeneVeranstaltungen` mit `__test__`-Präfix (eigenes Namensfenster). Nach `next dev`: `git checkout -- CLAUDE.md`.
- **Reihenfolge:** Implementierung, dann `/review`, erst danach Anleitung und Screenshots (AK5.4).

### Notizen aus `/implement` (2026-10-04)
- **Zwei Sessions:** Code + Unit-Tests kamen aus einer ersten Session (`ae5ddc1`, `dc154ea`); die
  zweite hat `docs/routes.md` (Zeile `/`), das Farb-Gate (die fünf Dateien aus ADR-057 D5), die
  E2E-Specs und diese Task-Datei nachgezogen.
- **AK4.3 Katalog-Index:** `/verwaltung/katalog` ist eine reine Umleitung auf
  `/verwaltung/katalog/[id]`, und die Zielseite trägt bereits einen `PageHeader` – „soweit sie es nicht
  schon tut" ist damit erfüllt, keine Änderung.
- **`aria-expanded` am Konto-Knopf ist kein DOM-Attribut:** Chromium leitet den Zustand aus
  `popovertarget` nur in den Accessibility-Baum ab. Playwrights eigene ARIA-Berechnung
  (`getByRole({ expanded })`) kennt das nicht. `e2e/header-startseite.spec.ts` liest deshalb den
  echten AX-Baum über CDP, und zwar in beiden Richtungen (offen = `true`, nach Escape = `false`).
- **E2E-Nachweis:** Gelaufen gegen einen eigenen `next dev` dieses Worktrees auf `localhost:3000`
  (Port vorher frei geprüft, Lesson #368). `127.0.0.1` scheidet aus, weil Next dev dort die
  HMR-Ressourcen blockt (`allowedDevOrigins`): ohne Hydration bleibt der Drawer zu, und das sieht
  wie eine Regression aus. Standardlauf: 14/14 grün, 15 opt-in-Tests übersprungen. Die opt-in-Specs
  mit Datenanlage (`E2E_DETAILSEITE_369`, `_KASSIEREN_371`, `_VERANSTALTUNG_352`, `_VERZEHR_370`,
  `_WECHSEL_308`) liefen seriell ebenfalls grün, 14/14.
- **Nachgezogene Alt-Specs:** `auth.spec.ts` meldet sich jetzt über das Konto-Menü ab.
  `verzehr-einzelansicht.spec.ts` sucht „Kassieren" ohne Pfeil. In `anleitung-veranstalter.spec.ts`
  ist nur der Zurück-Link-Locator angepasst: der Pfeil ist `aria-hidden`, der zugängliche Name heißt
  „Zur Veranstaltung". Den Rest der Anleitung macht AK5.4 nach `/review`.
- **DB-Integrationstests** (`listOffeneVeranstaltungen` u. a.) mit `.env.local` ausgeführt: 118/118 grün.

### Notizen aus `/test` (2026-10-04)
- Volle Suite inkl. DB-Integrationstests (`dotenv -e .env.local`): 110 Dateien / 1510 Tests grün; Gesamt-Coverage 98,3 % Stmts / 98,3 % Branch.
- Alle in #374 geänderten Dateien (`AppNav`, `KontoMenue`, `PublicHeader`, `app/page.tsx`, `OffeneVeranstaltungen`, Seitenköpfe) stehen bei 100 % (der Report listet nur Dateien unter 100 %, keine davon ist betroffen); die Restlücke in `db/veranstaltung.ts` 239–249 (`getZeile`) ist vorbestehend.
- AK-Abgleich ohne Lücke: je AK1–AK5 (außer AK5.4 = Doku) Happy Path + Fehlerfall vorhanden (u. a. AK2.4 „keine Ladung ohne `veranstalter`", DB-Fehler-Hinweis, „Angemeldet"-Fallback, Pfeil ohne Text-`→`). Keine neuen Tests nötig.

### Notizen aus `/refactor` (2026-10-04)
- Die dreifach kopierten Header-Klassen (`focusClass`, `headerClass`, `iconButtonClass`) liegen jetzt
  in `app/components/headerStyles.ts`; `AppNav`, `KontoMenue` und `PublicHeader` importieren sie.
  Das Abmelden-Button-Styling in `KontoMenue` heißt `abmeldenButtonClass`. Das Verhalten bleibt
  gleich, 1398 Tests grün wie vorher.
- Drei Kommentar-Nitpicks aus dem Review sind erledigt: E2E-Verweis in `KontoMenue.test.tsx`,
  „Abmelden" → „Konto-Knopf" in `AppNav.test.tsx`, Satzbau in `personenbezug.ts`.
- Nachtrag (Review Runde 2): `headerStyles.ts` steht jetzt im Farb-Gate (`eslint/ui-token-files.mjs`),
  `PublicHeader` nutzt `focusClass` auch für den „Anmelden"-Link, ADR-057 nennt die Datei in den
  Konsequenzen und D4 trägt die `auth()`-/Session-Bedingung.
- Bewusst offen (nicht Refactoring, gehört zu AK5.4/Doku): die übrigen Nitpicks (Popover-Abstand zum `StageBanner`, Light-Dismiss-Fokus
  im E2E, `Kassieren →`-Fixtures in `VerzehrEinzelansicht.test.tsx`).

### Notizen aus AK5.4 und Merge (2026-10-05)
- `origin/main` (#392, ADR „Detailseite-Kopfaktionen") per Merge eingebracht; einziger Konflikt war
  ein Kommentar in `e2e/anleitung-veranstalter.spec.ts`. Die Header-ADR dieser Task heißt jetzt
  **ADR-057** (die `056` gehört #391); alle #374-Verweise sind nachgezogen, die #391-Verweise blieben.
- Bilder per Capture-Spec gegen eine Wegwerf-DB neu erzeugt (`01`–`12` plus neu `02b-konto-menue`
  und `04b-startseite-offene-veranstaltung`); eigener Dev-Server auf Port 3374, Wegwerf-DB danach
  gelöscht, `tch_dev` unberührt. `anleitung.md` auf Kopfzeile, Konto-Menü/Abmelden, Startseite,
  „Verzehr erfassen"/„Auslagen erfassen", Zurück-Links und „Kassieren" ohne Pfeil angepasst.
- `anleitung.pdf` (manueller Browser-Druck, #221) ist wie schon bei #388 **nicht** neu erzeugt und
  zeigt noch den alten Stand – bei Bedarf per VS-Code-Vorschau nachdrucken.

## Offene Fragen
_Keine._ Geklärt: Anleitung/Screenshots im selben PR nach erfolgreicher Implementierung + Review (AK5.4); Sortierung bei gleichem Datum nach Anlage-Zeit.

## Review-Findings
<!-- Wird durch /review befüllt -->
Runde 1 (2026-10-04): **APPROVED**, Bericht in `tasks/review-374.md`. 0 kritische, 2 wichtige
(ADR-057 D4 um Session-Bedingung/`auth()` ergänzen; E2E-Verweis in `KontoMenue.test.tsx:6` auf
`e2e/header-startseite.spec.ts` korrigieren), 6 Nitpicks. Die wichtigen Findings werden vor dem
Merge zusammen mit AK5.4 erledigt.

Runde 2 (2026-10-05): **APPROVED**, Bericht in `tasks/review-374.md` (ersetzt Runde 1). 0 kritische,
3 wichtige Findings: `app/components/headerStyles.ts` fehlt im Farb-Gate, `PublicHeader` nutzt
`focusClass` noch nicht, die ADR-057-D4-Ergänzung ist noch nicht committet. Dazu 8 Nitpicks. Aus
Runde 1 ist W2 erledigt, W1 ist inhaltlich fertig, aber noch nicht committet.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Codify (2026-10-05), Bericht in `tasks/codify-374.md`: vier Lessons (Popover/AX-Baum, Farb-Gate bei Refactor-Extraktion,
E2E `localhost` statt `127.0.0.1`, Wegwerf-`*.tmp.config.ts`). Offen: `*.tmp.config.ts` in `.gitignore` (Edit nicht
freigegeben) und AK5.4 (Anleitung + Screenshots) – beides vor dem Merge.

---
Branch: `feature/374-header-startseite-zurueck-navigation`
Erstellt: 2026-10-03 20:21

Blocker 2026-10-05: Pipeline pausiert – MERGE_CONFLICT: PR #394 steht auf CONFLICTING gegen origin/main (5461984, #392). Überlappung in app/veranstaltung/[id]/page.test.tsx, eslint/ui-token-files.mjs, docs/ux/ux-issue-entwuerfe.md, docs/factory/PROJECT-CONTEXT.md, e2e/anleitung-veranstalter.spec.ts, e2e/verzehr-einzelansicht.spec.ts und Task-Datei; zusätzlich ADR-Nummernkollision (zwei Dateien docs/adr/056-*). Außerdem offen: AK5.4 (Anleitung + Screenshots) und uncommittete /codify-Änderungen. Manuelles Eingreifen nötig. (/architecture ausführen, dann Pipeline neu starten)
