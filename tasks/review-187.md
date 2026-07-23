# Review: Task 187

> **Review-Runde 4 – Circuit Breaker aufgelöst.** Der in Runde 1–3 offene kritische Fund
> (unvollständiger `FokusListe`-Move: alte `theke/[token]`-Dateien im Baum, rAF-Stub-Duplikat)
> wurde in Commit `f5c5ca6` behoben. **Verifiziert:** `app/theke/[token]/FokusListe.tsx`,
> `FokusListe.test.tsx` und `raf-stub.ts` sind entfernt; einziger verbliebener Verweis auf
> `./FokusListe` ist der korrekte Co-Location-Import in `app/_verzehr/FokusListe.test.tsx:3`;
> die route-neutralen Ersatzdateien liegen vollständig in `app/_verzehr/`. Die Eskalation aus
> Runde 3 hat den Fix ausgelöst – dieser Re-Review bewertet den bereinigten Stand.

## Kritische Findings (müssen behoben werden)
- keine (der zuvor eskalierte Move-Fund ist behoben, siehe oben)

## Wichtige Findings (sollten behoben werden)
- keine

## Nitpicks (optional)
- [ ] [app/_verzehr/FokusListe.tsx:63] Die Chip-Leiste kodiert den Rand-Bleed (`-mx-6 … px-6`)
  hart und setzt damit ein Eltern-Padding von `p-6` voraus. Beide Konsumenten (F5
  `app/veranstaltung/[id]/verzehr/page.tsx:47`, F7 `app/theke/[token]/page.tsx:34`) nutzen
  aktuell exakt `p-6`, daher stimmt es – aber jetzt, wo `FokusListe` route-neutral von zwei
  Seiten geteilt wird, ist das genau die in Lesson #188 gewarnte „Fremd-Layout-Offset
  hardcoden"-Kopplung (im selben Modul wird `scroll-mt-16` bewusst vom Konsumenten via
  `className` gesteuert). Latente Kopplung, kein Bug; pre-existing aus #183, keine Regression
  dieses PRs.
- [x] [app/veranstaltung/[id]/verzehr/page.tsx:65] Der Empty-State-Text „Noch keine Teilnehmer
  erfasst – zuerst Teilnehmer hinzufügen." dupliziert wortgleich den String aus
  `app/_verzehr/VerzehrErfassung.tsx:42`. Bewusst so (ADR-039 D4: wegabhängige Meldung, F7
  nutzt einen anderen Text) – bei einer künftigen Textänderung aber leicht zu übersehen.
  **Behoben im `/refactor`-Pass:** als `KEIN_TEILNEHMER_HINWEIS`-Konstante extrahiert, beide
  Stellen importieren sie jetzt statt den Wortlaut zu duplizieren.
- [ ] [app/veranstaltung/[id]/verzehr/page.test.tsx:99, app/_verzehr/FokusListe.test.tsx:52] Die `chip()`/`cardHead()`-Helfer unterscheiden Chip vs. Karten-Kopf über `new RegExp(name)` + An-/Abwesenheit von `aria-expanded`. Für die aktuellen Testdaten korrekt, wäre aber bei Anzeigenamen mit Regex-Sonderzeichen fragil. Reiner Test-Code, kein Produktionsrisiko – vertretbar.
- [ ] AC „F5 zeigt kein Gate / keine ‚Erfasser wechseln'-Leiste" ist strukturell durch `page.tsx` garantiert (rendert nur `FokusListe`, importiert `IdentityGate` gar nicht), aber ohne eigene negative Assertion getestet. Niedrigwertig – bewusst weglassen ist ok.

## Positives
- `FokusListe` (neu, `app/_verzehr/`) ist sauber route-neutral: Token-/`writeZielId`-Kopplung entfernt, Persistenz über den optionalen `onFokusWechsel`-Callback injiziert (ADR-039 D1, ADR-025 D5). F7 hängt seine geräte-lokale Ziel-Merkung im route-gebundenen Konsumenten an (`IdentityGate`, nur editierbarer Zweig), F5 lässt ihn weg – das F7-Verhalten (nur editierbar persistieren) bleibt exakt erhalten.
- `setState`-Updater bleiben rein: `toggle` delegiert Seiteneffekte an `waehleZiel` außerhalb der Updater-Funktion (Codify #183, mit erklärendem Kommentar).
- #188-Lessons konsequent angewandt: `scrollIntoView` guarded (`?.scrollIntoView?.`) und erst im `requestAnimationFrame`-Callback nach dem Reflow; `scroll-mt-16`-Offset bewusst beim Konsumenten (`FokusListe`), nicht in der route-neutralen `ZeileKarte` – abgesichert mit `should_deferScrollUntilAfterLayoutExpansion…` und `should_reserveScrollMarginTopClearingChipBar…`.
- Mock-Mapping-Lesson eingehalten: `should_showPositionMenge_when_positionExists` (page) bzw. `should_showOnlyOwnPositions_when_multipleZeilenHavePositions` (FokusListe) prüfen mit **befülltem** Positionen-Array das gemappte Ergebnis, nicht nur den Status.
- Empty-State beim Konsumenten mit wegabhängiger Meldung (ADR-039 D4, `page.tsx`); `docs/routes.md` präzisiert und der ADR-035-D2-Drift-Hinweis mitgepflegt. ADR-039 steht auf `Accepted`.
- Verhaltens-Äquivalenz F7 gegen `main` verifiziert: der frühere `if (editable) writeZielId(...)`-Guard in `waehleZiel` wandert 1:1 zum Konsumenten (editierbarer F7-Zweig reicht `onFokusWechsel`, read-only F7 und F5 lassen ihn weg) – kein neues fachliches Verhalten, exakt wie in Spec/ADR-039 gefordert.
- `VerzehrErfassung` bleibt korrekt erhalten (read-only-Liste im IdentityGate-Picker-Flow, spec-54 AC B) – kein toter Code entstanden.
- Alle 36 betroffenen Tests grün (`FokusListe`, `page`, `IdentityGate`); die volle Suite deckt jedes AC ab.

## Empfehlung
APPROVED
