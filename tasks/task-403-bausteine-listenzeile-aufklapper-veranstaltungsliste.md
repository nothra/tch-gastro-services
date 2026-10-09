# Task 403: bausteine-listenzeile-aufklapper-veranstaltungsliste

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Zwei route-neutrale Bausteine `Aufklapper` und `ListenZeile` unter `app/components/ui/` und
Umstellung der Konsumenten aus Issue #403. Spec: [spec-403](../docs/specs/spec-403-bausteine-listenzeile-aufklapper.md).

## Akzeptanzkriterien
Volltext (GIVEN/WHEN/THEN) in der Spec; hier die Gliederung:
- [ ] AK1.1–AK1.7 – Baustein Aufklapper (eigener Pfeil, Zähler, Anzeigen/Ausblenden, Tastatur, Token-Farben)
- [ ] AK2.1–AK2.8 – Baustein ListenZeile (Karte, Hover, Varianten Link/Zeilenaktion, verblasst + Badge)
- [ ] AK3.1–AK3.6 – `/veranstaltung`: Offen aufgeklappt, Abgeschlossen zu, verblasste Zeilen mit Badge
- [ ] AK4.1–AK4.4 – Startseite, Arbeitsschritt-Kacheln, Detail-Teilnehmer (`ZeileRow`) nutzen ListenZeile
- [ ] AK5.1–AK5.4 – Kassieren/Verzehr-Aufschlüsselung nutzen Aufklapper; beide Dateien im Farb-Gate
- [ ] F1–F4 – Fehlerszenarien (ohne JS, Überlänge, Kontrast, Tastatur am ⋯-Knopf)

## Technische Notizen
Entscheidungen: [ADR-059](../docs/adr/059-bausteine-listenzeile-aufklapper.md) (Nachtrag in ADR-052 D1).

Hinweise für `/implement`:
- `ListenZeile.tsx`/`Aufklapper.tsx` je mit Test unter `app/components/ui/` (Server Components,
  kein `"use client"`). Props siehe ADR-059 D1/D2. Pfeil-Symbol als Inline-SVG in `icons.tsx`.
- `ListenZeile` rendert `<li>`; Link füllt die Karte, `aktion`-Slot ist **Geschwister** des
  Links (nie darin). Ohne `aktion` Pfeil rechts, mit `aktion` kein Pfeil. `prefetch` durchreichen.
- Verblasst (D3): `opacity-60` nur auf Textblock+Pfeil, Badge unberührt, Untertitel
  `text-foreground`. Kontrast-Test mit der vorhandenen Funktion in `tokens.test.ts` ergänzen.
- `Aufklapper`: `<details className="group">`, Hinweis zweigeteilt per `group-open:hidden` /
  `hidden group-open:inline`; `ueberschrift`-Prop für `aria-labelledby`. jsdom wertet
  `group-open:` nicht aus → Funktionsbeleg per Playwright (Pfeil dreht, Hinweis wechselt,
  `localhost` statt `127.0.0.1`, eigener Dev-Server-Port – Lessons in `PROJECT-CONTEXT.md`).
- Umstellen: `VeranstaltungListe` (Offen offen/Abgeschlossen zu, `zustand="abgeschlossen"`),
  `OffeneVeranstaltungen`, `ArbeitsschrittKacheln` (`pfeil={false}`, `className="min-w-0"`),
  `ZeileRow` (`aktion={<ZeilenMenue …/>}`), `kassieren/page.tsx` „Abrechnung im Detail",
  `VerzehrAufschluesselung` (Titel „Verzehr", ohne Zähler).
- `KassierZeilenListe`: Hervorhebung `border-accent bg-accent-subtle`, normal `border-line-subtle`;
  beide Dateien in `eslint/ui-token-files.mjs` (Kommentar „bleiben außen vor" streichen).
- Doku: `docs/ux/glossar.md` prüfen („Anzeigen"/„Ausblenden", Badge „abgeschlossen"); keine
  Routen-Änderung → `docs/routes.md` unberührt.

## Offene Fragen
Q1–Q5 sind in `/architecture` entschieden (Spec-Abschnitt „Offene Fragen", ADR-059 D5).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/403-bausteine-listenzeile-aufklapper-veranstaltungsliste`
Erstellt: 2026-10-09 14:39
