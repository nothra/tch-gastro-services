# Spec: Logout-Race – Session-Rotation auf allen nicht-mutierenden Methoden unterdrücken

## Kontext

Der `/pr-shepherd`-Vorgänger #164 (PR #165, Merge `5e0edb3`) sollte die
Session-Wiederbelebung nach dem Abmelden beseitigen: Auth.js erneuert das
`authjs.session-token`-Cookie bei **jedem** authentifizierten Request (Rolling Session);
eine solche Antwort, die **nach** dem signOut-Clear eintrifft, setzt das Cookie neu und
belässt den Nutzer angemeldet („Logout hält nicht", reines Timing ⇒ flaky).

Der #164-Fix unterdrückt die Rotation aber **nur bei `method === "GET"`** (RSC/Prefetch,
erkannt über `next-url`/`sec-fetch-dest`). Auf INT bleibt das Logout danach weiterhin flaky:

```
pnpm test:e2e:int e2e/auth.spec.ts -g "Abmelden" --repeat-each=24 --workers=1
→ 23 passed, 1 failed   (nach Abmelden zeigt / weiterhin das Dashboard)
```

Ursache: Auch **`OPTIONS`- und `HEAD`-Requests** durchlaufen den Proxy (`proxy.ts`),
rotieren das Session-Cookie und können den signOut-Clear überholen. Playwright feuert
solche Preflight-/Probe-Requests rund um `page.goto`. Trace des roten Laufs:

```
+723ms POST    303 ACTION /   [SESSION-SET][SESSION-CLEARED]  ← Abmelden löscht Session
+778ms OPTIONS 200 /          [SESSION-SET]                   ← Resurrection durch OPTIONS
+854ms GET     200 /          [SESSION-SET]                   ← page.goto("/") → Dashboard, rot
```

Der GET-only-Guard war Whack-a-Mole: #164 schloss Prefetch-GET, OPTIONS/HEAD blieben offen.

## Scope

**Inbegriffen:**
- Die Session-Rotation wird auf **allen nicht-mutierenden HTTP-Methoden** unterdrückt
  (alles außer `POST`/`PUT`/`PATCH`/`DELETE`) – erfasst GET/HEAD/OPTIONS (und Prefetch)
  in einem Schritt.
- Die fragile `next-url`/`sec-fetch-dest`-Erkennung entfällt; die Entscheidung hängt nur
  noch an der Request-Methode.
- Korrektur des zugehörigen Stolpersteins in `docs/factory/PROJECT-CONTEXT.md` (der Kern
  ist „Rotation auf nicht-mutierenden Methoden unterdrücken", nicht die `next-url`-Erkennung).
- Anpassung/Ergänzung der Unit-Tests inkl. eines Kompositionstests für den Proxy-Pfad.

**Nicht inbegriffen:**
- Änderung der Session-Lebensdauer/`maxAge` oder der Rolling-Session-Strategie an sich.
- Änderung der `proxy.ts`-Matcher-Ausnahmen (`api/auth`/`api/version`/`api/health`/`theke/…`).
- Änderung am eigentlichen Cookie-Strippen (`stripSessionRotation`, Regex, CSRF-Schutz) –
  bleibt unverändert.
- Ein laufender Kassen-/Session-Saldo o. Ä. (nicht betroffen).

## Akzeptanzkriterien

- [ ] **AC1 – GET wird weiterhin unterdrückt.** GIVEN ein authentifizierter `GET`-Request
      durchläuft den Proxy, WHEN die Antwort ein rotierendes `authjs.session-token`-Set-Cookie
      trägt, THEN wird dieses Set-Cookie aus der Antwort entfernt.
- [ ] **AC2 – HEAD wird unterdrückt.** GIVEN ein `HEAD`-Request durchläuft den Proxy, WHEN
      die Antwort ein Session-Set-Cookie trägt, THEN wird es entfernt (keine Resurrection).
- [ ] **AC3 – OPTIONS wird unterdrückt.** GIVEN ein `OPTIONS`-Request (Preflight/Probe)
      durchläuft den Proxy, WHEN die Antwort ein Session-Set-Cookie trägt, THEN wird es
      entfernt (keine Resurrection).
- [ ] **AC4 – Mutationen bleiben unangetastet.** GIVEN ein `POST`/`PUT`/`PATCH`/`DELETE`
      (Login/Logout/Server-Action), WHEN die Antwort ein Session-Cookie **setzt oder löscht**,
      THEN bleibt dieses Set-Cookie unverändert erhalten (Login/Logout funktionieren).
- [ ] **AC5 – Erkennung ist rein methodenbasiert.** GIVEN ein nicht-mutierender Request
      **ohne** `next-url`/`sec-fetch-dest`-Signale, WHEN er den Proxy durchläuft, THEN wird
      die Rotation dennoch unterdrückt (keine Abhängigkeit mehr von den Header-Signalen).
- [ ] **AC6 – End-to-End: Logout hält.** GIVEN ein angemeldeter Nutzer meldet sich ab,
      WHEN OPTIONS/HEAD/GET den signOut-Clear umgeben, THEN zeigt ein anschließender Aufruf
      von `/` die Login-Seite. Nachweis: `pnpm test:e2e:int e2e/auth.spec.ts -g "Abmelden"
      --repeat-each=24` → **0 Fehler**.
- [ ] **AC7 – Stolperstein korrigiert.** GIVEN der #164-Stolperstein in
      `docs/factory/PROJECT-CONTEXT.md`, WHEN der Fix method-weit ist, THEN nennt die Regel
      als Kern „Rotation auf nicht-mutierenden Methoden unterdrücken" statt der
      `next-url`/`sec-fetch-dest`-Erkennung.

## Fehlerszenarien

- [ ] **Cookie-Selektivität bleibt gewahrt.** Beim Strippen dürfen ausschließlich
      Session-Token-Cookies (inkl. gechunkter `…session-token.0/.1`) getroffen werden;
      CSRF- und callback-url-Cookies bleiben erhalten (sonst brechen Folge-POSTs). Bereits
      durch die bestehenden `stripSessionRotation`-Tests abgedeckt; nicht regredieren.
- [ ] **Kein try/catch im Proxy-Wrapper.** Eine Exception im Guard propagiert fail-closed
      (kein stilles Durchwinken einer rotierten Antwort).
- [ ] **Groß-/Kleinschreibung der Methode.** Die Methoden-Prüfung darf nicht an einer
      unerwarteten Schreibweise scheitern (HTTP-Methoden sind case-sensitiv als Uppercase
      definiert; die Web-Request-API liefert sie uppercase – dennoch bewusst prüfen).

## Trade-off (bewusst akzeptiert, aus dem Issue)

Die Rolling-Session erneuert sich nach dieser Änderung **nur noch bei mutierenden Requests**
(faktisch beim Login-POST), nicht mehr bei jeder Navigation. Für diese wöchentlich genutzte
PWA mit fester `maxAge`-Lebensdauer (Default 30 Tage) akzeptabel und eher sicherer. Sicher,
weil **kein GET/HEAD/OPTIONS je legitim eine Session etabliert**: Login läuft über Credentials
= POST, und `api/auth` ist ohnehin aus dem `proxy.ts`-Matcher ausgenommen.

## Offene Fragen

- [ ] Keine offen. Root Cause, Lösungsweg und Trade-off sind im Issue #170 abschließend
      beschrieben; die Architektur-Entscheidung (Funktions-Rename `isRscRequest` →
      method-weite Prädikat-Funktion) wird in `/architecture` als ADR/Task-Notiz festgehalten.

## Referenzen

- Issue #170; Vorgänger #164 / PR #165 (Merge `5e0edb3`)
- Betroffen: `lib/prefetch-session.ts`, `proxy.ts`, `lib/prefetch-session.test.ts`,
  `docs/factory/PROJECT-CONTEXT.md`
