# Review: Task 371

Diff-Basis: `git diff origin/main...HEAD` (29 Dateien, +2104/−465), Spec
`docs/specs/spec-371-kassieren-summe-abschluss.md`, ADR-055. Runden: Backend/Logik,
Code-Qualität, Architektur & Patterns.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [ ] [app/veranstaltung/[id]/AbschlussAktion.tsx:69] Nach erfolgreichem Abschließen bzw.
  Wiederöffnen tauscht die Detailseite den ganzen Zweig (`OffeneVeranstaltung` ↔
  `AbgeschlosseneVeranstaltung`), der Auslöser wird neu gemountet. `returnFocusRef` zeigt dann
  auf einen entfernten Knoten, der Tastaturfokus landet vermutlich auf `<body>`. Nicht per Test
  belegt (die E2E prüft den Fokus nur nach „Abbrechen"). Kein AK fordert das; Kandidat für #372
  (einheitliches Bestätigen/Rückmelden).
- [ ] [app/veranstaltung/KassiereZeileForm.tsx:73] Die Erfolgs-Notice („7,00 € erhalten, davon
  1,50 € Spende") bleibt stehen, wenn danach ein neuer Betrag getippt wird, während die
  Live-Spende schon den neuen Wert zeigt. Fachlich korrekt (die Notice meldet den letzten
  gespeicherten Stand), kann aber kurz irritieren.
- [ ] [app/veranstaltung/[id]/kassieren/KassierSummenKarte.tsx:52] Der Link „Abschluss auf der
  Veranstaltungsseite" steht auch bei abgeschlossener Veranstaltung; dort führt er zu „Wieder
  öffnen". Die Spec (AK6) regelt nur den offenen Fall, deshalb kein Defekt.

## Positives

- **Single Source sauber umgesetzt (AK4, ADR-055 D1):** `spendeCents()` ist aus `kassierZeile`
  herausgezogen und wird von Server-Anzeige, Live-Vorschau und Erfolgsmeldung gemeinsam genutzt.
  `offenerBetragCents` sitzt in `kassierTagessummen` und speist Summenkarte und Dialog-Hinweis.
  Keine Nachrechnung in Page oder Client.
- **Live-Parser identisch mit der Server-Grenze (AK9):** `EURO_INPUT_RE` + `parseEuroToCents`
  aus `lib/money`; unlesbare Eingaben ergeben 0,00 € ohne Fehler (FS3), Mehrfachfall-Test
  (`abc`, `-5`, `7,555`, `7,`).
- **Action-Rückgabe normalisiert (ADR-055 D2):** `erhaltenCents: parsed.data.erhalten` statt der
  Roheingabe; `null` → „Betrag entfernt". Die drei bestehenden Action-Tests sind angepasst.
- **`AbschlussAktion`:** `key={durchlauf}` setzt den Action-Zustand je Öffnen zurück (Test
  `should_notShowOldRejection_when_dialogReopened`). `pending` kommt aus derselben Komponente wie
  der Dialog, die Sperre wirkt also ohne `meldeStart`. Das Gate bleibt serverseitig (FS1/FS2
  getestet). Der Test mit offen gehaltener Action folgt Lesson #370 (Resolve-Liste, `afterEach`
  in `act`, Vorbedingung `toHaveLength(1)`).
- **Theke (AK23)** doppelt abgedeckt: kein Auslöser im Kopf (`bearbeitbar`) und kein
  Abschluss-Link in der Summenkarte (`abschliessbar`), beides getestet.
- **Abgeschlossene Detailseite lädt weiter keine Positionen** (ADR-053 D4), per
  `listPositionenMock not.toHaveBeenCalled` abgesichert.
- **Testqualität:** Erwartungswerte sind Literale mit nachvollziehbarer Herleitung (z. B.
  „Anna 2 × 2,50 € mit 3,00 € angezahlt …" → 600). Positions-/Reihenfolge-Tests decken AK16 ab
  (Summenkarte aktualisiert sich, Liste bleibt eingefroren). E2E gegen eigenen Dev-Server
  (Lesson #368) mit 375-px-Überstandsprüfung.
- **Aufräumen vollständig:** `StatusToggle` + Test gelöscht, keine verbliebenen Code-/Doku-
  Präsens-Verweise in `app/`, `e2e/`, `eslint/` und der Anleitung (Grep). ADR-055 steht auf
  Accepted, ADR-053 trägt den Überholt-Hinweis.
- **Token-Gate (ADR-052):** Kassieren-Verzeichnis, `AbschlussAktion`, `KassiereZeileForm` in
  `eslint/ui-token-files.mjs`. Der Gegenrichtungs-Test in `color-gate-wiring.test.ts` nutzt
  jetzt einen weiterhin ungelisteten Nachbarn (`auslagen/page.tsx`).
- **Routen:** keine neue/geänderte `page.tsx`/`route.ts` → `docs/routes.md` zu Recht unberührt.
- **Transparenz:** Der menschliche Nachtest (Anleitungsbilder `10-kassieren.png`/
  `11-abrechnung.png`, Screenshots am PR) ist in der Task-Datei offen benannt.

## Empfehlung

APPROVED
