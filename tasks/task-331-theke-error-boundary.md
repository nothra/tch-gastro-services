# Task 331: theke-error-boundary

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Die Theken-Erfassung stürzt hinter „Application error: a client-side exception has occurred" ab,
wenn `proxy.ts` einen Server-Action-`POST` mit der HTML-429 der Drossel beantwortet (#297 /
ADR-048 D5) – eine Antwort außerhalb des Server-Action-Protokolls. Es existiert im gesamten
`app/`-Baum keine Error-Boundary, also läuft die Exception bis in Next' Default-`GlobalError`.
Dasselbe passiert heute schon bei einem Netz-/Offline-Fehler während einer Action; #297 macht die
Fehlerklasse nur billig auslösbar (Schreib-Budget ist **ohne** gültiges Token erschöpfbar).

Drei Bausteine + ADR-Nachzug, Details und Begründungen in
[spec-331](../docs/specs/spec-331-theke-error-boundary.md):

1. `app/theke/[token]/error.tsx` mit festem Text + `reset()`-Knopf (deckt auch den Offline-Fall ab)
2. `proxy.ts`/`lib/theke-throttle-response.ts`: gedrosselte Anfrage **mit** Action-Ausweis bekommt
   429 mit exakt `content-type: text/plain`; der Lesepfad bleibt bei HTML
3. Modul-Kommentar `app/_verzehr/MengeControl.tsx` präzisieren
4. ADR-048 D4 um die neue Asymmetrie ergänzen

Nicht im Scope: app-weite Boundary, Logging des Drosselns (Kleinfund), Änderungen an Budgets,
`not-found.tsx`, Anzeige von `error.message`/`error.digest`.

## Akzeptanzkriterien
- [x] AK-1 Boundary fängt den Absturz: GIVEN Schreib-Budget erschöpft WHEN +/− gedrückt THEN eigene Fehlerfläche statt „Application error: a client-side exception has occurred"
- [x] AK-2 Erholung ohne Reload: GIVEN Fehlerfläche sichtbar WHEN „Erneut versuchen" gedrückt THEN `reset()` wird aufgerufen
- [x] AK-3 Kein fremdbestimmter Text: GIVEN beliebiger Fehler THEN weder `error.message` noch `error.digest` in der Ausgabe
- [x] AK-4 Action-POST bekommt Klartext: GIVEN Schreib-Budget erschöpft WHEN Anfrage mit `Next-Action`-Header gedrosselt THEN 429 mit `content-type` exakt `text/plain` (kein `; charset=utf-8` – strikter Vergleich in `server-action-reducer.js:117`) + kurzer Body
- [x] AK-5 Lesepfad bleibt HTML: GIVEN Lese-Budget erschöpft WHEN Anfrage ohne Action-Ausweis gedrosselt THEN weiterhin `text/html; charset=utf-8` (beide Richtungen assertieren, Lesson #211)
- [x] AK-6 Header beider Varianten: GIVEN gedrosselte Antwort (Lese- oder Schreibpfad) THEN `retry-after` = Fensterlänge in Sekunden + `cache-control: no-store`
- [x] AK-7 Eine Quelle für die Fensterlänge: GIVEN Klartext nennt eine Wartezeit THEN aus `THEKE_RATE_LIMIT_WINDOW_MS` abgeleitet, kein zweites `60`-Literal
- [x] AK-8 Kommentar-Zusicherung präzisiert: GIVEN Modul-Kommentar `MengeControl.tsx` THEN Geltungsbereich = Action-Fehlerzustände, Proxy-Antwort außerhalb des Protokolls → Boundary
- [x] AK-9 ADR-048 D4 nachgezogen: GIVEN Action-Zweig liefert Klartext THEN beschreibt D4 die Asymmetrie samt Begründung
- [x] AK-10 Kein Routen-Doku-Drift: GIVEN `error.tsx` hinzugefügt THEN `docs/routes.md` unverändert und `routes-doc-check.sh` grün

## Fehlerszenarien
- [x] FS-1 Offline-Fall mit abgedeckt: GIVEN kein Netz WHEN Action abgeschickt THEN Fehlerfläche statt Absturz
- [x] FS-2 Kein Enumerations-Leak durch den Klartext: GIVEN gültiges vs. erfundenes Segment THEN Antworten ununterscheidbar
- [x] FS-3 Kein Endlos-Absturz: GIVEN Budget nach `reset()` noch erschöpft WHEN erneut gedrückt THEN wieder Fehlerfläche, keine Schleife
- [x] FS-4 `notFound()` läuft nicht über die Boundary: GIVEN unbekanntes Token THEN neutrale Not-Found-Antwort
- [x] FS-5 Boundary ist nicht selbst die Fehlerquelle: GIVEN `error.tsx` THEN `"use client"`, kein Server-only-Import, kein DB-Zugriff, unabhängig von den Seiten-Props

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Kein ADR-Trigger – die Entscheidungen sind gesetzt. ADR-048 D4 wird im selben PR nachgezogen
(AK-9), es entsteht keine neue ADR.

Verifizierte Grundlagen (an den installierten Versionen nachgelesen, `next@16.2.12` /
`react-dom@19.2.8`):
- `server-action-reducer.js:113` – Antwort ohne `text/x-component`/`x-action-redirect` → `throw`
- `server-action-reducer.js:117` – Body nur bei `contentType === 'text/plain'` als Meldung
- `find app -name 'error.tsx' -o -name 'global-error.tsx'` → leer, es gibt heute keine Boundary
- `routes-doc-check.sh:42` – der Drift-Check scannt nur `page.tsx`/`route.ts`

## Offene Fragen
- [x] OF-1 Ort der Klartext-Antwort: **zweiter Export** `tooManyRequestsPlainTextResponse()` in
      `lib/theke-throttle-response.ts` – Modul-Header aktualisiert, `RETRY_AFTER_SECONDS` bleibt
      die einzige Quelle für beide Antworten.
- [x] OF-2 Wortlaut: deutsch, freundlich, ohne 429-Spezifika in der Fehlerfläche
      („Da ist etwas schiefgelaufen" + „Erneut versuchen"); der Klartext-Body nennt Sekunden aus
      `THEKE_RATE_LIMIT_WINDOW_MS`, ohne Token/Veranstaltung.

## Root Cause [2026-09-09]

`proxy.ts` (isServerActionRequest-Zweig) – die 429-Antwort für einen gedrosselten Server-Action-
`POST` war identisch zur Lese-Antwort (HTML). `server-action-reducer.js:113/117` (next@16.2.12)
akzeptiert als gültige Action-Antwort nur `text/x-component`/`x-action-redirect` oder Klartext mit
EXAKT `content-type: text/plain`; alles andere führt zu `throw` während des Renderns
(`useThenable`, react-dom-client). Da im gesamten `app/`-Baum keine Error-Boundary existierte,
lief die Exception bis in Next' Default-`GlobalError` und zeigte „Application error: a client-side
exception has occurred" statt einer Inline-Fehlermeldung.

## Fix

1. `app/theke/[token]/error.tsx` (neu) – Client-Error-Boundary, fester Text + `reset()`-Knopf.
2. `lib/theke-throttle-response.ts` – neuer Export `tooManyRequestsPlainTextResponse()`
   (429, `content-type: text/plain`, gleiche `retry-after`/`cache-control` wie die HTML-Variante).
3. `proxy.ts` – der Server-Action-Zweig liefert bei erschöpftem Budget jetzt
   `tooManyRequestsPlainTextResponse()` statt `tooManyRequestsResponse()`; der Lesepfad bleibt
   unverändert bei HTML.
4. `app/_verzehr/MengeControl.tsx` – Modul-Kommentar präzisiert (Geltungsbereich des sichtbaren
   Action-Fehlers vs. Boundary-Fall).
5. `docs/adr/048-rate-limit-theke-leseroute.md` D4 – Asymmetrie HTML/Klartext nachgezogen.

Hinweis für `/codify`: Das auslösende Muster – ein früher Gate-/Drossel-Zweig vor einer
Server-Action-Route muss deren Antwortprotokoll einhalten, sonst globaler Client-Crash statt
Inline-Fehler – ist bereits als Lesson aus #297 indexiert
(`docs/factory/PROJECT-CONTEXT.md` → `lessons/next-auth.md`, Issue #331 dort schon verlinkt).

## Refactor-Notiz

Beide Review-Nitpicks bewusst nicht umgesetzt:
- Header-Duplikation (`status`/`retry-after`/`cache-control`) zwischen `tooManyRequestsResponse`
  und `tooManyRequestsPlainTextResponse`: bei zwei Funktionen kein Muss laut `clean-code.md`
  ("kein Over-Engineering für 3-Zeilen-Funktionen") – Extraktion erst beim dritten Vorkommen.
- Proxy-Kommentar (Zeilen 75-78): paraphrasiert ADR-048 D4 knapp, verweist aber korrekt auf die
  kanonische Quelle – kein Widerspruch, keine Drift, kein Refactoring-Bedarf.
Der Testname-Nitpick wurde bereits in `/test` behoben (echter Cross-Check statt Literale).
Keine strukturellen Änderungen nötig – Tests vor/nach identisch grün (31/31 in den drei
task-relevanten Dateien).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/331-theke-error-boundary`
Erstellt: 2026-09-09 07:28
Spec: `docs/specs/spec-331-theke-error-boundary.md`
