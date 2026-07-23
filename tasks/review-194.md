# Review: Task 194

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/theke/[token]/IdentityGate.tsx:205-219 vs. 255-271] `ErfasserPicker` und `ZielPicker`
      duplizieren die komplette Select-Hülle (`aria-labelledby`, `defaultValue=""`, `onChange`,
      `className`, Platzhalter-`<option value="" disabled>Bitte wählen…</option>`). Bei nur zwei
      Aufrufstellen kein Muss, aber eine kleine gemeinsame Komponente würde die identischen Zeilen
      einmalig halten. (Code-Qualität-Review)
- [ ] [app/theke/[token]/IdentityGate.test.tsx:45-50] Der rAF-Stub-Helper (`rafCallbacks` +
      `flushRaf`) ist nahezu Byte-für-Byte identisch mit dem bereits bestehenden Helper in
      `FokusListe.test.tsx:31-36`. Zwei Testdateien pflegen denselben Test-Helper parallel –
      Drift-Risiko bei künftigen Änderungen. Kandidat für eine gemeinsame Test-Utility.
      (Code-Qualität-Review)

## Nitpicks (optional)

- [ ] [IdentityGate.tsx:180-186] `handleAuswahl` wird in beiden Aufrufern nur als Inline-Arrow
      verdrahtet – leicht redundant, keine funktionale Auswirkung. (Code-Qualität)
- [ ] [IdentityGate.tsx:212, 263] Platzhalter-Text `"Bitte wählen…"` ist als Literal zweimal
      vorhanden; würde bei einer Extraktion (siehe oben) automatisch mitkonsolidiert.
      (Code-Qualität)
- [ ] [IdentityGate.tsx:244-247] `cancelAnimationFrame`-Cleanup-Branch beim Unmount ist nicht
      dediziert getestet (geringes Risiko, reines Unmount-Guard-Verhalten). (Code-Qualität)
- [ ] [IdentityGate.tsx:199,238] `useId()` + `aria-labelledby` statt `<label>`-Wrapping wie sonst
      im Repo üblich – begründete Abweichung, da die Beschriftung ein `<h2>` ist (Frage als
      Überschrift, ADR-035 D1), kein neues `<label>`-Element. Kein Fehler. (Architektur-Review)
- [ ] [IdentityGate.tsx:174-175] Eigene `selectClass`-Konstante statt Wiederverwendung des
      repo-weiten `inputClass`-Musters (`AddTeilnehmerForm.tsx` u.a.) – sachlich vertretbar
      (`w-full`/`text-sm` passend zur Komponente), aber nicht deckungsgleich mit dem bestehenden
      Muster. (Architektur-Review)
- [ ] [IdentityGate.tsx:138, 265] `?? ""` bzw. `? ... : ""`-Fallback für `erfasserName` ist zur
      Laufzeit unerreichbar (`erfasserId` ist durch `readErfasserId`/`readValidId` bereits gegen
      `zeilen` validiert) – vorbestehendes Muster aus #183, nicht durch #194 neu eingeführt.
      (Logik-Review)

## Positives

- Alle Akzeptanzkriterien und beide Fehlerszenarien aus spec-194 sind 1:1 durch dedizierte,
  nicht-tautologische Tests abgedeckt (16/16 grün) – inkl. Options-Reihenfolge, Platzhalter-Guard,
  Ein-Teilnehmer-Fall und Fokus-Timing über den etablierten rAF-Stub-Ansatz.
- Fokus-Fix ist race-/leak-frei: `useEffect`-Cleanup ruft `cancelAnimationFrame` vor dem Unmount,
  kein Fokus auf ein bereits entferntes Element möglich.
- Klare Schicht-Trennung eingehalten: reine Client-Komponente, keine neue Dependency (`useId`/
  `useRef` aus dem bereits importierten `react`), `docs/routes.md` korrekt unverändert.
- Konsistent mit ADR-035 (Identitäts-Gate-Design, D1) – die separat entschiedene Sticky-Chip-Leiste
  in `FokusListe.tsx` (D3) bleibt unberührt.
- Sprechende Namen, WHY-Kommentare mit Spec-/Codify-Referenzen (#188), Testnamen konsistent nach
  `should_X_when_Y`.

## Empfehlung

APPROVED

Begründung: Keine kritischen oder korrektheitsrelevanten Findings über drei unabhängige
Review-Perspektiven. Die beiden „Wichtig"-Funde sind reine Duplikations-/Clean-Code-Themen ohne
Verhaltensänderung – lehrbuchmäßiges Material für die spätere `/refactor`-Phase (Clean-Code-Pass,
kein neues Verhalten) statt einer erneuten `/implement`-Iteration.
