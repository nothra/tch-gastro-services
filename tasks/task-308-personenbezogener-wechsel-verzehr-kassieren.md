# Task 308: personenbezogener-wechsel-verzehr-kassieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung

Direkter, personenbezogener Wechsel zwischen Verzehrerfassung (`/veranstaltung/[id]/verzehr`)
und Kassieren (`/veranstaltung/[id]/kassieren`): aus der geöffneten Teilnehmer-Karte direkt in
die Kassierzeile **dieser** Person (angescrollt, hervorgehoben, `Erhalten`-Feld fokussiert) und
aus jeder Kassierzeile direkt zurück in die geöffnete Verzehr-Karte derselben Person. Reine
Navigation – keine Änderung an Summen, Zeilenstatus oder Abschluss-Gate.

**Spec:** [`docs/specs/spec-308-personenbezogener-wechsel-verzehr-kassieren.md`](../docs/specs/spec-308-personenbezogener-wechsel-verzehr-kassieren.md)

## Akzeptanzkriterien
- [x] AK1 – Hinweg: Aktion „Kassieren" in der geöffneten Karte führt personenbezogen in die Kassieransicht
- [x] AK2 – Zielzeile ist hervorgehoben und im Sichtbereich (sticky Kopf verdeckt sie nicht)
- [x] AK3 – `Erhalten`-Feld der Zielzeile hat den Tastaturfokus (offene Veranstaltung)
- [x] AK4 – Listen-Reihenfolge unberührt: Sortierung #223 und Positions-Freeze #253 bleiben gültig
- [x] AK5 – Rückweg: Aktion „Verzehr erfassen" in jeder Kassierzeile führt personenbezogen zurück
- [x] AK6 – Zielkarte initial geöffnet (alle anderen zu) und im Sichtbereich
- [x] AK7 – „Kassieren"-Aktion nur in der geöffneten Karte, nicht in eingeklappten
- [x] AK8 – Wechsel beliebig oft in beide Richtungen, ohne Umweg über die Detailseite
- [x] AK9 – Öffentlicher Weg `/theke/[token]` zeigt keine „Kassieren"-Aktion
- [x] AK10 – Abgeschlossene Veranstaltung: Wechsel-Links bleiben, Lesesicht bleibt Lesesicht
- [x] AK11 – Personenbezug übersteht ein Neuladen der Zielseite
- [x] AK12 – Summen, Erhalten, Spende, Zeilenstatus und Gesamtabrechnung unverändert
- [x] F1 – Unbekannter Personenbezug: Standardzustand, keine Fehlermeldung, kein 404, kein Leck
- [x] F2 – Abgeschlossen ohne `Erhalten`-Feld: Hervorhebung ja, Fokus nein, kein Laufzeitfehler
- [x] F3 – Veranstaltung ohne Teilnehmer: Leer-Hinweis unverändert, kein Fehler
- [x] F4 – Nutzer ohne Rolle `veranstalter`: bestehendes „Kein Zugriff"-Verhalten unverändert

## Technische Notizen

- **Kein ADR-Trigger erkannt** (`/architecture` entfällt): reine Navigation, keine neue
  Auth-Mechanik (beide Seiten sind bereits `veranstalter`-gegated), kein neues Datenmodell, keine
  neue Route. Die relevanten Entscheidungen liegen bereits vor: ADR-039 (route-neutrale
  Verzehr-Bausteine, D1: kein Feature-/Routen-Import), ADR-024 (Route-Schnitt), #223/#253
  (Sortierung + Positions-Freeze der Kassierliste).
- Vorhandene Bausteine, die der Wechsel nutzen kann: `FokusListe` hat bereits
  `initialOpenId: string | null`; die Kassierliste rendert über `EingefroreneZeilenListe`.
  `scroll-margin-top` wegen der sticky Köpfe beachten (vgl. #188).
- `docs/routes.md` braucht **keine** Änderung (keine neue Route, kein geänderter Zugriff).

### Umsetzungsentscheidungen (`/implement`)

- **Trägermechanik = Query-Parameter `?zeile=<zeileId>`** in einem eigenen Modul
  `app/veranstaltung/personenbezug.ts`. Beide Href-Bauer (`kassierenHref`/`verzehrHref`) und der
  Leser (`personenbezogeneZeileId`) hängen an derselben Konstante `PERSONENBEZUG_PARAM`, damit Hin-
  und Rückweg nicht auseinanderdriften; ein Round-Trip-Test sichert das ab. Query-Parameter statt
  Komponentenzustand, weil der Bezug ein Neuladen überstehen muss (AK11).
- **Kein Zod-Schema für den Parameter.** Die einzige gültige Wertemenge sind die Zeilen-Ids der
  geladenen Veranstaltung – die Mengenprüfung gegen `zeilen` ist strenger als jedes Formatschema.
  Alles andere (fehlend, mehrfach übergeben → Array, unbekannt, aus fremder Veranstaltung) ergibt
  `null` und damit den Standardzustand: fail-soft ohne Fehlermeldung und ohne Aussage darüber, ob
  der Wert woanders existiert (F1). Der Auflösungspunkt liegt **hinter** dem Rollen-Gate, deshalb
  verschafft ein geratener Wert weder Zugang noch Information (F4).
- **Route-Neutralität gewahrt (ADR-039 D1).** `ZeileKarte` bekommt eine generische
  `aktion?: ReactNode`-Prop und kennt weder Route noch Semantik; `FokusListe` reicht sie über
  `aktionJeZeile` je Zeile hinein. Die Aktion hängt am **sichtbaren Körper** – dadurch erscheint
  sie strukturell nur in der geöffneten Karte (AK7), statt über eine zusätzliche Bedingung. Der
  öffentliche Weg (`IdentityGate`) reicht die Prop gar nicht herein → AK9 ist eine Abwesenheit
  durch Nicht-Verdrahtung, nicht durch ein Flag.
- **Hervorhebung in `EingefroreneZeilenListe`**, weil diese Komponente die `<li>`-Elemente besitzt.
  Sie markiert genau eine Zeile (`aria-current` + Akzentfarbe, Light/Dark) und scrollt sie an;
  Reihenfolge, Inhalt und Status bleiben unberührt (AK4/AK12). Kein Verblassen-Timer – bewusst so
  in der Spec entschieden (zeitabhängige Tests wären flaky).
- **Scroll-Timing** in beiden Listen im `requestAnimationFrame`-Callback, also erst gegen das
  fertige Layout (Muster aus #188). Auf der Verzehrseite hält das vorhandene `scroll-mt-16` der
  Karte den Kopf frei von der sticky Chip-Leiste; die Kassierseite hat keinen sticky Kopf, dort
  genügt `block: "start"` ohne scroll-margin.
- **`autoFocus` nur in der Zielzeile** (`autoFocusErhalten`, Default `false`) – ohne Personenbezug
  fordert keine Zeile den Fokus an, sonst zöge ihn bei vielen Teilnehmern die letzte gerenderte
  Zeile an sich. In der Lesesicht existiert das Feld nicht, der Fokus entfällt ohne Sonderfall (F2).
- **Wechsel-Links auch bei abgeschlossener Veranstaltung** (AK10), weil sie reine Navigation sind –
  sie hängen nicht am `editable`/`offen`-Flag.
- **Der Mount-Scroll in `FokusListe` wirkt bewusst auch auf den öffentlichen Weg F7.** Der neue
  Effekt scrollt *jede* initial offene Karte in den Sichtbereich – auf `/theke/[token]` ist das die
  aus der geräte-lokalen Ziel-Merkung vorgewählte Karte (ADR-035 D1), die vorher beim Laden liegen
  blieb. Bewusst **ohne** Opt-out-Prop: „initial offen" heißt auf beiden Wegen „fokussiert", und
  dieselbe Zusage gilt bereits für die Chip-Auswahl (`waehleZiel`) – eine Prop wäre Fläche ohne
  Gewinn. Festgehalten in ADR-039 § Konsequenzen und gegen Regression gesichert durch
  `should_scrollRememberedZielCardIntoViewAfterLayout_when_bothStored` (`IdentityGate.test.tsx`).
  Der Test ist per Mutation belegt (Mount-Effekt invertiert → rot).

### Oberflächen-Verifikation

Zusätzlich zu den Unit-/Seiten-Tests gegen einen **echten lokalen Dev-Server** verifiziert
(Unit-grün ≠ UI-grün): neue Opt-in-Spec `e2e/wechsel-verzehr-kassieren.spec.ts`, **2 Tests grün**.
Belegt am echten DOM/Router, was jsdom nicht kann: Router-Übergang mit `?zeile=`, Hervorhebung
inkl. `toBeInViewport()`, echter Tastaturfokus im `Erhalten`-Feld, Neuladen (AK11), Rundlauf in
beide Richtungen (AK8) und F1 auf beiden Seiten.

Bewusst **nicht** im Standard-`pnpm test:e2e`-Lauf (Schalter `E2E_WECHSEL_308=1`, analog
`anleitung-veranstalter.spec.ts`): die Spec legt Daten an, und CI fährt E2E gegen die **persistente
INT-Umgebung** (`deploy-gate.yml`) – die dortigen Specs sind rein lesend. Lokal ausführen:

```bash
pnpm db:up && pnpm db:seed
E2E_WECHSEL_308=1 pnpm exec dotenv -e .env.local -- playwright test e2e/wechsel-verzehr-kassieren.spec.ts
```

Notiz zum Erstlauf: der erste Lauf war rot, weil beide Tests parallel dieselbe Veranstaltungs-
Bezeichnung anlegten und der Link-Zuwachs-Vergleich dadurch 2 statt 1 zählte – ein
Fixture-Artefakt, kein Produktbefund. Behoben durch eine je Test eindeutige Bezeichnung
(Begründung steht am Helper, damit sie nicht wieder eingebaut wird).

### Gates

`scripts/checks/pre-push.sh` vollständig grün: Tests **736 passed / 59 skipped**, Typecheck,
Prettier, Routen-Doku-Drift (synchron – kein Pfad-/Zugriffswechsel; nach Rework-Runde 1 nennt die
Funktionsspalte beider Routen zusätzlich den Aufruf-Vertrag `?zeile=`, was der strukturelle
Drift-Check nicht prüft), Hooks, Branch-Check.

## Offene Fragen
- Keine offenen fachlichen Fragen (siehe Spec → „Offene Fragen" für die bewusst dort
  entschiedenen Punkte).

## Review-Findings

Runde 1 (`tasks/review-308.md`): keine kritischen Findings, Empfehlung `NEEDS_REWORK` wegen zwei
Doku-/Test-Nachzügen. Am Produktionsverhalten des Features wurde nichts geändert.

- [x] **W1 – ADR-039-Drift.** D3/D4 beschrieben `initialOpenId={null}` als feste F5-Mechanik, D1
      zählte die Props ohne `aktionJeZeile` auf. Drift-Hinweise an D1, D3 und D4 ergänzt (Stil wie
      der bestehende Hinweis in ADR-035 D2) plus ein Trade-off-Punkt unter § Konsequenzen. Ohne
      Personenbezug gelten D3/D4 unverändert – genau das steht jetzt dort.
- [x] **W2 – F7-Verhaltensänderung nicht festgehalten/abgesichert.** Der Mount-Scroll trifft auch
      den öffentlichen Weg. Entscheidung jetzt unter „Umsetzungsentscheidungen" + ADR-039
      § Konsequenzen, Regressionsschutz durch einen neuen Test in `IdentityGate.test.tsx`.
- [x] **N1** – Identitätsfunktion `suchparameter(...)` in `personenbezug.test.ts` entfernt, die
      Aufrufstellen übergeben das Objektliteral direkt (der Parametertyp greift ohnehin).
- [x] **N2** – Klassenkette beider Wechsel-Links als `WECHSEL_LINK_CLASS` neben
      `PERSONENBEZUG_PARAM` zusammengezogen; sie gehört zum selben „ein Bedienmuster"-Versprechen.
- [x] **N4** – `docs/routes.md`: Funktionsspalte beider Routen nennt den Aufruf-Vertrag
      `?zeile=<zeileId>` (kein Pfad-/Zugriffswechsel, Drift-Check bleibt strukturell grün).
- [ ] **N3 (bewusst offen)** – `EingefroreneZeilenListe` trägt seit diesem PR zwei Zuständigkeiten
      (Positions-Freeze + Zielzeilen-Hervorhebung); der Modul-Header ist mitgepflegt, der Name nicht.
      Der Review nennt ausdrücklich „kein Rename-Zwang" – ein Rename berührt Komponente, Test und
      beide Konsumenten und gehört damit in den `/refactor`-Pass, nicht in die Rework-Runde.
      **Erledigt in `/refactor`:** umbenannt zu `KassierZeilenListe` (Typ `KassierZeile`), Datei
      + Test + der eine Produktions-Konsument (`kassieren/page.tsx`) mitgezogen. Der interne
      Freeze-Helfer `ordneNachEingefrorenerReihenfolge` behält seinen Namen – er beschreibt weiter
      korrekt nur den Freeze-Teil. Historische Doku (`review-253.md`, `lessons/testing.md` u. a.)
      bewusst unverändert gelassen (Vorfall-Narrativ, kein Präsens-Mechanik-Text).

**Runde 2/3 – manuelle Freigabe nach Circuit Breaker:** `/review 308` hat in Iteration 2 und 3
jeweils das Turn-Limit (30) erreicht, bevor ein aktualisierter Report geschrieben wurde – die
Pipeline hat `NEEDS_REWORK` nur als Turn-Limit-Fallback gewertet, ohne neue Findings.
`tasks/review-308.md` spiegelt weiterhin den Stand aus Iteration 1 (die einzige vollständige
Review-Runde). Der Rework-Lauf nach Iteration 2 bestätigte zusätzlich, dass am Code nichts mehr
zu tun war (Gates grün, 736 Tests). Nach Rücksprache mit dem Menschen gilt der Report aus Runde 1
als maßgeblich; die Checkbox „Review bestanden" wurde daraufhin manuell gesetzt.

## Test-Vervollständigung (`/test`)

- Coverage der 8 durch diese Task geänderten/neuen Produktionsdateien: **100%**
  (Statements/Branches/Funktionen/Zeilen) für `personenbezug.ts`, `FokusListe.tsx`,
  `VerzehrErfassung.tsx`, `EingefroreneZeilenListe.tsx`, `KassiereZeileForm.tsx`,
  `kassieren/page.tsx`, `verzehr/page.tsx`. `IdentityGate.tsx` blieb in dieser Task
  unverändert (nur der Test wurde ergänzt) – die zwei unabgedeckten Zeilen dort sind
  vorbestehende `useSyncExternalStore`-SSR-Snapshot-Stubs, die in jsdom nie laufen.
- Alle 12 Akzeptanzkriterien und alle 4 Fehlerszenarien sind über Unit-/Komponenten-Tests
  sowie die E2E-Spec referenziert und benannt – keine Lücke gefunden.
- Gesamt-Repo-Coverage 89,56 % Statements / 94,45 % Branches – über der 80%-Schwelle;
  die einzigen niedrig abgedeckten Dateien liegen in `.../db/` (Drizzle-Data-Layer,
  benötigt echte DB, unabhängig von dieser Task).
- Keine neuen Tests nötig, keine Produktionscode-Änderung in diesem Schritt.

## Security-Review

`tasks/security-308.md` – Ergebnis **PASSED**, keine kritischen oder wichtigen Findings. Query-
Parameter-Validierung, Autorisierungsreihenfolge und die strukturelle Abwesenheit der Kassieren-
Aktion im öffentlichen Weg wurden unabhängig gegen den Code verifiziert (nicht nur die Tests
gelesen).

## Codify-Notizen

Siehe `tasks/codify-308.md`. Kern-Learning: Der Pipeline-Report-Guard (ADR-019 §4) hat in
Review-Iteration 2 und 3 jeweils einen stehengebliebenen Verdict aus Iteration 1 als frisch
gewertet (Turn-Limit vor Report-Update) und den Circuit Breaker fälschlich ausgelöst, obwohl der
Rework längst fertig war. Lesson erweitert (`lessons/factory-workflow.md`), Fix als eigenständige
Task ausgelagert: **Issue #310**.

PR-Shepherd 2026-08-26: Merge freigegeben – alle Gates grün, CI lief zum Freigabezeitpunkt noch
(Auto-Merge wartet serverseitig darauf). Kein Approval erforderlich (0-Approvals-Policy, ADR-029).

---
Branch: `feature/308-personenbezogener-wechsel-verzehr-kassieren`
Erstellt: 2026-08-26 19:46
