## Codify-Report: Task 164

### Neue Regeln hinzugefügt
- **`docs/factory/PROJECT-CONTEXT.md` → Bekannte Stolpersteine: „Auto-Prefetch geschützter Routen
  belebt die Session nach dem Abmelden wieder (aus #164)"** – bündelt drei Learnings:
  1. **Mechanismus:** Auto-geprefetchte `<Link>`s zu authentifizierten Routen + Auth.js-Rolling-
     Session → racende Prefetch-Antwort setzt das Session-Cookie nach `signOut` neu (flaky Logout).
     Zentral in `proxy.ts` fixen (Rotation auf RSC-GETs unterdrücken), nicht per-Link.
  2. **Next-16-Falle:** Next strippt `next-router-prefetch`/`rsc` **vor** der Middleware; RSC-
     Erkennung dort über `next-url` bzw. `sec-fetch-dest ≠ "document"`.
  3. **Debugging-Lehre:** Server-Korrektheit ≠ kein Client-Race; gemeldete Ursache (`force-dynamic`)
     empirisch als No-op widerlegt; flaky Race per Playwright `--repeat-each` + Trace (Set-Cookie-
     Reihenfolge) beweisen.

### Muster erkannt (woraus die Regel stammt)
- **Gemeldete Ursache ≠ echte Ursache:** Das Issue vermutete Full Route Cache / `force-dynamic`.
  `/` war aber bereits dynamisch + `no-store`; der Bug war ein reiner Client-Race. → Regel:
  Hypothese empirisch prüfen, nicht übernehmen.
- **Symptom-Fix ≠ Schwachstellen-Klasse (Review-Runde 1, NEEDS_REWORK):** Der erste Fix
  (`prefetch={false}` nur Kopfzeile/Dashboard) schloss nur den Meldepfad `/`; weitere geschützte
  Links blieben offen. → Regel: bei generischem Root Cause zentral fixen.
- **Flaky-Race-Reproduktion:** Einzellauf grün, erst `--repeat-each` machte den Race sichtbar. →
  in die Debugging-Lehre aufgenommen.

### Kein Check hinzugefügt
Ein statischer Guard „authentifizierte Prefetches" ist nicht sinnvoll automatisierbar (Prefetch-
Verhalten ist Laufzeit/Client). Der zentrale `proxy.ts`-Guard + Unit-/Kompositionstests decken die
Klasse ab; der INT-Deploy-Gate-e2e ist der Integrations-Wächter.

### Keine Guideline-/CLAUDE.md-Änderung
Bewusst projektspezifisch gehalten (Next 16 + Auth.js v5 + `proxy.ts`) – kein universelles Prinzip,
das über die bestehenden Debugging-/Test-Normen hinausgeht.

### Folge-Arbeit
- **ESLint ignoriert Playwright-Artefakte nicht** (`test-results/`, `playwright-report/`) → `pnpm lint`
  bricht nach jedem e2e-Lauf. Bereits als Session-Task-Chip geflaggt (klein, `eslint.config.mjs`
  `globalIgnores` ergänzen). Kein GitHub-Issue erzwungen (Trivial-Hygiene); bei Bedarf via
  `start-work.sh … chore` aufgreifen.

### Empfehlung für nächste Features
- **Branch-/Task-Slug nicht auf die (evtl. falsche) Issue-Hypothese festnageln:** `fix/164-dashboard-
  force-dynamic` wurde zum Misnomer, als sich `force-dynamic` als No-op erwies. Ein Rename bei bereits
  offenem PR schließt ihn (#155) – daher belassen, aber künftig neutralere Slugs wählen
  (z. B. `fix/164-logout-session`).
