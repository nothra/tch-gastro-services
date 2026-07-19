# Task 170: logout-race-options-head

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
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
- [ ] AC1 – GET: rotierendes Session-Set-Cookie wird aus der Proxy-Antwort entfernt.
- [ ] AC2 – HEAD: Session-Set-Cookie wird entfernt (keine Resurrection).
- [ ] AC3 – OPTIONS: Session-Set-Cookie wird entfernt (keine Resurrection).
- [ ] AC4 – POST/PUT/PATCH/DELETE: Session-Set-Cookie (setzen/löschen) bleibt unangetastet.
- [ ] AC5 – Erkennung rein methodenbasiert (keine `next-url`/`sec-fetch-dest`-Abhängigkeit mehr).
- [ ] AC6 – E2E: `pnpm test:e2e:int e2e/auth.spec.ts -g "Abmelden" --repeat-each=24` → 0 Fehler.
- [ ] AC7 – Stolperstein #164 in `docs/factory/PROJECT-CONTEXT.md` auf „nicht-mutierende
      Methoden" korrigiert.

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

### Scope-/Branch-Check (Stolperstein #120)
Der Branch `fix/170-…` bündelt Code (`lib/`, `proxy.ts`, Tests) **und** eine ADR – für einen
Bugfix stimmig; kein Rename nötig (Art-Label `bug` passt, `security` bereits gesetzt).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `fix/170-logout-race-options-head`
Erstellt: 2026-07-19 17:25
