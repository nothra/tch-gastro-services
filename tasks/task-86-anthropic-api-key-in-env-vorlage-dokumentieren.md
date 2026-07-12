# Task 86: anthropic-api-key-in-env-vorlage-dokumentieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig <!-- reine Doku-Änderung an .env.example, kein Code → keine neuen Tests; bestehende Suite grün -->
- [x] Security-Review bestanden <!-- Secret-Handling geprüft: server-only, kein NEXT_PUBLIC_, nur Platzhalter (auskommentiert) im committeten Template -->
- [x] Refactoring abgeschlossen <!-- n/a: einzelner Kommentarblock -->
- [x] Codify ausgeführt <!-- kein neues Learning: bestehende Regel (server-only Secrets, kein NEXT_PUBLIC_) angewandt -->
- [x] Fertig / PR erstellt

## Beschreibung
`ANTHROPIC_API_KEY` als dokumentierten Platzhalter in die committete `.env.example`
aufnehmen – im Stil der bestehenden Abschnitte, damit der Key nach eurer Konvention
je Stage in `.env.local` / auf Vercel gesetzt werden kann. Es wird nur der Name +
Erklärung dokumentiert (auskommentierter Platzhalter), **kein** echtes Secret.

## Akzeptanzkriterien
- [x] GIVEN ein Entwickler öffnet `.env.example` WHEN er nach dem Anthropic-Key sucht
      THEN findet er `ANTHROPIC_API_KEY` mit Erklärung (Herkunft, server-only, Vercel).
- [x] GIVEN das committete Template WHEN es eingecheckt wird THEN steht dort **kein**
      echter Key-Wert, nur ein auskommentierter Platzhalter (`sk-ant-...`).
- [x] GIVEN der Hinweis zur Client-Sichtbarkeit WHEN dokumentiert THEN ist explizit
      vermerkt, dass **kein** `NEXT_PUBLIC_`-Präfix verwendet werden darf.

## Technische Notizen
- Nur `.env.example` geändert (gitignored: `.env*` außer `.example`). Die echten Werte
  trägt der Nutzer selbst in `.env.local` bzw. auf Vercel ein.
- Aktuell nutzt kein Code den Key (kein `@anthropic-ai`-Paket) → Platzhalter bewusst
  auskommentiert und als „optional" markiert.

## Offene Fragen
- Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/86-anthropic-api-key-in-env-vorlage-dokumentieren`
Erstellt: 2026-07-12 17:42
