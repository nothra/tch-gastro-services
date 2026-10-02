# Security Review: Task 370

> Diff-Basis `origin/main...HEAD`. Umfang: reine UI-Umstellung der Verzehr-Erfassung auf die
> Einzelansicht (`app/_verzehr/`, beide Seiten `app/theke/[token]` und `app/veranstaltung/[id]/verzehr`).
> Keine Änderung an Server Actions, Data-Layer, Auth/`proxy.ts`, Routen oder Abhängigkeiten
> (`git diff --stat` für `package.json`/`pnpm-lock.yaml`: leer; `docs/routes.md` nur Beschreibung).

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [Input/Autorisierung] `MengeControl` sendet unverändert `zeileId`, `catalogItemId` (Hidden-Felder) und `delta` (±1, nie absolutes `menge`). Die Vertrauensgrenze liegt weiter in den Actions (Zod-Validierung, Rollen-/Token-Scope, IDOR-Parent-Key, Drossel ADR-044) – diese sind in diesem PR **nicht** angefasst; die UI blendet nur „−" bei Menge 0 aus (Komfort, kein Schutz).
- [ ] [Input] Personenbezug `?zeile=` wird weiter serverseitig gegen die Zeilen **dieser** Veranstaltung aufgelöst (`personenbezogeneZeileId`, unbekannter Wert → erste Person); kein Durchgriff auf fremde Veranstaltungen. Auf der Theke stammt die Ziel-Merkung aus geräte-lokalem `localStorage` und wird gegen `zeilen` geprüft (stale → Fallback, FS5).
- [ ] [XSS] Kein `dangerouslySetInnerHTML`/`innerHTML`/`eval` in `app/_verzehr/`; Namen, Artikel und Fehlermeldungen werden als React-Text gerendert (Auto-Escaping). Fehlertexte kommen aus `VerzehrActionState.error` (feste Server-Meldungen), keine Stack Traces.
- [ ] [Information Disclosure] Die Nur-Lese-Liste der Theke vor der Namenswahl zeigt wie zuvor nur Name + Gesamt (weniger als vorher: keine Positionen/Einzelpreise) – Verringerung der Fläche.
- [ ] [Secrets/Logs] Keine Secrets, keine `console.*`-Ausgaben, keine neuen Env-Variablen. Die E2E-Läufe nutzten `.env.local` nur über `dotenv`, Werte wurden nicht ausgegeben oder committet.
- [ ] [Dependencies] Keine neuen oder geänderten Abhängigkeiten.

## Ergebnis
PASSED
