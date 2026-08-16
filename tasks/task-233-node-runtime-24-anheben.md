# Task 233: node-runtime-24-anheben

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Node 20 ist seit 30. April 2026 EOL – die Doku dieses Projekts nennt es an sechs Stellen
weiterhin als Laufzeit-Anforderung, während die CI längst auf 22 läuft (Drift). Dieser Task
hebt die Runtime einheitlich auf **Node 24** (Active LTS bis April 2028, Vercel-Default) an:
`engines.node` in `package.json` neu einführen, die drei CI-Stellen von 22 auf 24 ziehen und
alle Doku-Fundstellen nachpflegen.

Kein Dependency-Update, kein neues Verhalten in der App.

Spec: [`docs/specs/spec-233-node-runtime-24-anheben.md`](../docs/specs/spec-233-node-runtime-24-anheben.md)

## Akzeptanzkriterien

- [x] **AK-1** GIVEN `package.json` ohne `engines`-Feld WHEN der Task umgesetzt ist THEN
      enthält es `"engines": { "node": ">=24" }`, und `pnpm install` läuft ohne Engine-Warnung.
- [x] **AK-2** GIVEN die drei CI-Stellen auf `node-version: 22` WHEN der Task umgesetzt ist
      THEN steht an allen drei `24`, und kein `node-version: 22` bleibt im Repo zurück.
- [x] **AK-3** GIVEN die sechs Doku-Fundstellen („Node 20+" / „Node ≥ 20") WHEN der Task
      umgesetzt ist THEN nennt jede Node 24, und die Volltextsuche über alle drei
      Schreibweisen liefert außerhalb von Lockfile/`tasks/`/Spec-Kontext keinen Treffer.
- [ ] **AK-4** GIVEN die Workflows auf Node 24 WHEN der PR gepusht ist THEN sind die required
      Checks (`factory-ci` lint/test, `deploy-gate`) auf Node 24 tatsächlich gelaufen und grün.
- [x] **AK-5** GIVEN eine lokale Node-24-Umgebung WHEN `pnpm install`, `pnpm build`,
      `pnpm test` und `pnpm test:e2e` laufen THEN terminiert jedes erfolgreich.
- [x] **AK-6** GIVEN die Maschine mit global installiertem Node 26.3.0 WHEN AK-5 verifiziert
      wird THEN geschieht das unter Node 24 aus der keg-only Formel `node@24` (PATH-Präfix
      `/opt/homebrew/opt/node@24/bin`); `node -v` meldet `v24.x` im selben Lauf wie die Gates.
- [x] **AK-7** GIVEN die Frage nach der `@testing-library/jest-dom`-7-Blockade WHEN der Task
      abgeschlossen ist THEN steht das Prüfergebnis unten in den Notizen, und jest-dom selbst
      ist unverändert.
- [ ] **AK-8** GIVEN die Vercel-Einstellung „Node.js Version" WHEN der PR zum Merge freigegeben
      wird THEN ist der manuelle Nachlauf-Schritt in der PR-Beschreibung benannt.

## Technische Notizen

**Kein ADR-Trigger** – Zielversion und Begründung stehen im Issue, es entsteht keine neue
strukturelle Entscheidung. `/architecture` kann übersprungen werden; direkt `/implement 233`.

**Betroffene Stellen (in der Requirements-Phase verifiziert):**

| Datei | Zeile | Ist |
|---|---|---|
| `package.json` | – | kein `engines`-Feld |
| `.github/workflows/deploy-gate.yml` | 56 | `node-version: 22` |
| `.github/workflows/factory-ci.yml` | 114 (Job `lint`) | `node-version: 22` |
| `.github/workflows/factory-ci.yml` | 139 (Job `test`) | `node-version: 22` |
| `docs/factory/PROJECT-CONTEXT.md` | 67 | `Node 20+` |
| `README.md` | 23 | `Node ≥ 20` |
| `README.md` | 46 | `Node ≥ 20` |
| `CONTRIBUTING.md` | 35 | `Node ≥ 20` |
| `docs/adr/014-tech-stack-selection.md` | 37 | `Node 20+` |
| `docs/adr/036-abschlussbericht-erzeugung-excel-pdf.md` | 25 | `Node 20+` |

Nicht betroffen: `factory-poll.yml` und `deploy-freeze-release.yml` nutzen kein Node.

**Zusätzlicher Fund beim Implementieren (nicht in der ursprünglichen Sechser-Liste):**
`docs/factory/OPERATING.md:82` (`| Node ≥ 20 + \`pnpm\` | Build/Test/DB-Scripts | ... |`) trug
ebenfalls „Node ≥ 20" und wäre sonst als Treffer bei AK-3 stehen geblieben. Mitgezogen auf
Node 24, damit die Volltextsuche tatsächlich leer ist (Lesson #144: Terminologie-Sweeps sind
blind für nicht vorab bekannte Fundstellen).

**Node 24 lokal aktivieren (für AK-5/AK-6):** `node@24` ist installiert (24.19.0, keg-only) –
das globale `node` bleibt 26.3.0. Aktivierung pro Kommando durch PATH-Präfix, damit `node -v`
und die Gates im selben Lauf dieselbe Version sehen:

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH" && node -v && pnpm install && pnpm build
```

**Manueller Nachlauf nach dem Merge:** Vercel-Projekteinstellung „Node.js Version" auf 24.x
setzen (kein Repo-Artefakt, gehört in die PR-Beschreibung).

**jest-dom-7-Prüfung (AK-7):** Aufgelöst, soweit die Node-Version die Ursache war.
`@testing-library/jest-dom@7.0.1` (aktuell neueste, installiert bleibt `6.9.1`) deklariert
`engines.node: ">=22"` – das war die „Node-22-Blockade" aus dem Issue-Text. Mit diesem Task
läuft die Runtime überall (CI, `package.json`, lokal via `node@24`) auf **>=24**, was die
Node-Anforderung von jest-dom 7 überall erfüllt; die Peer-Dependencies
(`@testing-library/dom` `^10.4.1` erfüllt `>=10 <11`, `vitest` `^4.1.10` erfüllt `>= 0.32`)
passen ebenfalls bereits. Ein tatsächlicher Bump auf 7.x bleibt bewusst **außerhalb** dieses
Tasks (kein Dependency-Update, s. Scope) – dafür ein eigenes Issue anlegen, das die
Breaking-Changes von jest-dom 6→7 selbst prüft. `@testing-library/jest-dom` ist in diesem PR
unverändert (`^6.9.1`).

## Offene Fragen

- [x] Doku-Sweep-Umfang → alle sechs Fundstellen inkl. beider ADR-Stellen.
- [x] `engines.node`-Range → `>=24` (offene Untergrenze, lokales Node 26 bleibt gültig).
- [x] `.nvmrc`/`.node-version` einführen? → Nein, eine kanonische Quelle.
- [x] Lokale Verifikation → Node 24 lokal installieren und die Gates dort fahren. Umgesetzt via
      `brew install node@24` (24.19.0, keg-only) – nvm war nicht vorhanden und wurde bewusst
      nicht nachgerüstet (Homebrew-verwaltetes Setup, kein zweiter Versionsmanager im PATH).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/233-node-runtime-24-anheben`
Erstellt: 2026-08-16 18:30
