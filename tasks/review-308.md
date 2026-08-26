# Review: Task 308

> Diff-Scope: `git diff origin/main...HEAD` (18 Dateien, +1397/−67).
> Drei Runden (Backend/Logik · Code-Qualität · Architektur & Patterns) im Orchestrator-Kontext,
> ohne Fork-Delegation (Lesson #298/#267).
> Gegenprobe: die 8 vom PR berührten Vitest-Dateien laufen grün – **162 Tests passed**.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] `docs/adr/039-verzehrerfassung-fokusliste-route-neutral.md:D3/D4` – **ADR-Drift: `initialOpenId={null}` ist für F5 nicht mehr wahr.**
      ADR-039 **D3** beschreibt die Mechanik namentlich: „`app/veranstaltung/[id]/verzehr/page.tsx`
      … rendert `<FokusListe … initialOpenId={null} />`", **D4** wiederholt es für die Lesesicht:
      „Eine abgeschlossene Veranstaltung nutzt auf beiden Wegen dieselbe `FokusListe` mit
      `editable={false}`, `initialOpenId={null}`". Dieser PR macht `initialOpenId` auf F5
      personenbezugs-abhängig (`app/veranstaltung/[id]/verzehr/page.tsx:115`) – **inklusive** der
      abgeschlossenen Veranstaltung (AK10, Test
      `should_keepReadOnlyButOfferWechsel_when_abgeschlossenWithPersonenbezug`). Zusätzlich bekommt
      `FokusListe` mit `aktionJeZeile` eine neue Prop, die D1s Prop-Aufzählung nicht kennt.
      **Begründung:** Projektregel „PR ändert die von einer ADR namentlich beschriebene Mechanik →
      ADR-Beschreibung im selben PR mitpflegen" (Lesson aus #211, ergänzt #55); sie triggert
      ausdrücklich auch ohne Änderung an der ADR-Datei. Ohne Nachzug liest die nächste Task eine
      ADR, die den Startzustand von F5 falsch beschreibt.
      *Fix (klein):* Drift-Hinweis in ADR-039 (Konsequenzen/D3/D4) – „seit #308 trägt F5
      `initialOpenId = Personenbezug ?? null`; ohne Personenbezug gilt D3/D4 unverändert" – plus
      `aktionJeZeile` in der D1-Prop-Aufzählung nennen. ADR-035 D5 bleibt gültig („Standardzustand:
      alle Karten eingeklappt") und braucht keinen Nachzug.

- [ ] `app/_verzehr/FokusListe.tsx:45-51` – **Unbeabsichtigte Verhaltensänderung im öffentlichen Weg F7 (`/theke/[token]`), weder in der Task-Datei noch durch einen Test abgesichert.**
      Der neue Mount-Effekt scrollt *jede* initial offene Karte in den Sichtbereich – also auch die
      aus der geräte-lokalen Ziel-Merkung von `IdentityGate` (ADR-035 D1). Für einen
      wiederkehrenden Selbstbedienungs-Nutzer springt die Seite beim Laden neuerdings zur
      gemerkten Karte; vorher tat sie das nicht. Die Spec listet `/theke/[token]` unter „Nicht
      inbegriffen", und CLAUDE.md → „Scope einhalten" ist nicht verhandelbar.
      Die Wahl ist inhaltlich vertretbar (eine Opt-out-Prop wäre Fläche ohne Gewinn, und das
      Verhalten ist konsistent mit `waehleZiel`), aber sie ist **eine Entscheidung** und steht
      derzeit nur in einem Code-Kommentar – nicht unter „Umsetzungsentscheidungen" in
      `tasks/task-308-*.md` und in keinem F7-Test (`IdentityGate.test.tsx` prüft nur die
      *Abwesenheit* der Kassieren-Aktion, AK9).
      *Fix (klein):* Entscheidung in der Task-Datei festhalten **und** eine Assertion in
      `IdentityGate.test.tsx` ergänzen, die belegt, dass die gemerkte Zielkarte im rAF-Callback
      angescrollt wird – dann ist die Änderung bewusst und regressionsgeschützt statt beiläufig.

## Nitpicks (optional)

- [ ] `app/veranstaltung/personenbezug.test.ts:10-12` – `suchparameter(werte) { return werte; }` ist
      eine Identitätsfunktion; sie liefert nur eine Typ-Annotation und verschleiert an den
      Aufrufstellen, dass dort schlicht ein Objektliteral steht. Entweder streichen (Literal direkt
      übergeben, der Parametertyp der Funktion greift ohnehin) oder als
      `const suchparameter: (w: SeitenSuchparameter) => SeitenSuchparameter` sichtbar machen.

- [ ] `app/veranstaltung/[id]/verzehr/page.tsx:72` und `app/veranstaltung/[id]/kassieren/page.tsx:206`
      – identische Klassenkette `self-start text-sm font-medium text-cyan-700 hover:underline
      dark:text-cyan-400` für beide Wechsel-Links, dupliziert über zwei Dateien. Da beide Links
      bewusst als *ein* Bedienmuster auftreten sollen, wäre eine gemeinsame Konstante (z. B. neben
      `PERSONENBEZUG_PARAM` bzw. in `labels.ts`) driftsicherer als zwei Copy-Paste-Stellen.

- [ ] `app/veranstaltung/EingefroreneZeilenListe.tsx:1-17` – die Komponente trägt jetzt zwei
      Zuständigkeiten (Positions-Freeze **und** Zielzeilen-Hervorhebung/Scroll). Die Begründung im
      Modul-Header („weil sie die `<li>`-Elemente besitzt") überzeugt, aber der **Name** nennt nur
      noch die halbe Verantwortung. Kein Rename-Zwang – erwähnenswert, weil die Lesson
      „Modul-Header beim Hinzufügen einer Einheit mitpflegen" (#207) genau hier greift und der
      Header korrekt mitgepflegt wurde; der Name blieb zurück.

- [ ] `docs/routes.md:30,32` – korrekt **nicht** geändert (kein Pfad-/Zugriffswechsel, Drift-Check
      grün). ADR-039 § Konsequenzen empfiehlt allerdings, „die Funktionsbeschreibung der F5-Route
      ggf. zu präzisieren". Der neue `?zeile=`-Personenbezug ist ein Aufruf-Vertrag beider Routen –
      ein Halbsatz in der Funktionsspalte („personenbezogener Einstieg via `?zeile=`") würde ihn
      auffindbar machen.

## Positives

- **AK-Abdeckung ist lückenlos und diskriminierend.** Jedes der 12 AK und alle 4 Fehlerszenarien
  haben mindestens einen benannten Test; mehrere tragen bewusst eine Gegenkontrolle, damit die
  Assertion nicht aus dem falschen Grund grün ist – z. B. AK12
  (`should_keepAllAmountsAndStates_when_calledWithPersonenbezug` prüft zusätzlich
  `hervorgehobeneNamen() === ["Bernd Beispiel"]`, sonst verglichen es zwei Standardaufrufe) und AK9
  in `IdentityGate.test.tsx` (Vorbedingung „eine Karte ist wirklich offen" vor der
  Abwesenheits-Assertion). Genau die Muster, die frühere Reviews erst nachträglich erzwingen mussten
  (#253, #286).
- **AK4 wird gegen eine echte Divergenz getestet**, nicht gegen einen Nullfall: der
  Freeze-Test erzeugt erst per Rerender die abweichende Server-Sortierung und prüft dann Reihenfolge
  **und** Hervorhebung – die Lesson aus #253 ist sauber angewendet.
- **Route-Neutralität elegant gewahrt (ADR-039 D1):** `ZeileKarte` bekommt ein generisches
  `aktion?: ReactNode` und kennt weder Route noch Semantik; AK7 und AK9 fallen **strukturell** an
  (`koerperSichtbar && aktion`, bzw. die Prop wird im öffentlichen Weg gar nicht durchgereicht)
  statt über zusätzliche Flags. Ein Flag weniger ist ein Zustand weniger, der falsch stehen kann.
- **Trägermechanik zentral und drift-gesichert:** beide Href-Bauer und der Leser hängen an
  `PERSONENBEZUG_PARAM`; der Round-Trip-Test (`should_resolveOwnHref_when_roundTripped`) belegt Bauen
  und Lesen gegen dieselbe Konstante. Die Begründung, **kein** Zod-Schema zu nehmen, ist richtig und
  im Code begründet: die Mengenprüfung gegen die Zeilen dieser Veranstaltung ist strenger als jedes
  Formatschema und macht F1 zu fail-soft **ohne** Existenz-Aussage.
- **Auflösung liegt hinter dem Rollen-Gate** (`hasRole` → `getVeranstaltung` → `notFound` →
  erst dann `personenbezogeneZeileId`), und F4 ist explizit getestet: der Parameter verschafft weder
  Zugang noch Information. Der Wert wird nirgends reflektiert (`queryByText(/z-fremd/)`).
- **Layout-Timing korrekt aus #188 übernommen** (Scroll erst im `requestAnimationFrame`-Callback,
  in *beiden* Listen, mit `cancelAnimationFrame`-Cleanup), und der geteilte Test-Stub
  `@/app/_verzehr/raf-stub` wurde **wiederverwendet** statt dupliziert – genau das, was die Lesson
  aus #194 fordert.
- **Oberflächen-Verifikation gegen einen echten Dev-Server** (`e2e/wechsel-verzehr-kassieren.spec.ts`)
  belegt, was jsdom nicht kann: echter Router-Übergang, `toBeInViewport()`, echter Tastaturfokus,
  Reload (AK11) und der Rundlauf (AK8). Der Opt-in-Schalter `E2E_WECHSEL_308` ist richtig gewählt,
  weil CI gegen die persistente INT-Umgebung nur lesend fährt – und die Ursache des roten Erstlaufs
  (kollidierende Bezeichnung bei Parallellauf) steht als WHY am Helper, nicht nur im Task-Log.
- **AK12 ist als Zeichen-für-Zeichen-Vergleich zweier Renderings umgesetzt**, nicht als Stichprobe
  einzelner Beträge – die stärkste Form dieses „Navigation ändert nichts"-Nachweises.

## Empfehlung

NEEDS_REWORK

> **Kein Verhaltensfehler gefunden** – der Code ist korrekt, vollständig getestet (162/162 grün)
> und im Kern scope-treu umgesetzt; es gibt kein kritisches Finding. Das `NEEDS_REWORK` steht
> allein für die zwei Wichtigen Findings, und beide sind Nachzüge in der Größenordnung weniger
> Zeilen:
> 1. ADR-039 D1/D3/D4 an die geänderte Mechanik anpassen – das ist die Projektregel
>    „Entscheidungen dokumentieren" bzw. die Lesson aus #211, kein Stilwunsch.
> 2. Die F7-Verhaltensänderung in `FokusListe` als Entscheidung festhalten und mit einer Assertion
>    in `IdentityGate.test.tsx` gegen Regression sichern.
>
> Erwartete Iterationen: **1**. Am Produktionsverhalten des Features ist nichts zu ändern.
