## Codify-Report: Task 48

Feature: Login & RBAC (verwalter/abrechner), serverseitig durchgesetzt. Review + Security beide
bestanden (0 kritische Findings). Die Learnings stammen weniger aus fachlichen Fehlern als aus
**Tooling-/Framework-Reibung**, die konkret Zeit gekostet hat (Build-Abbruch, Migrations-Hänger,
tsc-Fehler, Test-Leak) – genau die Art wiederkehrender Fallen, die codifiziert gehört.

### Neue Regeln hinzugefügt

**`docs/factory/PROJECT-CONTEXT.md` → Bekannte Stolpersteine:**
- **Next.js 16: Middleware heißt `proxy.ts`** – wegen: `middleware.ts` neu angelegt → `next build`
  brach hart ab (beide Dateien verboten); Route-Schutz war längst über `proxy.ts` verdrahtet.
  Regel: Edge-Gate in `proxy.ts`, edge-sichere `authConfig` ohne db/bcrypt, Matcher eng fassen.
- **Drizzle-Migration bei Enum-Wert-Wechsel / Spalte→Array** – wegen: `drizzle-kit generate` hing
  im Non-TTY (interaktiver Prompt) und erzeugte danach inkohärentes SQL (ALTER auf nicht existierende
  Spalte). Regel: Prompt per `expect`/PTY, SQL durch drop-and-recreate ersetzen, Snapshot behalten,
  lokal gegen Wegwerf-DB verifizieren.
- **NextAuth v5: Custom-Claims typisieren** – wegen: `declare module "next-auth/jwt"` mergte nicht
  (Re-export), `token.roles` wurde `{}` → tsc-Fehler. Regel: `@auth/core/jwt` augmentieren + Cast im
  `session()`-Callback.
- **Vitest + Testing Library ohne `globals: true`** – wegen: fehlendes Auto-Cleanup → DOM-Leak
  zwischen Component-Tests (Test 2 sah Button aus Test 1). Regel: `afterEach(cleanup)` in
  `vitest.setup.ts` behalten; async Server Components via `render(await Component())`.

**`docs/factory/PROJECT-CONTEXT.md` → Projektspezifische Coding-Konventionen:**
- **Login/Credential-Prüfung in konstanter Zeit** – wegen: Timing-Seitenkanal (bcrypt lief nur bei
  existierender E-Mail) aus dem Security-Review. Regel: `bcrypt.compare` immer, Dummy-Hash bei
  unbekanntem Nutzer (`lib/credentials.ts`).
- **Rollen als Enum-Array + Guard `lib/authz.ts`** – verankert das ADR-016-Muster als Konvention
  für die Folge-Features F2–F8.

### Kein neuer Check / keine Guideline-/CLAUDE.md-Änderung

- **Kein Check-Skript:** Die Fehler sind nicht gut grep-automatisierbar, und der schärfste
  (`middleware.ts` + `proxy.ts`) wird bereits durch den harten `next build`-Abbruch fail-closed
  abgefangen. Ein eigener Check wäre Über-Engineering (YAGNI).
- **Keine universelle Guideline / kein neues Prinzip:** Alle Learnings sind stack-spezifisch
  (Next 16 / NextAuth v5 / Drizzle / Vitest) → gehören in PROJECT-CONTEXT, nicht in die
  stack-agnostischen Guidelines oder die „Nicht verhandelbaren Prinzipien".

### Empfehlung für nächste Features (F2–F8)

- Geschützte Server Actions rufen als **erste Zeile** `requireRole`/`requireAnyRole` auf und
  **fangen `ForbiddenError`** → 403-artige Antwort (Review-Hinweis: sonst rendert Next 500-artig).
- Rollen-Änderungen wirken erst nach erneutem Login (JWT-Staleness, ADR-016) – bei Bedarf eigene ADR.
- `postcss <8.5.10` (moderate, transitiv über `next`) beim nächsten `next`-Update mitziehen.
- Bei PWA/Serwist: `/sw.js` im `proxy.ts`-Matcher ausnehmen.
- Nach der Migration auf bereits provisionierten Stages einmal `pnpm db:seed` (Rollen sonst leer).
