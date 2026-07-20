# Review: Task 54

Scope: `git diff origin/main...HEAD` (Codify #161 – gegen `origin/main`, nicht lokales `main`).
Betrachtet: `db/veranstaltung.ts`, `app/veranstaltung/actions.ts`, `app/theke/[token]/*`,
`app/veranstaltung/[id]/ZugangTeilen.tsx` + `page.tsx`, `lib/base-url.ts`, `vitest.setup.ts`,
`docs/routes.md`, `docs/adr/034`, `docs/specs/spec-54` und die zugehörigen Tests.

## Kritische Findings (müssen behoben werden)
- [ ] Keine.

## Wichtige Findings (sollten behoben werden)
- [x] **Behoben [2026-07-20, /implement-Rework]:** `IdentityGate` rendert jetzt die
      route-neutrale `VerzehrErfassung` selbst mit `editable = offen && nameGewählt`. Teilnehmerliste
      und laufende Summen sind damit **sofort beim Öffnen** sichtbar (read-only), die
      Erfassungs-Controls (±) bleiben hinter dem Namens-Gate. Deckt spec-54 AC B1 („…sieht die
      Teilnehmerliste und die laufenden Summen") ohne Spec-Nachzug. Neue Tests:
      `should_showPickerAndReadOnlyList_when_noStoredName` (+ Stale-/Read-only-Varianten),
      Page-Test `should_showPickerAndReadOnlyList_when_openAndNoStoredName`. Nebenbei: leere Liste
      zeigt jetzt den neutralen öffentlichen Hinweis (Nitpick 4 unten) statt der F5-Meldung.
- [ ] ~~`app/theke/[token]/IdentityGate.tsx:66-68`~~ — **Laufende Summen bei offenem Link erst nach
      Namenswahl sichtbar, entgegen AC B (Spec-Bullet 1).** spec-54 B) verlangt: „WHEN ein
      Teilnehmer den gültigen Link öffnet THEN sieht er – ohne Login – die Veranstaltung, die
      **Teilnehmerliste** und die **laufenden Summen**." Ist noch kein Name gewählt (`!bekannt`),
      rendert das Gate ausschließlich den `NamensPicker` (Namensbuttons); die `children`
      (`VerzehrErfassung` mit Liste + Summen) werden **gar nicht** gerendert. Der Teilnehmer sieht
      beim ersten Öffnen also nur den Header + eine Namensliste, **nicht** die laufenden Summen.
      Erst nach Namenswahl erscheinen Liste/Summen. Das ist eine konkrete Abweichung von einem
      explizit abgehakten Akzeptanzkriterium (AC B in der Task-Datei). Entweder Liste + Summen
      read-only bereits neben/über dem Picker zeigen (Erfassungs-Controls weiter hinter dem Gate),
      **oder** die Spec/AC bewusst nachziehen, falls „Name zuerst" die gewollte Entscheidung ist.
      So oder so sollte Code ↔ Spec vor dem Merge konsistent sein (analog Codify #55 „ADR/Spec bei
      Rework auf Drift prüfen").

## Nitpicks (optional)
- [x] **Behoben [2026-07-20]:** `lib/base-url.ts:23` — Testfall
      `should_defaultToHttp_when_hostIsLoopbackIpAndNoForwardedProto` (Host `127.0.0.1:3000`)
      ergänzt; der `127.0.0.1`-Zweig ist jetzt eigenständig gedeckt (Branch-Coverage base-url 100 %).
- [x] **Behoben [2026-07-20]:** `app/_verzehr/VerzehrErfassung.tsx:41` — der Selbstbedienungs-Pfad
      zeigt bei leerer Liste über `IdentityGate` nun „…bitte an den Veranstalter wenden" statt der
      F5-Meldung „…zuerst Teilnehmer hinzufügen"; die F5-Meldung bleibt für den Veranstalter-Kontext.
- [ ] `app/theke/[token]/IdentityGate.tsx:64` — Der gemerkte Name wird über den **Anzeigenamen**
      (String-Gleichheit) statt über die `zeile.id` abgeglichen. Bei zwei Teilnehmern mit gleichem
      Anzeigenamen ist die Wiedererkennung mehrdeutig. Da die Auswahl rein clientseitig zur
      Wiedererkennung dient (nichts wird serverseitig gebunden, die Erfassung bleibt anonym), ist
      das harmlos; ADR-034 D4 begründet die Wahl (Stale-Fallback per Name). Nur als bewusste
      Design-Notiz festgehalten.
- [ ] `lib/base-url.ts:23` — `host.startsWith("127.0.0.1")` wird durch die Tests nie als
      entscheidender Operand ausgewertet (der `localhost`-Test kurzschließt das `||`, der
      Remote-Test trifft `false`). Der Branch-Ausgang (http) ist über den localhost-Test gedeckt,
      der `127.0.0.1`-Zweig selbst aber nicht separat. Ein zusätzlicher Testfall mit Host
      `127.0.0.1:3000` schließt die Lücke; funktional korrekt.
- [ ] `app/theke/[token]/IdentityGate.tsx:24-25` — Der `storage`-Event-Listener (Wiedergabe aus
      anderen Tabs) wird registriert, aber in keinem Test durch ein `storage`-Event ausgelöst
      (nur der eigene `NAME_CHANGED_EVENT`-Pfad via `waehlen`/`wechseln`). Optionaler Test für den
      Cross-Tab-Pfad.
- [ ] `app/_verzehr/VerzehrErfassung.tsx:41` (bestehend, nicht in diesem Diff geändert) — Im
      Read-only-Fall einer **abgeschlossenen** Veranstaltung ohne Zeilen zeigt die geteilte UI
      „…zuerst Teilnehmer hinzufügen." – für den öffentlichen Selbstbedienungs-Betrachter leicht
      irreführend. Extremer Randfall (abgeschlossen + 0 Zeilen); nur zur Kenntnis, da geteilte
      F5-UI außerhalb des #54-Scopes.

## Positives
- Saubere, testgetriebene DRY-Extraktion: `applyVerzehrAdjust` als gemeinsamer Kern; beide Actions
  behalten Auflösung + `revalidatePath` bei sich (ADR-034 D3). Bestehende F5-Tests bleiben grün.
- **Capability-basierte Autorisierung** korrekt und getestet: `adjustVerzehrByTokenAction` ruft
  bewusst **kein** `requireRole` (Test `should_authorizeWithoutRole_when_tokenValid` mit
  `auth()=null`), leitet `veranstaltungId` aus dem Token ab und erzwingt die **IDOR-Bindung** über
  `getZeile(zeileId, ziel.id)` (Test `…zeileBelongsToAnotherVeranstaltung`, Codify #51 sauber
  angewandt).
- **Neutraler 404** bei unbekanntem Token (Route `notFound()` + Action `NOT_FOUND`), keine
  Preisgabe; `getVeranstaltungByToken` bewusst ohne Constant-Time-Sonderbehandlung dokumentiert
  (256-bit-Token kein Enumerationsvektor).
- **Server-seitiger QR** (`qrcode` nur in `ZugangTeilen.tsx` importiert) → null Client-Bundle,
  druckbar; nur für offene Veranstaltungen eingebunden (Aufrufstelle in `[id]/page.tsx`).
- `IdentityGate` nutzt `useSyncExternalStore` statt set-state-in-effect (Codify-konform), inkl.
  eigenem Event für Same-Tab-Re-Render und Stale-Fallback; jede Verzweigung
  (Picker/gemerkt/stale/wechseln/read-only/leer) hat einen eigenen Test.
- Pflichten erfüllt: `docs/routes.md` gepflegt (`/theke/[token]` öffentlich, proxy-exempt);
  `proxy.ts`-Matcher verifiziert (theke/ bereits im Negativ-Lookahead, keine Änderung nötig);
  `absoluteUrl`-Fallback-Kette (Header → env → relativ) vollständig getestet.

## Empfehlung
NEEDS_REWORK
