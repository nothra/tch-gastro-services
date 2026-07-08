# ADR 014: Tech-Stack-Wahl

## Status
Accepted

## Datum
2026-07-08

## Kontext
TCH Gastro Services ist ein maßgeschneidertes, **nicht-kommerzielles** Tool für die
Gastronomie-Vorgänge des **Tennisclub Heuchelheim (TCH)**. Rahmenbedingungen (mit dem
Auftraggeber geklärt):

1. Betrieb auf **Vercel**.
2. Nutzung auf **privaten iOS- und Android-Geräten** verschiedener Nutzerrollen.
3. **Persistente** Datenspeicherung.
4. **Einfache, schnelle Erfassung** einfacher Vorgänge (erste UseCases).
5. **PWA** statt App-Store-Apps; **online-first** (kein Offline-Sync zum Start).
6. **Eigenes Login** mit App-verwalteten Rollen (RBAC), keine Fremd-/dm-Infrastruktur.
7. **EU/DE-Datenhaltung** (Vereins-/Mitgliederdaten, DSGVO).
8. **Dauerhaft kostenfrei**; voraussichtlich **mehrere Entwickler**.

## Decision
Gewählter Stack (alle Bausteine im geplanten Vereinsbetrieb kostenfrei):

| Schicht | Wahl |
|---|---|
| Sprache | **TypeScript** |
| Framework / Hosting | **Next.js (App Router)** auf **Vercel Hobby**, Region `fra1` |
| Cross-Platform | **PWA** (`@serwist/next` + Web-App-Manifest) |
| UI | **Tailwind CSS + shadcn/ui** (mobile-first) |
| Datenbank | **Neon Postgres** (Free, Region Frankfurt/EU) |
| DB-Zugriff | **Drizzle ORM** über Neon serverless HTTP-Treiber + **Zod** |
| Auth + Rollen | **Auth.js (NextAuth v5)**, Nutzer/Rollen in eigener Neon-DB, RBAC serverseitig |
| Tests | **Vitest** (Unit/Integration) + **Playwright** (E2E) |
| Lint/Format | **ESLint + Prettier** |
| Paketmanager | **pnpm**, Node 20+ |

Datei-Storage wird erst bei Bedarf ergänzt (dann Cloudflare R2 / Vercel Blob).

## Alternatives

### Option A: Next.js + Neon + Auth.js (gewählt)
**Pros:** dauerhaft 0 € (Neon Free, Auth.js OSS, Vercel Hobby für nicht-kommerzielle
Nutzung), EU-Datenhaltung, kein Vendor-Lock bei Auth (Daten in eigener DB), Vercel-nativ,
ein TypeScript-Codebase für Web + Mobile (PWA).
**Cons:** Auth/Rollen und ggf. Storage sind etwas mehr Eigenbau.

### Option B: Next.js + Supabase (Postgres + Auth + Storage)
**Pros:** integriertes Backend, weniger Eigenbau (Auth/RLS/Storage out-of-the-box), EU-Region.
**Cons:** Free-Projekte pausieren nach 7 Tagen Inaktivität und ohne Backups → für „dauerhaft
kostenfrei ohne Pflegeaufwand" schlechter; verlässlicher Betrieb faktisch Pro (~25 $/Monat).

### Option C: Native Apps (Swift/Kotlin) oder Flutter
**Pros:** volle native Fähigkeiten.
**Cons:** zwei Plattformen bzw. separater Stack, App-Store-Distribution, deutlich höherer
Aufwand – für „private Geräte, schnelle einfache Erfassung, Betrieb auf Vercel" überdimensioniert.

## Rationale
Option A erfüllt alle Rahmenbedingungen am direktesten: Vercel-nativ, eine PWA für iOS+Android
ohne App-Store, persistente EU-Daten (Neon Frankfurt), eigenes RBAC-Login ohne Fremd-Infrastruktur
und – entscheidend – **dauerhaft kostenfrei** für einen nicht-kommerziellen Vereinsbetrieb.
shadcn/ui + Server Actions liefern schnell die einfachen, mobil-optimierten Erfassungsformulare
der ersten UseCases. Der modulare Zuschnitt (Auth in eigener DB) vermeidet Vendor-Lock; ein
späterer Wechsel zu Option B bliebe wegen identischem Frontend/Tooling überschaubar.

## Consequences
**Positiv:**
- Alle Anforderungen (1–8) abgedeckt; Betriebskosten 0 €.
- Ein Sprachraum (TypeScript) für UI, API und DB-Zugriff.
- EU-Datenresidenz und eigenes RBAC ohne externe Auth-Anbieter.
- `PROJECT-CONTEXT.md` ist gefüllt → Stage-3-Pipeline-Preflight nicht mehr blockiert.

**Negativ / Trade-offs:**
- Auth-Flows, Rollen-Modell und Rechte-Checks sind selbst zu bauen (Standardmuster).
- **Vercel Hobby** ist nur für **nicht-kommerzielle** Nutzung frei – bei etwaiger späterer
  Kommerzialisierung wäre Vercel Pro oder ein Hosting-Wechsel nötig.
- iOS-PWA-Grenzen (Web-Push erst ≥16.4, keine beliebigen nativen APIs) – bei Bedarf später
  Capacitor-Wrapper auf demselben Code.
- Serverless-DB-Zugriff erfordert den Neon HTTP-Treiber (kein klassischer Pool).

## Folgeschritte (separate Tasks, teils account-abhängig)
- GitHub-**Organisation** (kostenlos) + Repo-Transfer + Branch-Protection (mehrere Entwickler).
- **Neon-** und **Vercel-Projekt** anlegen/verbinden (Region EU/`fra1`), Env-Vars setzen.
- Next.js-**Scaffolding** (create-next-app, shadcn/ui, serwist), Drizzle-Schema, Auth.js.
- CI-Variablen `FACTORY_LINT_COMMAND="pnpm lint"` / `FACTORY_TEST_COMMAND="pnpm test"` setzen.
