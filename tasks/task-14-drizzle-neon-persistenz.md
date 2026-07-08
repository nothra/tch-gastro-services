# Task 14: drizzle-neon-persistenz

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Drizzle-ORM + Neon-Anbindung: `db/index.ts` (Neon serverless HTTP-Client),
`db/schema.ts` (Auth.js-kompatibel: user inkl. role, account, session, verificationToken),
`drizzle.config.ts`, generierte Initial-Migration, db:*-Scripts, `.env.example`.

## Akzeptanzkriterien
- [x] `pnpm build/lint/test/format:check` bleiben grün (kein DB-Zugriff beim Bauen)
- [x] `pnpm db:generate` erzeugt Migration offline (4 Tabellen → db/migrations/0000_*.sql)
- [x] `.env.example` dokumentiert DATABASE_URL/AUTH_SECRET; `.env.local` gitignored, Secrets nicht im Repo
- [ ] (Übergabe) `pnpm db:migrate` gegen Neon ausgeführt → Tabellen in DB (braucht DATABASE_URL)

## Technische Notizen
- Neon serverless HTTP-Treiber (kein TCP-Pool) für Vercel-Functions.
- pnpm 11: `esbuild` (drizzle-kit) zu `allowBuilds` ergänzt.
- `db/migrations` + Factory-Dateien aus Prettier ausgenommen; `.env.example` explizit un-ignored.
- Auth.js-Laufzeit (Config/Routes/Middleware/Login) = Folge-Task, baut auf diesem Schema auf.

## Offene Fragen
- Wird DATABASE_URL über die Neon-Vercel-Integration gesetzt oder manuell? (beeinflusst nur das Deploy-Setup, nicht den Code)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/14-drizzle-neon-persistenz`
Erstellt: 2026-07-08 22:12
