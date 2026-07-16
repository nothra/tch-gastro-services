# INTERRUPT – Task 120

Typ: REVIEW_BLOCKER
Nachricht: Review NEEDS_REWORK – 3 menschliche Aktionen nötig (nicht Agent-Iteration):
1. [KRITISCH] git mv app/abrechnung/veranstaltung app/veranstaltung + gates (pre-push.sh, pnpm lint)
2. [KRITISCH] Migration 0000→0007 gegen Wegwerf-DB verifizieren: pnpm db:up
3. [WICHTIG] Branch docs/120-... → improvement/120-... umbenennen + Label documentation → enhancement anpassen
Danach: /pr-shepherd erneut ausführen → Auto-Merge freigeben
Aktion: /architecture ausführen, dann Pipeline neu starten
Zeitpunkt: 2026-07-15 23:02
