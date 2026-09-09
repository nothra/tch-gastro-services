# Review: Task 318

> Diff-Scope: `git diff origin/main...HEAD` (6 Dateien, davon 2 Code) · **Runde 2 von max. 3**
> Runde 1 (`NEEDS_REWORK`, 4 wichtige Findings) steht in der Git-History dieser Datei; ihre
> Findings + der Rework sind in `tasks/task-318-wechsel-links-kopfposition.md` zusammengefasst.
> Verifikation: `pnpm vitest run` über `VerzehrErfassung.test.tsx`, `FokusListe.test.tsx`,
> `verzehr/page.test.tsx`, `kassieren/page.test.tsx` → **4 Dateien / 112 Tests grün**;
> `pnpm lint` grün. Zwei Mutationsbelege gefahren (selbst-wiederherstellend, `git status`
> danach leer) – Ergebnisse unter „Positives".

## Kritische Findings (müssen behoben werden)

_Keine._ Das Produktionsverhalten ist korrekt und die Verschiebung bleibt eine einzelne
JSX-Zeile (`VerzehrErfassung.tsx:149`) hinter dem unveränderten Gate `koerperSichtbar`
(`:114`) – spec-308 AK7/AK9/AK10 bleiben strukturell erhalten. Alle vier wichtigen Findings
aus Runde 1 sind behoben und **gemessen** behoben (siehe „Positives", Mutation A).

## Wichtige Findings (sollten behoben werden)

- [ ] **`docs/factory/kleinfunde.md:293` – die eigenen `Datei:Zeile`-Anker sind seit dem
      Rework-Commit dieser Task um eine Zeile verschoben.** Der Eintrag nennt
      `app/_verzehr/VerzehrErfassung.tsx:113` + `:148`; tatsächlich steht
      `const koerperSichtbar = …` auf **`:114`** und `{koerperSichtbar && aktion}` auf **`:149`**
      (`grep -n koerperSichtbar` gegen HEAD). Zeile 113 ist `);`, Zeile 148 eine Leerzeile –
      beide zitierten Anker zeigen auf Nicht-Inhalt. Ursache ist der Rework-Commit `1a2d137`
      derselben Task: der neu formulierte Kommentarblock ist um eine Zeile gewachsen, nachdem
      der Eintrag in Runde 1 geschrieben wurde. Der Dateikopf macht genau das zur Pflicht
      (`kleinfunde.md:19`: „Fundstelle mit `Datei:Zeile` **verifiziert am Eintragsdatum** –
      Zeilennummern driften"), und die Lesson zu #291 nennt exakt diesen Fall („auch wenn die
      Drift-Quelle die eigenen Folge-Commits derselben Task sind"). Der ADR-Anker desselben
      Eintrags (`035-…:66-67`) ist dagegen **korrekt** – nachgeprüft, nicht übernommen.
      Fix: zwei Zahlen.
- [ ] **`app/_verzehr/VerzehrErfassung.test.tsx:607` – der in Runde 1 (W3) als widersprüchlich
      eingestufte Wortlaut steht unverändert in der Geschwister-Kopie derselben Datei.** Der
      Rework hat die Aussage „`aktion` hängt am sichtbaren Körper" in
      `VerzehrErfassung.tsx:76` korrekt auf „steht vor dem Erfassungs-Körper, teilt aber dessen
      Sichtbarkeits-Gate `koerperSichtbar`" umgestellt. Der Testkommentar sagt weiter wörtlich
      „Die Aktion des Konsumenten (#308: Wechsel ins Kassieren) **hängt am sichtbaren Körper**"
      – unter der Definition „Körper = Erfassung" (`VerzehrErfassung.tsx:65`) liegt sie nach
      diesem PR gerade **nicht** mehr dort, was der Nachbartest `:615` in derselben Datei
      ausdrücklich festhält („nicht mehr am Fuß des Körpers"). Die Datei widerspricht sich damit
      innerhalb von acht Zeilen. Bekanntes Rezidiv-Muster: `lessons/code-style.md`, „Fix für
      falschen WHY-Kommentar per Grep auf kopierte Geschwister-Stellen im selben PR ausweiten"
      (aus #264, dort Rezidiv in Runde 3). Ein repo-weiter Grep auf `sichtbaren Körper` findet
      genau **eine** weitere Stelle, `tasks/task-308-…md:67` – historischer Task-Bericht einer
      anderen Task und damit bewusst unberührt. Fix: ein halber Satz.

## Nitpicks (optional)

> Die ersten fünf standen bereits in Runde 1, wurden als optional nicht gezogen und sind
> unverändert offen – hier nur als Bestandsaufnahme, nicht als neue Forderung.

- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:613-636` – AK1 nennt als „erste sichtbare
      Erfassungs-Sektion" ausdrücklich auch „Nicht mehr im Katalog" (`spec-318:59-60`); dieser
      Zweig (`VerzehrErfassung.tsx:194-214`) hat weiter keine Reihenfolge-Assertion. Risiko
      strukturell null (ein einziger Einfügepunkt, `:149`, liegt vor **beiden** Sektionsblöcken).
- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:625` – der `throw`-Guard bleibt zur Laufzeit
      unerreichbar (`ZeileKarte` rendert immer ein `<li>`, `:130`); typnotwendig für
      `querySelector`, also **kein** Verstoß gegen `clean-code.md` → „Keine Fallbacks für vom
      Typsystem bereits ausgeschlossene Fälle". Einsparbar über das repo-übliche
      `screen.getAllByRole("listitem")[0]` (`KassierZeilenListe.test.tsx:22-28`).
- [ ] `app/_verzehr/VerzehrErfassung.tsx:74-75` – der Kommentarsatz nennt Position und `#318`,
      aber nicht das WHY; die übrigen Sätze des Blocks tun das durchgängig (`:71-73`). Ein
      Halbsatz aus `spec-318:12-15` (der Wechsel gehört zur Person, nicht zum Betragsblock –
      kein Scrollen bei langer Aufschlüsselung) genügt.
- [ ] `app/veranstaltung/personenbezug.ts:5-7` – „Hin- und Rückweg sollen als EIN Bedienmuster
      auftreten". Die begründete Mechanik (geteilte `WECHSEL_LINK_CLASS`, `:13-14`) bleibt
      richtig; die **Position** ist nach diesem PR bewusst asymmetrisch (Verzehr unter dem Kopf,
      Kassieren weiter am Fuß der Zeile, `kassieren/page.tsx:203-207` – Spec-Scope
      `spec-318:36-38`). Ein Halbsatz, der „EIN Bedienmuster" aufs Erscheinungsbild einengt,
      macht die Aussage wieder eindeutig. Kein Code-Änderungsbedarf.
- [ ] `tasks/task-318-wechsel-links-kopfposition.md:38-42` – AK5 nennt drei Testdateien
      namentlich; die Technische Notiz begründet nur, warum die **Komponenten** unverändert
      blieben, nicht die **Tests**. Ein Halbsatz („die bestehenden #308-Link-Tests in
      `FokusListe.test.tsx`/`verzehr/page.test.tsx` sind positionsagnostisch – Präsenz und
      `href` – und brauchten keine Umstellung") schließt die Erklärlücke, die sonst jede
      Folgerunde neu aufwirft.
- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:606` vs. `:613` – nach dem Rework haben beide
      Tests **identische** Overrides (`collapsible: true, open: true, aktion: …`), tragen aber
      unterschiedliche Bedingungs-Suffixe (`_when_bodyVisible` vs. `_when_collapsibleAndOpen`).
      Inhaltlich sind sie sauber getrennt (`href` vs. Reihenfolge); nur die Namen suggerieren
      zwei verschiedene Setups. Runde-1-Nitpick 6 ist damit zur Hälfte aufgelöst.

**Out of Scope (verifiziert, kein Handlungsbedarf in diesem PR):**
`docs/anleitung/veranstalter/bilder/08-verzehr.png` zeigt den `Kassieren →`-Link nicht – der
Screenshot stammt aus `9e21cde` (#221/#226) und damit von **vor** der Einführung des Links in
`d006c59` (#308). Die Lücke ist also weder von #318 verursacht noch von ihm verschlimmert; der
Alt-Text (`anleitung.md:133`: „Namensleiste oben, aufgeklappte Teilnehmer-Karte mit Plus/Minus
je Artikel") bleibt zutreffend. Bewusst **kein** `kleinfunde.md`-Eintrag – hier festgehalten,
damit eine Folgerunde es nicht neu aufwirft.

## Positives

- **Mutation A – der Runde-1-Kernfund ist gemessen geschlossen:** Mit einem zwischen Kopf und
  Slot eingefügten Fremd-Element (`<p>Zwischenzeile</p>` vor `:149`) wird jetzt **genau** der
  neue Test rot, und zwar an der Adjazenz-Assertion (`:634`, 1 failed / 39 passed). In Runde 1
  blieben in derselben Mutation alle 40 Tests grün. `toBeGreaterThan` → `toBe(kopfIndex + 1)`
  hat also real Beweiskraft gewonnen, nicht nur kosmetisch.
- **Mutation B – Kausalität zur Produktionsänderung:** Setzt man `VerzehrErfassung.tsx` auf den
  Stand vor der Verschiebung zurück (`git show 9f5f597:…`, Slot wieder auf `:213` am
  Körper-Ende), scheitert derselbe Test mit `expected 2 to be 1` – die Assertion misst die
  Position, nicht ein Nebenprodukt. Kein „grün aus dem falschen Grund".
- **W2 aus Runde 1 sauber getroffen:** Der Reihenfolge-Nachweis liegt jetzt auf
  `collapsible: true, open: true` – der einzigen ausgelieferten Kombination (`aktion=` kommt
  repo-weit nur aus `FokusListe.tsx:129`, und `FokusListe` rendert `collapsible` unbedingt,
  `:118`). Damit deckt der Test den Kopf-`<button>`-Zweig (`VerzehrErfassung.tsx:136-147`) ab,
  nicht den flachen `<div>`-Zweig, den kein Konsument mit `aktion` benutzt.
- **W4 aus Runde 1 verhaltensnah gelöst:** Die drei Indizes kommen über
  `getByText("Anna")` / `getByRole("link", { name: "Kassieren" })` / `getByTestId("menge")` und
  `kind.contains(…)`. Damit ist kein Elementtyp mehr fixiert (`tagName === "SECTION"` ist weg),
  die Text-Asymmetrie ist weg, und die `get*`-Queries werfen bei Abwesenheit selbst – ein
  stilles `-1` ist nicht mehr möglich, was `toBe(kopfIndex + 1)` zusätzlich absichert.
- **Kommentar-Fix an der gemeldeten Stelle korrekt und vollständig:** `:69` nennt jetzt
  „Erfassungs-Körper **und Aktion**" (deckt `VerzehrErfassung.test.tsx:638-643` ab), `:76`
  bindet die Sichtbarkeit an die **Bedingung** statt an die **Region**. Der Widerspruch aus
  Runde 1 W3 ist an der Produktionsstelle aufgelöst (offen bleibt nur die Kopie, W-Finding 2).
- **AK4 (Route-Neutralität, ADR-039 D1) unverändert belegbar:** Der Diff berührt den
  Importblock (`:1-15`) nicht, die Prop bleibt generisch `aktion?: ReactNode` (`:101`), und ein
  repo-weiter Grep auf `Kassieren →` liefert kein Vorkommen unter `app/_verzehr/`.
- **ADR-Drift selbst nachgeprüft, nicht aus Runde 1 übernommen:** `grep` über ADR-039 und
  ADR-035 zeigt, dass beide den `aktion`-Slot ausschließlich über Semantik/Sichtbarkeit
  beschreiben (`039:43-47`) bzw. gar nicht erwähnen (ADR-035) – **keine** Positionsaussage,
  also kein ADR-Nachtrag nach #211/#176 fällig. Ebenso ohne Positionsaussage: `spec-308`,
  `docs/anleitung/veranstalter/anleitung.md` (Schritt 4, `:124-137`, nennt den Link nicht),
  `e2e/wechsel-verzehr-kassieren.spec.ts` (Präsenz/`href`/Zielverhalten, `.first()`-Filter –
  positionsagnostisch).
- **`docs/routes.md` (#145) korrekt unberührt:** kein `app/**/page.tsx` und kein
  `app/api/**/route.ts` im Diff – keine Änderung an Pfad, Existenz oder Zugriff.
- **Scope strikt gehalten:** `KassierZeilenListe`/`kassieren/page.tsx` sind unberührt
  (`spec-318:36-38`), die Kopf-Abgrenzung (Summenzeile bleibt Teil des Kopfs, kein Aufspalten
  des Kopf-`div`) folgt der vorab entschiedenen Spec (`spec-318:104-111`). Kein Gold-Plating.
- **Keine Repo-Artefakte im PR:** `git status --porcelain --ignored` listet die
  `scripts/*.tmp.sh`-Hilfsskripte dieses Reviews als ignoriert (`!!`); der Arbeitsbaum ist nach
  beiden Mutationen sauber (`git status --porcelain` leer).

## Empfehlung

NEEDS_REWORK

Kein funktionaler Defekt, und der inhaltliche Kernfund aus Runde 1 ist **gemessen** geschlossen
(Mutation A). Was bleibt, sind zwei Präzisionsfehler in Artefakten, die dieser PR selbst
angelegt bzw. angefasst hat: zwei falsche Zeilennummern in `kleinfunde.md` (ein Eintrag, den
spätere Agenten als Arbeitsanweisung lesen und dessen Dateikopf verifizierte Anker verlangt) und
eine Kommentar-Kopie, die dem Fix aus Runde 1 im selben File widerspricht. Zusammen drei Zeilen
in zwei Dateien; beide sind dokumentierte Rezidiv-Muster (#291, #264), weshalb sie hier fallen
sollten statt als Altlast weiterzulaufen. Die sechs Nitpicks bleiben ausdrücklich optional –
sie sind **kein** Grund für eine weitere Runde.
