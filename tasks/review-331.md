# Review: Task #331

## Kritische Findings (müssen behoben werden)
- (keine)

## Wichtige Findings (sollten behoben werden)
- (keine)

## Nitpicks (optional)
- [ ] [proxy.ts:72-77] Der Kommentar über der `return isAction ? ... : ...`-Zeile beschreibt nur noch den Action-Zweig ausführlich; ein halber Satz, dass der Lesepfad bei HTML bleibt, steht zwar schon da ("Der Lesepfad bleibt bei HTML..."), aber die Begründung "ein menschlicher Browser-Aufruf, kein fetch" wiederholt D4 nur paraphrasiert – unkritisch, da ADR-048 D4/D4-Nachzug bereits die kanonische Quelle ist.
- [ ] [lib/theke-throttle-response.ts:49-76] `tooManyRequestsResponse` und `tooManyRequestsPlainTextResponse` duplizieren `status: 429`, `retry-after` und `cache-control` identisch, nur `content-type`/Body unterscheiden sich. Bei zwei Funktionen und drei Zeilen ist eine Extraktion (Shared-Header-Objekt) laut Clean-Code-Leitfaden ("kein Over-Engineering für 3-Zeilen-Funktionen") kein Muss – aber ein drittes Vorkommen sollte extrahiert werden, sonst driften die Header künftig unbemerkt auseinander.
- [ ] [lib/theke-throttle-response.test.ts:63-70] Testname `should_shareRetryAfterAndCacheControlWithHtmlVariant_when_called` verspricht einen Vergleich gegen die HTML-Variante, prüft aber nur hartkodierte Literale (`"60"`, `"no-store"`) ohne `tooManyRequestsResponse()` überhaupt aufzurufen. Kein Bug (Literal-Erwartung ist laut `testing-standards.md` sogar der bevorzugte Stil), aber der Name behauptet mehr, als der Test belegt – z. B. `should_return60RetryAfterAndNoStoreCacheControl_when_called` wäre ehrlicher, oder der Test vergleicht tatsächlich beide Responses gegeneinander.

### Runde 3 (Architektur & Konsistenz) – keine neuen Findings, nur Bestätigungen (siehe Positives)

## Positives
- Root-Cause-Kette (server-action-reducer.js:113/117, useThenable, fehlende Boundary) ist nachvollziehbar an den installierten Versionen verifiziert, nicht aus dem Gedächtnis behauptet.
- `RETRY_AFTER_SECONDS` bleibt konsequent die einzige Quelle für beide Antwortvarianten (AK-7) – kein zweites Literal eingeführt.
- `content-type: text/plain` ist bewusst ohne Parameter gesetzt und per Test (`should_return429WithExactPlainTextContentType_when_called`) exakt (nicht nur `toContain`) geprüft – trifft genau den strikten Vergleich in `server-action-reducer.js:117`.
- proxy.ts: `isAction`/`limiter` einmal ermittelt, `tryAcquire()` nur einmal aufgerufen, danach reine Verzweigung auf die Antwortvariante – keine doppelte Budget-Zählung, kein Off-by-one.
- Spiegel-Assertionen für die Asymmetrie HTML/Klartext in beide Richtungen vorhanden (`should_return429_when_thekeServerActionPostOverActionLimit` und `should_returnHtml429_when_thekeReadRequestOverLimit`), inkl. FS-2/FS-4-Enumerations-Leak-Tests für beide Pfade – entspricht Lesson #211.
- Scope exakt eingehalten: keine app-weite Boundary, keine Budget-/Fenster-Änderung, `docs/routes.md` unverändert (AK-10 durch `git diff --stat` bestätigt), `not-found.tsx` nicht angefasst (FS-4 unberührt).
- `error.tsx` ist eine reine Client Component ohne Server-only-Import/DB-Zugriff, unabhängig von Seiten-Props (FS-5) – zeigt weder `error.message` noch `error.digest` (AK-3).
- ADR-048 D4-Nachzug beschreibt die neue Asymmetrie samt Begründung, ohne die bisherige HTML-Entscheidung für den Lesepfad zurückzunehmen (Lesson #211/#176 beachtet).
- Alle drei neuen/geänderten Testdateien (`error.test.tsx`, `theke-throttle-response.test.ts`, `proxy.test.ts`) folgen konsequent `should_...when_...` und testen beobachtbares Verhalten (Rendertext, Response-Header/-Body, Statuscode) statt Implementierungsdetails – kein Zugriff auf interne State-Objekte oder private Funktionen.
- Alle neuen Branches sind abgedeckt: Action-Zweig throttled (Klartext) UND Lese-Zweig throttled (HTML) sind jetzt beide getestet (vorher fehlte der HTML-429-Test symmetrisch zum Action-Fall) – schließt exakt die in `lessons/testing.md` (#211) beschriebene Symmetrie-Lücke.
- Modul-Kommentare in `theke-throttle-response.ts` und `MengeControl.tsx` wurden konsistent von Singular auf Plural/neue Fälle nachgezogen (kein Widerspruch zwischen Prosa und den jetzt zwei Funktionen bzw. der neuen Fehlerklasse) – entspricht dem Codify-Learning zu Modul-Header-Pflege (#207).
- **Runde 3:** `app/theke/[token]/error.tsx` ist eine reine Client Component (`"use client"`) ohne Server-only-Import, ohne DB-Zugriff und ohne Abhängigkeit von Seiten-Props – Schicht-Grenze (FS-5) eingehalten; verifiziert per Diff-Lektüre der vollständigen Datei.
- **Runde 3:** ADR-048 D4-Nachzug (Zeilen 128–143) beschreibt die neue HTML/Klartext-Asymmetrie widerspruchsfrei zum übrigen ADR-Text – nimmt die bisherige HTML-Entscheidung für den Lesepfad nicht zurück, verweist konkret auf `server-action-reducer.js:113/117`, und ordnet die neue `error.tsx`-Boundary korrekt als zweite, ergänzende Verteidigungslinie ein (nicht als Ersatz für D4). ADR-Status bleibt `Accepted` – kein Statuswechsel nötig, da schon vor diesem PR akzeptiert.
- **Runde 3:** `docs/routes.md` ist laut `git diff origin/main...HEAD -- docs/routes.md` unverändert (leerer Diff), und `bash scripts/checks/routes-doc-check.sh` läuft grün (`Routen-Doku ist synchron mit dem app/-Baum`) – AK-10 empirisch verifiziert, nicht nur aus der Spec übernommen. `error.tsx` erzeugt erwartungsgemäß keine eigene Route (App-Router-Konvention).
- **Runde 3:** Code-Stil konsistent zur bestehenden HTML-Antwort: `tooManyRequestsPlainTextResponse` folgt demselben Modul, derselben `RETRY_AFTER_SECONDS`-Quelle und demselben Header-Set (`retry-after`, `cache-control: no-store`) wie `tooManyRequestsResponse` – keine zweite, abweichende Konstruktionslogik eingeführt. Keine neuen Abhängigkeiten (kein neues Package, kein neuer externer Aufruf).
- **Runde 3:** Die in `PROJECT-CONTEXT.md` (`lessons/next-auth.md`) explizit mit Issue #331 verlinkte Lesson ("Früher Gate-/Drossel-Zweig vor einer Server-Action-Route muss deren Antwortprotokoll einhalten") ist durch diesen PR tatsächlich aufgelöst: `tooManyRequestsPlainTextResponse()` liefert exakt `content-type: text/plain` ohne Parameter (trifft den strikten Vergleich in `server-action-reducer.js:117`), und `error.tsx` fängt den Rest-Absturz für den Fall, dass eine Antwort weiterhin außerhalb des Protokolls liegt (z. B. Offline-Fehler) – keine bloße Symptombehandlung, sondern Root-Cause-Fix plus Diagnose-Netz.

## Empfehlung

Basierend auf allen drei Runden (Runde 1+2: keine kritischen/wichtigen Findings, nur optionale Nitpicks; Runde 3: keine neuen Findings, Architektur/ADR/Routen/Lesson-Auflösung vollständig verifiziert):

APPROVED
