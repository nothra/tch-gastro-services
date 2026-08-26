# Security Review: Task 308

Reine Navigation zwischen zwei bereits `veranstalter`-gegateten Seiten, getragen von einem
Query-Parameter (`?zeile=<zeileId>`). Diff geprüft: `git diff origin/main...HEAD`.

## Kritische Findings (Blocker)

Keine.

## Wichtige Findings

Keine.

## Hinweise

- **Input-Validierung ohne Format-Schema (bewusst, korrekt):** `personenbezogeneZeileId`
  (`app/veranstaltung/personenbezug.ts:34-41`) validiert den Query-Parameter ausschließlich über
  Mengenzugehörigkeit zu den bereits serverseitig geladenen Zeilen-IDs der aktuellen
  Veranstaltung – strenger als jedes Format-/Zod-Schema. Kein Wert wird je roh in den DOM
  reflektiert (nur Vergleich/Lookup/`autoFocus`-Boolean); kein XSS-Pfad.
- **Autorisierungsreihenfolge verifiziert:** In beiden Seiten (`kassieren/page.tsx`,
  `verzehr/page.tsx`) läuft der `hasRole`-Check vor dem Laden der Veranstaltungsdaten und vor der
  Personenbezug-Auflösung. Eine Zeilen-ID aus einer fremden Veranstaltung oder ein Zufallswert
  matcht nie gegen die geladene Liste → `null` (F1/F4 sind testabgedeckt).
- **Öffentlicher Weg (`/theke/[token]`) unabhängig gegengeprüft:** Keiner der beiden
  `<FokusListe>`-Aufrufe in `IdentityGate.tsx` übergibt `aktionJeZeile` – die Kassieren-Aktion
  kann dort strukturell nie gerendert werden (AK9), nicht nur laut Test, sondern auch laut
  Code-Inspektion der Aufrufstellen.
- **E2E-Credentials:** `e2e/wechsel-verzehr-kassieren.spec.ts` liest `SEED_ADMIN_EMAIL`/
  `SEED_ADMIN_PASSWORD` aus Env-Vars – identisches, bereits etabliertes Muster wie in
  `auth.spec.ts`, `navigation.spec.ts`, `anleitung-veranstalter.spec.ts`. Keine hartkodierten
  Credentials.
- **Keine neuen Dependencies**, keine Kryptographie berührt, keine SQL-/Command-Injection-Fläche
  (kein neuer DB-Zugriff, kein neuer Shell-Aufruf), keine sensiblen Fehlermeldungen nach außen.

## Ergebnis

PASSED
