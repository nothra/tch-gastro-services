# Review: Task 318

> Diff-Scope: `git diff origin/main...HEAD` (6 Dateien, davon 2 Code) · **Runde 3 von max. 3**
> (Circuit Breaker: letzte zulässige Iteration). Runden 1 + 2 stehen in der Git-History dieser
> Datei; ihre Findings + der jeweilige Rework sind in
> `tasks/task-318-wechsel-links-kopfposition.md` zusammengefasst.
> Verifikation: `pnpm vitest run` über `VerzehrErfassung.test.tsx`, `FokusListe.test.tsx`,
> `verzehr/page.test.tsx`, `kassieren/page.test.tsx` → **4 Dateien / 112 Tests grün**;
> `pnpm lint` grün. Arbeitsbaum sauber (`git status --porcelain` leer); die
> `scripts/review318*.tmp.sh`-Helfer dieses Reviews sind gitignored (`!!`).
>
> **Vorgehen:** Die drei Personas (Logik / Code-Qualität / Architektur) wurden **direkt im
> Orchestrator-Kontext** gefahren, nicht per Sub-Agent – der Diff umfasst zwei Code-Dateien mit
> zusammen ~50 geänderten Zeilen, beide vollständig gelesen. Grund für die Abweichung von der
> Skill-Vorgabe: `lessons/factory-workflow.md` (#298/#267/#314) dokumentiert für genau diese
> Review-Delegation drei Fehlerbilder (Kontext-Bleed, fabrizierte Findings, selbstsicher falsche
> Verhaltensbehauptungen). Alle aus Runde 2 übernommenen Tatsachenbehauptungen sind unten
> **eigenständig nachgeprüft** (#314) und als solche markiert.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._ Beide wichtigen Findings aus Runde 2 sind behoben und an der Quelle nachgeprüft:

1. **`docs/factory/kleinfunde.md:293` (Zeilen-Anker)** – der Eintrag nennt jetzt
   `app/_verzehr/VerzehrErfassung.tsx:114` + `:149`. Gegen `HEAD` verifiziert: `:114` ist
   `const koerperSichtbar = !collapsible || open;`, `:149` ist `{koerperSichtbar && aktion}`.
   Beide Anker treffen exakt den zitierten Inhalt. Der ADR-Anker desselben Eintrags
   (`035-…:66-67`) wurde **erneut selbst** geprüft (nicht aus Runde 2 übernommen): `:67` ist
   „eingeklappt entfällt nur der Erfassungs-Körper (Kategorien + `MengeControl`)", `:66` der
   tragende Kontextsatz – korrekt.
2. **`app/_verzehr/VerzehrErfassung.test.tsx:607-608` (Kommentar-Widerspruch)** – der Wortlaut
   lautet jetzt „teilt das Sichtbarkeits-Gate des Körpers (`koerperSichtbar`), sitzt aber nicht
   mehr im Körper selbst (seit #318)" und ist damit widerspruchsfrei zum Nachbartest `:615-616`.
   Der Rezidiv-Grep aus #264 wurde neu gefahren: `sichtbaren Körper|hängt am` findet unter
   `app/` **kein** Vorkommen mehr in dieser Bedeutung – die verbliebenen Treffer sind
   `tasks/task-308-…md:67` (historischer Bericht einer anderen Task) und die Runde-2-Zitate in
   `tasks/review-318.md`/`task-318-…md` selbst, also bewusst unberührte Berichtstexte.

## Nitpicks (optional)

> Bestandsaufnahme der aus Runde 1/2 offenen, als optional nicht gezogenen Punkte – **keine**
> neue Forderung und ausdrücklich **kein** Grund für eine vierte Runde (die es nach dem Circuit
> Breaker auch nicht gäbe).

- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:613-637` – AK1 nennt als „erste sichtbare
      Erfassungs-Sektion" ausdrücklich auch „Nicht mehr im Katalog" (`spec-318:59-60`); dieser
      Zweig (`VerzehrErfassung.tsx:194-214`) hat keine eigene Reihenfolge-Assertion. Risiko
      strukturell null – nachgeprüft: es gibt **einen** Einfügepunkt (`:149`), und er liegt vor
      **beiden** Sektionsblöcken (`:151` Kategorien, `:194` Inaktiv-Sektion).
- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:625-626` – der `throw`-Guard bleibt zur Laufzeit
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
      Kassieren weiter am Fuß der Zeile, `kassieren/page.tsx:205` – Spec-Scope `spec-318:36-38`).
      Ein Halbsatz, der „EIN Bedienmuster" aufs Erscheinungsbild einengt, macht die Aussage
      wieder eindeutig. Kein Code-Änderungsbedarf.
- [ ] `tasks/task-318-wechsel-links-kopfposition.md:38-42` – AK5 nennt drei Testdateien
      namentlich; die Technische Notiz begründet nur, warum die **Komponenten** unverändert
      blieben, nicht die **Tests**. Diese Runde hat die Lücke geschlossen (siehe „Positives",
      letzter Punkt) – der Halbsatz in der Task-Notiz fehlt weiter.
- [ ] `app/_verzehr/VerzehrErfassung.test.tsx:606` vs. `:614` – beide Tests haben **identische**
      Overrides (`collapsible: true, open: true, aktion: …`), tragen aber unterschiedliche
      Bedingungs-Suffixe (`_when_bodyVisible` vs. `_when_collapsibleAndOpen`). Inhaltlich sauber
      getrennt (`href` vs. Reihenfolge); nur die Namen suggerieren zwei verschiedene Setups.

**Out of Scope (verifiziert, kein Handlungsbedarf in diesem PR):**

- `docs/anleitung/veranstalter/bilder/08-verzehr.png` zeigt den `Kassieren →`-Link nicht – der
  Screenshot stammt von **vor** der Einführung des Links (#308). Weder von #318 verursacht noch
  verschlimmert; der Alt-Text (`anleitung.md:133`) bleibt zutreffend. Bewusst **kein**
  `kleinfunde.md`-Eintrag.
- `docs/adr/035-…:63` beschreibt `FokusListe` weiter als
  `app/theke/[token]/FokusListe.tsx`; die Datei liegt seit #187 unter `app/_verzehr/FokusListe.tsx`.
  Vorbestehende ADR-Drift aus einer **anderen** Task, von #318 nicht berührt (der Slot-Punkt
  desselben Abschnitts ist bereits über `kleinfunde.md` erfasst). Hier nur festgehalten, damit
  keine Folgerunde ihn #318 zurechnet.

## Positives

- **Beide Runde-2-Findings an der Quelle geschlossen, nicht nur behauptet:** Zeilennummern gegen
  `HEAD` nachgezählt, Rezidiv-Grep (#264) neu gefahren – siehe „Wichtige Findings".
- **Der inhaltliche Kernfund der Kette bleibt gemessen geschlossen:** Die Adjazenz-Assertion
  `expect(aktionIndex).toBe(kopfIndex + 1)` (`:635`) belegt AK1s „unmittelbar"; in Runde 2 wurde
  per Mutation gemessen, dass ein zwischengeschobenes Fremd-Element genau diese Zeile rot macht
  (vorher blieben alle 40 Tests grün) und dass ein Rückbau der Produktionsänderung denselben Test
  bricht (`expected 2 to be 1`). Der Rework dieser Runde hat weder Test noch Produktionszeile
  angefasst – der Beleg gilt unverändert für `HEAD`.
- **Keine verschachtelten interaktiven Elemente – der naheliegende Fehler dieser Verschiebung ist
  vermieden:** `{koerperSichtbar && aktion}` (`:149`) steht **außerhalb** des
  `{collapsible ? <button …>{kopf}</button> : kopf}`-Ausdrucks (`:136-147`). Ein `<a>` innerhalb
  des Kopf-`<button>` wäre invalides Markup und hätte Klick/Tastatur beider Ziele kollidieren
  lassen. Nebeneffekt: die Tab-Reihenfolge ist jetzt Kopf-Button → Wechsel-Link → Erfassung, was
  das Ziel der Änderung auch für Tastatur-/Screenreader-Nutzung einlöst.
- **AK2/AK3 strukturell unverändert:** Der Slot bleibt hinter demselben, unveränderten Gate
  `koerperSichtbar` (`:114`) – AK7 (kein Link eingeklappt), AK9 (F7 reicht die Prop nicht herein,
  `FokusListe.tsx:129` mit `aktionJeZeile?.[…]`) und AK10 (Lesesicht: das Gate hängt an
  `collapsible`/`open`, nicht an `editable`) sind nicht angetastet. `kassierenHref` und die
  `WECHSEL_LINK_CLASS`-Erzeugung liegen unverändert beim Konsumenten
  (`verzehr/page.tsx:67-74`).
- **AK4 (Route-Neutralität, ADR-039 D1) belegbar erhalten:** Der Diff berührt den Importblock
  nicht, die Prop bleibt generisch `aktion?: ReactNode` (`:101`), und der Slot trägt keinen
  Kassieren-spezifischen Namen.
- **Kein ADR-Nachtrag nach #211/#176 fällig – selbst nachgeprüft:** ADR-039 D1 beschreibt den
  Slot ausschließlich über die **Bedingung** („rendert, wenn ihr Körper sichtbar ist", `:42-47`),
  nicht über eine Position; ADR-035 D2 nennt den Slot gar nicht (nur die unvollständige
  „entfällt nur"-Aufzählung, bereits als `kleinfunde.md`-Eintrag erfasst). Ebenso ohne
  Positionsaussage: `spec-308` und `docs/anleitung/veranstalter/anleitung.md`. Ein repo-weiter
  Grep auf `am Fuß|Fuß der|am Ende der Karte` findet außer dem **neuen** Testkommentar
  (`:616`, der die Änderung beschreibt) keine Stelle, die die alte Position noch behauptet.
- **E2E bleibt tragfähig – selbst geprüft, nicht übernommen:**
  `e2e/wechsel-verzehr-kassieren.spec.ts` assertiert durchgehend rollen-/textbasiert
  (`getByRole("link", { name: /Kassieren/ })` + `toHaveCount`, `li[aria-current="true"]`,
  `getByRole("listitem").filter({ hasText: … }).first()`). Keine Assertion hängt an der
  DOM-Reihenfolge **innerhalb** eines `<li>` – die Positionsänderung kann sie nicht brechen.
  (Playwright wurde in dieser Runde nicht gefahren; die Prüfung ist statisch.)
- **`docs/routes.md` (#145) korrekt unberührt:** kein `app/**/page.tsx` und kein
  `app/api/**/route.ts` im Diff – keine Änderung an Pfad, Existenz oder Zugriff.
- **Scope strikt gehalten:** `KassierZeilenListe`/`kassieren/page.tsx` unberührt
  (`spec-318:36-38`), die Kopf-Abgrenzung folgt der vorab entschiedenen Spec
  (`spec-318:104-111`) – die Summenzeile bleibt im Kopf, das Kopf-`div` wird nicht aufgespalten.
  Die Produktionsänderung ist **eine** verschobene JSX-Zeile. Kein Gold-Plating.
- **Runde-2-Nitpick 5 inhaltlich aufgeklärt (Erklärlücke zu AK5 geschlossen):** Nachgeprüft, warum
  nur `VerzehrErfassung.test.tsx` angepasst werden musste – `aktion=` wird repo-weit an **einer**
  Stelle gesetzt (`FokusListe.tsx:129`), und `FokusListe` hat zwei Konsumenten: F5
  (`verzehr/page.tsx:113`, mit `aktionJeZeile`) und F7 (`theke/[token]/IdentityGate.tsx`, ohne).
  Die #308-Link-Tests in `FokusListe.test.tsx`/`verzehr/page.test.tsx` prüfen Präsenz, `href` und
  Weiterreichung der Prop – alle positionsagnostisch, daher zu Recht unverändert. Offen bleibt
  nur, das als Halbsatz in die Task-Notiz zu schreiben (Nitpick 5).

## Empfehlung

APPROVED

Kein kritisches und kein wichtiges Finding. Der PR verschiebt eine JSX-Zeile hinter einem
unveränderten Sichtbarkeits-Gate und stellt den zugehörigen Test von Anwesenheit auf eine
gemessen wirksame Adjazenz-Assertion um; alle fünf AK sind erfüllt, die Sichtbarkeits- und
Zielsemantik aus #308 ist strukturell unangetastet, und die Route-Neutralität (ADR-039 D1) ist
belegbar erhalten. Die beiden Präzisionsfehler aus Runde 2 (Zeilen-Anker in `kleinfunde.md`,
Kommentar-Kopie im Test) sind an der Quelle nachgeprüft behoben. Die sechs Nitpicks bleiben
optional und sind als Bestandsaufnahme dokumentiert, damit `/refactor` bzw. `/codify` sie
aufgreifen können, ohne sie neu herzuleiten. Weiter zu `/test`.
