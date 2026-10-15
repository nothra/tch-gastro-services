# Review: Task 406

> Iteration 1 · Diff `origin/main...HEAD` (30 Dateien, 6 Commits bis `18cb2ab`) · drei Runden
> (Logik, Code-Qualität, Architektur). Vitest der 8 betroffenen Dateien: 131/131 grün,
> Coverage der 8 Produktivdateien 100 % (Statements/Branches/Functions/Lines). E2E nicht gelaufen.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/components/ui/AktionsMenue.tsx:50-59, :72, :83 + app/veranstaltung/AuslageRow.tsx:199-211] **Menü lässt sich während laufender Erstattungs-Action schließen – Ablehnung verpufft stumm (AK3.4/FS2 nur teilweise erfüllt).** Die Einträge hängen nur, solange `offen` (`{offen && …}`, Z. 77). Außenklick (`pointerdown`, Z. 51), Escape (Z. 83) und erneuter Tipp auf ⋯ (Z. 72) schließen ohne Rücksicht auf `pending`. Dann ist `ErstattungUmschalten` samt `useActionState` ausgehängt: eine Ablehnung erscheint nie als `Notice`; ein Erfolg ruft über `useSchliessendeAction` trotzdem `schliessen()` → Fokus springt auf ⋯, auch wenn der Nutzer woanders steht. `Dialog`/`FormularDialog` sperren Schließen während der Action (`schliessbar`/`gesperrt`) – laut Lesson #369 gehört der Sperr-Vertrag in den Baustein. Zusätzlich nimmt `disabled={pending}` (AuslageRow Z. 208) dem fokussierten Eintrag den Fokus, das Popup-`onKeyDown`-Escape greift dann nicht mehr. **Fix:** Sperre im `AktionsMenue` (z. B. `MenueSteuerung.meldeLauf(laeuft)` / `gesperrt`), die Außenklick, Escape und Auslöser-Toggle während einer Action blockiert; Tests mit nie auflösendem Promise (Lesson #370) für Außenklick, Escape und Auslöser-Tipp während `pending` + Ablehnung danach sichtbar.
- [ ] [eslint/color-gate-wiring.test.ts:122-127] **Diskriminierungs-Kontrolle ist grün aus dem falschen Grund.** `should_notReport_when_fileIsNotOnTheList` lintet `CODE_WITH_RAW_COLOR` (JSX) unter `app/veranstaltung/labels.ts` – in einer `.ts`-Datei ist JSX ein Parse-Fehler (`Parsing error: '>' expected.`, `ruleId: null`), der Filter auf `RULE_ID` liefert `[]` unabhängig vom Listenstatus (Lessons #214, #172/#297). **Fix:** ungelisteten `.tsx`-Nachbarn verwenden (z. B. nicht existierender, ähnlicher Pfad wie `app/veranstaltung/AuslageNeu.tsx` oder eine reale ungelistete `.tsx` in `app/veranstaltung/`), und zusätzlich assertieren, dass keine `fatal`-Meldung vorliegt – idealerweise im Helfer `rawColorMessages` für alle Fälle.
- [ ] [app/veranstaltung/AuslageRow.tsx:66-67 + docs/adr/061-…-auslagen.md:136-137] **„Kartenoptik ist im Test an `ListenZeile` gebunden (Drift-Anker)" stimmt nicht.** `AuslageRow.test.tsx:500-511` vergleicht nur mit Literalen; `ListenZeile` wird weder importiert noch gerendert – eine Änderung in `ListenZeile.tsx:142` ließe den Test grün (die `gap-3`/`gap-2`-Abweichung zeigt es bereits). „X erzwingt Y"-Behauptung ohne Enforcer (Lesson code-style #319/#59). **Fix:** Entweder echte Bindung (gemeinsame exportierte Karten-Klassen-Konstante aus `ListenZeile.tsx`, von `AuslageAnzeige` genutzt – dann entfällt auch der Drift) oder Kommentar und ADR auf „mit festen Token-Literalen abgesichert" zurückschneiden.
- [ ] [docs/adr/059-bausteine-listenzeile-aufklapper.md:9-10, :44-50 · docs/adr/060-listenzeile-dialog-ausloeser-notice-warnung.md:41 · docs/adr/052-ui-grundlage-eigene-bausteine-tokens-farb-gate.md:49-56] **Rückverweise auf ADR-061 fehlen.** ADR-059 hat einen Nachtrag für ADR-060 (Button-Modus, `anhang`), aber keinen für den neuen Slot `kennzeichen`; ADR-060:41 zählt die gemeinsamen Props ohne `kennzeichen` auf (liegt jetzt in `GemeinsameProps`, `ListenZeile.tsx:45`); ADR-052 D1 führt neue Bausteine als Nachträge (#369, #403), `AktionsMenue` fehlt. Lesson #211/#176. **Fix:** je ein Nachtrag-Satz mit Link auf ADR-061.

## Nitpicks (optional)

- [ ] [docs/adr/061-…-auslagen.md D1] API-Beschreibung von `MenueEintrag` driftet: Code hat zusätzlich `type?: "button" | "submit"` (AktionsMenue.tsx:115); der erste Eintrag wird per `querySelector('[role="menuitem"]')` (Z. 49) gefunden, keine Fokus-Ref über den Baustein (Lesson #211).
- [ ] [docs/adr/061-…-auslagen.md, Implementierungs-Hinweis 2] Fordert Gate-Einträge für `AktionsMenue.tsx` und `ZeilenMenue.tsx` – beide waren schon gedeckt (`app/components/ui/` in `ui-token-files.mjs:16`, `ZeilenMenue.tsx` seit #369); der Code-Kommentar `ui-token-files.mjs:60-61` sagt es richtig.
- [ ] [app/veranstaltung/AuslageRow.tsx:70] Nur-lesen-Karte `gap-3` vs. `ListenZeile` `gap-2` – „dieselben Karten-Tokens" laut ADR (erledigt sich mit gemeinsamer Konstante, s. o.).
- [ ] [app/veranstaltung/[id]/auslagen/page.tsx:19] Kommentarzeile ~150 Zeichen, Rest der Datei auf ≤ 100 umbrochen.
- [ ] [app/components/ui/AktionsMenue.tsx:34] JSDoc „jedes Öffnen beginnt ohne den Zustand des letzten" ohne Test – z. B. Erstatten ablehnen → Menü schließen → wieder öffnen → kein `alert`.
- [ ] [app/components/ui/ListenZeile.test.tsx:343-372] `should_renderKennzeichenInsideTippZielAfterText_when_buttonMode` prüft nur `toContainElement`, die „AfterText"-Reihenfolge wird nur im Link-Modus belegt; der reale Konsument nutzt Button-Modus (Lesson #318).
- [ ] [app/veranstaltung/[id]/auslagen/page.test.tsx:160] `toBeGreaterThanOrEqual(1)` ohne Variabilitätsquelle – `AuslageRow` ist gestubbt, Zählung exakt prüfen (Lesson #322).
- [ ] [app/veranstaltung/AuslageForm.test.tsx:54] Helfer `renderErfassen` wird auch für Bearbeiten genutzt → `renderFormular`.
- [ ] [app/veranstaltung/AuslageForm.test.tsx:148-160] Erfassen-Erfolgstest prüft `zweck` (Notiz, AK1.3) im FormData nicht.
- [ ] [app/veranstaltung/AuslageRow.tsx:117 + e2e/helpers/auslagen.ts:35-37] Menü-Label `Aktionen für <Name>` ist bei mehreren Auslagen eines Teilnehmers nicht eindeutig (Screenreader; Playwright-Strict-Mode im Helfer). Spec erlaubt es – Hinweis für später (Betrag/Kategorie ins Label).
- [ ] [app/veranstaltung/AuslageRow.tsx:27-30] `STATUS_BADGE` codiert „offen"/„erstattet" hart statt kurzer Badge-Variante in `labels.ts` neben `AUSLAGE_STATUS_LABEL` (gewollte Abweichung zu „offen zu erstatten", AK2.2).
- [ ] [app/veranstaltung/AuslageRow.tsx:208-210] „Als erstattet markieren" ohne Busy-Text („<Verb> …", Glossar Z. 60) – vorbestehend, keine Regression.
- [ ] [docs/ux/glossar.md:148] Stand-Satz nennt #372, die Zeilen 181/182/188 sind auf #406 umgestellt.
- [ ] [docs/factory/kleinfunde.md:471-472] Anker `AbschlussAktion.tsx:61-76` deckt die Was-Behauptung nicht (Offen-Zustand Z. 57, `onClose`/`returnFocusRef` Z. 85-86); im PR umgeschrieben, Datum noch 2026-10-09 (Lesson #351) → `:57-87`, Datum aktualisieren.
- [ ] [app/components/ui/AktionsMenue.tsx:77-88] `role="menu"` mit `<form>`/`Notice`-Kindern und ohne Pfeiltasten-Navigation – bewusst per ADR-061 D3, nur für eine A11y-Runde vermerkt.

## Out-of-Scope (klassifiziert nach ADR-018/ADR-043)

- **Issue #419** (bug, test): Fokus nach erfolgreichem Teilnehmer-Entfernen landet auf `<body>` – `ZeilenMenue.tsx:21` ohne `ersatzFokusId`, `:64-67` `onErfolg: onClose` statt `schliessenNachErfolg`. Vorbestehend (origin/main identisch), Auslöser reproduzierbar → Issue.
- **kleinfunde.md** (bestehender Eintrag „E2E-Helfer `login` und `createVeranstaltung` …" ergänzt): fünfte `login`-Kopie in `e2e/auslagen.spec.ts:33`.

## Positives

- Keine Server-Logik geändert (`app/**/actions*`, `db/` nicht im Diff); IDs bleiben serverseitig gebunden (`createAuslageAction.bind(null, id)`, `updateAuslageAction.bind(…)`) – AK5.3, F1, F3 strukturell erfüllt.
- `AktionsMenue` bündelt den Menü-Verhaltensvertrag (Escape, Außenklick, Fokus rein/raus) an einer Stelle, route-neutral (nur `./Button`, `./joinClasses`); `ZeilenMenue` schrumpft, `ZeilenMenue.test.tsx` unverändert grün. `MenueEintraege`-Umweg für `react-hooks/refs` mit WHY-Kommentar.
- Lesson #373 umgesetzt: `onSubmit` + `startTransition`, Eingaben bleiben nach Ablehnung, `Notice` im Dialog.
- Fokus-Verträge vollständig: Bearbeiten → Zeile, Löschen-Abbrechen → ⋯, Löschen-Erfolg → `AUSLAGEN_LISTE_ID` (bleibt im Leerzustand), Erfassen im Leerzustand → Seitenkopf-Auslöser; je mit Test.
- Muster konsistent mit #405/Katalog (`AnlegeDialog` + `imLeerzustand`, `useFormularDialog`, `useBestaetigung` + `schliessenNachErfolg`); `AuslageErfassen` als Client-Hülle sauber begründet.
- Tests: Literale als Soll-Werte, Symmetrie Erstatten ↔ Zurücknehmen beidseitig, offene Actions in `afterEach` mit `act` aufgelöst (Lesson #370), 100 % Coverage.
- Farb-Gate vollständig, Gegenprobe Unterseite korrekt auf ungelistetes `[id]/verzehr/page.tsx` umgestellt; erledigter Kleinfund entfernt; Glossar-Anker, Anleitung Schritt 5, Capture-Spec und E2E-Helfer mitgezogen (Lesson #391, exakte Locatoren); Screenshot korrekt als menschlicher Vor-Merge-Schritt markiert. ADR-061 Accepted; ADR-053/058 nachgezogen; `docs/routes.md` nicht betroffen; kein `nextjs-agent-rules`-Block im Diff.

## Empfehlung
NEEDS_REWORK
