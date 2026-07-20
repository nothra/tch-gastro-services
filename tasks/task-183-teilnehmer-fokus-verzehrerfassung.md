# Task 183: teilnehmer-fokus-verzehrerfassung

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
<!-- Was soll implementiert werden? -->

Überarbeitung der Selbstbedienungs-Verzehrerfassung (F7, `theke/[token]`) mit Fokus auf den
**Ziel-Teilnehmer** statt auf den Erfasser. Trennung von **Erfasser** (wer bedient, einmalig
festgelegt, rein clientseitig/anonym gemerkt) und **Ziel-Teilnehmer** (für wen gebucht wird,
schnell wechselbar). Zweistufiger, geführter Einstieg (Erfasser → Ziel-Teilnehmer), Akkordeon
mit nur dem Ziel-Teilnehmer aufgeklappt, und eine dauerhaft erreichbare (sticky) Teilnehmer-
Auswahl für schnelle Navigation auf Handy/Tablet.

**Kein** neues Datenmodell, **keine** Migration – reine Präsentations-/Client-Schicht auf dem
mit #54/ADR-034 gelegten Fundament. Kanonische Spec: [`docs/specs/spec-183-erfasser-ziel-teilnehmer-verzehr.md`](../docs/specs/spec-183-erfasser-ziel-teilnehmer-verzehr.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->

### Zweistufiger Einstieg
- [x] GIVEN erstmaliges Öffnen (offene Veranstaltung, kein Erfasser gemerkt) WHEN die Seite lädt THEN erscheint zuerst „Wer bist du?"; Erfassbereiche noch nicht bearbeitbar.
- [x] GIVEN „Wer bist du?" WHEN ein Erfasser gewählt wird THEN wird er clientseitig pro Token gemerkt UND direkt „Für wen möchtest du einen Verzehr erfassen?" abgefragt.
- [x] GIVEN die Ziel-Frage nach gewähltem Erfasser WHEN sie angezeigt wird THEN ist die erste Antwortmöglichkeit „Für mich" (der Erfasser), darunter die übrigen Teilnehmer.
- [x] GIVEN die Ziel-Frage WHEN „Für mich" gewählt wird THEN wird der Erfasser als Ziel-Teilnehmer übernommen (ohne erneute Namenssuche), gemerkt und dessen Erfassbereich aufgeklappt.
- [x] GIVEN „Für wen?" WHEN ein Ziel-Teilnehmer gewählt wird THEN wird die Auswahl gemerkt, dessen Erfassbereich aufgeklappt (andere zu) und die Bearbeitung freigeschaltet.

### Wiederkehr / Persistenz
- [x] GIVEN gemerkter Erfasser UND Ziel-Teilnehmer WHEN der Link erneut geöffnet wird THEN werden beide Fragen übersprungen und der zuletzt gewählte Erfassbereich ist direkt aufgeklappt.

### Akkordeon & Transparenz
- [x] GIVEN mehrere Teilnehmer WHEN einer aufgeklappt ist THEN sind die übrigen eingeklappt.
- [x] GIVEN ein eingeklappter Erfassbereich WHEN er dargestellt wird THEN zeigt er weiterhin Name + laufende Summen (Getränke/Essen/Kaffee).
- [x] GIVEN ein eingeklappter Teilnehmer WHEN darauf getippt wird THEN klappt er auf und der zuvor offene zu (höchstens einer offen).

### Schnelle Navigation
- [x] GIVEN die Erfassungsansicht auf Handy/Tablet WHEN gescrollt wird THEN bleibt oben eine dauerhaft erreichbare Teilnehmer-Auswahl (Chips/Dropdown) sichtbar.
- [x] GIVEN die Sticky-Auswahl WHEN ein Teilnehmer angetippt wird THEN wird er Ziel-Teilnehmer, sein Bereich klappt auf (andere zu), kommt in den Sichtbereich und wird gemerkt.

### Erfasser-Wechsel (untergeordnet)
- [x] GIVEN eine laufende Erfassung WHEN der Erfasser gewechselt werden soll THEN ist das über eine unauffällige, aber erreichbare Aktion möglich; neuer Erfasser wird gemerkt.

### Read-only
- [x] GIVEN eine abgeschlossene Veranstaltung WHEN der Link geöffnet wird THEN kein Erfasser-/Ziel-Flow; Liste im selben Akkordeon-Layout, aber nicht bearbeitbar.

### Fehlerszenarien
- [x] GIVEN gemerkter Erfasser/Ziel nicht (mehr) in der Liste WHEN die Seite lädt THEN wird die betreffende Frage erneut gestellt (Stale-Fallback).
- [x] GIVEN localStorage nicht verfügbar WHEN die Seite öffnet THEN funktioniert der Ablauf weiter (bei jedem Laden erneut fragen), kein Absturz.
- [x] GIVEN leere Teilnehmerliste WHEN der Link geöffnet wird THEN bestehender neutraler Hinweis, kein Gate.

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Architektur festgelegt in [ADR-035](../docs/adr/035-selbstbedienung-erfasser-ziel-fokus.md).
**Reine Präsentations-/Client-Schicht** – kein Datenmodell, keine Migration, keine neue
Dependency, kein neuer Auth-Pfad, keine `docs/routes.md`-Änderung.

**Betroffene Dateien:**
- `app/_verzehr/VerzehrErfassung.tsx` – interne `ZeileKarte` **exportieren** und um **optionale**
  Akkordeon-Props erweitern (`collapsible?`, `open?`, `onToggle?`). Ohne diese Props **unverändertes**
  Verhalten (flach, aufgeklappt). Eingeklappt: nur Kopf (Name + Summen) rendern, Körper (Kategorien +
  `MengeControl`) weglassen. (ADR-035 D2)
- `app/veranstaltung/[id]/verzehr/page.tsx` (F5) – **nicht anfassen** (nutzt die Karte weiter flach).
- `app/theke/[token]/FokusListe.tsx` – **NEU**, `"use client"`: sticky Chip-Leiste (D3) + Akkordeon
  (genau eine offen = Ziel), rendert die wiederverwendete Karte collapsible; `scrollIntoView` beim
  Wechsel **guarded** (`ref.current?.scrollIntoView?.({ block: "start" })`).
- `app/theke/[token]/IdentityGate.tsx` – **umbauen** zur Zustandsmaschine (Erfasser → Ziel), Zweischritt
  „Wer bist du?" → „Für wen?" mit **„Für mich"** als erster Option; rendert bei beiden gesetzt die
  `FokusListe`, sonst die passende Frage. „Erfasser wechseln" unauffällig. (ADR-035 D1)
- Kleiner **guarded localStorage-Helfer** (fail-open, try/catch) – IDs statt Namen; Schlüssel
  `tch:sb:erfasser:<token>` / `tch:sb:ziel:<token>`; Legacy-Adoption von `tch:sb:name:<token>` (D4/D6).

**TDD-Reihenfolge & Pflicht-Testfälle (je AC ein Test, Codify #117/#116):**
1. Guarded-Storage-Helfer: read/write/clear, **Storage-nicht-verfügbar → fail-open** (kein Throw),
   Stale-ID → null. **Legacy-Keep-Test:** Alt-Key `tch:sb:name` mit passendem Namen → als Erfasser-ID
   adoptiert + Alt-Key entfernt; ohne Match → ignoriert.
2. Karte collapsible: `open=false` rendert **Kopf + Summen**, aber **keine** `MengeControl`;
   `open=true` rendert Körper. Ohne die Props (F5-Pfad): unverändert voll aufgeklappt (Regressions-Test).
3. `FokusListe`: genau **eine** Karte offen; Chip-Tipp/Karten-Tipp öffnet Ziel + schließt andere +
   merkt Ziel; aktiver Chip `aria-current`. Read-only (`editable=false`): alle zu, keine Controls.
4. `IdentityGate`-Zweischritt: kein Erfasser → „Wer bist du?"; Erfasser gewählt → „Für wen?" mit
   **erster** Option „Für mich"; „Für mich" → Ziel = Erfasser (kein zweiter Suchschritt);
   anderer Teilnehmer → Ziel gesetzt, Karte offen. Wiederkehr (beide gemerkt) → direkt Fokus-Ansicht.
   Stale Erfasser → „Wer bist du?"; Stale Ziel (Erfasser bekannt) → „Für wen?". Erfasser-Wechsel.
5. Leere Liste → bestehender neutraler Hinweis (kein Gate). Read-only → kein Gate.

**Achtung Codify-Altlasten:** `set-state-in-effect` vermeiden (Auswahl über Event/`useSyncExternalStore`
wie im bisherigen Gate, kein `useEffect`+`setState`); `afterEach(cleanup)` bleibt; `MengeControl` in
Tests wie gehabt stubben.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
_Durch /architecture (ADR-035) geklärt: Sticky-Auswahl = Chip-Leiste (D3); Persistenz = IDs, zwei
Schlüssel + Legacy-Adoption (D1/D6); Akkordeon = wiederverwendete Karte + neue F7-`FokusListe`,
F5 unberührt (D2)._

## Implementierungs-Notizen (/implement, 2026-07-20)

**ADR-Trigger-Check (Schritt 0):** Kein Trigger. Die Architektur ist in ADR-035 bereits
entschieden; die Umsetzung ist reine Präsentations-/Client-Schicht – keine Technologiewahl, kein
neues Architekturmuster, kein Schnittstellen-Vertrag, keine irreversible Konsequenz (kein
Datenmodell, keine Migration, keine neue Dependency, kein neuer Auth-Pfad, keine `docs/routes.md`-
Änderung).

**Umgesetzt (TDD, Red→Green je AC):**
1. `app/theke/[token]/erfasser-ziel-storage.ts` (**NEU**) – geräte-lokale Persistenz von Erfasser-
   und Ziel-**Zeilen-ID** je Token (`tch:sb:erfasser:` / `tch:sb:ziel:`), fail-open (try/catch),
   Stale-Auflösung gegen `zeilen`, einmalige Legacy-Adoption von `tch:sb:name:` (D6). 11 Unit-Tests.
2. `app/_verzehr/VerzehrErfassung.tsx` – interne `ZeileKarte` **exportiert** + optionale Akkordeon-
   Props (`collapsible`/`open`/`onToggle`/`ref`). Ohne Props unverändert (F5-Regressions-Test);
   `open=false` rendert nur Kopf (Name + Summen), kein Körper. 6 neue Tests.
3. `app/theke/[token]/FokusListe.tsx` (**NEU**, `"use client"`) – sticky Chip-Leiste (D3) +
   Akkordeon (genau eine Karte offen), `scrollIntoView` guarded; merkt Ziel nur bei `editable`. 6 Tests.
4. `app/theke/[token]/IdentityGate.tsx` – **umgebaut** zur Zustandsmaschine (Erfasser → Ziel) mit
   „Für mich" als erster Ziel-Option, Wiederkehr, Stale-Fallbacks, „Erfasser wechseln", Read-only
   ohne Gate; liest via `useSyncExternalStore` (kein set-state-in-effect), Legacy-Adoption im
   Mount-Effekt (nur localStorage-Write + Event, kein setState). 12 Tests.
5. `app/theke/[token]/page.test.tsx` – zwei Tests an das neue Zweischritt-/Akkordeon-Verhalten
   angepasst (Wiederkehr mit beiden IDs; Read-only = Akkordeon zu, Chip klappt read-only auf).

**Design-Notiz:** Während der Picker-Schritte („Wer bist du?"/„Für wen?") bleibt die bestehende
flache `VerzehrErfassung` **read-only** sichtbar (Namen + Summen + Artikelzeilen, nicht bearbeitbar,
Codify #54). Die neue `FokusListe` (Akkordeon) wird erst bei vollständigem Flow bzw. im Read-only-
Fall (abgeschlossen) gemountet – so entfällt Doppel-State/`key`-Remount-Logik.

**Gates:** `pnpm lint` grün, `pnpm typecheck` grün, `pnpm format:check` grün, Routen-Doku synchron,
Test-Suite grün (558 passed / 59 skipped; 35 neue Tests für #183).

**Offener Nachtest (UI/Dev-Server):** Interaktive Verifikation gegen `pnpm dev` (Zweischritt,
Chip-Wechsel, Sticky-Verhalten auf Handy/Tablet) steht aus – erfordert lokale DB (`pnpm db:up`) +
gültigen Veranstaltungs-Token. Kein neuer Server-/Proxy-Pfad (nur Client-Präsentation auf der
bestehenden `theke/[token]`-Route), daher geringes Unit-≠-UI-Risiko; keine e2e-Seeding-Infra für die
Token-Route vorhanden (auch #54 hatte keine). Nachweis später via `/verify` bzw. `/post-merge-verify`.

## Review-Findings
<!-- Wird durch /review befüllt -->

**Review-Runde 1 (siehe `tasks/review-183.md`): NEEDS_REWORK, 0 kritisch, 1 wichtig, 3 Nitpicks.**

Behoben (/implement, 2026-07-20):
- **Wichtig – `FokusListe.tsx` `toggle` (React-Reinheit):** Seiteneffekte (`writeZielId`,
  `scrollIntoView`) lagen in der `setOpenId`-Updater-Funktion → doppelte Ausführung unter
  StrictMode/Concurrent-Rendering + Cross-Component-State-Update während des Renders. `toggle`
  delegiert jetzt an das bereits korrekte `waehleZiel`
  (`openId === id ? setOpenId(null) : waehleZiel(id)`); Updater rein. Gates grün.

Nitpicks (optional, bewusst nicht umgesetzt – YAGNI/Scope):
- `IdentityGate.tsx:136` `erfasser?.anzeigename ?? ""` – bewusst defensiver, nicht schädlicher
  Fallback (ID ist bereits gegen `zeilen` validiert); belassen.
- `VerzehrErfassung.tsx` Disclosure-`aria-controls` – Ergänzung berührt die geteilte F5-Karte;
  `aria-expanded` genügt für einfache AT. Als optionale A11y-Verbesserung offen.
- `FokusListe.test.tsx` Chip-Test – die offene Ziel-Karte ist über den Kopf-Tipp-Test bereits
  indirekt belegt; keine funktionale Lücke.

**Review-Runde 2 (siehe `tasks/review-183.md`): APPROVED.** Unabhängige Frisch-Prüfung gegen
`git diff origin/main...HEAD` (Codify #161) über alle drei Perspektiven; der Runde-1-Fix wurde
verifiziert (reiner `setOpenId`-Updater, Effekte im Event-Handler). Keine kritischen/wichtigen
Findings. Verbleibende Nitpicks unverändert bewusst offen (s.o.).

## Test-Notizen (/test, 2026-07-20)

**Coverage-Analyse:** Gesamt-Coverage 87,3 % Stmts / 93,75 % Branch / 87,07 % Lines (Schwelle
80 %, siehe PROJECT-CONTEXT.md) – 559 Tests grün, 59 skipped (E2E). Neuer Code des Tasks
(`app/theke/[token]/`) lag bei 97,4 % Stmts / 94,4 % Branch / 97 % Lines; eine Lücke identifiziert
und geschlossen:

- **`FokusListe.tsx:95`** (`positionen.filter(...)`-Callback) war ungetestet, weil
  `FokusListe.test.tsx` durchgängig eine leere `positionen`-Liste nutzte – der Filter lief nie über
  ein Element. Neuer Test `should_showOnlyOwnPositions_when_multipleZeilenHavePositions` belegt
  reales Verhalten (nicht nur Coverage): zwei Zeilen mit demselben Artikel, aber unterschiedlicher
  Menge – jede Karte zeigt ausschließlich ihre eigene Menge. Datei jetzt 100 % (Modul-Aggregat
  `app/theke/[token]` 98,27 % Stmts / 98 % Lines).
- **`IdentityGate.tsx:50,55`** (`() => null`-`getServerSnapshot` für die beiden
  `useSyncExternalStore`-Aufrufe) bleibt ungetestet – bewusst. React ruft `getServerSnapshot` nur
  bei echtem SSR-Rendering auf (`ReactDOMServer`), nicht bei einem Client-Render in jsdom/Testing
  Library. Im Projekt existiert keine SSR-Test-Infrastruktur (kein anderes `useSyncExternalStore`-
  Vorkommen, kein `renderToString` in Tests); ein Test nur für diese zwei Zeilen würde reine
  Framework-Verdrahtung prüfen, kein Nutzerverhalten (Testing-Agent-Grundsatz: „Coverage ist ein
  Mittel, kein Ziel"). Akzeptierte, dokumentierte Lücke.

**AC-Vollständigkeit:** Alle Akzeptanzkriterien aus `docs/specs/spec-183-erfasser-ziel-teilnehmer-
verzehr.md` sind laut Implementierungs-Notizen einzeln testabgedeckt (Zweischritt, Wiederkehr,
Akkordeon, Sticky-Navigation, Erfasser-Wechsel, Read-only, alle drei Fehlerszenarien) – keine
zusätzlichen Lücken beim Abgleich gefunden.

**Gates:** `pnpm test:coverage` grün, `bash scripts/checks/pre-push.sh` grün (Tests, Typecheck,
Format, Routen-Doku-Drift).

## Refactor-Notizen (/refactor, 2026-07-20)

Clean-Code-Pass gegen `git diff origin/main...HEAD` (Codify #161: Diff-Scope gegen
`origin/main`, nicht lokales `main`). Ein Fund, ein kleiner Schritt:

- **`IdentityGate.tsx`:** `zeilen.find((zeile) => zeile.id === erfasserId)` wurde in zwei
  getrennten Branches (Schritt-2-„Für wen?" und der finalen Fokus-Ansicht) identisch berechnet,
  obwohl `erfasserId` ab dem vorausgehenden Guard (`erfasserId === null` → return) in beiden
  Branches bereits nicht-`null` ist. Einmal direkt nach dem Guard aufgelöst und in beiden
  Branches wiederverwendet – kein doppelter Array-Scan, kein neues Verhalten.

Sonst keine weiteren Funde: benannte Konstanten (Storage-Keys, `CATEGORY_ORDER`), kleine
guarded Helfer (`erfasser-ziel-storage.ts`), Early-Returns/Guard-Clauses bereits durchgängig
genutzt, keine Duplikation in `FokusListe.tsx`/`VerzehrErfassung.tsx`. Bereits zwei Review-Runden
(APPROVED) vorher.

**Gates (unverändert grün nach dem Schritt):** `bash scripts/checks/pre-push.sh` – 559 Tests
grün, Typecheck, Format, Routen-Doku-Drift.

## Security-Notizen (/security-review, 2026-07-20)

**Ergebnis: PASSED** (siehe `tasks/security-183.md`) – 0 kritisch, 0 wichtig, 6 Hinweise
(alle Bestätigungen, kein Handlungsbedarf). Scope gegen `origin/main...HEAD` (Codify #161).

Kernbewertung: reine Client-/Präsentationsschicht, keine neue Dependency/Migration/Schema-Änderung
(verifiziert). Entscheidende Frage – weicht der Client-Gate-Refactor eine Server-Grenze auf? –
klar **nein**: `editable` ist rein clientseitige Ableitung aus `status === "offen"`; serverseitig
erzwingt `applyVerzehrAdjust` unabhängig `status !== "offen" → NOT_OFFEN` **und** die IDOR-Bindung
`getZeile(zeileId, ziel.id)` gegen die aus dem Token aufgelöste Veranstaltung. Kein XSS (nur
JSX-Textinterpolation, kein `dangerouslySetInnerHTML`; Token nie im DOM). Kein IDOR über gemerkte
IDs (`readValidId` resolved nur gegen token-scoped `zeilen`, Stale → null). localStorage fail-open
korrekt; Legacy-`tch:sb:name:`-Adoption ist Netto-Verbesserung (Name → opake ID). Route-Neutralität
`app/_verzehr/` eingehalten. Kein Out-of-Scope-Härtungsbedarf → kein neues Issue.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Vollständiger Report: `tasks/codify-183.md`. Kurzfassung:

- **Neue Regel** in `docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine): `setState`-
  Updater-Funktionen müssen rein bleiben – keine Seiteneffekte darin (Review-Runde-1-Fund in
  `FokusListe.toggle`, behoben in Commit `50f85e3`).
- Coverage-Lücke (`FokusListe.tsx:95`), das kleine Refactor-Dedup und die verbleibenden Nitpicks
  brauchen keine neue Regel – bereits durch bestehende Guidelines/Prozesse abgedeckt.
- Security-Review PASSED, keine Learnings.

---
Branch: `feature/183-teilnehmer-fokus-verzehrerfassung`
Erstellt: 2026-07-20 10:44
