# Security Review: Task 137

Scope: rein präsentationale UX-Verfeinerung der Verzehr-Erfassung – Artikel-Größe (`size`)
anzeigen + gleichnamige Artikel gruppieren. Geänderter Produktionscode:
`app/_verzehr/VerzehrErfassung.tsx`, `app/_verzehr/artikel-anzeige.ts`,
`app/veranstaltung/[id]/verzehr/page.tsx`, `db/verzehr.ts`.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [Input-Validierung / out-of-scope] Der Katalog-**Schreibpfad** (`app/verwaltung/katalog/schema.ts`)
  hat für die `text`-Spalte `size` (und `name`) **keine `.max()`-Obergrenze**. Per Codify-Regel
  „Erweiterung auf `text`-Spalten (#50)" braucht jedes Zod-String-Feld auf einer `text`-Spalte eine
  domänen-sinnvolle Grenze (z. B. `size` ~50, `name` ~200). Landet überlanger Text in der DB, wird er
  in dieser Task nun **angezeigt** (Layout-/DoS-Fläche gering, nur authentifizierte Verwalter). Das ist
  eine **Vorbedingung** dieser Task, kein durch #137 eingeführter Defekt und **außerhalb des Scopes**
  (Task liest `size` nur, schreibt nicht). Empfehlung: separates Härtungs-Issue für die Zod-Obergrenze
  auf `size`/`name` – Orchestrator entscheidet über Anlage.

## Ergebnis
PASSED
