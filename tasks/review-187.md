# Review: Task 187

> **Review-Runde 3 → CIRCUIT BREAKER.** Derselbe kritische Fund aus Runde 1 und Runde 2 ist
> **unverändert offen** (die alten `theke/[token]`-Dateien liegen weiterhin im Baum, Timestamp
> 13:02, keine Deletion im `git status`). Damit ist der Review zum 3. Mal auf denselben Code mit
> demselben ungelösten Befund angewendet worden. Gemäß CLAUDE.md („max. 3 Review↔Implement-
> Iterationen, dann eskalieren") wird **nicht weiter iteriert** – Eskalation an den Menschen.

## Kritische Findings (müssen behoben werden)
- [ ] [app/theke/[token]/FokusListe.tsx, FokusListe.test.tsx, raf-stub.ts] **Der „Move" ist nicht abgeschlossen – die alten Dateien liegen weiterhin im Baum** (verifiziert: `ls` zeigt alle drei, Timestamp 13:02 unverändert; `git status` zeigt keine Deletions). **Begründung:**
  - `app/theke/[token]/raf-stub.ts` ist ein **byte-identisches Duplikat** von `app/_verzehr/raf-stub.ts` (`diff` leer, verifiziert) → verletzt direkt **Codify #194** („rAF-Stub nicht duplizieren"), einen explizit in der Task-Datei genannten Guardrail.
  - `app/theke/[token]/FokusListe.tsx` ist **toter Code**: er trägt noch die alte token-gekoppelte Variante (`import { writeZielId } from "./erfasser-ziel-storage"`, `token`-Prop, `writeZielId(token, id)` im Inneren – verifiziert). Kein Produktionsmodul importiert ihn mehr – `IdentityGate.tsx` importiert `@/app/_verzehr/FokusListe`; ausschließlich das ebenfalls tote `app/theke/[token]/FokusListe.test.tsx` referenziert ihn (`grep` bestätigt: nur `FokusListe.test.tsx:3` `import { FokusListe } from "./FokusListe"`).
  - Die Gates sind **trotzdem grün**, weil das alte Testfile weiterläuft und die tote alte Variante testet – die grüne Suite **verdeckt** den unvollständigen Move. Die Implement-Notiz behauptet „Move abgeschlossen" und kündigt ein `git rm` an, das über zwei Runden nie ausgeführt wurde.
  - **Fix:** `git rm "app/theke/[token]/FokusListe.tsx" "app/theke/[token]/FokusListe.test.tsx" "app/theke/[token]/raf-stub.ts"`, die neuen `app/_verzehr/`-Dateien `git add`, danach Gates (`pnpm lint`, Test-Suite, `tsc --noEmit`) erneut grün ziehen.

## Wichtige Findings (sollten behoben werden)
- (keine)

## Nitpicks (optional)
- [ ] [app/veranstaltung/[id]/verzehr/page.test.tsx:98, app/_verzehr/FokusListe.test.tsx:55] Die `chip()`/`cardHead()`-Helfer unterscheiden Chip vs. Karten-Kopf über `new RegExp(name)` + An-/Abwesenheit von `aria-expanded`. Für die aktuellen Testdaten korrekt, wäre aber bei Anzeigenamen mit Regex-Sonderzeichen fragil. Reiner Test-Code, kein Produktionsrisiko – vertretbar.
- [ ] AC „F5 zeigt kein Gate / keine ‚Erfasser wechseln'-Leiste" ist strukturell durch `page.tsx` garantiert (rendert nur `FokusListe`, importiert `IdentityGate` gar nicht), aber ohne eigene negative Assertion getestet. Niedrigwertig – bewusst weglassen ist ok.

## Positives
- `FokusListe` (neu, `app/_verzehr/`) ist sauber route-neutral: Token-/`writeZielId`-Kopplung entfernt, Persistenz über den optionalen `onFokusWechsel`-Callback injiziert (ADR-039 D1, ADR-025 D5). F7 hängt seine geräte-lokale Ziel-Merkung im route-gebundenen Konsumenten an (`IdentityGate`, nur editierbarer Zweig), F5 lässt ihn weg – das F7-Verhalten (nur editierbar persistieren) bleibt exakt erhalten.
- `setState`-Updater bleiben rein: `toggle` delegiert Seiteneffekte an `waehleZiel` außerhalb der Updater-Funktion (Codify #183, mit erklärendem Kommentar).
- #188-Lessons konsequent angewandt: `scrollIntoView` guarded (`?.scrollIntoView?.`) und erst im `requestAnimationFrame`-Callback nach dem Reflow; `scroll-mt-16`-Offset bewusst beim Konsumenten (`FokusListe`), nicht in der route-neutralen `ZeileKarte` – abgesichert mit `should_deferScrollUntilAfterLayoutExpansion…` und `should_reserveScrollMarginTopClearingChipBar…`.
- Mock-Mapping-Lesson eingehalten: `should_showPositionMenge_when_positionExists` (page) bzw. `should_showOnlyOwnPositions_when_multipleZeilenHavePositions` (FokusListe) prüfen mit **befülltem** Positionen-Array das gemappte Ergebnis, nicht nur den Status.
- Empty-State beim Konsumenten mit wegabhängiger Meldung (ADR-039 D4, `page.tsx`); `docs/routes.md` präzisiert und der ADR-035-D2-Drift-Hinweis mitgepflegt. ADR-039 steht auf `Accepted`.

## Empfehlung
NEEDS_REWORK (Circuit Breaker erreicht – Eskalation statt weiterer Iteration)
