# Task 16: authjs-credentials-login-rbac

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Auth.js (next-auth v5) Credentials-Login (E-Mail+Passwort, bcrypt, JWT-Sessions) auf
dem Drizzle-Schema. Edge/Node-Split (auth.config.ts / auth.ts), Route-Handler,
`proxy.ts` (Next-16-Nachfolger von middleware) schützt alle Routen außer /login,
Rolle in JWT/Session (RBAC), Login-Seite + Server-Action, Seed-Script für Initial-Admin.

## Akzeptanzkriterien
- [x] `pnpm build/lint/test/format:check` grün (db lazy → Build ohne Secrets)
- [x] Migration `passwordHash` erzeugt UND gegen Neon angewendet (4 Tabellen live)
- [x] proxy schützt Routen (authorized-Callback); Rolle in Session verfügbar
- [ ] (Übergabe) `pnpm db:seed` mit SEED_ADMIN_* → erster Admin, Login testbar
- [ ] (Übergabe) AUTH_SECRET in Vercel setzen (für Prod-Login)

## Technische Notizen
- Credentials ⇒ JWT-Sessions (kein DB-Session-Adapter). db lazy (Proxy) → kein DB-Zugriff beim Build.
- `middleware.ts` → `proxy.ts` (Next 16 Deprecation); Default-Export der auth-Funktion.
- JWT-Rollen-Augmentation griff nicht → `token.role` beim Lesen gecastet.
- bcryptjs 3 bringt eigene Typen (`@types/bcryptjs` entfernt).
- Offene Registrierung bewusst NICHT vorhanden (admin-provisioniert via db:seed).

## Offene Fragen
- Nutzerverwaltung (weitere Nutzer/Rollen zuweisen) → späteres Admin-UI / eigener Task.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/16-authjs-credentials-login-rbac`
Erstellt: 2026-07-08 22:23
