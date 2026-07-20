# Review: Task 188

Scope (`git diff origin/main...HEAD`): `app/theke/[token]/FokusListe.tsx`,
`app/_verzehr/VerzehrErfassung.tsx` (+ zugehörige Tests) und die Task-Datei. Kein Fremd-PR-Leak
im Diff (Codify #161 geprüft). Bug-Fix zu #188 (Kartenfokus/Scroll).

## Kritische Findings (müssen behoben werden)

- Keine.

## Wichtige Findings (sollten behoben werden)

- [x] **Behoben in `/refactor`** (`className`-Prop an `ZeileKarte`, `scroll-mt-16` wird jetzt von
  `FokusListe` vorgegeben). [app/_verzehr/VerzehrErfassung.tsx:118] Die route-neutrale `ZeileKarte`
  (`app/_verzehr/`) hardcodete mit `scroll-mt-16` eine Offset-Höhe, die fachlich zur
  **F7-Chip-Leiste** in `FokusListe` gehört, und knüpfte sie an den `collapsible`-Modus. Kein Import-Verstoß gegen
  Codify #52 (nur ein Tailwind-Class-Literal, kein `app/theke`-Import), aber eine **leaky
  abstraction**: `collapsible` bedeutet „einklappbar", nicht „liegt unter einer ~3rem sticky
  Leiste". Zusätzlich gleicht **kein** Test den Offset (`scroll-mt-16`) gegen die tatsächliche
  Chip-Leisten-Höhe ab – ändert jemand später `py-2`/`text-sm` an der Leiste, driftet der Wert
  still. Empfehlung: den Offset vom Konsumenten steuern lassen (optionaler `className`/Prop an
  `ZeileKarte`, den `FokusListe` mit `scroll-mt-16` befüllt), oder den Trade-off bewusst als
  akzeptiert dokumentieren. **Nicht blockierend** (funktioniert; rem-basiert, skaliert mit der
  Leiste) – guter Kandidat für `/refactor` (kein Verhaltens-Change).

## Nitpicks (optional)

- [ ] [docs/adr/035-selbstbedienung-erfasser-ziel-fokus.md:71] D3 zitiert den Aufruf inline als
  `ref.current?.scrollIntoView?.({ block: "start" })`; er ist jetzt in `requestAnimationFrame`
  gewrappt und die Zielkarte trägt ein `scroll-margin-top`. Kein Architektur-Change (Codify #55
  greift nicht – Funktions-/Modulgrenzen unverändert), daher nicht zwingend; eine Halbzeile in
  D3 („Scroll rAF-verzögert nach dem Reflow, Karte mit scroll-margin unter der Sticky-Leiste")
  hielte die Doku aktuell.
- [ ] [app/theke/[token]/FokusListe.tsx:47] Der `requestAnimationFrame`-Callback wird bei Unmount
  nicht gecancelt. Nachweislich harmlos (doppeltes optional chaining + die Ref-Map-Cleanup-Logik
  in Zeile 90-91 löscht den Eintrag → `get(id)` liefert `undefined`), daher kein Fix nötig – nur
  als bewusster Verzicht notiert.

## Positives

- **Saubere TDD:** RED→GREEN belegt; 3 Reproduktionstests für die zwei Symptome plus ein
  Scope-Guard, der beweist, dass F5 (nicht-collapsible) **kein** `scroll-mt` bekommt – genau die
  „je separierbares Kriterium eine eigene Assertion + Negativ-Nachweis"-Regel (#116/#117).
- **Wurzelbehandlung statt Kaschierung:** beide Ursachen exakt adressiert – rAF für das
  Reflow-Timing (Screenshot 2), `scroll-margin` für den Sticky-Overlap (Screenshot 1). Kein
  try/catch-Symptomfix.
- **Robuste Wahl:** `scroll-mt-16` ist in Tailwind v4 rem-basiert (4rem) und skaliert proportional
  mit der ebenfalls rem-basierten Chip-Leiste – auch unter Font-Scaling bleibt der Kopf frei.
- **Konventionskonform:** bedingter className als Template-Literal wie im übrigen Code
  (kein `clsx`/`cn` im Projekt), Import-Richtung `app/theke → app/_verzehr` regelkonform.
- **Doku:** WHY-orientierte Kommentare an beiden Fundstellen; Task-Datei mit Root Cause, Fix,
  Verifikations-Hinweis (kein Browser-Check möglich, jsdom-Grenze offen benannt) und Codify-Muster.

## Empfehlung

APPROVED
