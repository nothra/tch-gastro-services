# Routen-Übersicht

> **Kanonische Quelle bleibt der Code** (`app/**/page.tsx`, `app/api/**/route.ts`). Diese Datei
> ist die kuratierte Übersicht – sie wird bei **jeder** route-verändernden Änderung mitgepflegt
> (CLAUDE.md-Guardrail). Ein automatischer Drift-Check (`scripts/checks/routes-doc-check.sh`)
> erzwingt die Übereinstimmung fail-closed im Push-Gate.

**Zugriffs-Semantik:**

- **öffentlich** – ohne Anmeldung erreichbar (bei API-Routen zusätzlich im
  [`proxy.ts`](../proxy.ts)-Negativ-Lookahead-Matcher ausgenommen).
- **angemeldet** – Anmeldung nötig, aber keine spezifische Rolle.
- **`veranstalter` / `verwalter`** – Rollen-Gate. Quelle je Seite: `hasRole(...)` im `page.tsx`
  (Komfort-Redirect; die eigentliche Durchsetzung liegt serverseitig in den Server Actions über
  `requireRole`, siehe [`lib/authz.ts`](../lib/authz.ts)).

## Seiten (`app/**/page.tsx`)

| Pfad | Typ | Funktion | Zugriff |
|------|-----|----------|---------|
| `/` | Seite | Startseite / Landing | angemeldet |
| `/login` | Seite | Anmeldung (Credentials) | öffentlich |
| `/veranstaltung` | Seite | Veranstaltungs-Liste | `veranstalter` |
| `/veranstaltung/[id]` | Seite | Veranstaltung führen (Detail) | `veranstalter` |
| `/veranstaltung/[id]/verzehr` | Seite | Verzehr erfassen (Getränke, Essen, Kaffee) | `veranstalter` |
| `/veranstaltung/[id]/auslagen` | Seite | Auslagenerstattung | `veranstalter` |
| `/verwaltung/katalog` | Seite | Katalog/Preise pflegen | `verwalter` |
| `/verwaltung/teilnehmer` | Seite | Teilnehmer-Stammdaten pflegen | `verwalter` |

## API-Route-Handler (`app/api/**/route.ts`)

| Pfad | Typ | Funktion | Zugriff |
|------|-----|----------|---------|
| `/api/auth/[...nextauth]` | API | Auth.js-Handler (Login/Session/Callback) | öffentlich (proxy-exempt) |
| `/api/health` | API | Healthcheck (Liveness/Readiness) | öffentlich (proxy-exempt) |
| `/api/version` | API | Versions-/Build-Info | öffentlich (proxy-exempt) |

## Weitere (metadaten-generierte) Routen

Nicht Teil des Drift-Checks (kein `page.tsx`/`route.ts`), der Vollständigkeit halber notiert:

- `app/manifest.ts` erzeugt `/manifest.webmanifest` (PWA-Manifest, öffentlich).
