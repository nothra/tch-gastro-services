// Schutz gegen Session-Wiederbelebung durch nicht-mutierende Requests (#164, #170 / ADR-032).
//
// Auth.js (JWT-Strategie) erneuert das Session-Cookie bei *jedem* authentifizierten Request
// (Rolling Session) – die Antwort trägt dann ein frisches `…authjs.session-token`-Set-Cookie.
// Klickt der Nutzer „Abmelden", während eine solche authentifizierte Antwort (Prefetch-GET,
// aber auch HEAD/OPTIONS-Preflight, die Playwright rund um `page.goto` feuert) noch unterwegs
// ist, landet sie NACH dem signOut-Clear und setzt das Cookie neu → die Session wird
// wiederbelebt, das Logout „hält nicht" (Race, flaky Deploy-Gate INT).
//
// Gegenmittel (zentral in `proxy.ts`, deckt ALLE geschützten Routen ab): Auf allen
// nicht-mutierenden Methoden das rotierende Session-Set-Cookie aus der Antwort entfernen. Nur
// mutierende Requests (Login/Logout/Server-Actions = POST/PUT/PATCH/DELETE) dürfen das Cookie
// setzen oder löschen – kein GET/HEAD/OPTIONS etabliert je legitim eine Session (Login läuft
// über Credentials = POST; `api/auth` ist ohnehin aus dem Matcher ausgenommen).
//
// #164 unterdrückte nur GET über die fragile `next-url`/`sec-fetch-dest`-Heuristik (Whack-a-Mole:
// OPTIONS/HEAD blieben offen). ADR-032 ersetzt das durch eine rein methodenbasierte Entscheidung.

// Auth.js-Session-Cookie: `authjs.session-token` (HTTP) bzw. `__Secure-authjs.session-token`
// (HTTPS), inklusive gechunkter Varianten `…session-token.0/.1` bei großen Tokens.
const SESSION_TOKEN_SET_COOKIE = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/;

// Mutierende HTTP-Methoden – nur sie dürfen das Session-Cookie setzen/löschen. HTTP-Methoden
// sind als Uppercase definiert; die Web-Request-API liefert sie so (bewusst nicht gefaltet).
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Soll die Session-Rotation aus der Antwort gestrippt werden? Ja für jede nicht-mutierende
// Methode (GET/HEAD/OPTIONS und künftige) – nein nur für POST/PUT/PATCH/DELETE (ADR-032).
export function shouldSuppressSessionRotation(request: { method: string }): boolean {
  return !MUTATION_METHODS.has(request.method);
}

// Entfernt jedes Session-Token-Set-Cookie aus der Antwort und lässt alle anderen Cookies
// (CSRF, callback-url) unangetastet. No-op, wenn kein Session-Cookie gesetzt wird.
export function stripSessionRotation(response: Response): void {
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length === 0) return;

  const kept = setCookies.filter((cookie) => !SESSION_TOKEN_SET_COOKIE.test(cookie));
  if (kept.length === setCookies.length) return;

  response.headers.delete("set-cookie");
  for (const cookie of kept) response.headers.append("set-cookie", cookie);
}
