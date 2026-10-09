# Review: Task 403

> Iteration 1 · Diff `origin/main...HEAD` (28 Dateien, +1501/−125) · drei Runden (Logik,
> Code-Qualität, Architektur) als Sub-Agenten; Kritisch-/Wichtig-Befunde im Orchestrator am Code
> bzw. an `node_modules/tailwindcss` gegengeprüft. Vitest/Playwright in diesem Schritt nicht
> ausgeführt (Review ist lesend).

## Kritische Findings (müssen behoben werden)
- [ ] [e2e/bausteine-listenzeile-aufklapper.spec.ts:64-66, 89, 94] Die Pfeil-Prüfung liest
  `getComputedStyle(el).transform`, Tailwind v4 (`tailwindcss ^4.3.3`) setzt `rotate-90` aber über
  die eigenständige CSS-Eigenschaft `rotate: 90deg` (verifiziert in
  `node_modules/tailwindcss/dist/lib.js`: `o("rotate", …)`). `transform` bleibt damit immer
  `"none"` → der Zu-Zustand ist grün ohne Aussage, der Offen-Zustand (`not.toBe(KEINE_DREHUNG)`)
  wird rot. Das ist der **einzige** Browser-Beleg für AK1.2 (die Task-Checkbox ist offen) – der
  geplante Lauf würde scheitern bzw. nichts belegen. Zusätzlich prüft `drehung()` per einmaligem
  `evaluate` direkt nach dem Umschalten (Z. 143, 169, 177), während `transition-transform` läuft →
  zeitabhängig. Fix: `await expect(pfeil(details)).toHaveCSS("rotate", "90deg")` bzw. `"none"`
  (prüft die richtige Eigenschaft und wiederholt bis zum Ende der Transition), `drehung()` und
  `KEINE_DREHUNG` entfernen.

## Wichtige Findings (sollten behoben werden)
- [ ] [app/components/ui/ListenZeile.tsx:50] Kartenrahmen `border-line-subtle` widerspricht
  ADR-052 D2 (Z. 106-107: „Bedienelement-Rahmen nutzen deshalb immer `line`, nie `line-subtle`"),
  während der ADR-052-Nachtrag (Z. 53-54) und ADR-059 behaupten, die ADR-052-Regeln „gelten
  unverändert". Drei der vier umgestellten Zeilen hatten vorher `border-line`. Spec AK2.1 und
  ADR-059 D1 verlangen `line-subtle` ausdrücklich, und ADR-052 Z. 82 nennt `line-subtle` zugleich
  für „Kartenrand" – der Widerspruch ist also in der Doku angelegt. Entweder `border-line`
  verwenden (AK2.1 nachziehen) **oder** in ADR-059 D1 eine begründete Ausnahme festhalten
  (ganze Karte ist Link, Erkennbarkeit über Titel/Pfeil, WCAG 1.4.11 verlangt für Links keinen
  Rahmen) und den Nachtrag in ADR-052 entsprechend formulieren.
- [ ] [app/veranstaltung/[id]/kassieren/page.tsx:269-272, app/veranstaltung/VerzehrAufschluesselung.tsx:19]
  Konsumenten übergeben Farb-Token per `className` an den Aufklapper (`border border-line-subtle
  bg-surface` bzw. `text-muted`) – gegen den eigenen Vertrag (`Aufklapper.tsx:23` „nicht für
  Farben", ADR-052 D1 Z. 56-57 „für Layout …, nicht für Farben"). Das Farb-Gate merkt es nicht
  (Token-Klassen), genau dieses Muster würden aber die Folge-Issues kopieren. Vorschlag:
  „Abrechnung im Detail" in die vorhandene `Card` (`app/components/ui/Card.tsx`, gleiche Optik)
  legen; `text-muted` an einen Wrapper um den Inhalt der Verzehr-Aufschlüsselung (Titel, Pfeil
  und Hinweis setzen ihre Farbe ohnehin selbst). JSDoc-Zeile `Aufklapper.tsx:23` („Rahmen")
  schärfen.
- [ ] [app/veranstaltung/ZeileRow.tsx:23-31 mit app/components/ui/ListenZeile.tsx:45,93]
  `aktion={editable && …}` übergibt bei abgeschlossener Veranstaltung `false` → `zeigtPfeil`
  wird `true`: die schreibgeschützte Teilnehmerzeile zeigt neu einen Pfeil, die bearbeitbare das
  ⋯. Verhalten ist ADR-D1-konform, aber eine sichtbare Änderung ohne Test: weder ein
  ListenZeile-Test mit falsy `aktion` noch ein ZeileRow-Test mit `editable={false}` prüft Pfeil
  vorhanden / Aktions-Container abwesend. Test ergänzen (beide Richtungen, Lesson #211).
- [ ] [e2e/bausteine-listenzeile-aufklapper.spec.ts, tasks/task-403-…md:24-26] F1/F2/F4 sowie der
  Browser-Beleg für AK1.2/AK1.3/AK1.5 hängen allein an dieser Spec, die nicht in CI läuft
  (`E2E_BAUSTEINE_403`) und noch nie gelaufen ist (jsdom wertet `group-open:` nicht aus, die
  Unit-Tests prüfen nur Klassennamen). Nach dem Fix aus K1 einmal laufen lassen (eigener Port,
  `localhost`, `db:migrate`+`db:seed`, Lessons #368/#374/#370) und die Checkbox schließen;
  braucht laut Task-Notiz die Freigabe des Menschen.

## Nitpicks (optional)
- [ ] [app/veranstaltung/[id]/ArbeitsschrittKacheln.tsx:28-35 / ListenZeile.tsx:50,57] Vorher
  `flex-col h-full` (Inhalt oben), jetzt `items-center` an `<li>` und Link → bricht ein
  Kacheltitel um, stehen die Nachbarkacheln vertikal zentriert statt oben. Kleine optische
  Abweichung von AK4.2 „unverändert" (nur per Code-Lesen, nicht im Browser geprüft).
- [ ] [app/components/ui/ListenZeile.tsx:44,66] Uneinheitliche Leer-Prüfungen: `untertitel !==
  undefined` und `zustand !== undefined` vs. Wahrheitswert bei `aktion`. `untertitel={x && …}`
  mit `null`/`false` ergäbe einen leeren `text-sm`-Span, `zustand=""` ein leeres Badge (verletzt
  „Zustand immer als Text").
- [ ] [app/components/ui/Aufklapper.tsx:40-50] `group-open:` greift bei **jedem** offenen
  `.group`-Vorfahren – ein zugeklappter Aufklapper in einem offenen zeigte gedrehten Pfeil und
  „Ausblenden". Heute nirgends verschachtelt (`group` kommt in `app/` nur hier vor); für die
  Folge-Issues im Kopfkommentar/ADR-059 D2 „nicht verschachteln" vermerken oder benannte Gruppe
  (`group/aufklapper`) nutzen.
- [ ] [app/components/ui/Aufklapper.tsx:48-51] Der Hinweis „Anzeigen"/„Ausblenden" geht in den
  zugänglichen Namen des `<summary>` ein („Abgeschlossen (2) Anzeigen, reduziert") – doppelt zum
  nativen Zustand; `aria-hidden` am Hinweis erwägen (nicht mit Screenreader geprüft).
- [ ] [docs/adr/059-bausteine-listenzeile-aufklapper.md:47,154 + D3-Tabelle] Drift im selben PR:
  `h-full` als Kachel-Beispiel (Code nutzt nur `min-w-0`); „Fünf Listen-Markups" – umgestellt
  sind vier; der knappste Kontrastwert (`foreground`·0,6 auf `accent-subtle`, hell ≈ 4,6 : 1) steht
  nur in der Task-Notiz, nicht in der D3-Tabelle.
- [ ] [docs/specs/spec-403-bausteine-listenzeile-aufklapper.md:159-170] Q2–Q5 stehen noch auf
  `[ ]`, obwohl Z. 151 sie als entschieden ausweist.
- [ ] [docs/ux/glossar.md:42-43] Neue Regel „Status-Badges … klein geschrieben als
  Partizip/Adjektiv" kollidiert mit dem bestehenden Badge in
  `app/veranstaltung/[id]/kassieren/KassierSummenKarte.tsx:44-46` („Alles bezahlt"/„Noch n
  offen"). Regel auf Zustands-Badges an Listenzeilen eingrenzen oder als Abweichung führen
  (Lesson #375).
- [ ] [app/components/ui/tokens.test.ts:158-181] Hell und dunkel in einem Test-Body ohne
  `expect`-Nachricht (bei Rot unklar, welches Theme); Gegenprobe „`muted` fällt unter
  `opacity-60` durch" nur im hellen Theme, obwohl ADR-059 D3 beide als ✗ führt.
- [ ] [app/components/ui/ListenZeile.tsx:50] `focus-within` am `<li>` greift auch, solange der
  nicht portalierte `ConfirmDialog` des `ZeilenMenue` offen ist (liegt im DOM im `<li>`) – rein
  kosmetisch; ein Satz in ADR-059 D1 zur Mechanik würde helfen.
- [ ] [app/veranstaltung/VerzehrAufschluesselung.tsx:9-12] Kopfkommentar nach der Einfügung nicht
  neu umbrochen (Z. 10 endet mitten im Satz).
- [ ] [scripts/format403.tmp.sh] Wegwerf-Datei liegt noch im Worktree (gitignoret, Lesson
  `build-tooling.md`) – vor dem Merge löschen.

## Positives
- Kontrast-Entscheidung D3 wird nachgerechnet statt behauptet: `tokens.test.ts` prüft die
  verblasste Zeile auf Karte **und** Hover-Fläche in beiden Themes, mit Gegenprobe (`muted`
  fiele durch → die Abweichung von „Zeile `opacity-60`" ist nötig) und festem Stützwert für die
  Überblendung; `contrastRatio` wird wiederverwendet.
- Aufklapper ohne State und ohne `"use client"`: natives `<details>` + `group-open:` funktioniert
  vor der Hydration, die Kassier-Seite bleibt Server Component.
- Zeilenaktion als Slot neben dem Link: kein verschachteltes interaktives Element, der Baustein
  bleibt route-neutral (Imports nur `next/link`, `react`, `./Badge`, `./icons`,
  `./joinClasses`); Test belegt „nicht im Link" und „Klick navigiert nicht".
- Baustein-Tests decken beide Richtungen ab (Pfeil ja/nein/bei `aktion`, verblasst ja/nein,
  Zähler gesetzt/fehlend/`0`, Überschrift h2/h3/ohne) gegen Literale; gelöschte
  Konsumenten-Assertions (Kachel-Reihenfolge, Leerzustand „Offen", rohe Farbklassen) sind
  gleichwertig ersetzt, nicht gelockert.
- Doku im selben PR mitgezogen: Farb-Gate-Liste samt gestrichenem „außen vor"-Kommentar,
  Glossar-Abgrenzung „Ausblenden ↔ deaktivieren", ADR-052-Nachtrag, AK2.5 in der Spec; keine
  Routen-Änderung → `docs/routes.md` zu Recht unberührt.
- E2E-Spec sauber aufgebaut: `__test__`-Präfix + Lauf-Suffix, keine absoluten Zählannahmen,
  `exact: true`, echter Lauf ohne JavaScript (F1), Tastatur-Bedienung des ⋯ (F4).

## Out-of-Scope
- Startseiten-Navigation `app/page.tsx:44` hat eine eigene Karten-Optik (`border-line`, `p-6`,
  `text-lg`). Bewusst **kein** Fund: das sind große Navigationskacheln, keine Listenzeilen – nicht
  Gegenstand von ListenZeile.

## Empfehlung
NEEDS_REWORK
