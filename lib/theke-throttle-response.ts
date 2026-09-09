// Antwort für gedrosselte Lese-Anfragen auf die öffentliche Theken-Route (#297, ADR-048 D4).
//
// Die Seite wird direkt im Proxy erzeugt, nicht per `rewrite` auf eine Next-Route: Ein Rewrite
// erzeugte genau die Function-Invocation, die die Bremse einsparen soll (AK-3), und lieferte den
// Status der Zielroute statt 429. Aus demselben Grund ist das Dokument in sich geschlossen –
// Layout und CSS inline, kein Skript, kein `_next/`-Bundle, kein externes Asset: im Drosselfall
// darf kein weiterer Roundtrip entstehen.
//
// Der Inhalt ist bewusst unabhängig vom aufgerufenen Token (die Funktion nimmt kein Argument):
// eine gedrosselte Anfrage auf ein gültiges und auf ein erfundenes Segment ist ununterscheidbar
// (FS-4).

// Deckt sich mit der Fensterlänge des Limiters (ADR-048 D2) – nach dieser Zeit ist wieder Budget da.
const RETRY_AFTER_SECONDS = 60;

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
in etwa einer Minute geht es wieder.</p>
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
