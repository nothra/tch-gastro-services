# Review: Task 318

> Diff-Scope: `git diff origin/main...HEAD` (4 Dateien) · Runde 1 von max. 3
> Verifikation: `pnpm vitest run` über `VerzehrErfassung.test.tsx`, `FokusListe.test.tsx`,
> `verzehr/page.test.tsx`, `kassieren/page.test.tsx` → **4 Dateien / 112 Tests grün**.
> Zwei Mutationsbelege gefahren (jeweils selbst-wiederherstellend, `git status` danach leer) –
> Ergebnisse unter W1 und im Abschnitt „Positives".

## Kritische Findings (müssen behoben werden)

_Keine._ Das Produktionsverhalten ist korrekt: die Verschiebung ist eine einzelne JSX-Zeile
(`VerzehrErfassung.tsx:148`), das Sichtbarkeits-Gate `koerperSichtbar` (`:113`) ist unverändert
und steht weiterhin vor dem Slot – spec-308 AK7/AK9/AK10 bleiben damit strukturell, nicht nur
zufällig, erhalten.

## Wichtige Findings (sollten behoben werden)

- [ ] **`app/_verzehr/VerzehrErfassung.test.tsx:626` – Reihenfolge-Assertion belegt AK1s
      „unmittelbar" nicht.** AK1 (`spec-318:57`) fordert „**unmittelbar** unterhalb des
      Kartenkopfs"; `expect(aktionIndex).toBeGreaterThan(kopfIndex)` prüft nur „irgendwo danach".
      **Empirisch belegt:** Mit einem zusätzlich zwischen Kopf und Slot gerenderten Fremd-Element
      (`<p>Zwischenzeile</p>` vor Zeile 148) bleiben **alle 40 Tests grün** – eine AK1-Verletzung
      bliebe also unentdeckt. Dass es heute faktisch Adjazenz ist, liegt allein an der Fixture
      (genau drei Kinder). Fix ist ein Token: `expect(aktionIndex).toBe(kopfIndex + 1)`.
- [ ] **`app/_verzehr/VerzehrErfassung.test.tsx:616` – der Reihenfolge-Nachweis liegt auf der
      Prop-Kombination, die gar nicht ausgeliefert wird.** Der neue Test nutzt den flachen Pfad
      ohne `collapsible`; der einzige Produktions-Konsument des Slots (`FokusListe.tsx:129`)
      rendert `ZeileKarte` aber **immer** mit `collapsible` (`FokusListe.tsx:118`), wo der Kopf ein
      `<button>` statt eines `<div>` ist (`VerzehrErfassung.tsx:135-146`). Die ausgelieferte
      Kombination hat weiterhin nur Präsenz-/Containment-Assertions (`FokusListe.test.tsx:210-225`,
      `verzehr/page.test.tsx:261-272`). Funktionsrisiko gering (identische JSX-Reihenfolge in
      beiden Kopf-Zweigen), AK5-Beweis aber am Nebenpfad. Fix: `collapsible: true, open: true` in
      das Override des neuen Tests – deckt dann Produktionspfad und Kopf-`<button>`-Zweig mit ab.
- [ ] **`app/_verzehr/VerzehrErfassung.tsx:69` vs. `:74-77` – Widerspruch innerhalb des in diesem
      PR umformulierten Kommentarblocks.** Zeile 65 definiert „Körper = Erfassung", Zeile 69 sagt
      „bei `open=false` entfällt **nur** der Erfassungs-Körper (Kategorien + `MengeControl`)". Der
      neu formulierte Satz stellt den Slot ausdrücklich „oberhalb der Erfassungs-Sektionen"
      (`:74-75`), lässt ihn aber „am sichtbaren Körper hängen" (`:76`) – unter der Definition aus
      Zeile 65 liegt er damit außerhalb des Körpers und hängt gleichzeitig daran. In der
      #308-Fassung („Baustein am Fuß des Körpers") war das widerspruchsfrei. Zusätzlich ist Zeile
      69 jetzt unvollständig: beim Einklappen entfällt auch die Aktion (festgeschrieben in
      `VerzehrErfassung.test.tsx:630`). Fix: Sichtbarkeit an die **Bedingung** statt an die
      **Region** binden („steht vor dem Erfassungs-Körper, teilt aber dessen Sichtbarkeits-Gate
      `koerperSichtbar`") und Zeile 69 auf „Erfassungs-Körper **und Aktion**" ziehen. Bekanntes
      Rezidiv-Muster: `lessons/code-style.md`, TL;DR-Satz über umformuliertem Detail-Absatz nicht
      mitgezogen (aus #322).
- [ ] **`app/_verzehr/VerzehrErfassung.test.tsx:621-623` – markup-gekoppelte und asymmetrische
      Suchprädikate.** `kopfIndex` nutzt Substring (`textContent?.includes("Anna")`), `aktionIndex`
      exakte Gleichheit (`textContent === "Kassieren"`) – der Produktions-Link heißt aber
      `Kassieren →` (`verzehr/page.tsx:71`); richtet jemand die Fixture am echten Text aus, liefert
      `findIndex` still `-1` und der Test wird kosmetisch rot. `koerperIndex` fixiert über
      `tagName === "SECTION"` den Elementtyp des Körpers (`VerzehrErfassung.tsx:156`/`:194`), womit
      ein reines Markup-Refactoring den Test bricht, ohne dass sich Verhalten ändert. Im Repo sind
      verhaltensnahe Anker etabliert – Containment (`FokusListe.test.tsx:224`) und die im selben
      `describe` eingeführten Marker `getByRole("link", …)` (`:610`), `getByText("Anna")` (`:555`),
      `getByTestId("menge")` (`:556`). Fix: Indizes über `kind.contains(<Marker-Element>)`
      bestimmen; die Assertion-Kette bleibt unverändert.

## Nitpicks (optional)

- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:613-628` – AK1 nennt als „erste sichtbare
      Erfassungs-Sektion" ausdrücklich auch die Variante „Nicht mehr im Katalog"
      (`spec-318:59-60`); dieser Zweig (`VerzehrErfassung.tsx:193-213`) hat keine
      Reihenfolge-Assertion. Risiko strukturell null (ein einziger Einfügepunkt, Zeile 148, liegt
      vor **beiden** Sektionsblöcken) und `tagName === "SECTION"` würde die Inaktiv-Sektion
      unverändert treffen – es fehlt nur der Beweis. Zweiter Fall mit `artikel: []` +
      `positionen: [pos({ active: false, menge: 2 })]` wäre fast Copy-Paste.
- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:618-619` – der `throw`-Guard ist zur Laufzeit
      unerreichbar (`ZeileKarte` rendert immer ein `<li>`, `VerzehrErfassung.tsx:129`). **Kein**
      Verstoß gegen `clean-code.md` → „Keine Fallbacks für vom Typsystem bereits ausgeschlossene
      Fälle": `querySelector` ist deklariert `Element | null`, die Verengung ist für `li.children`
      typnotwendig (`tsconfig.json` setzt nur `strict: true`, kein `noUncheckedIndexedAccess`).
      Einsparbar über das im Repo häufigere `screen.getAllByRole("listitem")[0]`
      (`KassierZeilenListe.test.tsx:22-28`) – Wurzel-Karte ist das erste `listitem`, die
      verschachtelten `<li>` liegen erst in `:234`/`:272`.
- [ ] `app/_verzehr/VerzehrErfassung.tsx:74-75` – der neue Kommentarsatz nennt die Position und
      `#318`, aber nicht das WHY. Die übrigen Sätze des Blocks tun das durchgängig (`:71-73`). Ein
      Halbsatz aus dem Spec-Kontext (`spec-318:12-15`: der Wechsel gehört zur Person, nicht zum
      Betragsblock – kein Scrollen bei langer Aufschlüsselung) genügt.
- [ ] `app/veranstaltung/personenbezug.ts:5-7` – „Hin- und Rückweg sollen als EIN Bedienmuster
      auftreten". Die begründete Mechanik (eine geteilte `WECHSEL_LINK_CLASS`, `:13-14`) bleibt
      richtig und unverändert; die **Position** ist nach diesem PR aber bewusst asymmetrisch
      (Verzehr unter dem Kopf, Kassieren weiterhin am Fuß der Zeile,
      `kassieren/page.tsx:203-207` – Spec-Scope `spec-318:36-38`). Ein Halbsatz, der „EIN
      Bedienmuster" explizit aufs Erscheinungsbild einengt und die Positionsdifferenz auf #318
      verweist, würde die Aussage wieder eindeutig machen. Kein Code-Änderungsbedarf.
- [ ] `tasks/task-318-wechsel-links-kopfposition.md:38-42` – AK5 nennt drei Testdateien namentlich;
      die Technische Notiz begründet nur, warum die **Komponenten** unverändert blieben, nicht die
      **Tests**. Ein Halbsatz („bestehende #308-Link-Tests sind positionsagnostisch – Präsenz und
      `href` – und brauchten keine Umstellung") schließt die Erklärlücke, die sonst jede Folgerunde
      neu aufwirft.
- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:613` – das Suffix `_when_bodyVisible` bezeichnet hier
      ein anderes Setup als beim Geschwistertest `:606` (dort explizit
      `collapsible: true, open: true`, hier ist `koerperSichtbar` schon über `!collapsible` wahr).
      Löst sich mit dem Fix zu Wichtig-Finding 2 von selbst auf.

**Out of Scope (nicht in diesem PR):** ADR-035 D2 (`docs/adr/035-…:66-67`) behauptet „eingeklappt
entfällt **nur** der Erfassungs-Körper" – der `aktion`-Slot entfällt ebenfalls. Die Ungenauigkeit
stammt aus #308 und betrifft eine von #318 nicht angefasste Datei; unterhalb der Issue-Schwelle
(ADR-043) → als Eintrag in `docs/factory/kleinfunde.md` festgehalten.

## Positives

- **Mutationsbeleg der Kausalität, nicht nur Codelesen:** Setzt man die Verschiebung zurück (Slot
  wieder ans Körper-Ende), wird **genau** der neue Test rot (1 failed / 39 passed) – die
  RED-vor-GREEN-Kausalität hängt an der dritten Assertion (`:627`), weil die Kinderliste dann
  `[div, section, a]` lautet. Kein „grün aus dem falschen Grund".
- **Die `-1`-Absicherung ist lückenlos und transitiv:** `expect(kopfIndex).toBeGreaterThan(-1)`
  (`:625`) verhindert, dass die Kette über zwei `-1`-Werte zufällig grün wird; daraus folgt
  `aktionIndex ≥ 1` und `koerperIndex ≥ 2`. Jeder `-1`-Fall macht die jeweilige Assertion rot.
- **Keine Magic Numbers:** alle drei Indizes werden über `findIndex` zur Laufzeit bestimmt statt
  als Literale gesetzt – die Lesson „Row/Cell-Index-Assertions sind Magic Numbers, Herleitung
  mitschreiben" (aus #189) greift hier gar nicht, weil keine feste Zahl vorkommt.
- **Reihenfolge über Geschwister-Position statt Textreihenfolge:** `li.children` + Index-Vergleich
  ist strenger als ein `textContent`-Vergleich über den ganzen Container – ein in den Kopf
  hineingerenderter Link würde auffallen. Trifft die Lesson „zwei isolierte Präsenz-Assertions
  ersetzen keinen Positionsvergleich" (aus #286) korrekt.
- **AK4 belegbar gehalten:** der Diff berührt den Importblock (`:1-15`) nicht, die Prop bleibt
  generisch `aktion?: ReactNode` (`:100`), der ADR-039-D1-Verweis bleibt im Kommentar. Ein
  repo-weiter Grep auf `Kassieren →` liefert kein Vorkommen unter `app/_verzehr/`.
- **Doku-Drift systematisch geprüft, und die eine relevante Stelle ist mitgezogen:** Der
  Prop-Kommentar wurde im selben PR von „am Fuß des Körpers" auf die neue Position korrigiert
  (`:74-77`). ADR-039 D1 + #308-Nachtrag (`:42-47`) beschreiben den Slot rein über Semantik und
  **Sichtbarkeit**, nicht über die Position – kein ADR-Nachtrag nötig. Ebenso ohne Positionsaussage
  und damit driftfrei: `spec-308`, `spec-52`, `spec-54`, `spec-187`, `README-montagsrunde.md`,
  `docs/anleitung/veranstalter/anleitung.md` (Schritt 4 nennt den Wechsel-Link gar nicht),
  `docs/routes.md:30`, `lessons/frontend-react.md`.
- **`docs/routes.md` (#145) korrekt unberührt:** der Diff enthält kein `app/**/page.tsx` und kein
  `app/api/**/route.ts` – keine Änderung an Pfad, Existenz oder Zugriff.
- **Die E2E-Absicherung aus #308 ist positionsagnostisch** (`e2e/wechsel-verzehr-kassieren.spec.ts`
  prüft Präsenz/`href`/Zielverhalten) und bricht durch die Verschiebung nicht – belegt durch die
  grüne Vitest-Suite plus Codelesen der Spec-Datei.
- **Spec-Disziplin:** die Kopf-Abgrenzung (Summenzeile bleibt Teil des Kopfs, Kopf-`div` wird nicht
  aufgespalten) und die Scope-Reduktion um die Kassier-Karte waren vorab entschieden
  (`spec-318:36-38`, `:104-111`) und sind exakt so umgesetzt – kein Gold-Plating, keine offene
  Designentscheidung in `/implement`.
- **Keine Repo-Artefakte im PR:** `git status --porcelain --ignored` zeigt alle
  `scripts/*.tmp.sh`-Hilfsskripte dieses Reviews als ignoriert (`!!`), nicht getrackt; der
  Arbeitsbaum ist ansonsten sauber.

## Empfehlung

NEEDS_REWORK

Kein funktionaler Defekt – alle vier wichtigen Findings betreffen Beweiskraft der Tests und
Präzision der Kommentare. Ausschlaggebend ist Finding 1: dass eine AK1-Verletzung („unmittelbar")
den Test grün lässt, ist **gemessen**, nicht vermutet, und der Fix kostet ein Token. Finding 2
(`collapsible` mitgeben) und Finding 4 (verhaltensnahe Anker) sind Einzeiler im selben Test,
Finding 3 zwei Kommentarzeilen in der bereits angefassten Datei. Zusammen etwa zehn Zeilen in zwei
Dateien – deutlich billiger jetzt als als Altlast.
