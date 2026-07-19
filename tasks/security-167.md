# Security Review: Task 167

Scope: Dependency-Config-Änderung. Diff gegen `origin/main` umfasst exakt 3 Dateien —
`pnpm-workspace.yaml` (+10, Sicherheits-Overrides + Kommentar), `pnpm-lock.yaml`
(Auflösung, netto −240 Zeilen) und die Task-Datei. **Kein Produktionscode.**

## Kritische Findings (Blocker)
- keine

## Wichtige Findings
- keine

## Hinweise

### Wirksamkeit — belegt
- **Verwundbare Versionen aus dem Baum entfernt.** Lockfile-Diff entfernt `postcss@8.4.31`
  und `esbuild@0.18.20`. Im neuen Lockfile lösen alle Kopien oberhalb des Patch-Floors auf:
  `postcss@8.5.16` (≥ 8.5.10 ✓), `esbuild@0.25.12` und `esbuild@0.28.1` (beide ≥ 0.25.0 ✓).
  Gezielte Gegenprobe nach Restbeständen (`postcss@8.<5.10`, `esbuild@0.1x/0.2[0-4]`): keine.
- **`pnpm why`** bestätigt: postcss nur noch als `8.5.16` (via `@tailwindcss/postcss`),
  esbuild nur `0.25.12`/`0.28.1`.
- **`pnpm audit`** → „No known vulnerabilities found" (Exit 0). Damit sind GHSA-qx2v-qp2m-jg93
  (postcss XSS im CSS-Stringify, Build-Zeit via `next`) und GHSA-67mh-4wv8-2f99 (esbuild
  Dev-Server-Request-Leak, dev-only via `drizzle-kit`) geschlossen.

### Supply-Chain — sauber
- **Zielversionen sind legitime, veröffentlichte Releases**, keine getippten Fantasieversionen:
  postcss 8.5.16, esbuild 0.25.12/0.28.1 sind reguläre Upstream-Releases. Kein Downgrade eines
  anderen Pakets.
- **`pnpm install --frozen-lockfile`** läuft sauber („Already up to date") — der committete
  Lockfile ist konsistent mit `pnpm-workspace.yaml`; keine unbelegte Auflösung.
- **Keine unerwarteten neuen Pakete.** Alle im Lockfile berührten Einträge sind entweder
  `postcss`/`esbuild` selbst oder die offiziellen `@esbuild/*`-Plattform-Binärpakete (optionale
  Standard-Abhängigkeiten von esbuild). Die netto −240 Zeilen entstehen durch **Deduplizierung**:
  Der alte `esbuild@0.18.20`-Teilbaum brachte einen eigenen kompletten Satz `@esbuild/*`-Binaries
  mit, der gegen das bereits vorhandene neuere esbuild wegfällt. Kein fremdes Paket eingeschleust.

### Override-Form — korrekt und eng
- **Konditionale Form** `"postcss@<8.5.10": ">=8.5.10"` bzw. `"esbuild@<0.25.0": ">=0.25.0"`:
  Der Selektor greift ausschließlich **unterhalb** des Patch-Floors. Spätere legitime
  Parent-Upgrades (`next`, `drizzle-kit`), die selbst eine gepatchte Version ziehen, matchen den
  Selektor nicht mehr und werden nicht blockiert. Kein unbedingter/zu breiter Override, keine
  Version-Pinning-Falle. Der Kommentar im YAML nennt Grund, GHSA-IDs und Entfern-Kriterium
  (No-op, sobald Parents patchen) — nachvollziehbar dokumentiert.

### Rest-Katalog (Prüfreihenfolge Persona) — N/A, begründet
- **Injection / Input-Validierung, Auth/RBAC, Sensitive-Data/Secrets, Krypto, Error-Handling/
  Information-Disclosure:** Nicht anwendbar. Der PR ändert ausschließlich Dependency-Auflösung
  (`pnpm-workspace.yaml` + Lockfile). Keine Server Actions, Route Handler, DB-Queries,
  Auth-Guards, Env/Secret-Zugriffe oder sonstiger ausführbarer Anwendungscode sind betroffen —
  entsprechend gibt es an diesen Grenzen keine neue Angriffsfläche zu bewerten.

## Ergebnis
PASSED
