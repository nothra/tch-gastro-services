# Task 368: ui-grundlage-tokens-bausteine-schrift

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung
Gemeinsame UI-Grundlage für die UX-Überarbeitung (UX-1): semantische Farb-Tokens (hell/dunkel),
sechs Bausteine (`Button`, `Field`, `Card`, `Badge`, `Notice`, `PageHeader`), Geist als echte
Schrift, Typo-Skala, `tabular-nums` für Beträge. Nachweis durch Umstellung von Login und
`app/verwaltung/katalog/**`, abgesichert durch ein Farb-Gate gegen rohe Tailwind-Farbklassen.

Spec: [`docs/specs/spec-368-ui-grundlage.md`](../docs/specs/spec-368-ui-grundlage.md) ·
ADR-Trigger → `/architecture` vor `/implement`.

## Akzeptanzkriterien
<!-- Volltext GIVEN/WHEN/THEN in der Spec -->
- [x] AK1.1 Semantische Farb-Tokens als Tailwind-Klassen (Akzent, Fläche, Linie, Text, gedämpft, Gefahr, Erfolg, Warnung)
- [x] AK1.2 Tokens folgen Hell-/Dunkelmodus des Geräts ohne `dark:` in Seiten
- [x] AK1.3 Kontrast WCAG AA in hell und dunkel (Text 4,5:1, Linie/Fokus 3:1)
- [x] AK1.4 Akzent bleibt Vereins-Cyan, kein `blue-*` mehr als Akzent
- [x] AK2.1 Button: Varianten primary/secondary/danger/ghost, alle Größen ≥ 44 px
- [x] AK2.2 Button: disabled, sichtbarer Fokus, Hover je Variante
- [x] AK2.3 Button-Stil für Navigation ist semantisch ein Link
- [x] AK2.4 Button ohne Typ löst Formular nicht ungewollt aus
- [x] AK2.5 Field: Label per `id`, Hinweis/Fehler per `aria-describedby`
- [x] AK2.6 Field: `aria-invalid` + Gefahr-Optik nur bei Fehler
- [x] AK2.7 Field: Text/Passwort/Zahl/Auswahl, native Attribute durchgereicht
- [x] AK2.8 Card: abgegrenzte Fläche hell/dunkel
- [x] AK2.9 Badge: Töne neutral/akzent/erfolg/warnung/gefahr, Status als Text
- [x] AK2.10 Notice: Erfolg `role="status"`, Fehler `role="alert"`
- [x] AK2.11 PageHeader: Titel = h1, Zurück-Link/Meta/Aktion optional
- [x] AK2.12 Bausteine vollständig getestet (100 % neuer Code)
- [x] AK3 Geist wird angezeigt (Arial-Override entfernt)
- [x] AK4.1 h1 > h2 > h3 > Fließtext in der Größe
- [x] AK4.2 Beträge mit `tabular-nums`
- [x] AK5.1 Login + `app/verwaltung/katalog/**` nutzen die Bausteine
- [x] AK5.2 Bestehende Unit-/E2E-Tests grün, Verhalten unverändert
- [x] AK5.3 375 px hell + dunkel durchgeklickt, Screenshots als Nachweis
- [x] AK6.1 Farb-Gate lehnt rohe Farbklassen in gelisteten Dateien ab (mit Fundstelle)
- [x] AK6.2 Nicht gelistete Dateien bleiben unberührt
- [x] AK6.3 Keine Fehlalarme bei Nicht-Farb-Klassen
- [x] AK6.4 Fail-closed bei fehlender Datei/unlesbarer Liste
- [x] AK6.5 Positiv-/Negativtests gegen das echte Gate, POSIX-portabel
- [x] AK6.6 Liste durch Folge-Issues erweiterbar, dokumentiert
- [x] Fehlerszenarien aus der Spec abgedeckt

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

**Umsetzungs-Notizen (`/implement`, 2026-09-30):**

- Zusätzliches Token `overlay` (Dialog-Abdunkler in `CatalogControls.tsx`, ersetzt
  `bg-black/50`) in ADR-052 D2 nachgetragen. Es trägt keinen Text und ist deshalb kein
  Kontrastpaar. ADR-052 steht auf `Accepted`.
- `CatalogRow.tsx`/`CatalogItemForm.tsx` hatten keine Unit-Tests (0 %). Tests sind nachgezogen,
  inklusive `tabular-nums` am Preis (AK4.2). Die Regel-Zweige für Nicht-String-Literale und
  getaggte Templates mit `cooked === null` sind jetzt abgedeckt. Alle geänderten Dateien haben
  100 % Coverage. `app/login/actions.ts` (0 %) ist unverändert und nicht Teil dieses Scopes.
- **AK5.2/AK5.3 – Stolperstein:** `playwright.config.ts` nutzt `reuseExistingServer`. Der
  erste Lauf hing an einem **fremden** Dev-Server auf `:3000` (anderer Checkout, alter Stand:
  blauer Button, Arial) und war damit kein Beleg. Wiederholt gegen den Dev-Server dieses
  Worktrees (`next dev -p 3368`, `PLAYWRIGHT_BASE_URL`): E2E 10 grün, 6 opt-in übersprungen
  (brauchen `E2E_*`/`CAPTURE_ANLEITUNG`, legen Daten an). Die 375-px-Durchläufe in hell und
  dunkel liefen für Login leer/Fehler, Katalog, Inline-Bearbeitung und Umbenennen-Dialog.
  Ergebnis: kein horizontaler Scroll (`scrollWidth − clientWidth = 0`), nichts abgeschnitten,
  im Dunkeln heller Akzent mit dunklem Text. Screenshots liegen lokal unter
  `test-results/ux368/` (gitignoret) und kommen zum PR. Es wurden keine Daten angelegt.
- Der Next-Hinweis „1 Issue" während des Durchlaufs war ein Hydration-Diff nur auf
  `caret-color: transparent`. Das setzt Playwright beim Screenshot, kein Produktfehler (die
  `useId`-IDs stimmen überein).
- Den von `next dev` in `CLAUDE.md` geschriebenen `nextjs-agent-rules`-Block habe ich wieder
  entfernt (Lesson #337).

## Offene Fragen
- [x] → `/architecture` (ADR-052): shadcn/ui vs. eigene Bausteine + Ablageort (ADR)
- [x] → `/architecture` (ADR-052): exakte Token-Werte + Kontrastnachweis, Hell/Dunkel-Mechanismus
- [x] → `/architecture` (ADR-052): Ort/Format der Liste umgestellter Dateien, Gate-Verankerung (pre-push/CI, ADR-041/047 prüfen)

## Review-Findings
<!-- Wird durch /review befüllt -->

**Runde 1** ([`review-368.md`](review-368.md), NEEDS_REWORK). Rework in `/implement`:

- [x] **W1** Farb-Gate-Lücken: Paletten `mauve`/`mist`/`olive`/`taupe`, Utilities
  `inset-shadow`/`inset-ring`/`drop-shadow`/`text-shadow`, Präfixe mit `[…]`, `/name`, `@`
  sowie führendes `!` ergänzt. Je Form ein `invalid`-Fall (erst rot, dann grün). Dazu ein
  Drift-Test: Er liest die Paletten aus `tailwindcss/theme.css` und erzeugt je Palette einen
  `invalid`-Fall. Er ist fail-closed, wenn der Parser weniger als 20 findet. ADR-052 D3 ist
  nachgezogen.
- [x] **W2** AK5.3-Nachweis: Der PR-Body von #378 enthält jetzt Zusammenfassung und
  Screenshot-Tabelle. **Offen:** Die 12 PNGs aus `test-results/ux368/` müssen per Drag & Drop
  an den PR. `gh` kann keine Bilder hochladen, das muss ein Mensch machen.
- [x] **N1** `color-scheme: light dark` auf `:root`, mit Test.
- [x] **N2** Hover-Paare `on-accent`/`accent-hover` und `on-danger`/`danger-hover` stehen in
  `TEXT_PAIRS`. Das doppelte `accent`-Paar ist aus `NON_TEXT_PAIRS` entfernt.
- [x] **N3** Den tautologischen Disabled-Test habe ich als Klassen-Kontrakt umbenannt. Das
  Verhalten prüft weiter `should_beDisabledAndNotFire_when_disabled`.
- [x] **N4** Hover ist jetzt `not-disabled:hover:`. Bewusst nicht `enabled:`: `:enabled` trifft
  auf das `<a>` von `ButtonLink` nie zu und würde dort den Hover abschalten. Per
  Tailwind-Compile-Probe geprüft: Die Ausgabe ist `:not(:disabled):hover`.
- [ ] **N5** Nicht umgesetzt (optional). Heute nutzt niemand ein eigenes
  `aria-describedby`/`aria-invalid`, das Zusammenführen wäre YAGNI.
- [ ] **N6** Nicht umgesetzt. Das Verhalten gab es schon vorher. Der Reviewer ordnet es den
  Folge-Issues #369–#374 zu.

**Runde 2** ([`review-368.md`](review-368.md), NEEDS_REWORK). Rework in `/implement`:

- [x] **W3** `scripts/pr368-body.tmp.md` per `git rm` entfernt. Der Inhalt steht im PR-Body
  von #378. Die `.gitignore`-Lücke für `*.tmp.md` liegt außerhalb des Scopes (Kleinfund aus
  Runde 2).
- [x] **W2** Erledigt (Screenshots von Hand als PR-Kommentar angehängt, 2026-09-30); war **menschliche Aktion vor dem Merge**: die 12 PNGs aus
  `test-results/ux368/` als Kommentar an PR #378 anhängen. Das löst kein weiterer
  `/implement`-Lauf (Circuit Breaker).
- [x] **N7** Farb-Gate erkennt jetzt eine Ebene verschachtelter Arbitrary-Varianten
  (`[&_[data-x]]:`) und die Opazitäts-Kurzform `/(--a)`. Je Form ein `invalid`-Fall (erst rot,
  dann grün). ADR-052 D3 nachgezogen.
- [x] **N8** Test umbenannt in `should_guardHoverWithNotDisabled_when_variantIs%s`.

## Test-Notizen (`/test`, 2026-09-30)

- Coverage-Lauf über `app/components/ui/**`, `eslint/**`, `app/login/**`, `app/verwaltung/katalog/**`:
  alle geänderten/neuen Dateien 100 % (Stmts/Branch/Funcs/Lines). Einzige Lücke:
  `app/login/actions.ts` (0 %), unverändert und außerhalb des Scopes (siehe Umsetzungs-Notizen).
- Volle Suite grün: 92 Dateien, 1187 Tests; 105 DB-Tests ohne `dotenv` übersprungen (nicht
  betroffen, keine DB-Änderung). Keine neuen Tests nötig, kein Produktionscode geändert.
- Offen bleibt W2 (menschliche Aktion: PNGs an PR #378).

## Refactoring-Notizen (`/refactor`, 2026-09-30)

- Sechsfach kopiertes `[…, className].filter(Boolean).join(" ")` in `Button`, `Field`, `Card`,
  `Badge`, `Notice`, `PageHeader` zu `joinClasses()` (`app/components/ui/joinClasses.ts`, mit
  eigenem Test) zusammengezogen. Kein neues Verhalten; `app`+`eslint`-Tests (1061), Lint und
  Format grün. Sonst keine Befunde (Namen, Funktionslängen, Kommentare unauffällig).
- W2 (PNGs an PR #378) bleibt eine menschliche Aktion vor dem Merge.

## Codify-Notizen (`/codify`, 2026-09-30)

- Drei Lessons (Drift-Test für Gate-Enumeration, fremder Playwright-Dev-Server, Binär-AK am PR)
  plus Index-Zeilen; `kleinfunde.md`-Anker korrigiert (N9). Details: [`codify-368.md`](codify-368.md).
- **Offen, menschlich vor dem Merge:** W2 – 12 PNGs an PR #378.

---
Branch: `feature/368-ui-grundlage-tokens-bausteine-schrift`
Erstellt: 2026-09-30 21:42

Blocker 2026-09-30 (AUFGELÖST: Screenshots angehängt): Pipeline pausiert – APPROVAL_PENDING: W2/AK5.3: 12 Screenshots aus test-results/ux368/ muessen von Hand an PR #378 angehaengt werden (gh kann keine Bilder hochladen). Danach /pr-shepherd erneut: Draft aufloesen, Task-Datei abschliessen, Merge freigeben. (/architecture ausführen, dann Pipeline neu starten)

PR-Shepherd 2026-09-30: Screenshots (W2) angehängt; Merge freigegeben – alle Gates grün.
