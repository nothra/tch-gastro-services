# Task 331: theke-error-boundary

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
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
- [ ] AK-1 Boundary fängt den Absturz: GIVEN Schreib-Budget erschöpft WHEN +/− gedrückt THEN eigene Fehlerfläche statt „Application error: a client-side exception has occurred"
- [ ] AK-2 Erholung ohne Reload: GIVEN Fehlerfläche sichtbar WHEN „Erneut versuchen" gedrückt THEN `reset()` wird aufgerufen
- [ ] AK-3 Kein fremdbestimmter Text: GIVEN beliebiger Fehler THEN weder `error.message` noch `error.digest` in der Ausgabe
- [ ] AK-4 Action-POST bekommt Klartext: GIVEN Schreib-Budget erschöpft WHEN Anfrage mit `Next-Action`-Header gedrosselt THEN 429 mit `content-type` exakt `text/plain` (kein `; charset=utf-8` – strikter Vergleich in `server-action-reducer.js:117`) + kurzer Body
- [ ] AK-5 Lesepfad bleibt HTML: GIVEN Lese-Budget erschöpft WHEN Anfrage ohne Action-Ausweis gedrosselt THEN weiterhin `text/html; charset=utf-8` (beide Richtungen assertieren, Lesson #211)
- [ ] AK-6 Header beider Varianten: GIVEN gedrosselte Antwort (Lese- oder Schreibpfad) THEN `retry-after` = Fensterlänge in Sekunden + `cache-control: no-store`
- [ ] AK-7 Eine Quelle für die Fensterlänge: GIVEN Klartext nennt eine Wartezeit THEN aus `THEKE_RATE_LIMIT_WINDOW_MS` abgeleitet, kein zweites `60`-Literal
- [ ] AK-8 Kommentar-Zusicherung präzisiert: GIVEN Modul-Kommentar `MengeControl.tsx` THEN Geltungsbereich = Action-Fehlerzustände, Proxy-Antwort außerhalb des Protokolls → Boundary
- [ ] AK-9 ADR-048 D4 nachgezogen: GIVEN Action-Zweig liefert Klartext THEN beschreibt D4 die Asymmetrie samt Begründung
- [ ] AK-10 Kein Routen-Doku-Drift: GIVEN `error.tsx` hinzugefügt THEN `docs/routes.md` unverändert und `routes-doc-check.sh` grün

## Fehlerszenarien
- [ ] FS-1 Offline-Fall mit abgedeckt: GIVEN kein Netz WHEN Action abgeschickt THEN Fehlerfläche statt Absturz
- [ ] FS-2 Kein Enumerations-Leak durch den Klartext: GIVEN gültiges vs. erfundenes Segment THEN Antworten ununterscheidbar
- [ ] FS-3 Kein Endlos-Absturz: GIVEN Budget nach `reset()` noch erschöpft WHEN erneut gedrückt THEN wieder Fehlerfläche, keine Schleife
- [ ] FS-4 `notFound()` läuft nicht über die Boundary: GIVEN unbekanntes Token THEN neutrale Not-Found-Antwort
- [ ] FS-5 Boundary ist nicht selbst die Fehlerquelle: GIVEN `error.tsx` THEN `"use client"`, kein Server-only-Import, kein DB-Zugriff, unabhängig von den Seiten-Props

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
- [ ] OF-1 Ort der Klartext-Antwort: zweiter Export in `lib/theke-throttle-response.ts` (dann
      Modul-Header dort mitpflegen – er behauptet heute „Lese-Anfragen" und „nimmt kein Argument")
      oder eigenes Modul. Bedingung: `RETRY_AFTER_SECONDS` bleibt eine Quelle (AK-7)
- [ ] OF-2 Wortlaut von Fehlerfläche und Klartext-Body – deutsch, freundlich, keine 429-Spezifika
      in der Fehlerfläche (sie trägt auch FS-1)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/331-theke-error-boundary`
Erstellt: 2026-09-09 07:28
Spec: `docs/specs/spec-331-theke-error-boundary.md`
