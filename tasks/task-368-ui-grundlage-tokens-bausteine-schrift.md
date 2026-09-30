# Task 368: ui-grundlage-tokens-bausteine-schrift

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Gemeinsame UI-Grundlage für die UX-Überarbeitung (UX-1): semantische Farb-Tokens (hell/dunkel),
sechs Bausteine (`Button`, `Field`, `Card`, `Badge`, `Notice`, `PageHeader`), Geist als echte
Schrift, Typo-Skala, `tabular-nums` für Beträge. Nachweis durch Umstellung von Login und
`app/verwaltung/katalog/**`, abgesichert durch ein Farb-Gate gegen rohe Tailwind-Farbklassen.

Spec: [`docs/specs/spec-368-ui-grundlage.md`](../docs/specs/spec-368-ui-grundlage.md) ·
ADR-Trigger → `/architecture` vor `/implement`.

## Akzeptanzkriterien
<!-- Volltext GIVEN/WHEN/THEN in der Spec -->
- [ ] AK1.1 Semantische Farb-Tokens als Tailwind-Klassen (Akzent, Fläche, Linie, Text, gedämpft, Gefahr, Erfolg, Warnung)
- [ ] AK1.2 Tokens folgen Hell-/Dunkelmodus des Geräts ohne `dark:` in Seiten
- [ ] AK1.3 Kontrast WCAG AA in hell und dunkel (Text 4,5:1, Linie/Fokus 3:1)
- [ ] AK1.4 Akzent bleibt Vereins-Cyan, kein `blue-*` mehr als Akzent
- [ ] AK2.1 Button: Varianten primary/secondary/danger/ghost, alle Größen ≥ 44 px
- [ ] AK2.2 Button: disabled, sichtbarer Fokus, Hover je Variante
- [ ] AK2.3 Button-Stil für Navigation ist semantisch ein Link
- [ ] AK2.4 Button ohne Typ löst Formular nicht ungewollt aus
- [ ] AK2.5 Field: Label per `id`, Hinweis/Fehler per `aria-describedby`
- [ ] AK2.6 Field: `aria-invalid` + Gefahr-Optik nur bei Fehler
- [ ] AK2.7 Field: Text/Passwort/Zahl/Auswahl, native Attribute durchgereicht
- [ ] AK2.8 Card: abgegrenzte Fläche hell/dunkel
- [ ] AK2.9 Badge: Töne neutral/akzent/erfolg/warnung/gefahr, Status als Text
- [ ] AK2.10 Notice: Erfolg `role="status"`, Fehler `role="alert"`
- [ ] AK2.11 PageHeader: Titel = h1, Zurück-Link/Meta/Aktion optional
- [ ] AK2.12 Bausteine vollständig getestet (100 % neuer Code)
- [ ] AK3 Geist wird angezeigt (Arial-Override entfernt)
- [ ] AK4.1 h1 > h2 > h3 > Fließtext in der Größe
- [ ] AK4.2 Beträge mit `tabular-nums`
- [ ] AK5.1 Login + `app/verwaltung/katalog/**` nutzen die Bausteine
- [ ] AK5.2 Bestehende Unit-/E2E-Tests grün, Verhalten unverändert
- [ ] AK5.3 375 px hell + dunkel durchgeklickt, Screenshots als Nachweis
- [ ] AK6.1 Farb-Gate lehnt rohe Farbklassen in gelisteten Dateien ab (mit Fundstelle)
- [ ] AK6.2 Nicht gelistete Dateien bleiben unberührt
- [ ] AK6.3 Keine Fehlalarme bei Nicht-Farb-Klassen
- [ ] AK6.4 Fail-closed bei fehlender Datei/unlesbarer Liste
- [ ] AK6.5 Positiv-/Negativtests gegen das echte Gate, POSIX-portabel
- [ ] AK6.6 Liste durch Folge-Issues erweiterbar, dokumentiert
- [ ] Fehlerszenarien aus der Spec abgedeckt

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
- [ ] → `/architecture`: shadcn/ui vs. eigene Bausteine + Ablageort (ADR)
- [ ] → `/architecture`: exakte Token-Werte + Kontrastnachweis, Hell/Dunkel-Mechanismus
- [ ] → `/architecture`: Ort/Format der Liste umgestellter Dateien, Gate-Verankerung (pre-push/CI, ADR-041/047 prüfen)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/368-ui-grundlage-tokens-bausteine-schrift`
Erstellt: 2026-09-30 21:42
