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
Entscheidungen: [ADR-052](../docs/adr/052-ui-grundlage-eigene-bausteine-tokens-farb-gate.md).
Beim Umsetzen den ADR-Status auf `Accepted` setzen (Lesson aus #197).

**Implementierungs-Hinweise für `/implement`:**

1. **Tokens (`app/globals.css`):** Token-Tabelle aus ADR-052 D2 1:1 als `:root`-Variablen +
   Dark-Block + `@theme inline` (`--color-<name>: var(--<name>)`). `body`: Arial-Zeile löschen,
   Token `background`/`foreground` + `font-sans` nutzen. `@layer base` für `h1`/`h2`/`h3`.
   **Test:** `app/components/ui/tokens.test.ts` liest `globals.css`, parst beide Werte-Sätze und
   rechnet die Kontrastpaare aus ADR-052 D2 nach (WCAG-Formel). So bleibt AK1.3 bei künftigen
   Farbänderungen belegt. Zusätzlich prüfen, dass kein `Arial` mehr in `globals.css` steht (AK3).
2. **Bausteine (`app/components/ui/`):** je Datei + `*.test.tsx`. Varianten als
   `Record<…, string>` mit Token-Klassen.
   - `Button`: `variant` (`primary`|`secondary`|`danger`|`ghost`), `size` (alle `min-h-11`
     = 44 px), Default `type="button"` (AK2.4), `focus-visible:`-Ring in `accent`,
     `disabled:`-Optik, Hover je Variante. Geteilte Klassenfunktion `buttonClasses()` für
     `ButtonLink` (auf `next/link`, AK2.3). Kein zweiter Klassenstring.
   - `Field`: Label + Steuerelement + Hinweis/Fehler. `id` optional, sonst `useId()`. Vorher
     prüfen, ob `useId` in der Nutzung als Server Component funktioniert, sonst `"use client"`.
     Verknüpfung über Render-Prop oder Kind-Klon mit `id`, `aria-describedby`, `aria-invalid`
     (nur bei Fehler). Dazu `Input`/`Select`-Primitive mit dem einen Eingabe-Klassenstring
     (Rahmen `line`, nicht `line-subtle`).
   - `Card`, `Badge` (`tone`: neutral|akzent|erfolg|warnung|gefahr, Text-Kind Pflicht),
     `Notice` (`kind`: erfolg → `role="status"`, fehler → `role="alert"`, `null` bei leerem
     Inhalt), `PageHeader` (Titel = `h1`, optional `back` {href,label}, `meta`, `action`).
     `min-w-0`/`break-words` für lange Titel (Fehlerszenario 375 px).
3. **Farb-Gate:** `eslint/no-raw-color-classes.mjs` (Regel), `eslint/ui-token-files.mjs`
   (Liste + fail-closed-Loader, Kopfkommentar „so erweitern"), Block in `eslint.config.mjs`
   mit `files` aus der Liste, `ignores: ["**/*.test.*"]`. Tests in Vitest: `RuleTester`
   (valid: Token-, Nicht-Farb-Klassen, Wortgrenze; invalid: Palette, `dark:`/`hover:`-Präfix,
   `/50`, `white`/`black`, `-[#…]`, mehrzeiliges Template). `ESLint`-API mit `lintText` +
   `filePath` für gelistete vs. nicht gelistete Datei (AK6.1/AK6.2) und Loader-Test für
   fehlenden Pfad bzw. leere Liste (AK6.4). Lesson aus #172: verhaltensbasiert testen, mit
   Diskriminierungs-Kontrolle (ähnlicher Nachbarpfad, z. B. `app/verwaltung/teilnehmer/`).
4. **Umstellung:** `app/login/**` und `app/verwaltung/katalog/**` auf Bausteine, `blue-*`
   entfällt, Preise `tabular-nums`. Bestehende Tests grün halten (nur Selektoren anpassen).
   Danach `pnpm lint` grün mit aktiver Liste.
5. **Nachweis AK5.3:** lokaler Dev-Server, 375 px, hell + dunkel (`resize_window`
   colorScheme), Screenshots in PR/Task. Wegwerf-Daten mit `__test__`-Präfix und aufräumen
   (Lesson aus #346).
6. **Doku:** Keine Routen-Änderung, also kein `docs/routes.md`. `PROJECT-CONTEXT.md` →
   Tech-Stack-Zeile „shadcn/ui" auf „eigene Bausteine (`app/components/ui/`, ADR-052)"
   anpassen und unter „Projektspezifische Coding-Konventionen" eine Zeile ergänzen: neue UI
   nutzt Bausteine/Token-Klassen, umgestellte Pfade in `eslint/ui-token-files.mjs` eintragen.
   `@import`-Deckel im Blick behalten (903/1100).

## Offene Fragen
- [x] → `/architecture` (ADR-052): shadcn/ui vs. eigene Bausteine + Ablageort (ADR)
- [x] → `/architecture` (ADR-052): exakte Token-Werte + Kontrastnachweis, Hell/Dunkel-Mechanismus
- [x] → `/architecture` (ADR-052): Ort/Format der Liste umgestellter Dateien, Gate-Verankerung (pre-push/CI, ADR-041/047 prüfen)

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/368-ui-grundlage-tokens-bausteine-schrift`
Erstellt: 2026-09-30 21:42
