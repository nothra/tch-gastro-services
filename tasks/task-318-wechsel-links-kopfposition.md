# Task 318: wechsel-links-kopfposition

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Der personenbezogene Wechsel-Link aus #308 (`Kassieren →` in der Verzehr-Karte) steht heute am
Fuß der Teilnehmer-Karte. Er wird an den Kartenkopf verschoben – direkt unter den Anzeigenamen.
Pfeilrichtung, Link-Text, Zielsemantik und die Sichtbarkeitsregeln aus #308 bleiben unverändert.

**Scope-Entscheidung (Requirements-Gespräch):** Die Kassier-Karte (`← Verzehr erfassen`) bleibt
unverändert – abweichend vom ursprünglichen Issue-Text #318 wird dort nichts verschoben.

Spec: [docs/specs/spec-318-wechsel-links-kopfposition.md](../docs/specs/spec-318-wechsel-links-kopfposition.md)

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 – Position in der Verzehr-Karte: `Kassieren →` unmittelbar unter dem Kartenkopf
      (Name + Summenzeile), oberhalb der ersten Erfassungs-Sektion
- [x] AK2 – Sichtbarkeitsregeln aus spec-308 (AK7/AK9/AK10) unverändert, nur an neuer Position
- [x] AK3 – Zielsemantik des Links (`kassierenHref`, Hervorhebung/Fokus) unverändert
- [x] AK4 – `VerzehrErfassung.tsx`/`ZeileKarte` bleibt route-neutral (ADR-039 D1)
- [x] AK5 – Bestehende Tests der Verzehr-Karte auf neue Position umgestellt, mit expliziter
      Reihenfolge-Assertion (Name → Link → Körper), nicht nur Anwesenheit; Kassier-Karte
      bleibt unverändert (keine Test-Anpassung dort)

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger (reine Positionsänderung eines bestehenden Slots, keine neue Technologie/
Architektur/Schnittstelle/irreversible Konsequenz).

Umsetzung: In `ZeileKarte` (`app/_verzehr/VerzehrErfassung.tsx`) wird `{koerperSichtbar && aktion}`
jetzt direkt nach dem Kopf gerendert statt nach dem letzten Erfassungs-Abschnitt. Der `aktion`-Slot
selbst bleibt unverändert (ein einzelner, vom Konsumenten gelieferter `ReactNode`) – `FokusListe`
und die Verzehr-Seite brauchten keine Änderung, da sie nur den Slot befüllen, nicht seine Position
bestimmen.

Zu AK5 – warum nur eine der drei genannten Testdateien angepasst wurde: die bestehenden
#308-Link-Tests in `FokusListe.test.tsx` und `verzehr/page.test.tsx` sind positionsagnostisch
(sie prüfen Präsenz, `href` und das Weiterreichen der Prop, nicht die DOM-Reihenfolge innerhalb
der Karte) und brauchten daher keine Umstellung. Gleiches gilt für
`e2e/wechsel-verzehr-kassieren.spec.ts` (rollen-/textbasierte Assertions).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
Keine offenen fachlichen Fragen – Details zur Kopf-Abgrenzung (Name+Summenzeile vs. nur Name)
sind in der Spec unter „Offene Fragen" bereits entschieden.

## Review-Findings
<!-- Wird durch /review befüllt -->

**Runde 1** (`tasks/review-318.md`, `NEEDS_REWORK`): keine kritischen, vier wichtige Findings,
sechs Nitpicks. Kein funktionaler Defekt – alle wichtigen Findings betreffen die Beweiskraft des
neuen Reihenfolge-Tests und die Präzision des Kommentarblocks:

1. AK1s „unmittelbar" ist nicht assertiert (`toBeGreaterThan` statt `toBe(kopfIndex + 1)`) –
   per Mutation gemessen: ein Fremd-Element zwischen Kopf und Slot lässt alle 40 Tests grün.
2. Reihenfolge-Nachweis liegt auf dem Pfad ohne `collapsible`, obwohl der einzige
   Produktions-Konsument (`FokusListe`) immer `collapsible` rendert.
3. Kommentar-Widerspruch in `VerzehrErfassung.tsx:69` vs. `:74-77` („Körper" trägt zwei
   Bedeutungen; „entfällt nur der Erfassungs-Körper" ist unvollständig).
4. Markup-gekoppelte/asymmetrische Test-Anker (`tagName === "SECTION"`,
   `textContent === "Kassieren"` vs. `includes("Anna")`).

Ein Out-of-Scope-Fund (ADR-035 D2, Ungenauigkeit aus #308) ist unterhalb der Issue-Schwelle in
`docs/factory/kleinfunde.md` festgehalten.

**Rework nach Runde 1:** Alle vier wichtigen Findings behoben:
1. `expect(aktionIndex).toBe(kopfIndex + 1)` statt `toBeGreaterThan` – belegt „unmittelbar" (AK1).
2. Reihenfolge-Test nutzt jetzt `collapsible: true, open: true` – deckt den ausgelieferten
   Kopf-`<button>`-Pfad ab (Produktionskombination von `FokusListe`).
3. Kommentar in `VerzehrErfassung.tsx:74-77` korrigiert: `aktion` teilt das Sichtbarkeits-Gate
   `koerperSichtbar`, statt widersprüchlich „am Körper zu hängen"; Zeile 69 nennt jetzt
   „Erfassungs-Körper und Aktion" beim Einklappen.
4. Indizes im Reihenfolge-Test über verhaltensnahe Marker (`getByText("Anna")`,
   `getByRole("link", { name: "Kassieren" })`, `getByTestId("menge")`) statt Markup/Text-Substring.

Verifiziert: `pnpm vitest run` über alle vier Testdateien → 112/112 grün, `pnpm lint` grün.

**Runde 2** (`tasks/review-318.md`, `NEEDS_REWORK`): keine kritischen Findings, zwei wichtige,
sechs Nitpicks. Alle vier wichtigen Findings aus Runde 1 sind behoben – der Kernfund (AK1
„unmittelbar") ist per Mutation gemessen geschlossen: ein Fremd-Element zwischen Kopf und Slot
macht jetzt genau die Adjazenz-Assertion rot (vorher blieben alle 40 Tests grün). Offen bleiben
zwei Präzisionsfehler in Artefakten dieses PRs:

1. `docs/factory/kleinfunde.md:293` – die Anker `VerzehrErfassung.tsx:113`/`:148` sind durch den
   eigenen Rework-Commit `1a2d137` um eine Zeile verschoben (korrekt: `:114`/`:149`); der
   Dateikopf verlangt verifizierte Anker (Rezidiv-Muster #291).
2. `app/_verzehr/VerzehrErfassung.test.tsx:607` – der von Runde 1 (W3) beanstandete Wortlaut
   „hängt am sichtbaren Körper" steht unverändert in der Geschwister-Kopie und widerspricht dem
   Nachbartest `:615` („nicht mehr am Fuß des Körpers"); Rezidiv-Muster #264 (Grep auf kopierte
   Stellen im selben PR).

**Rework nach Runde 2:** Beide Präzisionsfehler behoben:
1. `docs/factory/kleinfunde.md:294` – Anker korrigiert auf `VerzehrErfassung.tsx:114`/`:149`
   (gegen die aktuelle Datei verifiziert).
2. `app/_verzehr/VerzehrErfassung.test.tsx:607-608` – Wortlaut auf „teilt das Sichtbarkeits-Gate
   des Körpers, sitzt aber nicht mehr im Körper selbst (seit #318)" korrigiert, widerspruchsfrei
   zum Nachbartest `:614-617`.

Verifiziert: `pnpm vitest run app/_verzehr/VerzehrErfassung.test.tsx` → 40/40 grün.

**Runde 3** (`tasks/review-318.md`, `APPROVED` – letzte zulässige Iteration laut Circuit Breaker):
keine kritischen, keine wichtigen Findings. Beide Runde-2-Präzisionsfehler sind an der Quelle
nachgeprüft behoben (Zeilen-Anker `:114`/`:149` gegen `HEAD` nachgezählt, Rezidiv-Grep #264 neu
gefahren – unter `app/` kein Vorkommen mehr). Die aus Runde 2 stammenden Tatsachenbehauptungen
wurden nach Lesson #314 eigenständig gegengeprüft statt übernommen: ADR-039 D1 und ADR-035 D2
enthalten keine Positionsaussage zum `aktion`-Slot (kein ADR-Nachtrag nach #211/#176 fällig), und
`e2e/wechsel-verzehr-kassieren.spec.ts` assertiert durchgehend rollen-/textbasiert, also
positionsagnostisch. Zusätzlich als Positivum belegt: der Slot liegt außerhalb des
Kopf-`<button>` (`:136-147`) – kein verschachteltes interaktives Element, und die Tab-Reihenfolge
ist jetzt Kopf → Wechsel-Link → Erfassung. Die sechs Nitpicks bleiben ausdrücklich optional; die
Erklärlücke zu AK5 (Runde-2-Nitpick 5) ist mit dieser Runde in der Technischen Notiz oben
geschlossen.

Verifiziert: `pnpm vitest run` über alle vier betroffenen Testdateien → 112/112 grün,
`pnpm lint` grün, Arbeitsbaum sauber.

## Test-Ergebnis (`/test`)

Coverage-Analyse (`pnpm test:coverage`, gesamter Baum) zeigt für
`app/_verzehr/VerzehrErfassung.tsx` **100 % Statements/Branches/Functions/Lines** (29/29, 27/27,
13/13, 27/27) – alle Zweige um `koerperSichtbar`, `collapsible`/`open` und den `aktion`-Slot sind
abgedeckt. Alle fünf AK geprüft: AK1 (Position/Adjazenz) und AK5 (Reihenfolge Name → Link →
Körper) sind bereits mit einer exakten `toBe(kopfIndex + 1)`-Assertion belegt (per Mutation in
Review-Runde 2 verifiziert); AK2 (Sichtbarkeitsregeln, ehem. spec-308 AK7/AK9/AK10) ist über
`should_hideAktion_when_collapsibleAndClosed` (AK7), die generische
`should_renderNoAktion_when_aktionOmitted`-Absenz-Prüfung (AK9, Konsument liefert keine Aktion)
sowie die unveränderten, positionsagnostischen Tests in `FokusListe.test.tsx`/
`verzehr/page.test.tsx`/`e2e/wechsel-verzehr-kassieren.spec.ts` (AK10) abgedeckt; AK3/AK4 sind
über bestehende Tests (`href`-Assertion, route-neutrale Konsumenten-Tests) belegt. Keine Lücken
gefunden – Tests testen Verhalten (verhaltensnahe Marker: `getByText`, `getByRole`,
`getByTestId`), sind unabhängig und deterministisch (AAA-Pattern eingehalten). Keine
Testdatei-Änderung nötig, daher kein Commit in diesem Schritt (nur die Checkbox unten).

Verifiziert: `pnpm vitest run` → 803/803 grün (59 skipped, unabhängig von dieser Task), `pnpm lint`
grün, Arbeitsbaum sauber bis auf diese Task-Datei-Aktualisierung.

## Refactoring (`/refactor`)

Kein neues Verhalten eingeführt. Zwei der sechs optionalen Nitpicks aus Review-Runde 3
aufgegriffen (kein Grund für eine Review-Runde, rein strukturelle Verbesserung):

1. `VerzehrErfassung.tsx:74-77` – Kommentar ergänzt um das WHY der Positionsentscheidung
   (Wechsel gehört zur Person, nicht zum Betragsblock; kein Scrollen bei langer
   Aufschlüsselung), passend zum Duktus der übrigen Sätze des Blocks (Nitpick 3).
2. `VerzehrErfassung.test.tsx:614-635` – toter `throw`-Guard nach `container.querySelector("li")`
   entfernt, stattdessen `screen.getAllByRole("listitem")[0]` wie im repo-üblichen Muster
   (`KassierZeilenListe.test.tsx`); der Guard war typnotwendig, aber zur Laufzeit unerreichbar
   (Nitpick 2).

Die übrigen vier Nitpicks bleiben bewusst unangetastet (rein kosmetisch/dokumentarisch, kein
Struktur- oder Klarheitsgewinn im Verhältnis zum Diff-Risiko): Test-Namens-Suffix-Angleichung,
fehlende Reihenfolge-Assertion auf dem strukturell bereits abgedeckten Inaktiv-Zweig,
Bedienmuster-Formulierung in `personenbezug.ts` (bereits als Out-of-Scope-Nachtrag dokumentiert),
Task-Notiz-Halbsatz zu AK5 (bereits in der Technischen Notiz oben nachgetragen).

Verifiziert: `pnpm vitest run` → 803/803 grün (59 skipped), `pnpm lint` grün,
`bash scripts/checks/pre-commit.sh` grün.

## Security-Review (`/security-review`)

`tasks/security-318.md`: **PASSED** – keine kritischen, keine wichtigen Findings, keine Hinweise.
Produktionscode-Anteil des Diffs ist eine verschobene JSX-Zeile; es entsteht kein neuer
Datenfluss, keine neue Grenze, kein neues Input. Positiv belegt statt nur behauptet:

- Sichtbarkeits-Gate `koerperSichtbar` (`VerzehrErfassung.tsx:115`) ist byte-identisch – nicht
  umformuliert, nicht gelockert, nicht dupliziert; nur der Ort im JSX-Baum ist neu.
- Der öffentliche Token-Weg zeigt den Link auf die authentifizierte Kassieransicht weiterhin
  nicht: `aktionJeZeile` hat repo-weit genau **einen** Lieferanten
  (`veranstaltung/[id]/verzehr/page.tsx:113`, hinter dem `veranstalter`-Gate `:36`); beide
  `FokusListe`-Instanzen in `theke/[token]/IdentityGate.tsx` (`:94`, `:160`) übergeben ihn nicht.
- Der Slot ist in der neuen Position **Geschwister** des Kopf-`<button>` (`:137-148`), nicht
  dessen Kind – kein verschachteltes interaktives Element, kein Toggle-Mitfeuern.
- URL-Bau unverändert sicher: `zeileId` per `URLSearchParams` als Daten kodiert
  (`personenbezug.ts:44-46`), `veranstaltungId` vorher fail-closed gegen die DB aufgelöst
  (`getVeranstaltung` → `notFound()`); IDOR-Auflösung über die Zeilen-Menge dieser Veranstaltung
  (`personenbezug.ts:34-41`) vom Diff nicht berührt.
- Keine Dependency-Datei im Diff (`package.json`/`pnpm-lock.yaml`/`next.config.*`/`.env*`) →
  kein `pnpm audit` nötig; kein `dangerouslySetInnerHTML`/`eval`/Secret/Env-Zugriff in den
  `+`-Zeilen; `kleinfunde.md` nutzt den etablierten Kanal (kein neuer Ablage-Mechanismus im
  Sinne von Lesson #286).

Keine Out-of-Scope-Findings – weder Issue (Schritt A) noch `kleinfunde.md`-Eintrag (Schritt B)
anzulegen.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/318-wechsel-links-kopfposition`
Erstellt: 2026-09-09 17:54
