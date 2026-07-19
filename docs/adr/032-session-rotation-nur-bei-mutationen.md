# ADR 032: Session-Rotation nur bei mutierenden Requests unterdrücken

## Status

Accepted

## Date

2026-07-19

## Context

Auth.js (JWT-Strategie) erneuert das `authjs.session-token`-Cookie bei **jedem**
authentifizierten Request (Rolling Session) – die Antwort trägt ein frisches
`…authjs.session-token`-`Set-Cookie`. Meldet sich der Nutzer ab, während eine solche
authentifizierte Antwort noch unterwegs ist, landet sie **nach** dem signOut-Clear und
belebt das Cookie wieder → das Logout „hält nicht" (reines Timing ⇒ flaky, nur unter
Latenz sichtbar, z. B. INT-Deploy-Gate).

Der erste Fix (#164, PR #165, Merge `5e0edb3`) unterdrückte diese Rotation zentral im
Edge-Proxy (`proxy.ts` → `lib/prefetch-session.ts`), aber **nur für `method === "GET"`** und
nur, wenn er den Request über die internen Header `next-url`/`sec-fetch-dest` als
RSC-/Prefetch-Aufruf erkannte. Das beseitigte die Prefetch-GET-Quelle, ließ aber andere
nicht-mutierende Methoden offen:

```
+723ms POST    303 ACTION /   [SESSION-SET][SESSION-CLEARED]  ← Abmelden löscht Session
+778ms OPTIONS 200 /          [SESSION-SET]                   ← Resurrection durch OPTIONS
+854ms GET     200 /          [SESSION-SET]                   ← page.goto("/") → Dashboard, rot
```

`OPTIONS`- und `HEAD`-Requests durchlaufen denselben Proxy, rotieren das Cookie und können
den signOut-Clear überholen (Playwright feuert solche Preflight-/Probe-Requests rund um
`page.goto`). Nachweis nach dem #164-Merge (INT trägt den Fix):

```
pnpm test:e2e:int e2e/auth.spec.ts -g "Abmelden" --repeat-each=24 --workers=1
→ 23 passed, 1 failed
```

Das GET-only-Kriterium war damit ein **Whack-a-Mole**: jede weitere nicht-mutierende
Methode ist eine neue Resurrection-Quelle. Zusätzlich ist die Signal-Erkennung
(`next-url`/`sec-fetch-dest`) selbst fragil – sie hängt an Next.js-internem
Header-Verhalten, das sich zwischen Versionen ändern kann.

Rahmenbedingungen:

1. **Zentrale Grenze ist der Edge-Proxy** (`proxy.ts`), nicht per-`<Link>` – nur dort sind
   alle geschützten Routen abgedeckt (per-Link `prefetch={false}` war in #164 Runde 1
   unvollständig).
2. **Kein `GET`/`HEAD`/`OPTIONS` etabliert je legitim eine Session.** Login läuft über
   Credentials = **POST**; `api/auth` ist ohnehin aus dem `proxy.ts`-Matcher ausgenommen.
   Nur mutierende Requests (Login/Logout/Server-Actions) dürfen das Session-Cookie setzen
   oder löschen.

## Decision

Die Entscheidung, ob die Session-Rotation aus der Proxy-Antwort gestrippt wird, hängt
**allein an der HTTP-Methode**: Sie wird auf **allen nicht-mutierenden Methoden**
unterdrückt – alles außer `POST`/`PUT`/`PATCH`/`DELETE`. Damit sind `GET`, `HEAD` und
`OPTIONS` (und jede künftige nicht-mutierende Methode) in einem Schritt erfasst.

Die bisherige `next-url`/`sec-fetch-dest`-Erkennung entfällt ersatzlos. `lib/prefetch-session.ts`
bekommt eine method-basierte Prädikat-Funktion (Ersatz für `isRscRequest`):

```ts
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export function shouldSuppressSessionRotation(request: { method: string }): boolean {
  return !MUTATION_METHODS.has(request.method);
}
```

Das eigentliche Strippen (`stripSessionRotation`: verankerte Cookie-Regex, CSRF-/
callback-url-Schutz, chunked `…session-token.0/.1`) bleibt **unverändert**. `proxy.ts`
ruft das neue Prädikat statt `isRscRequest` auf; der Wrapper bleibt ohne `try/catch`
(Exception propagiert fail-closed).

## Alternatives

### Option A: Method-weite Unterdrückung (alles außer POST/PUT/PATCH/DELETE) – gewählt

**Pros:**
- Beendet das Whack-a-Mole strukturell: GET/HEAD/OPTIONS und jede künftige nicht-mutierende
  Methode sind ohne Nachpflege erfasst.
- Entfernt die fragile Next.js-Header-Erkennung (`next-url`/`sec-fetch-dest`) – die
  Entscheidung hängt nur noch an einem stabilen, standardisierten Request-Attribut.
- Sicher per Konstruktion: kein nicht-mutierender Request etabliert je eine Session, also
  kann das Strippen keinen legitimen Login/Logout brechen.
- Trivial und vollständig als Unit-Test abdeckbar (eine reine Funktion der Methode).

**Cons:**
- Die Rolling-Session erneuert sich nicht mehr bei Navigation, nur noch beim Login-POST
  (Trade-off, siehe unten) – die Session läuft dann nach fester `maxAge` ab statt
  gleitend.

### Option B: Beim GET-only-Guard bleiben und OPTIONS/HEAD einzeln ergänzen

**Pros:**
- Kleinster Diff; Rolling-Session bliebe für HEAD/OPTIONS theoretisch erhalten.

**Cons:**
- Behebt nur die aktuell beobachteten Methoden – jede weitere nicht-mutierende Methode
  bliebe eine offene Resurrection-Quelle (das Whack-a-Mole geht weiter).
- Behält die fragile `next-url`/`sec-fetch-dest`-Erkennung samt ihrer Versions-Abhängigkeit.
- Kein realer Nutzen: HEAD/OPTIONS sind keine Navigationen, deren Rolling-Refresh man
  erhalten wollte.

### Option C: Rolling Session ganz abschalten (Auth.js-Konfiguration)

**Pros:**
- Keine Rotation mehr, also keine Resurrection-Quelle an irgendeinem Request.

**Cons:**
- Greift tiefer in die Auth.js-Konfiguration ein als nötig und ändert das
  Session-Verhalten global – über das hier zu lösende Problem hinaus.
- Der Proxy-Guard wird ohnehin für die Prefetch-/GET-Absicherung gebraucht; Option C
  ersetzt ihn nicht sauber und ist die größere, weniger reversible Änderung.

## Rationale

Option A adressiert die **Klasse** des Fehlers (nicht-mutierende Requests beleben die
Session wieder) statt einzelner Methoden und entfernt zugleich die fragilste Komponente
des #164-Fixes (die Header-Heuristik). Die Sicherheit folgt aus einer klaren, überprüfbaren
Invariante: **Nur Mutationen dürfen das Session-Cookie setzen/löschen** – und Login ist per
Design ein POST. Das ist einfacher, robuster und besser testbar als die methoden-einzelne
Erweiterung (B) und deutlich weniger invasiv/reversibler als das globale Abschalten der
Rolling Session (C).

## Consequences

**Positive:**
- Logout hält zuverlässig, unabhängig davon, welche nicht-mutierende Methode den signOut
  umgibt (E2E-Nachweis: `--repeat-each=24` → 0 Fehler).
- Weniger, klarer Code: eine reine method-basierte Funktion statt Header-Heuristik;
  100 % unit-testbar (GET/HEAD/OPTIONS strippen, POST/PUT/PATCH/DELETE nie).
- Keine Abhängigkeit mehr von Next.js-internem Header-Verhalten.

**Negative / Trade-offs:**
- Die Rolling-Session erneuert sich nur noch bei mutierenden Requests (faktisch beim
  Login-POST), nicht mehr bei jeder Navigation. Für diese wöchentlich genutzte PWA mit
  fester `maxAge`-Lebensdauer (Default 30 Tage) akzeptabel und eher sicherer. Bewusst
  akzeptiert (Issue #170).

**Doku-Folge:** Der #164-Stolperstein in `docs/factory/PROJECT-CONTEXT.md` wird korrigiert –
Kern ist „Rotation auf allen nicht-mutierenden Methoden unterdrücken", nicht die
`next-url`/`sec-fetch-dest`-Erkennung. Diese ADR präzisiert und ersetzt die
Erkennungs-Aussage des #164-Stolpersteins (die Prefetch-GET-Analyse bleibt als Historie
gültig).
