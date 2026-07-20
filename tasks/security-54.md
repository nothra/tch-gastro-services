# Security Review: Task 54

Feature F7 – Selbstbedienung per Link/QR + Namenswahl. Erste öffentliche, unauthentifizierte
Route (`app/theke/[token]/page.tsx`) + token-scoped Server Action ohne `requireRole`
(`adjustVerzehrByTokenAction`). Scope: `git diff origin/main...HEAD` (25 Dateien, alle #54).

Geprüft: OWASP Top 10 (Broken Access Control/IDOR, Injection/XSS, Krypto, Dependencies,
Error Handling), plus die 9 Threat-Surface-Punkte des Auftrags.

## Kritische Findings (Blocker)

_Keine._

Alle fail-closed-Grundlagen sind vorhanden und korrekt umgesetzt:
- **IDOR/BOLA sauber gebunden.** `applyVerzehrAdjust(ziel, formData)` bindet jede Zeile über
  `getZeile(zeileId, ziel.id)` an die aus dem Token aufgelöste Veranstaltung
  (`db/veranstaltung.ts:116`, `and(eq(id), eq(veranstaltungId))`). Ein manipulierter `zeileId`
  einer fremden Veranstaltung ⇒ `undefined` ⇒ `ZEILE_NOT_FOUND`; die fremde Zeile bleibt
  unberührt (Codify #51 erfüllt). `adjustVerzehrByTokenAction` leitet `ziel` **ausschließlich**
  aus dem Token ab (`app/veranstaltung/actions.ts:305-316`) – kein client-gelieferter
  Veranstaltungs-Bezug.
- **Status-Gate.** `applyVerzehrAdjust` lehnt Schreibzugriff bei `status !== "offen"` ab
  (`actions.ts:260`); abgeschlossene Veranstaltung ⇒ read-only serverseitig erzwungen.
- **Soft-Delete-Gate.** Inaktiver Katalogartikel nur anpassbar, wenn bereits eine Position
  existiert (`actions.ts:269-274`).
- **Token unratbar & CSPRNG.** `unguessableToken` = 2× `crypto.randomUUID()` (≈244 bit,
  `db/schema.ts:153`), `unique`, kein `Math.random`. Miss ⇒ `notFound()` (neutral, kein Leak,
  `page.tsx:20`). Kein constant-time nötig (ADR-034 D2 – korrekt begründet, kein
  Enumerationsvektor gegen 2²⁴⁴).
- **Action-Bound-Args verschlüsselt.** Der Token wird via `.bind(null, token)` server-seitig
  gebunden (`page.tsx:31`); Next 16 verschlüsselt Closure-Bound-Args – der Client kann den
  Token nicht frei setzen/brute-forcen.
- **Proxy-Exemption eng.** `theke/` steht explizit und **eng** im Negativ-Lookahead des
  `proxy.ts`-Matchers (Codify #63); keine pauschale `api`/Wildcard-Öffnung.
- **Dependency sauber.** `pnpm audit --prod`: „No known vulnerabilities found". `qrcode` wird
  nur server-seitig importiert (`ZugangTeilen.tsx`, Server Component, kein `"use client"`) –
  kein Client-Bundle.

## Wichtige Findings

_Keine Blocker; ein bewusst ausgelagerter Punkt:_

- [~] **[Availability/Abuse] Kein Rate-Limit auf der öffentlichen Schreib-Grenze** –
  `adjustVerzehrByTokenAction` (`actions.ts:305`) ist die einzige unauthentifizierte
  Mutation. Wer den (öffentlich ausgehängten) Link/QR kennt, kann unbegrenzt ±1-Anpassungen
  absetzen → Verfälschung der Abrechnung + Kostentreiber (Neon-Free/Vercel-Functions).
  **Bewusster Trade-off, ADR-034 D7** delegiert die Missbrauchsbremse ausdrücklich hierher und
  hält sie als additive Härtung fest. Impact ist gebunden (nur offene Veranstaltungen, nur
  Menge auf existierenden Zeilen/Artikeln, kein Anlegen/Löschen von Zeilen – das verlangt
  `requireRole`; keine PII über die ohnehin öffentliche Liste hinaus; keine Rechteausweitung).
  **Kein Merge-Blocker.** → Backlog-Issue **#182** (`enhancement` + `security`).

## Hinweise

- [ ] **[Access Control – akzeptiert]** Der Token gewährt Schreibzugriff auf **alle** Zeilen
  der Veranstaltung; die Namenswahl (`IdentityGate`) ist reine Client-UX (localStorage), keine
  serverseitige Bindung. Jeder Link-Inhaber kann den Verzehr **jedes** Teilnehmers ändern. Das
  ist das explizite Vertrauensmodell (spec-52 „anonym", spec-54 „volle Transparenz", ADR-034
  D4) – kein Defekt, hier dokumentiert.
- [ ] **[XSS – geprüft, sicher]** `dangerouslySetInnerHTML={{ __html: qrSvg }}`
  (`ZugangTeilen.tsx:34`): `qrSvg` stammt aus `QRCode.toString(url,{type:"svg"})`. Die URL wird
  in QR-Module (rect/path) **kodiert**, nicht als Markup in den SVG-Quelltext interpoliert –
  kein Injection-Pfad, auch nicht über einen manipulierten Host-Header. Quelle ist die
  vertrauenswürdige Library-Ausgabe, nicht Nutzer-HTML; Seite ist zudem nur für Veranstalter
  erreichbar. Namen (`{selected}`, `{zeile.anzeigename}`) sind React-escaped.
- [ ] **[Host-Header – geringes Restrisiko]** `lib/base-url.ts` baut die absolute URL aus
  `host` + `x-forwarded-proto` (`base-url.ts:9-12`). `ZugangTeilen` wird nur auf der
  **authentifizierten**, nicht gecachten Veranstalter-Detailseite gerendert (`page.tsx:84`) –
  der Veranstalter sieht seinen eigenen Request-Host; ein Angreifer kann ihn nicht spoofen, und
  auf Vercel wird der Host plattformseitig gesetzt. Kein Cache-Poisoning-Vektor (dynamische
  Per-User-Seite). env-Fallback (`AUTH_URL`/`NEXTAUTH_URL`) vorhanden. Optional härtbar über
  eine kanonische Base-URL/Host-Allowlist, hier nicht nötig.
- [ ] **[Client-Storage – unkritisch]** `IdentityGate` speichert in localStorage
  `tch:sb:name:<token>` nur den bereits öffentlichen Anzeigenamen, keyed am Token, der ohnehin
  in der URL steht (`IdentityGate.tsx:23,59`). Keine sensiblen Daten; XSS-Impact minimal (Name
  öffentlich, Token bereits in der URL). Erfassung bleibt anonym (nichts server-seitig
  persistiert).
- [ ] **[Error Handling]** Neutrale Nutzer-Fehlermeldungen (`NOT_FOUND`, `ZEILE_NOT_FOUND`,
  `notFound()`); keine Stack Traces / internen Infos nach außen. Der Message-Unterschied
  Token-Miss vs. Zeile-Miss hilft keiner Enumeration (Zeile-Miss setzt einen gültigen
  244-bit-Token voraus).
- [ ] **[Proxy – Zukunftshinweis]** Die Exemption `theke/` deckt **alle** künftigen Routen
  unter `app/theke/**` ab. Solange dort nur `[token]/page.tsx` liegt, unkritisch; beim Anlegen
  weiterer `theke/`-Unterrouten (z. B. Admin) den Matcher gezielt nachziehen (fail-closed).

## Ergebnis

PASSED

Keine kritischen oder blockierenden Findings im Scope. Das einzige nennenswerte Restrisiko
(Rate-Limit der öffentlichen Action) ist per ADR-034 D7 ein bewusst ausgelagerter, gebundener
Trade-off und als Backlog-Issue **#182** erfasst. Die fail-closed-Grundlagen (unratbarer Token,
Status-Gate, IDOR-Bindung, neutrale Fehler, verschlüsselte Bound-Args, saubere Dependency) sind
vollständig und korrekt umgesetzt.
