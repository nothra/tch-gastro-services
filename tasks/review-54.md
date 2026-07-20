# Review: Task 54

Scope: `git diff origin/main...HEAD` (Codify #161 – gegen `origin/main`, nicht lokales `main`).
Betrachtet: `db/veranstaltung.ts`, `app/veranstaltung/actions.ts`, `app/theke/[token]/*`,
`app/veranstaltung/[id]/ZugangTeilen.tsx` + `page.tsx`, `lib/base-url.ts`, `vitest.setup.ts`,
`docs/routes.md`, `docs/adr/034`, `docs/specs/spec-54` und die zugehörigen Tests.

**Runde 2** (nach Rework von Runde 1). Drei Personas: Backend/Logik, Code-Qualität,
Architektur/Patterns. Fokus-Verifikation der F7-Testdateien grün: 5 Dateien / 118 Tests passed.

## Kritische Findings (müssen behoben werden)
- [ ] Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] Keine.
- [x] **Behoben & verifiziert [Runde 1 → Rework]:** AC-B1-Abweichung (laufende Summen erst nach
      Namenswahl sichtbar). `IdentityGate` rendert jetzt die route-neutrale `VerzehrErfassung` selbst
      mit `editable = editable && bekannt`: Teilnehmerliste **und** laufende Summen sind sofort beim
      Öffnen sichtbar (read-only, `data-editable="false"`), die ±-Controls bleiben hinter dem
      Namens-Gate. Getestet in `IdentityGate.test.tsx`
      (`should_showPickerAndReadOnlyList_when_noStoredName` + Stale-Variante) und `page.test.tsx`
      (`should_showPickerAndReadOnlyList_when_openAndNoStoredName`). Code an kanonische Spec
      angeglichen, kein Spec-Nachzug nötig (Codify #55).

## Nitpicks (optional)
- [ ] `lib/base-url.ts:23` — Host-Header-Vertrauen: `absoluteUrl` bildet die geteilte URL aus dem
      `host`-Request-Header. Auf einer authentifizierten Veranstalter-Seite und hinter Vercels
      Host-Validierung praktisch unkritisch (ADR-034 D6 bewusst so gewählt) – zur Kenntnis für
      /security-review, wo ohnehin die Missbrauchsbremse/Rate-Limit (ADR-034 D7) offen ist.
- [ ] `app/theke/[token]/IdentityGate.tsx:95` — Der gemerkte Name wird über den **Anzeigenamen**
      (String-Gleichheit) statt über `zeile.id` abgeglichen; bei zwei gleichen Anzeigenamen ist die
      Wiedererkennung mehrdeutig. Funktional folgenlos (Auswahl ist rein clientseitig, Erfassung
      bleibt anonym; ADR-034 D4). Bewusste Design-Notiz.
- [ ] `app/theke/[token]/IdentityGate.tsx:34` — Der `storage`-Event-Listener (Cross-Tab-Wiedergabe)
      wird registriert, aber in keinem Test durch ein echtes `storage`-Event ausgelöst (nur der
      Same-Tab-`NAME_CHANGED_EVENT`-Pfad). Registrierung ist zeilengedeckt (100 % Branch/Line auf
      `IdentityGate`); optionaler Cross-Tab-Test.
- [ ] `app/_verzehr/VerzehrErfassung.tsx:41` (bestehend, nicht in diesem Diff geändert) — Bei einer
      **abgeschlossenen** Veranstaltung ohne Zeilen zeigt die geteilte F5-UI „…zuerst Teilnehmer
      hinzufügen" (für den öffentlichen Betrachter leicht irreführend). Extremer Randfall
      (abgeschlossen + 0 Zeilen, kein Gate); außerhalb #54-Scope.

## Positives
- Saubere, testgetriebene DRY-Extraktion: `applyVerzehrAdjust` als gemeinsamer Kern; beide Actions
  behalten Auflösung + `revalidatePath` bei sich (ADR-034 D3). Bestehende F5-Tests bleiben grün.
- **Capability-basierte Autorisierung** korrekt und getestet: `adjustVerzehrByTokenAction` ruft
  bewusst **kein** `requireRole` (Test `should_authorizeWithoutRole_when_tokenValid` mit
  `auth()=null`), leitet `veranstaltungId` aus dem Token ab und erzwingt die **IDOR-Bindung** über
  `getZeile(zeileId, ziel.id)` (Test `…zeileBelongsToAnotherVeranstaltung`, Codify #51). Jeder
  Guard-Branch (unbekannter Token, abgeschlossen, IDOR, delta-out-of-range) hat einen eigenen Test.
- **Neutraler 404** bei unbekanntem Token (Route `notFound()` + Action `NOT_FOUND`), keine
  Preisgabe; `getVeranstaltungByToken` ohne Constant-Time-Sonderbehandlung sauber dokumentiert
  (256-bit-Token kein Enumerationsvektor).
- **Server-seitiger QR** (`qrcode` nur in `ZugangTeilen.tsx` importiert) → null Client-Bundle,
  druckbar; nur für offene Veranstaltungen eingebunden (`{offen && <ZugangTeilen …/>}`).
  `dangerouslySetInnerHTML` nur auf dem vertrauenswürdigen `qrcode`-SVG (URL wird nicht als Markup
  eingebettet, sondern als QR-Module kodiert) – kein XSS-Vektor.
- `IdentityGate` nutzt `useSyncExternalStore` statt set-state-in-effect (Codify-konform), inkl.
  eigenem Event für Same-Tab-Re-Render und Stale-Fallback; alle Verzweigungen
  (Picker/gemerkt/stale/wechseln/read-only/leer) getestet.
- Pflichten erfüllt: `docs/routes.md` gepflegt (`/theke/[token]` öffentlich, proxy-exempt);
  `proxy.ts`-Matcher verifiziert (theke/ bereits im Negativ-Lookahead, keine Änderung nötig);
  `vitest.setup.ts`-localStorage-Polyfill defensiv (nur wenn kein funktionierender Storage) und
  dokumentiert.

## Empfehlung
APPROVED
