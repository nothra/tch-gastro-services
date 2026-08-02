# Review: Task 253

> 1. Review-Durchlauf. Diff-Scope: `git diff origin/main...HEAD` (6 Dateien, +583/−80).
> Geprüft gegen `docs/specs/spec-253-kassieren-position-bis-reload-behalten.md`,
> `docs/factory/PROJECT-CONTEXT.md` und die Lessons `frontend-react.md` / `testing.md`.
> Die beiden geänderten Testdateien laufen grün (35 Tests, lokal verifiziert).

## Kritische Findings (müssen behoben werden)
- (keine)

Alle acht Akzeptanzkriterien aus der Spec sind funktional umgesetzt; die Sortierung aus
spec-223 bleibt unangetastet, das Einfrieren wirkt ausschließlich innerhalb einer gemounteten
Sitzung. Der server-gerenderte `inhalt` bleibt inhaltlich live – die Trennung
„Position eingefroren / Inhalt aktuell" aus der Spec (Technische Notizen) ist im Code korrekt
abgebildet.

## Wichtige Findings (sollten behoben werden)
- [x] [app/veranstaltung/[id]/kassieren/page.test.tsx:404-418 i. V. m. :40-44] Der Test
      `should_keepPositionAndEditableForm_when_erhaltenOfKassierteZeileIsCorrected` deckt AC5
      nur zur Hälfte ab. Die Korrektur 2,50 € → 3,00 € (`arrangeVierZeilen({… bernd: 300 …})`)
      wird arrangiert, aber **nicht assertiert**: Der `KassiereZeileForm`-Stub (Zeile 40-44)
      rendert ausschließlich `zeileId`, nicht `initialErhalten`. Die Assertion
      `toHaveTextContent("z-b")` würde also auch dann grün bleiben, wenn die Seite der
      eingefrorenen Zeile einen **veralteten** Erhalten-Betrag mitgäbe. Genau das verbietet die
      Spec aber ausdrücklich („Das Badge … und die Formularanzeige (`initialErhalten`) müssen
      weiterhin die **aktuellen** Server-Daten je Zeile widerspiegeln"). Für das Badge ist der
      Live-Nachweis vorhanden (Zeile 386-387), für `initialErhalten` fehlt er – und zwar
      projektweit: `grep initialErhalten app/` findet außerhalb von `KassiereZeileForm.test.tsx`
      (isolierte Komponententests) keinen einzigen Konsumenten-Test. Fix: Stub um
      `{initialErhalten}` erweitern und im Test `toHaveTextContent("3,00")` prüfen. Das
      entspricht der Lesson „Callback-/Prop-Weiterreichung nur durch Codelesen belegt ist keine
      Testabdeckung" (aus #187) und „Mock-Default verdeckt Mapping-Code"
      (`docs/factory/guidelines/testing-standards.md`).
- [x] [app/veranstaltung/[id]/kassieren/page.test.tsx:420-432] Der Test
      `should_keepExistingSortBehaviour_when_veranstaltungIsAbgeschlossenViaStatusToggle` ist in
      seiner Sortier-Assertion **nicht diskriminierend** – er kann aus dem falschen Grund grün
      sein (Lesson aus #214). Rechnung: `arrangeVierZeilen({anna:250, bernd:null, carla:250,
      dora:null})` liefert alphabetisch [Anna, Bernd, Carla, Dora]; die stabile Server-Sortierung
      (`Number(bezahlt)`) ergibt [Bernd, Dora, Anna, Carla] – exakt die eingefrorene Reihenfolge.
      Vor **und** nach dem `rerender` ist Server-Reihenfolge ≡ eingefrorene Reihenfolge, die
      Assertion in Zeile 430 hält daher unabhängig davon, ob der Freeze greift oder gar nicht
      existiert. Aussagekräftig ist an diesem Test nur Zeile 431 (Formulare verschwinden bei
      `abgeschlossen`). Da die StatusToggle-Aktion `kassier.bezahlt` konstruktionsbedingt nicht
      verändert (Spec: „dort ändert sich `kassier.bezahlt` durch diese Aktionen ohnehin nicht"),
      ist ein *echt* diskriminierender Test hier nicht konstruierbar – deshalb: entweder den
      Testnamen/Kommentar so schärfen, dass er nur noch das tatsächlich Geprüfte behauptet
      (Formular-Wegfall + unveränderte Reihenfolge, mit explizitem Hinweis „beide Reihenfolgen
      sind hier per Konstruktion identisch"), oder die Sortier-Assertion in einen eigenen,
      benannten Regressions-Check überführen. So, wie es steht, suggeriert der Testname eine
      Absicherung von AC6, die er nicht leisten kann.
      – Dasselbe Muster (nicht diskriminierend, hier aber inhärent) betrifft
      `app/veranstaltung/EingefroreneZeilenListe.test.tsx:103-113`
      (`…_when_rerenderedWithUnchangedZeilen`, Fehlerszenario „Kassieren schlägt fehl"): Bei
      unveränderten Server-Daten sind beide Reihenfolgen zwangsläufig gleich. Ein kurzer
      Kommentar, dass der Test die *Statusstabilität* (Zeile 112) belegt und nicht den Freeze,
      genügt.

## Nitpicks (optional)
- [ ] [app/veranstaltung/EingefroreneZeilenListe.tsx:22, :26] Die Komponente ist neutral
      benannt und liegt route-neutral in `app/veranstaltung/`, hardcodet aber das Layout ihres
      einzigen Konsumenten (`flex flex-col gap-3` am `<ul>`, `rounded border border-zinc-200
      p-4 dark:border-zinc-800` am `<li>`). Die Lesson aus #188/#187 („Route-neutrale
      Komponente: Fremd-Layout vom Konsumenten via `className` steuern, nicht hardcoden")
      zielt genau darauf; vgl. auch das offene Issue #205 zum gleichen Muster. Solange es
      genau einen Konsumenten gibt, ist das unkritisch – zwei optionale Props
      (`listenClassName` / `zeilenClassName`) würden die Komponente aber wirklich
      wiederverwendbar machen. **Alternativ** (und ehrlicher): den Namen an den einzigen
      Anwendungsfall binden. Bewusst nicht als „Wichtig" eingestuft, weil der Umzug
      1:1 erfolgt ist (Diff geprüft: identische Klassen wie vorher) – keine visuelle
      Regression.
- [ ] [app/veranstaltung/EingefroreneZeilenListe.tsx:13-16 vs. app/veranstaltung/ZeileRow.tsx]
      Musterbruch zum bestehenden Stil: In diesem Verzeichnis besitzt bisher die *Zeilen*-
      Komponente ihr eigenes `<li>` (`ZeileRow`, `AuslageRow`); hier besitzt umgekehrt die
      Listen-Komponente das `<li>` und nimmt einen opaken `inhalt: ReactNode` entgegen.
      Funktional gleichwertig und mit dem Ziel „nur die Hülle wird Client-Komponente" gut
      begründet; eine `children`-basierte Variante mit einer server-gerenderten
      `KassierZeileRow` wäre näher am Bestand. Kein Handlungsbedarf, nur zur Kenntnis für
      künftige Listen.
- [ ] [app/veranstaltung/[id]/kassieren/page.tsx:114-177] Durch das Verschieben des
      Zeileninhalts in ein Prop-Objektliteral steckt jetzt ein ~60-zeiliges JSX-Fragment
      innerhalb eines `.map`-Callbacks innerhalb eines Props – die Verschachtelungstiefe der
      Seite ist gestiegen und `KassierenPage` bleibt mit ~160 Zeilen deutlich über der
      20-Zeilen-Orientierung aus `clean-code.md`. Eine Extraktion der Zeilendarstellung in eine
      präsentationale Server-Komponente (`KassierZeileInhalt`) im selben Verzeichnis würde
      Seite und Zeile entkoppeln. Kandidat für `/refactor`, kein Blocker (die Seite war auch
      vorher lang).
- [ ] [app/veranstaltung/EingefroreneZeilenListe.test.tsx:20-22] Der Helfer
      `namenInReihenfolge()` liest `li.querySelector("span")` – also das *erste* `<span>` – und
      funktioniert nur, weil die Fixture den Namen vor dem Status platziert. Ein
      `data-testid="name-…"` (analog zum bereits vorhandenen `status-…`) machte den Helfer
      unabhängig von der Fixture-Reihenfolge.

## Positives
- **Spec-Kern exakt getroffen:** Eingefroren wird ausschließlich die Reihenfolge der
  `zeile.id`s; der komplette Zeileninhalt (Badge, Getränke/Essen/Kaffee, Verzehr-Gesamt,
  Spende, `VerzehrAufschluesselung`, `initialErhalten`) bleibt server-gerendert und damit
  aktuell. Nur die `<ul>`/`<li>`-Hülle wandert über die Client-Grenze – die minimal mögliche
  Client-Fläche für diese Anforderung.
- **`useState`-Initializer statt `useEffect`** (`EingefroreneZeilenListe.tsx:19`) – vermeidet
  den in Lesson #49 (`react-hooks/set-state-in-effect`) beschriebenen Fallstrick und macht
  „Reload → Remount → Server-Sortierung" zum natürlichen Standardverhalten statt zum Sonderfall.
- **Sortierlogik unangetastet:** `page.tsx:73-79` (spec-223) ist unverändert; der Diff des
  Zeilen-Markups ist ein reiner 1:1-Move (Klassen byte-gleich) – keine visuelle Regression und
  keine zweite Wahrheitsquelle für die Reihenfolge.
- **Fail-safe in beide Richtungen und belegt:** `ordneNachEingefrorenerReihenfolge` hängt
  unbekannte Ids an (statt sie stillschweigend auszublenden) und überspringt entfallene Ids –
  beides mit eigenem Test (`:129`, `:144`), obwohl auf dieser Seite nicht erwartet.
- **Zweistufiger Testaufbau:** Komponente isoliert *und* die echte Kassierseite über
  `render` → `rerender` als simulierter `revalidatePath`-Zyklus. Der Reload-Test (`:435-444`)
  belegt die Gegenrichtung (Server-Sortierung nach Remount) – die Spiegel-Assertion aus
  Lesson #211 ist damit erfüllt.
- **Kommentare erklären das WHY** (Modul-Header in `EingefroreneZeilenListe.tsx:5-11`,
  Ergänzung an der Sortierung in `page.tsx:70-72`) und verlinken Issue/Spec – konform zu
  `clean-code.md`.
- **Refactoring der Testfixture:** `arrangeVierZeilen(...)` ersetzt den vorher inline
  duplizierten Setup-Block des Sortiertests, statt eine zweite Kopie danebenzulegen
  (vgl. Lesson #240).
- **Keine Routen-Änderung → `docs/routes.md` korrekt unberührt** (#145).
- **Ehrliche Task-Dokumentation:** Die nicht durchgeführte UI-Verifikation am Dev-Server ist in
  der Task-Datei mit Ursache (kein Docker/keine DB) und Ersatznachweis explizit vermerkt statt
  verschwiegen.

## Out-of-Scope-Findings (als Issue angelegt)
- **#271** – „E2E-Abdeckung für die Kassierseite (`/veranstaltung/[id]/kassieren`) aufbauen"
  (`enhancement`, `test`). Der echte RSC-Zyklus (Server Action → `revalidatePath` → neuer
  Payload bei erhaltenem Client-State) wird in den jsdom-Tests nur durch
  `rerender(await KassierenPage(...))` *simuliert*; dass der `useState`-Freeze eine echte
  Next.js-Revalidierung überlebt, ist damit nicht am laufenden System nachgewiesen. Eine
  E2E-Spec braucht Seed-Daten + Veranstalter-Login – Test-Infrastruktur weit außerhalb des
  #253-Scopes. Verwandt: #166.

## Empfehlung

NEEDS_REWORK

Die Implementierung selbst ist aus meiner Sicht fertig und korrekt – die beiden
Wichtig-Findings betreffen ausschließlich die **Beweiskraft der Tests** zu AC5 und AC6 und sind
klein (Stub um `initialErhalten` erweitern + eine Assertion; Testname/Kommentar schärfen).
Kein kritisches Finding, keine Änderung am Produktionscode erforderlich.
