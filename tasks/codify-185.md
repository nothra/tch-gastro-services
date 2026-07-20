## Codify-Report: Task 185

### Neue Regeln hinzugefügt

- **`docs/factory/guidelines/clean-code.md`** – „Keine Fallbacks für vom Typsystem bereits
  ausgeschlossene Fälle": Ein `?? fallback`/`!== undefined`-Guard nach einem Record-Lookup, den
  der Typ (ohne `noUncheckedIndexedAccess`) bereits ausschließt, ist totes Verhalten und
  verfehlt 100 %-Branch-Coverage. Wegen: `/refactor` entfernte genau so einen toten `?? char`-
  Fallback in `berichtDateiname.ts:23` (aus dem Review als Nitpick markiert) und eine analoge
  tote `spalte !== undefined`-Guard in `berichtXlsx.ts`. *(bereits im Arbeitsbaum vorhanden,
  während des `/refactor`-Schritts geschrieben – hier verifiziert und mit committet.)*
- **`docs/factory/PROJECT-CONTEXT.md`** (Bekannte Stolpersteine) – „`/refactor`
  Turn-Limit-Exhaustion: Retry ohne Gedächtnis baut auf halbfertigem Fremd-Stand auf": Der
  automatisierte `/refactor`-Schritt lief 3× ins Turn-Limit ohne Commit; jeder Retry startete
  gedächtnislos auf dem halbfertigen Zwischenstand des Vorgängers. Regel: vor jedem Retry
  `git status`/`git diff` prüfen statt blind neu zu starten; bei wiederholtem Turn-Limit den
  Scope für einen einzelnen `/refactor`-Lauf als zu groß hinterfragen. *(ebenfalls bereits im
  Arbeitsbaum vorhanden – hier verifiziert und mit committet.)*
- **`docs/factory/guidelines/testing-standards.md`** – „Mock-Default mit leerem Array verdeckt
  Mapping-Code" (neu in dieser Codify-Session): Review-Finding (wichtig) an
  `bericht/route.ts:67-85` – die `zeilen.map`/`positionen.map`/`auslagen.map`-Lambdas, die
  DB-Rows auf `berichtModell`-Input übersetzen, liefen in `route.test.ts` ausschließlich über
  `mockResolvedValue([])` (nie mit befüllten Daten überschrieben) und waren dadurch faktisch
  ungetestet, obwohl Coverage grün war. `/test` hat den konkreten Fall bereits per
  `should_mapDbRowsIntoBerichtModell_when_zeilenPositionenAndAuslagenPresent` behoben – die
  Regel verallgemeinert das Muster (generisches Testing-Anti-Pattern, nicht projektspezifisch),
  damit zukünftige Route-/Action-Tests mit gemockten Listen-Data-Layer-Calls von vornherein
  einen befüllten Fall einplanen statt es erst im Review zu finden.

### Keine Änderungen nötig

- Security-Review: PASSED, keine kritischen/wichtigen Findings. Die drei Hinweise (transitive
  `uuid`-Advisory über `exceljs`, optionale Excel-Formula-Injection-Härtung, fehlende
  Pro-Nutzer-Eigentümerbindung) sind alle als nicht ausnutzbar bzw. konsistent mit der
  bestehenden Baseline eingestuft und bereits in `tasks/security-185.md` dokumentiert – kein
  Muster, das eine neue Regel rechtfertigt, kein Scope-sprengendes Folge-Issue nötig.
  Dependency-Override-Vorgehen ist bereits durch Codify #167 abgedeckt.
- Review-Nitpick „ADR-036 D4 schreibt eine Reihenfolge zu, die dort so nicht steht" ist bereits
  durch die bestehende Regel „ADR nach Review-Rework auf Drift prüfen" (Codify #55) abgedeckt –
  keine neue Regel nötig, nur eine Erinnerung, sie beim nächsten ADR-Bezug anzuwenden.
  Verbleibende Coverage-Nitpicks (zweiter `.replace(/-+$/g, "")`-Zweig in
  `berichtDateiname.ts:27`, Excel/PDF-Locale-Nuance bei Dezimaltrennzeichen) sind Einzelfälle
  ohne erkennbares Wiederholungsmuster – als Review-Historie ausreichend dokumentiert.

### Empfehlung für nächste Features

- Bei Server-Actions/Route-Handlern, die Listen aus Data-Layer-Mocks per `.map(...)` in ein
  Ziel-Modell übersetzen, von Anfang an (nicht erst im `/test`-Nachzug) einen Testfall mit
  befüllten Mock-Daten einplanen – siehe die neue `testing-standards.md`-Regel.
- Bei einem automatisierten Skill-Schritt, der wiederholt ans Turn-Limit läuft: vor dem nächsten
  Retry immer erst den Arbeitsbaum-Zustand (`git status`/`git diff`) prüfen, bevor man „einfach
  nochmal" startet.
