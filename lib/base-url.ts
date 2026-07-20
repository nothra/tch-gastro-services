import { headers } from "next/headers";

// Baut eine absolute URL zur Request-Zeit (ADR-034 D6): bevorzugt Host + Protokoll aus den
// Request-Headern (robust über local/int/prd ohne zusätzliche Env-Pflege). Fehlt der `host`,
// greift der env-Fallback (AUTH_URL/NEXTAUTH_URL); fehlt auch der, bleibt der relative Pfad.
// Für Selbstbedienungs-Link/QR (F7, #54) gebraucht, damit der geteilte Link vollständig ist.
export async function absoluteUrl(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (host) {
    const proto = requestHeaders.get("x-forwarded-proto") ?? defaultProto(host);
    return `${proto}://${host}${path}`;
  }

  const envBase = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (envBase) return `${envBase.replace(/\/$/, "")}${path}`;

  return path;
}

// Lokale Hosts bedienen wir ohne TLS (http), externe defaulten auf https.
function defaultProto(host: string): string {
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return local ? "http" : "https";
}
