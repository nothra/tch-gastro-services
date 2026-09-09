// Zwei Antworten für gedrosselte Anfragen auf die öffentliche Theken-Route: HTML für den
// menschlichen Lesepfad (#297, ADR-048 D4) und Klartext für den fetch-basierten Server-Action-Pfad
// (#331, ADR-048 D4-Nachzug). Beide nimmt keine Argumente – der Inhalt ist unabhängig vom
// aufgerufenen Token: eine gedrosselte Anfrage auf ein gültiges und auf ein erfundenes Segment ist
// ununterscheidbar (FS-4/FS-2).
//
// Beide werden direkt im Proxy erzeugt, nicht per `rewrite` auf eine Next-Route: Ein Rewrite
// erzeugte genau die Function-Invocation, die die Bremse einsparen soll (AK-3), und lieferte den
// Status der Zielroute statt 429. Aus demselben Grund ist die HTML-Variante in sich geschlossen –
// Layout und CSS inline, kein Skript, kein `_next/`-Bundle, kein externes Asset: im Drosselfall
// darf kein weiterer Roundtrip entstehen.

import { THEKE_RATE_LIMIT_WINDOW_MS } from "./rate-limit";

// Aus der Fensterlänge des Limiters abgeleitet (ADR-048 D2) statt als zweites 60er-Literal
// danebengestellt: Nach genau dieser Zeit ist wieder Budget da, und ein geändertes Fenster zieht
// den Header mit (#142 – projektweite Magic-Number-Konsistenz). Der sichtbare Hinweistext unten
// liest dieselbe Konstante: Sonst zöge ein geändertes Fenster nur den Header mit und die Prosa
// bliebe als stille Falschaussage stehen (#264 – Fix auf die Geschwister-Stelle ausweiten).
const RETRY_AFTER_SECONDS = THEKE_RATE_LIMIT_WINDOW_MS / 1000;

const THROTTLE_PAGE_HTML = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zu viele Anfragen</title>
<style>
body { margin: 0; display: flex; min-height: 100vh; align-items: center; justify-content: center;
  background: #f8fafc; color: #0f172a;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 32rem; padding: 2rem; text-align: center; }
h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
p { margin: 0; line-height: 1.6; color: #475569; }
</style>
</head>
<body>
<main>
<h1>Zu viele Anfragen</h1>
<p>Die Theke wird gerade sehr h&auml;ufig aufgerufen. Bitte versuche es gleich noch einmal &ndash;
in etwa ${RETRY_AFTER_SECONDS} Sekunden geht es wieder.</p>
</main>
</body>
</html>
`;

// Vollständige 429-Antwort für den Drosselfall: fertiges HTML-Dokument, `Retry-After` passend zum
// Fenster und `no-store`, damit kein CDN die 429 für diese URL zwischenspeichert.
export function tooManyRequestsResponse(): Response {
  return new Response(THROTTLE_PAGE_HTML, {
    status: 429,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(RETRY_AFTER_SECONDS),
      "cache-control": "no-store",
    },
  });
}

// 429-Antwort für einen gedrosselten Server-Action-POST (#331). `content-type` ist EXAKT
// `text/plain` – ohne `; charset=utf-8` –, weil `server-action-reducer.js:117` strikt vergleicht
// (`contentType === 'text/plain'`); mit Parameter fiele der Body wieder heraus und React zeigte
// erneut die generische „An unexpected response was received from the server."
export function tooManyRequestsPlainTextResponse(): Response {
  return new Response(
    `Zu viele Anfragen. Bitte in etwa ${RETRY_AFTER_SECONDS} Sekunden erneut versuchen.`,
    {
      status: 429,
      headers: {
        "content-type": "text/plain",
        "retry-after": String(RETRY_AFTER_SECONDS),
        "cache-control": "no-store",
      },
    },
  );
}
