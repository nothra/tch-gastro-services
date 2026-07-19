// Schutz gegen Session-Wiederbelebung durch Prefetch/RSC-Requests (#164).
//
// Auth.js (JWT-Strategie) erneuert das Session-Cookie bei *jedem* authentifizierten Request
// (Rolling Session) – die Antwort trägt dann ein frisches `…authjs.session-token`-Set-Cookie.
// Next.js prefetcht `<Link>`s zu geschützten Routen automatisch; diese Prefetch-Antworten
// rotieren das Cookie im Hintergrund. Klickt der Nutzer „Abmelden", während eine solche
// Prefetch-Antwort noch unterwegs ist, landet sie NACH dem signOut-Clear und setzt das Cookie
// neu → die Session wird wiederbelebt, das Logout „hält nicht" (Race, flaky Deploy-Gate INT).
//
// Gegenmittel (zentral in `proxy.ts`, deckt ALLE geschützten Links ab): Auf RSC-/Prefetch-
// Requests das rotierende Session-Set-Cookie aus der Antwort entfernen. Diese Hintergrund-
// Requests sollen die Session ohnehin nicht verlängern; nur echte Dokumentaufrufe (und der
// Login-POST) setzen/erneuern das Cookie.
//
// Erkennung: Next strippt seine eigenen Marker (`next-router-prefetch`, `rsc`) VOR der
// Middleware. Sichtbar bleibt der interne `next-url`-Header (bei RSC-/Prefetch-Navigationen
// gesetzt, bei echten Dokumentaufrufen absent) bzw. `sec-fetch-dest` (≠ "document" = fetch/RSC).

// Auth.js-Session-Cookie: `authjs.session-token` (HTTP) bzw. `__Secure-authjs.session-token`
// (HTTPS), inklusive gechunkter Varianten `…session-token.0/.1` bei großen Tokens.
const SESSION_TOKEN_SET_COOKIE = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/;

// Ist der Request ein RSC-/Prefetch-Aufruf (kein Top-Level-Dokumentaufruf, kein POST)?
// Nur solche GET-Requests dürfen die Session NICHT rotieren – POST (Login/Logout) und echte
// Dokumentaufrufe bleiben unangetastet (fail-safe: bei fehlenden Signalen NICHT strippen).
export function isRscRequest(request: { method: string; headers: Headers }): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.has("next-url")) return true;
  const dest = request.headers.get("sec-fetch-dest");
  return dest !== null && dest !== "document";
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
