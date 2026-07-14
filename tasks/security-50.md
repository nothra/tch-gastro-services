# Security Review: Task 50 (Teilnehmer-Stammdaten)

Scope: `git diff main...HEAD` – Server Actions, Zod-Schema, Drizzle-Data-Layer, UI und
Schema für die Teilnehmer-Stammdaten (F3, #50, ADR-022).

## Kritische Findings (Blocker)

Keine.

## Wichtige Findings

Keine.

## Hinweise

- [ ] **[Input-Validierung] `name` ohne Obergrenze (Defense in Depth).**
      `teilnehmerSchema.name` ist `z.string().trim().min(1, …)` – ohne `.max(…)`. Die
      Spalte `teilnehmer.name` ist Postgres-`text` (unbegrenzt), es gibt also – anders als bei
      int4-Feldern (CLAUDE.md-Regel „Zod-Schema: Obergrenze für Integer-mapped Inputs") – **keine
      DB-Fehlergrenze**, die überlange Eingaben abfängt. Threat Surface ist niedrig (Angreifer
      müsste eine authentifizierte `verwalter`-Session besitzen), daher kein Blocker.
      **Empfehlung:** eine domänen-sinnvolle Obergrenze an der Grenze ergänzen, z. B.
      `z.string().trim().min(1, …).max(200, "Anzeigename ist zu lang.")` – analog für einen
      späteren Katalog-Angleich. Optional als eigenes Backlog-Issue, wenn nicht in diesem PR.

## Geprüft & unauffällig

- **Injection (SQL/Command):** Ausschließlich Drizzle-parametrisierte Queries
  (`eq(teilnehmer.name, name)`, `and(…)`), kein Raw-SQL, keine String-Interpolation im
  Data-Layer. Kein Command-/Shell-Aufruf.
- **XSS:** Ausgaben (`name`, `typ`, `mitglied`) werden von React text-escaped; kein
  `dangerouslySetInnerHTML`, kein `href`/`src` aus Nutzerinput.
- **AuthN/AuthZ (RBAC):** `requireRole("verwalter")` als erste Zeile jeder mutierenden Action
  (`create`/`update`/`setActive`), fail-closed über `lib/authz.ts`. Die UI-Sperre in `page.tsx`
  ist bewusst nur Anzeige-Komfort; die Durchsetzung liegt serverseitig (Defense in Depth,
  PROJECT-CONTEXT). AK5 (Abrechner darf nicht) ergibt sich daraus.
- **BOLA/IDOR:** `update`/`setActive` nehmen eine `id` aus dem FormData; da alle Verwalter
  alle Stammdaten pflegen (kein Objekt-Ownership-Modell), ist das kein IDOR – gewolltes Verhalten.
- **Duplikat-Bestätigung (`confirmDuplicate`):** Ein Client kann `confirmDuplicate=true` direkt
  senden und die Warnung überspringen – das ist **so vorgesehen** (nicht-blockierende,
  überstimmbare Warnung, ADR-022), kein Security-Defekt.
- **CSRF:** Erfassung ausschließlich über Next.js Server Actions (integrierter Origin-Schutz).
- **Secrets/Logging:** Keine hartkodierten Credentials/Keys. Der Denial-Log in `requireAnyRole`
  enthält nur Rollennamen, keine PII (keine Teilnehmernamen).
- **Dependencies:** Keine neuen Abhängigkeiten; nur vorhandene (zod, drizzle-orm).
- **Error Handling:** Generischer `ForbiddenError` ohne Detailpreisgabe; Zod-Fehler als
  nutzerfreundliche Meldung (`firstIssueMessage`); keine Stack Traces nach außen.

## Ergebnis

PASSED

Kein kritischer oder wichtiger Fund – der Merge ist aus Security-Sicht nicht blockiert.
Der einzige Hinweis (`name`-Obergrenze) ist Defense in Depth und kann in diesem PR oder als
Backlog-Issue adressiert werden.
