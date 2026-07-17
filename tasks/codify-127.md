## Codify-Report: Task 127

### Muster-Analyse
- **Review (`review-127.md`): APPROVED, keine kritischen/wichtigen Findings.** Der Doku-Abgleich
  war beim ersten Anlauf korrekt (kanonische Slugs, Quell-Verweis, Scope-Disziplin). Keine
  Fehlerklasse aus dem Review zu codifizieren.
- **Kein Rework-Zyklus, kein Bug eingeführt.** Nichts, was eine neue Code-/Test-Regel triggert.

### Neue Regeln hinzugefügt
- Keine Änderung an `CLAUDE.md` / Guidelines / `PROJECT-CONTEXT.md` **auf diesem Branch** –
  bewusst (Scope-Disziplin): #127 ist eng auf das Essen-Katalog-Modell begrenzt. Das eine
  Prozess-Learning betrifft `start-work.sh` (Code) und gehört nicht in einen `docs/`-PR zum
  Essen-Modell.

### Prozess-Learning → als Issue erfasst (ADR-018)
- **Issue #131** – `start-work.sh` behandelt `--help`/`-h` nicht und akzeptiert ein flag-artiges
  erstes Argument als Kurzbeschreibung. In dieser Session hat `bash scripts/start-work.sh --help`
  still ein echtes Issue (#128, Titel „--help") + Worktree + Branch + Draft-PR angelegt; alles
  musste manuell zurückgebaut werden. Fix (Härtung + Begleit-Test) ist Code-Arbeit außerhalb des
  #127-Scopes → eigenes `enhancement`+`tech-debt`-Issue. Dort wird beim Umsetzen auch der
  „Bekannte Stolpersteine"-Eintrag in `PROJECT-CONTEXT.md` ergänzt (nicht hier, um den
  fokussierten Docs-PR nicht zu verwässern).

### Out-of-Scope-Fund aus dem Review (bereits erfasst)
- **Issue #130** – veraltetes „F4 Essenpreis je Abend"-Beispiel in `docs/adr/021`. Siehe
  `review-127.md`.

### Was überraschend gut lief
- Der Review-Schritt hat über die geänderten Zeilen hinaus **alle weiteren `docs/`-Kopien** des
  Essen-Modells gegen-geprüft (Grep über `essenpreis`/`pro Abend`/`Getränke-Katalog`) und dabei
  die out-of-scope-Drift in ADR-021 (#130) gefunden. Dieses „kanonische Quellen synchronisieren"-
  Vorgehen ist bereits als CLAUDE.md-Regel verankert und hat hier funktioniert – keine neue Regel
  nötig, nur Bestätigung.

### Empfehlung für nächste Features
- Bei Modell-/Regel-Änderungen den Review-Grep über **alle** Doku-Kopien beibehalten – hat hier
  eine echte Drift-Stelle aufgedeckt.
