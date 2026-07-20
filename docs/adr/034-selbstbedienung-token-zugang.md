# ADR 034: Selbstbedienung – öffentliche Token-Route, capability-basierte Verzehr-Action, QR-Erzeugung

## Status
Accepted

## Date
2026-07-20

## Context

F7 (#54, [spec-54](../specs/spec-54-selbstbedienung-link.md)) öffnet die Verzehr-Erfassung für
**Teilnehmer ohne Konto**: Der Veranstalter teilt einen **Link/QR**, wer ihn öffnet, wählt seinen
Namen aus der Liste und erfasst wie in F5 – volle Transparenz, kein Passwort. Genutzt hybrid
(eigenes Handy + geteiltes Theken-Gerät).

Das Datenmodell ist **bereits in #51 vorbereitet** (ADR-023) und muss nicht geändert werden:

- **`veranstaltung.token`** (256-bit unratbar, `unique`, `$defaultFn`) existiert für **jede**
  Veranstaltung – datiert wie stehende Theke.
- **`veranstaltung_typ`** (`veranstaltung` | `theke`) + Theke-Data-Layer sind da.
- **`db/verzehr.ts`** ist bewusst **rollen-neutral** – der RBAC-Guard sitzt in der Action, „damit
  F7 dieselbe Data-Layer über eine token-scoped Action wiederverwendet" (ADR-025 D6, wörtlich).
- **`proxy.ts`-Matcher** nimmt `theke/` bereits vom Auth-Gate aus (öffentlicher Seam, ADR-023 D6).
- **`app/_verzehr/VerzehrErfassung.tsx`** ist route-neutral und trägt ein `editable`-Flag; ihr
  Kommentar sagt: „F7 (#54) reicht eine token-scoped Action … herein – ohne Umbau."

Die Spec delegiert an /architecture: (1) die öffentliche Route + Token-Lookup, (2) die
**token-scoped Erfassungs-Action** (Autorisierung ohne Rolle), (3) das **Identitäts-Gate** mit
Namens-Persistenz je Gerät, (4) die **QR-Erzeugung** (PWA-Bündelgröße), (5) die **absolute
Basis-URL**. Rate-Limiting bleibt ausdrücklich bei /security-review.

Es gibt bewusst **keine** Datenmodell-Änderung und **keine** Migration in dieser Task – F7 ist reine
Präsentations-/Action-Schicht auf dem in #51/ADR-023 gelegten Fundament.

## Decision

### D1 · Öffentliche Route `app/theke/[token]/page.tsx` (Server Component)
Eine login-freie Route lädt die Veranstaltung **über den Token** (`getVeranstaltungByToken`),
antwortet bei Miss mit `notFound()` (neutral, kein Leak), und rendert – wie die authentifizierte
F5-Seite – `zeilen`, `artikel` (vollständiger Katalog, **inkl. Essen**) und `positionen`.
`editable = status === "offen"`. Eine **abgeschlossene** Veranstaltung wird als **Read-only-Ansicht**
gerendert (dieselbe `VerzehrErfassung` mit `editable={false}` – ohne Sonderpfad).

### D2 · Token-Lookup in der Data-Layer: `getVeranstaltungByToken(token)`
Neue Funktion in `db/veranstaltung.ts`, indizierte `unique`-Selektion (`Promise<Veranstaltung |
undefined>`). **Keine** constant-time-Sonderbehandlung: Anders als der Login (User-Enumeration,
`lib/credentials.ts`) ist ein 256-bit-Zufallstoken kein Enumerationsvektor – ein Timing-Orakel auf
„Token existiert" hat keinen praktikablen Rate-Gewinn gegen 2²⁵⁶. Miss ⇒ `notFound()`.

### D3 · Capability-basierte, token-scoped Verzehr-Action (kein Rollen-Guard)
Neue Action `adjustVerzehrByTokenAction(token, prev, formData)`: **der gültige Token einer offenen
Veranstaltung IST die Autorisierung** – **kein** `requireRole`. Der gemeinsame Kern mit
`adjustVerzehrAction` (Zod-Parse → Status `offen` → **IDOR-Bindung** `getZeile(zeileId,
veranstaltung.id)` → Soft-Delete-Prüfung `getCatalogItem` → `adjustMenge` → autoritative Menge)
wird in einen **privaten Helfer `applyVerzehrAdjust(veranstaltung, formData)`** extrahiert, den
**beide** Actions aufrufen (DRY). Einziger Unterschied ist die **Auflösung + Autorisierung** der
Veranstaltung: F5 per `id` **nach** `requireRole("veranstalter")`, F7 per **Token** (self-scoping,
keine Rolle). `revalidatePath` zeigt auf den `theke/[token]`-Pfad.

### D4 · Identitäts-Gate als Client-Wrapper mit Server-Children
`VerzehrErfassung` ist eine **Server Component** und kann nicht in eine Client-Komponente
importiert werden. Das Namens-Gate wird daher ein **Client-Wrapper**
(`app/theke/[token]/IdentityGate.tsx`, `"use client"`), der die server-gerenderte
`VerzehrErfassung` als **`children`** erhält (etabliertes „Client-Wrapper mit Server-Children"-Muster):
- **Erfassbar (`editable`):** liest die gemerkte Person aus **localStorage** (Schlüssel **pro Token**,
  z. B. `tch:sb:name:<token>`). Fehlt sie **oder** ist der gemerkte Name **nicht (mehr) in `zeilen`**
  (stale-Fallback), zeigt der Wrapper den **Namens-Picker** (Liste der `anzeigename`). Sonst rendert
  er die `children` (Erfassung, **ganze Liste** – volle Transparenz) plus eine Kopfzeile
  „Erfassung als **&lt;Name&gt;** · **Person wechseln**" (Button leert die Auswahl).
- **Read-only (`!editable`):** **kein** Gate – die `children` werden direkt gerendert.
Die gewählte Person ist **rein clientseitig** (localStorage) und wird **nicht** mit-gespeichert –
Erfassung bleibt anonym (spec-52); der Name dient nur der Wiedererkennung am Gerät.

### D5 · QR-Erzeugung server-seitig via `qrcode` (SVG-String, null Client-Bundle)
Neue **Server-only-Abhängigkeit `qrcode`** (+ `@types/qrcode`): die Detailseite erzeugt den QR als
**SVG-String** (`QRCode.toString(url, { type: "svg" })`) und rendert ihn inline. Kein Client-JS,
**kein** PWA-Bundle-Zuwachs; SVG ist scharf und druckbar. Verworfen: `qrcode.react` (Client-Bundle,
PWA-Kosten) und ein **externer QR-Dienst** (verletzt EU-Datenresidenz und die „keine Offline-/
Fremd-Abhängigkeit"-Linie; gäbe den Token an Dritte).

### D6 · Absolute Basis-URL aus dem Request (`headers()`), env-Fallback
Der Link/QR braucht eine **absolute** URL (`https://<host>/theke/<token>`). Sie wird aus
`headers()` (`host` + `x-forwarded-proto`) **zur Request-Zeit** gebildet (robust über
local/int/prd, ohne zusätzliche Env-Pflege); nur falls ein Header fehlt, greift ein
env-Fallback (`AUTH_URL`/`NEXTAUTH_URL`). Anzeige beim **Veranstalter** auf `app/veranstaltung/[id]`
in einem Abschnitt „Zugang teilen" (Link als Text zum Kopieren + QR-SVG).

### D7 · Missbrauchsbremse (Rate-Limit) bewusst NICHT in #54
Die token-scoped Action ist die **einzige öffentliche Schreib-Grenze**. Eine Missbrauchsbremse
(Rate-Limit, analog `lib/rate-limit.ts` beim Health-Endpoint, ADR-020) wird an **/security-review**
delegiert (so von spec-54 vorgesehen). #54 liefert die fail-closed-Grundlagen (unratbarer Token,
Status-Gate, IDOR-Bindung, neutrale Fehler); die Härtung ist additiv nachrüstbar.

## Alternatives

### D3 – Ort der token-scoped Action
**Option A (gewählt): gemeinsamer privater Kern, Action zentral bei F5.**
`adjustVerzehrByTokenAction` liegt neben `adjustVerzehrAction` in `app/veranstaltung/actions.ts`,
beide nutzen `applyVerzehrAdjust`. **Pro:** DRY, ein Ort für die Verzehr-Adjust-Logik, folgt der
bestehenden Zentralisierung; jede Action self-authorisiert. **Con:** eine öffentliche Action
wohnt im „veranstaltung"-Modul (Namensraum leicht irreführend).
**Option B: eigenes `app/theke/actions.ts` + Kern in gemeinsames Server-Modul.**
**Pro:** klare Trennung öffentlich/authentifiziert. **Con:** neues Modul + Re-Export des Kerns,
mehr Fläche für ein einziges zusätzliches Verhalten; die Kern-Extraktion ist ohnehin nötig.
→ A gewählt (weniger Fläche, DRY); die Sicherheit hängt **nicht** am Dateiort, sondern am
Guard **in** der Action.

### D5 – QR-Erzeugung
**Option A (gewählt): `qrcode` server-seitig, SVG-String.** Pro: null Client-Bundle, druckbar,
EU-konform. Con: neue (server-only) Dependency.
**Option B: `qrcode.react` client-seitig.** Pro: rein deklarativ. Con: Client-Bundle-Zuwachs
(PWA), rendert erst nach Hydration.
**Option C: externer QR-Dienst (URL).** Pro: keine Dependency. Con: EU-Residenz verletzt, Token an
Dritte, Offline-/Verfügbarkeitsrisiko → **abgelehnt**.

### D4 – Identität
**Option A (gewählt): clientseitige localStorage-Merkung, Name nicht persistiert.** Pro: konsistent
mit der anonymen Erfassung (spec-52), kein Datenmodell, kein Server-State. Con: „wer bin ich" ist
nur UX, keine Datenkopplung.
**Option B: Cookie/Server-Session je Gerät.** Pro: server-seitig verfügbar. Con: Overkill, führt
Identität in ein bewusst anonymes Modell ein, mehr Fläche.

## Rationale

Der Kern der Entscheidung ist **maximale Wiederverwendung**: Route, Data-Layer, `VerzehrErfassung`
(inkl. `editable`-Read-only), Delta-Upserts (Nebenläufigkeit, ADR-025 D3) und die IDOR-/
Soft-Delete-Guards existieren bereits und wurden in ADR-023/025 **ausdrücklich für F7 vorbereitet**.
Die einzig neue **architektonische** Idee ist die **capability-basierte Autorisierung**: bisher
autorisiert ausschließlich `requireRole` (ADR-016); F7 führt den Token als zweiten, gleichwertigen
Autorisierungsträger an **einer klar umrissenen öffentlichen Grenze** ein – self-scoping (der Token
bestimmt die Veranstaltung, IDOR-Bindung erzwingt, dass Schreibvorgänge diese Veranstaltung nicht
verlassen) und fail-closed (unratbar, nur `offen`, neutrale Fehler). Das rechtfertigt einen ADR,
ebenso die neue Server-Dependency (`qrcode`).

## Consequences

**Positive:**
- Kein Datenmodell/Migration; F7 ist additiv auf dem #51-Fundament.
- Read-only-Ansicht „geschenkt" über `editable={false}`.
- `VerzehrErfassung`/`db/verzehr.ts` bleiben unverändert – ein DRY-Kern (`applyVerzehrAdjust`) statt
  Duplikat.
- QR ohne Client-Bundle-Kosten, EU-konform, druckbar.

**Negative / Trade-offs:**
- Zweiter Autorisierungspfad (Token neben Rolle) erweitert die Angriffsfläche um **eine** öffentliche
  Mutation – bewusst eng gehalten; Rate-Limit ist ein offener /security-review-Punkt (D7).
- Neue Server-Dependency `qrcode` (+ Typen).
- Identität nur clientseitig – ein Gerätewechsel/Storage-Clear vergisst die Person (akzeptiert:
  „Person wählen" ist ein Klick).
- Eine öffentliche Action im `veranstaltung`-Actions-Modul (Namensraum, nicht Sicherheit).

## Implementierungs-Hinweise
Siehe die **Technischen Notizen** in [`tasks/task-54-selbstbedienung-link-namenswahl.md`](../../tasks/task-54-selbstbedienung-link-namenswahl.md)
(TDD-Reihenfolge, betroffene Dateien, `docs/routes.md`-Pflicht, Dependency-Schritt).
