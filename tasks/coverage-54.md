# Test-Vervollständigung Task 54 — Coverage-/Vollständigkeitsbericht

Scope: `db/veranstaltung.ts`, `app/veranstaltung/actions.ts` (`applyVerzehrAdjust` +
`adjustVerzehrByTokenAction`), `app/theke/[token]/page.tsx`, `app/theke/[token]/IdentityGate.tsx`,
`app/veranstaltung/[id]/ZugangTeilen.tsx`, `app/veranstaltung/[id]/page.tsx` (Einbindung),
`lib/base-url.ts`. Review-Runde 2 war bereits **APPROVED**, keine offenen kritischen/wichtigen
Findings.

## AC-Vollständigkeit (spec-54)

| AC | Test(e) | Status |
|----|---------|--------|
| A — Link+QR auf `theke/[token]`, nur offen | `ZugangTeilen.test.tsx` (`should_buildThekeUrlFromToken`, `should_showLinkToThekeRoute`, `should_renderQrForTheThekeUrl`); `app/veranstaltung/[id]/page.test.tsx` (`should_showZugangTeilen_when_veranstaltungOffen`, `should_hideZugangTeilen_when_veranstaltungAbgeschlossen`) | ✅ |
| B1 — ohne Login: Liste+Summen sichtbar | `page.test.tsx` (theke) `should_showPickerAndReadOnlyList_when_openAndNoStoredName`; `IdentityGate.test.tsx` (`should_showPickerAndReadOnlyList_when_noStoredName`, Stale-Variante) | ✅ |
| B2 — Namenswahl → Erfassen für ganze Liste, Summen live | `IdentityGate.test.tsx` (`should_storeNameAndEnableErfassung_when_pickName`, `expectAllMengeEditable(true)` für **alle** Zeilen) | ✅ |
| B3 — Name je Gerät gemerkt, „Person wechseln" | `IdentityGate.test.tsx` (`should_enableErfassung_when_storedNameValid`, `should_clearNameAndShowReadOnlyPicker_when_personWechseln`) | ✅ |
| B4 — Neuer Teilnehmer NICHT anlegbar | **Ergänzt:** `page.test.tsx` (theke) `should_notOfferNewParticipant_when_openAndNoStoredName` — prüft Abwesenheit von Textfeldern/„anlegen"-Buttons | ✅ (neu) |
| C1 — abgeschlossen → Read-only | `page.test.tsx` (theke) `should_renderReadOnlyWithoutGate_when_abgeschlossen`; `IdentityGate.test.tsx` `should_renderReadOnlyWithoutPicker_when_notEditable` | ✅ |
| C2 — serverseitige Ablehnung bei Erfassung nach Abschluss | `actions.test.ts` `adjustVerzehrByTokenAction` → `should_rejectAndNotPersist_when_veranstaltungClosed` | ✅ |
| D1 — ungültiges Token → neutraler 404 | `page.test.tsx` (theke) `should_notFound_when_tokenUnknown`; `actions.test.ts` `should_returnNeutralErrorAndNotPersist_when_tokenUnknown`; `db/veranstaltung.test.ts` `should_returnUndefined_when_tokenUnknown` (DB-Integration) | ✅ |
| D2 — Token stabil, keine Rotation/Ablauf | Kein Rotations-/Ablauf-Code im Schema/Data-Layer (architekturell garantiert, ADR-034); nichts Zusätzliches sinnvoll testbar | ✅ (by design) |
| E1 — Theke-Typ über `theke/[token]` identisch (inkl. Essen) | **Ergänzt:** `page.test.tsx` (theke) `should_workSameWayIncludingEssen_when_veranstaltungTypIsTheke` | ✅ (neu) |
| E2 — geteiltes Gerät, „Person wechseln" mehrfach | `IdentityGate.test.tsx` `should_clearNameAndShowReadOnlyPicker_when_personWechseln` (deckt den Wechsel-Mechanismus generisch ab) | ✅ |
| F — token-scoped Autorisierung, kein IDOR | `actions.test.ts` `should_authorizeWithoutRole_when_tokenValid` (kein `requireRole`), `should_rejectAndNotPersist_when_zeileBelongsToAnotherVeranstaltung` (IDOR, `getZeile` mit korrekter `veranstaltungId` aufgerufen), `should_returnErrorAndNotPersist_when_deltaOutOfRange` | ✅ |
| Fehlerszenario: Token-Raten verhindert | `db/veranstaltung.ts` — 256-bit Token, keine Constant-Time-Sonderbehandlung nötig (dokumentiert im Code); kein zusätzlicher Test sinnvoll (kein Enumerationsvektor bei Zufallstoken) | ✅ (by design) |

## Coverage vorher/nachher

Aggregat unverändert (die zwei neuen Tests decken bereits vollständig abgedeckte Zeilen/Branches
zusätzlich AC-spezifisch ab, keine neuen Statements):

- Tests: 529 passed / 59 skipped → **531 passed / 59 skipped** (+2 neue Tests, alle grün)
- `app/theke/[token]` (Ordner-Aggregat): 97.67 % Stmts / 100 % Branch / 93.75 % Funcs / 100 % Lines
  (unverändert)
- `app/veranstaltung/[id]` (Ordner-Aggregat): 94.44 % Stmts / 100 % Branch / 80 % Funcs / 100 % Lines
  (unverändert)
- `app/veranstaltung/actions.ts`: 99.57 % Stmts / 98.78 % Branch / 100 % Funcs / 100 % Lines
  (unverändert)
- `lib/base-url.ts`: 100 % / 100 % / 100 % / 100 % (alle Branches inkl. `127.0.0.1`- und
  `NEXTAUTH_URL`-Fallback-Zweig abgedeckt)
- `db/veranstaltung.ts`: Integrationstests (`skipIf(!hasDb)`) decken `getVeranstaltungByToken`
  Treffer/Miss ab, laufen lokal ohne `DATABASE_URL` nicht (siehe unten) — **kein Blocker**, Standard-
  Konvention dieses Projekts (analog `catalog.test.ts`).

## Was ergänzt wurde

- `app/theke/[token]/page.test.tsx`:
  - `should_workSameWayIncludingEssen_when_veranstaltungTypIsTheke` (AC E1) — `veranstaltung.typ =
    "theke"`, `datum: null`, Katalog mit `getraenk`+`essen`-Artikel; belegt, dass die Route nirgends
    auf `typ` verzweigt und Essen eingeblendet bleibt.
  - `should_notOfferNewParticipant_when_openAndNoStoredName` (AC B4) — prüft, dass kein Textfeld und
    kein „anlegen/hinzufügen/neu"-Button existiert (nur Auswahl aus der Liste).
- Neue Test-Datei-Anzahl: 0 (nur 2 Tests in bestehender Datei ergänzt).

## Test-Qualität

- Alle geprüften Tests folgen AAA, `should_X_when_Y`-Namen, unabhängig/deterministisch (kein
  `sleep`, kein ungemockter `Date.now`/`Math.random`).
- Mocking-Grenze eingehalten: Data-Layer (`db/*`) und `next/cache`/`next/navigation` sind gemockt,
  interne Business-Logik (`applyVerzehrAdjust`, `IdentityGate`) läuft ungemockt.
- Assertions gegen Literale (z. B. `lib/base-url.test.ts` prüft feste erwartete URL-Strings, nicht
  eine aus derselben Quelle abgeleitete Erwartung).
- IDOR-Test (`should_rejectAndNotPersist_when_zeileBelongsToAnotherVeranstaltung`) verifiziert sowohl
  die Ablehnung als auch den korrekten `getZeile`-Aufruf mit `("z1", "v1")` — die IDOR-Bindung selbst
  ist zusätzlich auf DB-Ebene in `db/veranstaltung.test.ts` (`should_notRemoveZeileOfOtherVeranstaltung…`,
  `should_notSetErhaltenOfOtherVeranstaltung…`) mit echten Zeilen abgesichert.

## Bewusst offen (dokumentiert, kein Blocker für diesen Schritt)

- **`IdentityGate.tsx` Funktions-Coverage 92.3 %:** Der `getServerSnapshot`-Fallback von
  `useSyncExternalStore` (`() => null`, dritter Parameter) wird in jsdom nie aufgerufen, weil
  `window` dort immer existiert (kein echter SSR-Render ohne `window`). Eine sinnvolle Abdeckung
  bräuchte einen `react-dom/server`-Rendering-Test nur für diesen Trivialfall — unverhältnismäßig
  für einen reinen Hydration-Fallback. Bereits in Review-Runde 2 als 100 % Branch/Line
  dokumentiert; die verbleibende Funktions-Lücke ist eine reine Test-Infrastruktur-Grenze, kein
  Verhalten.
- **Cross-Tab-`storage`-Event (`IdentityGate.tsx:34`):** Registrierung ist getestet (100 %
  Branch/Line), das native Event selbst wird in keinem Test ausgelöst — bereits als optionaler
  Nitpick in Review-Runde 2 akzeptiert.
- **DB-Integrationstests (`db/veranstaltung.test.ts`, u. a. `getVeranstaltungByToken`):** laufen
  lokal in dieser Session ohne `DATABASE_URL` nicht (0 % Line-Coverage für `db/veranstaltung.ts` im
  lokalen Report) — `skipIf(!hasDb)` ist projektweite Konvention (analog `catalog.test.ts`), läuft
  in CI mit echter DB. Kein Blocker, nur dokumentiert.
- **Out-of-Scope-Funde (nicht Teil von Task 54, nicht angefasst):**
  - `app/veranstaltung/actions.ts:117` (`createWalkInAction`, `ziel` nicht gefunden) und `:324`
    (`ensureThekeAction`, `kasse`-String-Parsing) sind vorbestehende, unveränderte Zweige ohne
    eigenen Test — außerhalb des #54-Diffs, nicht angerührt (Scope einhalten).
  - `app/veranstaltung/[id]/page.tsx` (Filter-Callback `bereitsErfasst`, vorbestehend seit #52/#120)
    ungetestet (Funktions-Coverage 75 %) — außerhalb des #54-Diffs.
  - `app/_verzehr/VerzehrErfassung.tsx:17` trägt einen **veralteten Kommentar** („F7 reicht … einen
    Katalog **ohne** Essen herein"), der der aktuellen spec-54-Entscheidung („Essen bleibt
    eingeblendet") widerspricht. Datei ist laut Review-Runde 2 „bestehend, nicht in diesem Diff
    geändert" — als Doku-Drift-Fund für ein Folge-Issue vorgemerkt, nicht in diesem Testing-Schritt
    behoben (kein Produktionscode-/Kommentar-Edit in `/test`).

## Ausführung

- `pnpm test`: **531 passed / 59 skipped** (590 total), keine roten Tests.
- `pnpm test:coverage`: Aggregat unverändert (86.4 % Stmts / 93.72 % Branch / 70.99 % Funcs /
  86.35 % Lines) — alle Task-54-Dateien vollständig abgedeckt (Ausnahmen s. o., alle dokumentiert
  und außerhalb des Scopes bzw. architekturell bedingt).
