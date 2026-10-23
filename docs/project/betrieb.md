# Betrieb (TCH Gastro Services)

> **Besitzer: Projekt** (`docs/factory/OWNERSHIP.md`, `docs/project/**`). Hier steht, was an der
> Betriebsumgebung **TCH-spezifisch** ist: Werkzeuge, lokale Umgebung, Deploy-Gate-Secrets, Vercel,
> Neon. Die generischen Abläufe der Pipeline stehen in [`docs/factory/OPERATING.md`](../factory/OPERATING.md);
> sie verweist an den passenden Stellen hierher. Die Abschnitte wurden in #432 (T1a-3) inhaltlich unverändert
> aus `OPERATING.md` übernommen, die Nummern (0.1, 0.2, …) entsprechen den dortigen.
>
> Kurzfassung für den Dauerkontext: `PROJECT-CONTEXT.md` → „Lokale Umgebung & Oberflächentests".

---

## 0.1 Lokale Werkzeuge (TCH-Zeilen)

Zusätzlich zu den generischen Werkzeugen (`gh`, `yq`, `claude`) aus `OPERATING.md` §0.1:

| Werkzeug | Zweck | Prüfen |
|----------|-------|--------|
| Node ≥ 24 + `pnpm` | Build/Test/DB-Scripts | `node -v`, `pnpm -v` |
| Docker (Compose v2) | lokale DEV-Postgres | `docker compose version` |

Projekt aufsetzen: siehe [README → DEV](../../README.md#dev--lokale-entwicklung)
(`pnpm install` · `install-hooks.sh` · `.env.local` · `pnpm db:up` · `db:migrate` · `db:seed` · `pnpm dev`).

## Lokale Umgebung & Oberflächentests

Die TCH-Details zu Schritt 4 von `/implement` (ausgelagert aus `.claude/commands/implement.md`
und `coding-agent.md`, #432):

**Oberflächentests bei UI-berührenden Tasks (zusätzlich, nicht als Ersatz):**
Sobald eine Task die Oberfläche berührt, wird das Verhalten gegen einen **lokal
gestarteten Dev-Server** verifiziert – Unit-grün ≠ UI-/Proxy-grün (vgl. #63, wo ein
Handler-Direktaufruf die `proxy.ts`-Ebene umging):
1. Voraussetzung: lokale DB hochfahren (`pnpm db:up`) + `.env.local`.
2. Automatisiert: je Akzeptanzkriterium eine Playwright-Spec unter `e2e/*.spec.ts`;
   `pnpm test:e2e` startet den Dev-Server via `webServer`-Config selbst
   (`reuseExistingServer` außerhalb CI).
3. Interaktiv: `pnpm dev` (bzw. Preview-Config `dev`) starten und die betroffene
   Oberfläche im Browser durchklicken/screenshotten (deckt sich mit `/verify`).

Oberflächentests sind **nicht** in den pre-push-Gates verankert (Gates = Lint + `pnpm test`);
sie laufen zusätzlich und werden in der Task-Datei als erledigt vermerkt.

**Stage 3 (`FACTORY_STAGE=3`, nicht-interaktiv):** Kein Mensch, meist keine DB und kein
Browser vorhanden. Die interaktive Browser-Verifikation entfällt; automatisierte E2E
(`pnpm test:e2e`) nur ausführen, wenn DB (`pnpm db:up`) und Dev-Server verfügbar sind. Ist
das nicht gegeben, die offene UI-Verifikation als Blocker/Nachtest in der Task-Datei
protokollieren (Nachweis später über `/post-merge-verify`) – nicht still überspringen.

---

## 0.2 GitHub-Repository-Secrets (für das Deploy-Gate)

Das Deploy-Gate (`.github/workflows/deploy-gate.yml`) migriert und promotet **fail-closed** –
fehlt ein Pflicht-Secret, bricht es ab (nie stilles Überspringen). Setzen unter
**Repo → Settings → Secrets and variables → Actions → Secrets**:

| Secret | Wofür | Pflicht? |
|--------|-------|----------|
| `VERCEL_AUTOMATION_BYPASS_SECRET` | E2E dürfen an Vercels Deployment-Protection vorbei (INT) | **Pflicht** |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | INT-Admin-Login der E2E-Tests | **Pflicht** |
| `PRD_DATABASE_URL` | Prod-Neon-Connection-String (Auto-Migration, ADR-017) | **Pflicht** |
| `PRD_ADMIN_EMAIL` / `PRD_ADMIN_PASSWORD` | Prod-Login idempotent seeden | **Pflicht** |
| `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_INT_BRANCH_ID`, `NEON_PRD_BRANCH_ID`, `INT_DATABASE_URL` | INT-Refresh von PRD (Reset → anonymisieren → migrieren) | **Pflicht** — Absicherungs-Vorstufe der PRD-Migration (seit ADR-017) |
| `ANTHROPIC_API_KEY` (oder `ANTHROPIC_BASE_URL` für ein Gateway) | nur für den **Async-Trigger** (Stage 3 in CI) | Optional (siehe 0.4) |

> Warum die Neon-Secrets **Pflicht** sind: Der INT-Refresh migriert dieselbe Migration zuerst
> gegen prod-nahe, anonymisierte Daten und fährt E2E dagegen. Solange das Gate PRD **automatisch**
> migriert, darf diese Vorstufe nicht fehlen – sonst liefe die Prod-Migration ohne den bewiesenen
> INT-Lauf (die Lücke, die ADR-017 schließt). Details: [README → Deploy-Gate](../../README.md#deploy-gate-e2e-vor-production).

## 0.3 Vercel Production-Branch (Scharfschalten – Reihenfolge zwingend)

Production ist vom `main`-Push **entkoppelt** und hängt am `production`-Branch, den nur das Gate
bewegt. Aktivierungsreihenfolge (aus README/ADR-017):

1. **Alle Pflicht-Secrets** aus 0.2 setzen.
2. Das Gate **einmal grün** laufen lassen (ein `main`-Push) → es legt/aktualisiert den `production`-Branch.
3. **Erst danach** in **Vercel → Project → Settings → Git → Production Branch = `production`** setzen.

Ab jetzt: `main`-Push → nur INT-Preview; **Prod deployt ausschließlich** über den vom Gate
promoteten `production`-Branch (nur bei grünem INT-E2E **und** grüner PRD-Migration).

Vercel-Env je Scope: `NEXT_PUBLIC_STAGE`, `DATABASE_URL`, `AUTH_SECRET` für *Preview/int* und
*Production* getrennt setzen (siehe [README → Stages](../../README.md#umgebungen-stages)).

---

## 1.4 Was nach dem Merge automatisch passiert (Deploy-Details)

Kein Handgriff mehr – der Merge auf `main` löst die Kette nach Production aus:

```
Merge auf main
   └─▶ Deploy-Gate (.github/workflows/deploy-gate.yml)
        INT auf Commit → INT-DB von PRD auffrischen (Reset→anonymisieren→migrieren→seed)
        → auf INT-Build warten → Playwright-E2E gegen INT
        → (nur grün) PRD-DB migrieren + seeden  → Promote main→production
        → Vercel deployt Production → /api/health-Check (DB-Read)
```

E2E **oder** Prod-Migration rot → **kein** Promote → Production bleibt auf dem letzten Stand.

---

## 4.3 Destruktive Produktions-Migrationen

Automatisch im Gate laufen nur **additive/geprüfte** Migrationen (auf INT gegen prod-nahe,
anonymisierte Daten bewiesen, dann PRD, ADR-017). **Nicht** dem Automatismus überlassen:

- `DROP`/`TRUNCATE`/Spalten-Umbenennung/Typ-Wechsel mit **echtem Prod-Datenbestand**.
- Alles, was Daten verliert oder nicht idempotent rückspielbar ist.

→ Solche Migrationen als **eigene ADR** entscheiden, Datensicherung/Rücklaufplan festhalten und
**manuell** kontrolliert fahren (`.env.prd` ist ausdrücklich für solche Sonderfälle gedacht,
README). Der drop-and-recreate-Trick aus den Migrations-Learnings gilt nur, **solange kein
Prod-Datenbestand betroffen ist** (PROJECT-CONTEXT).
