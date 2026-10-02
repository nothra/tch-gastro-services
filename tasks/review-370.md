# Review: Task 370

> Review-Runde 2 (3 Personas: Logik, Code-Qualität, Architektur), 2026-10-02. Diff-Basis
> `origin/main...HEAD`, Rework-Commit `768337b`. Alle Findings vom Orchestrator gegen den Code
> nachverifiziert. Runde 1 (1 kritisch, 4 wichtig, 12 Nitpicks) ist vollständig abgearbeitet bzw.
> bewusst offen gelassen (rAF-Abbruch, doppelte Summen-/Gruppierlogik → `/refactor`, `?zeile=` nach
> F5) – siehe Git-Historie dieser Datei. Gates im Orchestrator: `pre-commit.sh` (Lint) grün,
> Prettier grün, Vitest für `app/_verzehr`, `app/theke`, `app/veranstaltung/[id]/verzehr` grün
> (184 Tests). Der Mutationsbeleg „K1-Test ohne `key` rot" ist nicht neu gelaufen (keine
> Freigabe für das Mutationsskript in dieser Session); gestützt auf die Task-Notiz (3/3 rot) und das
> Codelesen der Code-Qualitäts-Persona.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [docs/adr/054-verzehr-einzelansicht-statt-fokus-akkordeon.md:60-63] D1 zählt die Prop-Schnittstelle auf und endet mit „Neu: optionale `kopfClassName` (D3)" – die im Rework eingeführte `fussleisteClassName` (`app/_verzehr/VerzehrEinzelansicht.tsx:42/53`, gesetzt von beiden Konsumenten) fehlt; nur D3 (`:93`) nennt sie. ADR-Drift nach Rework (Lesson #55/#211). Fix: „Neu: optionale `kopfClassName` und `fussleisteClassName` (D3)."
- [ ] [docs/adr/035-selbstbedienung-erfasser-ziel-fokus.md:96-99] D5 („Read-only im selben Akkordeon-Layout … dieselbe `FokusListe` … alle Karten eingeklappt … zum Aufklappen") hat kein Banner, obwohl genau das durch ADR-054 abgelöst ist (Lese-Ansicht = Einzelansicht ab der ersten Person, `app/theke/[token]/IdentityGate.tsx:96-108`; ADR-039 D4 sagt das im eigenen Banner bereits). Statuszeile von ADR-035 und der Drift-Absatz in ADR-054 (`:197-198`) behaupten zugleich „D5 gilt fort". Fix: Teil-Banner an D5 („fort gilt: Read-only ohne Gate, kein Schreibzugriff; Layout abgelöst durch ADR-054") und beide Statusformulierungen angleichen.
- [ ] [docs/adr/039-verzehrerfassung-fokusliste-route-neutral.md:122-124] D4-Schlussabsatz „`VerzehrErfassung` **bleibt bestehen**: der `IdentityGate` nutzt es weiterhin …" ist falsch – die Datei ist gelöscht, an ihre Stelle tritt `VerzehrUebersicht` (`IdentityGate.tsx:112`). Das D4-Banner (`:103-105`) deckt nur Read-only und Empty-State ab. Fix: Banner um „`VerzehrErfassung` entfällt; vor der Namenswahl steht `VerzehrUebersicht` (ADR-054 D4)" ergänzen.
- [ ] [app/_verzehr/VerzehrEinzelansicht.tsx:101-102, app/_verzehr/VerzehrEinzelansicht.positionszustand.test.tsx:67-90] Folge des K1-Fixes, nicht dokumentiert und nur halb getestet: Durch den Remount je Person geht (a) ein Fehler, der **nach** dem Wegwechseln eintrifft (Anna „+", sofort „Nächste Person", Drossel-Ablehnung), still verloren, und (b) beim Rückweg A → B → A sind As Knöpfe trotz laufender Aktion wieder aktiv (`pending=false` der neuen Instanz). Kein Datenverlust (Delta-Protokoll, Menge vom Server) und **keine Regression** – auf `origin/main` hängte das Einklappen den Kartenkörper samt `MengeControl` ebenso aus (`VerzehrErfassung.tsx`, `koerperSichtbar`). Aber FS1/AK4.4 sprechen von der „betroffenen" Position ohne Einschränkung. Zudem ist der Test `:67-78` keine echte Spiegel-Richtung (er wiederholt Test 1 mit vertauschten Personen; der in Runde 1 geforderte Rückweg fehlt). Fix: Grenze als bewusste Entscheidung in ADR-054 (D2 oder Konsequenzen) + Satz im Key-Kommentar festhalten („gilt, solange die Person angezeigt wird"); Rückweg-Test ergänzen, der das gewollte Verhalten belegt, und den Kommentar „Spiegel-Richtung" an `:68` korrigieren.

## Nitpicks (optional)
- [ ] [docs/adr/035-selbstbedienung-erfasser-ziel-fokus.md:81-82, docs/adr/039-verzehrerfassung-fokusliste-route-neutral.md:71-72] Nach dem neuen Banner fehlt die Leerzeile – per CommonMark-Lazy-Continuation gehört der abgelöste Originalabsatz dadurch mit zum Banner-Zitat. Leerzeile einfügen (wie bei ADR-035 D2, ADR-039 D3/D4).
- [ ] [docs/adr/035-selbstbedienung-erfasser-ziel-fokus.md:56-59] Älteres #187-Banner sagt weiter „Der Rest von D2 (exportierte `ZeileKarte`, optionale Akkordeon-Props) bleibt gültig" – widerspricht dem neuen ADR-054-Banner direkt darüber. Halbsatz „(überholt durch ADR-054)".
- [ ] [docs/adr/039-verzehrerfassung-fokusliste-route-neutral.md:44-53] D1 gilt laut Status fort, nennt aber `initialOpenId` und „nur in der geöffneten Karte" – Hinweis auf die Umbenennung `initialeZeileId` (ADR-054 D1) fehlt.
- [ ] [docs/adr/054-verzehr-einzelansicht-statt-fokus-akkordeon.md:99, :173-174] D4-Überschrift „`VerzehrErfassung` schrumpft zur Nur-Lese-Übersicht" – tatsächlich gelöscht + neu `VerzehrUebersicht.tsx`. Und „ADR-052-Regeln gelten für die berührten Dateien ab sofort" stimmt für die Konsumenten nicht (rohe Farben/`dark:` in `IdentityGate.tsx:88/145/152/175`, `verzehr/page.tsx:39/91/95/98`, vorbestehend, laut spec-370 Sache von #369/#374) – auf `app/_verzehr/` eingrenzen (wie AK7.1).
- [ ] [tasks/task-370-verzehr-erfassung-kompakt-touch.md:63, :67, :69, :75-76] Technische Notizen veraltet: „Proposed → … flippen" (ADR ist Accepted), „ÄNDERN `VerzehrErfassung.tsx`", `fussleisteClassName` fehlt in den Konsumenten-Zeilen.
- [ ] [app/_verzehr/VerzehrUebersicht.tsx:14, app/_verzehr/VerzehrEinzelansicht.tsx:102] Im Rework neu geschriebene Kommentarzeilen über `printWidth` 100 (~124 bzw. ~103 Zeichen; Prettier bricht Kommentare nicht um) – an den Rest der Datei angleichen.
- [ ] [app/_verzehr/VerzehrEinzelansicht.test.tsx:435] Test „takeFooterPaddingFromConsumer" prüft zusätzlich `mx-auto`/`max-w-3xl` (Layout der Komponente, nicht das Konsumenten-Padding) – auf `px-6` beschränken.
- [ ] [app/_verzehr/VerzehrEinzelansicht.positionszustand.test.tsx:6, VerzehrEinzelansicht.test.tsx:5] Runde-1-Nitpick „ein Importpfad für `VerzehrArtikel`" nur im Produktionscode umgesetzt; die beiden internen Tests importieren weiter über den Re-Export `./verzehr-props` (wie `IdentityGate.tsx:5` von außen – dort korrekt).
- [ ] [app/_verzehr/PersonenKopf.tsx:19-20] „Getränke/Kaffee/Essen" als Literale, obwohl `KATEGORIE_LABEL` (`kategorien.ts:17-22`) dieselben Texte führt.
- [ ] [app/_verzehr/VerzehrEinzelansicht.tsx:66, :71-75] `gewaehlteKategorie` bleibt nach Rückfall auf `"inaktiv"` stehen (spec-konform, AK2.4, aber überraschend beim nächsten Personenwechsel); `wechsleZu` reagiert auch auf den bereits aktiven Chip (schreibt Ziel erneut, scrollt nach oben) – harmlos.
- [ ] [e2e/verzehr-einzelansicht.spec.ts:153, :190] `ersteZeile` ist ein „Menge verringern"-Knopf (Name); `box(letzterStepper)` doppelt gemessen.
- [ ] [app/veranstaltung/[id]/verzehr/page.tsx:113-122 vs. app/theke/[token]/IdentityGate.tsx:35-36] Bleed/Padding auf F7 als benannte Konstanten, auf F5 als Literale – zwei Stile für dieselbe Sache.

## Positives
- K1 sauber behoben: `key={aktiveZeile.id}` an der richtigen Stelle, WHY-Kommentar, Tests mit echtem `MengeControl`/`useActionState`, die Fehler bzw. Pending zuerst positiv nachweisen; nie auflösendes Promise nach Lesson #369.
- Kein weiterer Client-Zustand wandert falsch mit: `PersonenChips`-Refs nach `zeile.id` geschlüsselt, Kategorie bewusst über dem Key (AK2.4), Fußleisten-Aktion je Person abgeleitet.
- Stale-/Fallback-Logik (FS3, FS5, AK1a.5/1a.6), inaktive Positionen (AK2.5, passend zur Serverregel `actions.ts:578-581`), „Nächste Person" zyklisch ab 2, `onFokusWechsel` nur auf der Theke im Schreibmodus – alles verifiziert.
- Route-Neutralität und Server/Client-Grenze eingehalten (`VerzehrUebersicht` ohne `"use client"`, `KEIN_TEILNEHMER_HINWEIS` server-tauglich); `app/_verzehr/` frei von rohen Farben/`dark:`, in `eslint/ui-token-files.mjs`.
- Runde-1-Rework vollständig: `groessenSuffix` entfernt, kleinfunde-Eintrag gelöscht (keine verwaisten `_verzehr`-Anker mehr), `Closes #205`, Fußleisten-Padding vom Konsumenten (Lesson #188), ADR-039 D2–D4 mit Bannern, E2E mit auto-wiederholenden Assertions.

## Empfehlung
NEEDS_REWORK

> Begründung: keine Code-Defekte, aber drei ADR-Drifts und eine undokumentierte Verhaltensgrenze
> (Wichtig 4) – alles Doku plus ein Test, also ein kleiner Rework. Circuit Breaker: Das ist Runde 2.
> Eine dritte Runde auf denselben Code ist die letzte vor der Eskalation an den Menschen.
