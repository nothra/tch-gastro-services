# Task 170: logout-race-options-head

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Der #164-Fix gegen die Logout-Session-Resurrection unterdrückt die Auth.js-Session-Rotation
nur bei `method === "GET"` (RSC/Prefetch). **OPTIONS- und HEAD-Requests** laufen aber ebenfalls
durch `proxy.ts`, rotieren das `authjs.session-token`-Cookie und können es nach dem signOut
wiederbeleben, wenn sie den Clear zeitlich überholen → Logout bleibt auf INT flaky.

Fix: Session-Rotation auf **allen nicht-mutierenden Methoden** unterdrücken (alles außer
POST/PUT/PATCH/DELETE) – erfasst GET/HEAD/OPTIONS in einem Schritt und beendet das Whack-a-Mole.
Die fragile `next-url`/`sec-fetch-dest`-Erkennung entfällt.

Spec: `docs/specs/spec-170-logout-race-nicht-mutierende-methoden.md`

## Akzeptanzkriterien
<!-- Quelle: docs/specs/spec-170-logout-race-nicht-mutierende-methoden.md -->
- [x] AC1 – GET: rotierendes Session-Set-Cookie wird aus der Proxy-Antwort entfernt.
      (`proxy.test.ts` should_stripSessionCookie_when_getRequest; Prädikat-Unit)
- [x] AC2 – HEAD: Session-Set-Cookie wird entfernt (keine Resurrection).
      (`proxy.test.ts` should_stripSessionCookie_when_headRequest; Prädikat-Unit)
- [x] AC3 – OPTIONS: Session-Set-Cookie wird entfernt (keine Resurrection).
      (`proxy.test.ts` should_stripSessionCookie_when_optionsRequest; Prädikat-Unit)
- [x] AC4 – POST/PUT/PATCH/DELETE: Session-Set-Cookie (setzen/löschen) bleibt unangetastet.
      (`proxy.test.ts` POST/DELETE keep; Prädikat-Units POST/PUT/PATCH/DELETE → false)
- [x] AC5 – Erkennung rein methodenbasiert (keine `next-url`/`sec-fetch-dest`-Abhängigkeit mehr).
      (Prädikat-Signatur nur `{ method }`; `next-url`/`sec-fetch-dest`-Logik ersatzlos entfernt;
      `should_returnTrue_when_getRequest`; Header im Proxy-Test leer)
- [~] AC6 – E2E: `pnpm test:e2e:int e2e/auth.spec.ts -g "Abmelden" --repeat-each=24` → 0 Fehler.
      Nachtest: läuft gegen die INT-Deployment; INT trägt den Fix erst nach dem Merge (aktuell
      noch #164 GET-only, weiterhin flaky). Verifikation nach dem INT-Deploy dieses Branches
      (bzw. via `/post-merge-verify`). Lokal nicht aussagekräftig ausführbar.
- [x] AC7 – Stolperstein #164 in `docs/factory/PROJECT-CONTEXT.md` auf „nicht-mutierende
      Methoden" korrigiert (Korrektur-Absatz + Regel-Bullets, Verweis auf ADR-032).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Entscheidung: **ADR-032** – Session-Rotation nur bei mutierenden Requests unterdrücken.

Bewusster Trade-off (aus Issue #170 / ADR-032): Die Rolling-Session erneuert sich danach nur
noch bei mutierenden Requests (Login-POST), nicht mehr bei jeder Navigation – für diese
wöchentlich genutzte PWA akzeptabel (feste `maxAge`, Default 30 Tage) und eher sicherer.

### Implementierungs-Hinweise (für /implement, TDD)
1. **`lib/prefetch-session.ts`**: `isRscRequest` durch method-basiertes Prädikat ersetzen
   (Name: `shouldSuppressSessionRotation`). Kern:
   ```ts
   const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
   export function shouldSuppressSessionRotation(request: { method: string }): boolean {
     return !MUTATION_METHODS.has(request.method);
   }
   ```
   `next-url`/`sec-fetch-dest`-Logik **ersatzlos entfernen**. `stripSessionRotation`
   (Regex, CSRF-/callback-url-Schutz, chunked Cookies) **unverändert lassen**.
2. **`proxy.ts`**: Import + Aufruf `isRscRequest` → `shouldSuppressSessionRotation` umstellen
   (nur `request` mit `method`, kein `headers` mehr nötig). Kein try/catch im Wrapper
   (fail-closed). Wrapper-Kommentar auf „nicht-mutierende Methoden" anpassen.
3. **`lib/prefetch-session.test.ts`**: Prädikat-Tests umstellen – GET/HEAD/OPTIONS →
   `true` (auch **ohne** `next-url`/`sec-fetch-dest`, AC5), POST/PUT/PATCH/DELETE → `false`.
   Die `stripSessionRotation`-Tests bleiben (Cookie-Selektivität nicht regredieren).
   Kompositionstest ergänzen: Proxy-Pfad strippt bei OPTIONS/HEAD das Session-Set-Cookie,
   bei POST nicht (deckt AC1–AC4 auf Proxy-Ebene ab).
4. **`docs/factory/PROJECT-CONTEXT.md`**: #164-Stolperstein korrigieren (AC7) – Kern ist
   „Rotation auf allen nicht-mutierenden Methoden unterdrücken", nicht die
   `next-url`/`sec-fetch-dest`-Erkennung. Verweis auf ADR-032.
5. **Verifikation (AC6)**: `pnpm test:e2e:int e2e/auth.spec.ts -g "Abmelden" --repeat-each=24`
   → 0 Fehler (E2E gegen INT, gehört in die Implementierungs-/Test-Verifikation).

### Implement-Notizen (2026-07-19)
- **Proxy-Kompositionstest liegt in `proxy.test.ts`** (nicht neu in `prefetch-session.test.ts`):
  Dort läuft der echte `proxy`-Wrapper gegen eine gemockte NextAuth-Middleware, die realen Helfer
  laufen mit – die authentischere AC1–AC4-Abdeckung auf Proxy-Ebene. Ein separater Kompositions-
  Block im Unit-File wäre Duplikat gewesen (clean-code, keine Duplikation).
- **Verhaltensänderung ggü. #164:** `proxy.test.ts` prüfte zuvor
  `should_keepSessionCookie_when_documentGetRequest` (Dokument-GET behielt das Cookie). Mit der
  method-weiten Regel strippt **jeder** GET (auch Dokumentaufrufe) – der Test wurde durch
  `should_stripSessionCookie_when_getRequest` (GET ohne Signale, AC1+AC5) ersetzt. Das spiegelt
  den bewussten Trade-off (Rolling-Session nur noch bei Mutationen, ADR-032).
- **`stripSessionRotation` unverändert** (Regex-Anker, CSRF-/callback-url-Schutz, chunked Cookies) –
  bestehende Tests bleiben grün (Selektivität nicht regrediert).

Blocker [2026-07-19]: AC6 (E2E `--repeat-each=24` gegen INT) offen – INT trägt den Fix erst nach
dem Merge, lokal nicht aussagekräftig. Mensch/Nachtest: nach INT-Deploy dieses Branches ausführen
(`pnpm test:e2e:int e2e/auth.spec.ts -g "Abmelden" --repeat-each=24`) bzw. `/post-merge-verify`.

### Test-Notizen (/test, 2026-07-19)
- **Coverage:** `lib/prefetch-session.ts` + `proxy.ts` bei 100% (Stmts/Branch/Funcs/Lines).
  Gesamte Suite weiterhin grün (432 passed, 52 unrelated skipped).
- **Duplikat entfernt (Review-Nitpick):** `should_returnTrue_when_getWithoutAnySignals` war seit
  dem Signatur-Wechsel auf `{ method }` identisch zu `should_returnTrue_when_getRequest` (keine
  zusätzliche Abdeckung, clean-code: keine Duplikation). Die AC5-Zuordnung („rein methoden-
  basiert") hängt jetzt am verbleibenden GET-Test; die Proxy-Komposition (`should_stripSessionCookie_when_getRequest`
  mit leeren Headern) belegt AC5 zusätzlich auf Wrapper-Ebene. 20→19 Tests, keine Coverage-Lücke.
- **Restliche Review-Nitpicks (Case-Normalisierung der Methode)** bewusst nicht in Tests gegossen:
  laut Review niedriges, sicherheits-neutrales Risiko (dokumentierte Rationale im Code-Kommentar
  reicht) – nicht blockierend, hier nicht nachgezogen.

### Refactor-Notizen (/refactor, 2026-07-19)
- **Kein Änderungsbedarf.** `lib/prefetch-session.ts`/`proxy.ts` + Tests erfüllen die
  Clean-Code-Checkliste bereits (sprechende Namen, kleine Single-Responsibility-Funktionen,
  benannte Konstanten statt Magic Strings, Guard Clauses, WHY-Kommentare, keine Duplikation –
  das Duplikat-Nitpick aus dem Review war schon in `/test` behoben, 19 Tests grün verifiziert).
- Das verbleibende Review-Nitpick (Case-Normalisierung von `request.method`) bleibt bewusst
  unangetastet: laut Review optional/nicht blockierend, und `.toUpperCase()` wäre eine
  Verhaltensänderung (Robustheit), kein reines Refactoring – widerspricht der Kernregel
  „kein neues Verhalten".
- `pnpm lint` + `pnpm vitest run lib/prefetch-session.test.ts proxy.test.ts` grün (19/19).

### Scope-/Branch-Check (Stolperstein #120)
Der Branch `fix/170-…` bündelt Code (`lib/`, `proxy.ts`, Tests) **und** eine ADR – für einen
Bugfix stimmig; kein Rename nötig (Art-Label `bug` passt, `security` bereits gesetzt).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->
Review (APPROVED) und Security-Review (PASSED) ohne kritische/wichtige Findings. Beide
Nitpicks (doppelter Prädikat-Test, Case-Normalisierung der HTTP-Methode) bereits behandelt
bzw. bewusst nicht gefixt (Verhaltensänderung widerspräche „kein neues Verhalten" im
Refactor) – kein neues Regel-Bedürfnis. Details: `tasks/codify-170.md`.

---
Branch: `fix/170-logout-race-options-head`
Erstellt: 2026-07-19 17:25
