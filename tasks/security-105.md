# Security Review: Task 105

Scope: Extraktion des duplizierten Zod-Fehler-Helfers `firstIssueMessage` nach
`lib/form-errors.ts`; beide Server-Actions importieren ihn statt lokaler Kopie.
Reines internes Refactoring – kein neues Verhalten (Diff `main...HEAD`).

## Kritische Findings (Blocker)
- Keine.

## Wichtige Findings
- Keine.

## Hinweise
- Keine.

## Prüfkatalog-Ergebnis (relevante Punkte)
- **Injection (SQL/Command/XSS/JSON):** Nicht betroffen. Der Helfer führt nichts aus,
  baut keine Query/kein Kommando; er liest `error.issues[0]?.message` (String) und gibt
  ihn zurück. DB-Zugriff läuft weiterhin über die Drizzle-Data-Layer (unverändert).
  Output-Encoding bleibt Sache der React-Renderschicht – hier nicht berührt.
- **Fehlermeldungen / Info-Leak:** Zurückgegeben wird ausschließlich die Zod-eigene
  Validierungsmeldung (schemadefinierter Text, z. B. „Name ist zu lang.") bzw. der
  Fallback „Ungültige Eingabe." – keine Stack-Traces, keine internen Pfade/Details.
  Verhalten identisch zu vorher, nur an einen zentralen Ort verlagert.
- **AuthN/AuthZ:** Nicht verändert. Die `requireRole("verwalter")`-Guards in beiden
  Actions bleiben unangetastet; der Helfer wird erst nach dem Guard aufgerufen.
- **Secrets/Krypto:** Keine Secrets, keine Zufallszahlen, kein `Math.random()`.
- **Dependencies:** Keine neuen Dependencies (`package.json`/Lockfile unverändert).
  `zod` wird im Test nur als bestehende Dependency genutzt; Produktionscode in
  `lib/form-errors.ts` ist Zod-entkoppelt und edge-sicher (kein `db`/`bcrypt`-Import).
- **Input-Validierung:** Unverändert – die Zod-`safeParse`-Grenze in den Actions bleibt
  vollständig erhalten; der Helfer verarbeitet nur das Ergebnis.

## Ergebnis
PASSED
