# Task 403: bausteine-listenzeile-aufklapper-veranstaltungsliste

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Zwei route-neutrale Bausteine `Aufklapper` und `ListenZeile` unter `app/components/ui/` und
Umstellung der Konsumenten aus Issue #403. Spec: [spec-403](../docs/specs/spec-403-bausteine-listenzeile-aufklapper.md).

## Akzeptanzkriterien
Volltext (GIVEN/WHEN/THEN) in der Spec; hier die Gliederung:
- [x] AK1.1, AK1.3–AK1.7 – Baustein Aufklapper (eigener Pfeil, Zähler, Anzeigen/Ausblenden,
      Tastatur, Token-Farben) – Unit-Tests
- [ ] AK1.2 (Pfeil dreht) – nur im Browser belegbar, hängt an der Playwright-Checkbox unten
- [x] AK2.1–AK2.8 – Baustein ListenZeile (Karte, Hover, Varianten Link/Zeilenaktion, verblasst + Badge)
- [x] AK3.1–AK3.6 – `/veranstaltung`: Offen aufgeklappt, Abgeschlossen zu, verblasste Zeilen mit Badge
- [x] AK4.1–AK4.4 – Startseite, Arbeitsschritt-Kacheln, Detail-Teilnehmer (`ZeileRow`) nutzen ListenZeile
- [x] AK5.1–AK5.4 – Kassieren/Verzehr-Aufschlüsselung nutzen Aufklapper; beide Dateien im Farb-Gate
- [x] F3 – Kontrast der verblassten Zeile (tokens.test.ts, hell + dunkel, Karte + Hover-Fläche)
- [ ] F1/F2/F4 + Browser-Beleg AK1.2/AK1.3 – Playwright `e2e/bausteine-listenzeile-aufklapper.spec.ts`
      (geschrieben, Lauf ausstehend: braucht lokale DB + `.env.local` per `dotenv`, Freigabe durch
      den Menschen – siehe Notiz unten)

## Technische Notizen
Entscheidungen: [ADR-059](../docs/adr/059-bausteine-listenzeile-aufklapper.md) (Nachtrag in ADR-052 D1).

Hinweise für `/implement`:
- `ListenZeile.tsx`/`Aufklapper.tsx` je mit Test unter `app/components/ui/` (Server Components,
  kein `"use client"`). Props siehe ADR-059 D1/D2. Pfeil-Symbol als Inline-SVG in `icons.tsx`.
- `ListenZeile` rendert `<li>`; Link füllt die Karte, `aktion`-Slot ist **Geschwister** des
  Links (nie darin). Ohne `aktion` Pfeil rechts, mit `aktion` kein Pfeil. `prefetch` durchreichen.
- Verblasst (D3): `opacity-60` nur auf Textblock+Pfeil, Badge unberührt, Untertitel
  `text-foreground`. Kontrast-Test mit der vorhandenen Funktion in `tokens.test.ts` ergänzen.
- *(überholt: Gruppe heißt jetzt `group/aufklapper`, siehe Rework-Notizen)*
  `Aufklapper`: `<details className="group">`, Hinweis zweigeteilt per `group-open:hidden` /
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

### Notizen aus `/implement` (2026-10-09)
- **Hover/Fokus der Karte** über `hover:`/`focus-within:` am `<li>` – damit hebt auch ein fokussierter
  ⋯-Knopf die Zeile hervor (gleiche „gemeint"-Sprache); der Fokusring sitzt am Link.
- **Untertitel als `ReactNode`**: die Kacheln reichen die Kennzahl mit `tabular-nums` durch (AK4.2
  „unverändert"); Veranstaltungslisten übergeben Text.
- **Kontrast-Test (D3)** rechnet `foreground` unter `opacity-60` auf `surface` **und**
  `accent-subtle` (Hover-Fläche, hell ≈ 4,6 : 1 – knapp) in beiden Themes; eine Gegenprobe belegt,
  dass `muted` unter `opacity-60` durchfiele (sonst wäre die Abweichung von AK2.5 unnötig).
- **Glossar** um die Abgrenzung „Ausblenden (Ansicht) ↔ deaktivieren (Objekt)" und die
  Badge-Schreibweise ergänzt – die Verb-Tabelle führte „ausblenden" als *Nicht verwenden*.
- *(überholt durch Rework W2: Rahmen/Fläche kommen jetzt von `Card`)* **Kassieren „Abrechnung im
  Detail"**: Rahmen/Fläche/`px-4` am `<details>` (Aufklapper-`className`), Trennlinie zum Inhalt
  jetzt eingerückt statt randbündig.
- **Wegwerf-Datei** `scripts/format403.tmp.sh` (Prettier-Aufruf, gitignoret) liegt noch im
  Worktree – `rm` war in der Session nicht freigegeben; bitte von Hand löschen.

### Notizen aus dem Rework nach Review-Iteration 1 (2026-10-09)
- **K1:** E2E prüft den Pfeil jetzt per `toHaveCSS("rotate", "90deg" | "none")` (Tailwind v4 nutzt
  die Eigenschaft `rotate`, nicht `transform`); `toHaveCSS` wiederholt bis zum Ende der Transition.
  Lauf weiterhin ausstehend (siehe AK-Checkbox).
- **W1:** `border-line-subtle` bleibt (AK2.1) – als begründete Ausnahme zu ADR-052 D2 in ADR-059 D1
  festgehalten, ADR-052-Nachtrag und AK2.1 verweisen darauf.
- **W2:** „Abrechnung im Detail" liegt in `Card` (`py-0`, das `<summary>` bringt die Tipp-Höhe mit);
  die Verzehr-Aufschlüsselung dämpft nur ihren Inhalt. Aufklapper-JSDoc geschärft. Tests belegen
  „keine Farbklassen am `<details>`".
- **W3:** Tests für leeren `aktion`-Slot (ListenZeile, `false`/`null`) und `ZeileRow` mit
  `editable={false}`/`true` (Pfeil ja/nein, Aktions-Container ja/nein); Mutationsbeleg
  `zeigtPfeil = pfeil` → `should_showNoArrow_when_editable` rot.
- **Nitpicks umgesetzt:** einheitliche Leer-Prüfung `hatInhalt` (Untertitel, Zustand, Aktion);
  benannte Gruppe `group/aufklapper` (schützt nur vor fremden `.group`-Vorfahren – Korrektur
  siehe Rework Iteration 2); Hinweis `aria-hidden`;
  ADR-059-Drift (`h-full`, „Vier Listen-Markups", Hover-Kontrast in D3, `focus-within`-Mechanik);
  Spec Q2–Q5 abgehakt; Glossar-Badge-Regel auf Zustands-Badges eingegrenzt; Kontrast-Tests je
  Theme getrennt, Gegenprobe `muted` in beiden Themes; Kopfkommentar neu umbrochen.
- **Nitpick bewusst nicht umgesetzt:** Kachel-Ausrichtung (`items-center` statt oben). Bei
  gleich hohen Kacheln ist mittig ausgerichteter Text optisch ruhig; Oben-Ausrichtung bräuchte eine
  Layout-Variante im Baustein nur für diesen Konsumenten (YAGNI). Im Browser-Lauf mit ansehen.
- **Wegwerf-Datei** `scripts/format403.tmp.sh` liegt weiter im Worktree – `rm` auch in dieser
  Session nicht freigegeben; bitte von Hand löschen.

### Notizen aus dem Rework nach Review-Iteration 2 (2026-10-09)
- **W1:** Wirkungsbehauptung korrigiert statt Selektor umgebaut – heute verschachtelt kein
  Konsument (YAGNI). ADR-059 D2, Aufklapper-Kopfkommentar und Testname
  (`should_useOnlyNamedGroupVariant_when_rendered`) sagen jetzt: Name schützt vor fremden
  `.group`-Vorfahren, **nicht** vor verschachtelten Aufklappern → „Aufklapper nicht
  verschachteln"; bei Bedarf Selektor per Kind-Kombinator binden + Browser-Test.
- **W2:** Nachtrag in ADR-055 D4 (dritter Verbraucher erreicht → ADR-059 D2), ADR-055 in
  ADR-059 „Bezug zu anderen ADRs".
- **W3:** ADR-059 D1 begründet `line-subtle` auch für die pfeillosen Kacheln (Text-Link, `nav`,
  Kennzahl; einheitlicher Kartenrand); Kopfkommentar `ListenZeile.tsx` angeglichen.
- **W4:** AK1.2 aus der abgehakten AK1-Zeile herausgelöst – hängt jetzt sichtbar am offenen
  Playwright-Lauf. Lauf weiter ausstehend (Freigabe des Menschen: lokale DB, `.env.local`,
  eigener Port, `localhost`); Tipp-Höhe „Abrechnung im Detail" dabei mit ansehen.
- **Nitpicks umgesetzt:** D3-Kontrastwerte angeglichen (4,7/6,5, dunkel Hover 5,4) und
  Planungsform entfernt; `group-open:` → `group-open/aufklapper:` in ADR-059 + E2E-Kopf;
  ADR-052 D2 mit Querverweis auf die Ausnahme; `hatInhalt`-JSDoc dokumentiert `0` als Inhalt;
  `$label`-Objektzeilen in `ListenZeile.test.tsx`; `toHaveLength`-Herleitungen kommentiert;
  `VERBLASST_OPACITY` aus der exportierten `VERBLASST_CLASS` gelesen (+ Test für den Parser);
  Fokusring per `toHaveCSS("outline-style", "solid")`; Kommentarzeile umbrochen; überholte
  Notizen markiert.
- **Wegwerf-Dateien** `scripts/format403.tmp.sh`, `scripts/review403.tmp.sh` (gitignoret) –
  vor dem Merge von Hand löschen.

## Offene Fragen
Q1–Q5 sind in `/architecture` entschieden (Spec-Abschnitt „Offene Fragen", ADR-059 D5).

## Review-Findings
<!-- Wird durch /review befüllt -->
- **Iteration 1 (2026-10-09): NEEDS_REWORK** – [review-403.md](review-403.md): 1 kritisch
  (E2E prüft `transform` statt Tailwind-v4-`rotate` → AK1.2-Beleg rot/aussagelos), 4 wichtig
  (`border-line-subtle` vs. ADR-052 D2; Farb-Token per `className` an den Aufklapper; Pfeil der
  schreibgeschützten `ZeileRow` ungetestet; E2E-Lauf ausstehend), 11 Nitpicks.
  → Rework: K1, W1–W3 und 9 Nitpicks behoben, 1 Nitpick begründet abgelehnt, E2E-Lauf offen
  (Notizen oben).
- **Iteration 2 (2026-10-09): NEEDS_REWORK** – [review-403.md](review-403.md): 0 kritisch, 4 wichtig
  (benannte Gruppe verhindert Mitdrehen verschachtelter Aufklapper **nicht** – ADR/Kommentar/
  Testname behaupten es; ADR-055 D4 „kein neuer Baustein" nicht nachgezogen; `line-subtle`-
  Begründung „Titel und Pfeil" trägt nicht für die pfeillosen Kacheln; E2E-Lauf weiter offen,
  braucht Freigabe des Menschen), 12 Nitpicks. Iteration-1-Befunde K1, W1–W3 bestätigt behoben.
  → Rework: W1–W3 und alle Nitpicks behoben, W4 (E2E-Lauf) weiter offen (Notizen oben).
- **Iteration 3 (2026-10-09): APPROVED, Circuit Breaker** – [review-403.md](review-403.md):
  0 kritisch, 1 wichtig, 2 Nitpicks. Iteration-2-Befunde W1–W3 und alle Nitpicks sind bestätigt
  behoben. Gates grün: Vitest (942 Tests in `app/components/ui` + `app/veranstaltung`), Lint,
  Prettier, `tsc`. Der einzige offene Punkt ist der Playwright-Lauf. Er ist an den Menschen
  eskaliert und **Vor-Merge-Bedingung** (AK1.2 und die Playwright-Checkbox bleiben bis dahin
  offen). Nitpicks: Kurzzeile in ADR-059 „Konsequenzen"; Wegwerf-Dateien `scripts/*403.tmp.sh`.

## Test-Notizen (`/test`, 2026-10-09)
- Vitest gesamt: 1621 grün, 112 DB-Tests übersprungen (ohne dotenv, bekannt); Lint grün.
- Coverage der Task-Dateien (`Aufklapper`, `ListenZeile`, `icons`, Konsumenten): 100 %
  Stmts/Branch/Funcs/Lines – keine davon steht unter den <100-%-Zeilen des Reports.
  Gesamt 95,8 % ≥ 80 %.
- Keine Testlücke gegenüber den AK gefunden: keine neuen Tests, kein Produktionscode geändert.
- **Weiterhin offen (Mensch, Vor-Merge):** Playwright-Lauf
  `e2e/bausteine-listenzeile-aufklapper.spec.ts` (AK1.2, F1/F2/F4) – braucht lokale DB +
  `.env.local`; Wegwerf-Dateien `scripts/*403.tmp.sh` von Hand löschen.

## Refactoring-Notizen (`/refactor`, 2026-10-09)
- Diff gegen `origin/main` nach der Checkliste geprüft (Naming, SRP, Duplikation, Magic Strings,
  Kommentare = WHY): kein Befund, der eine Änderung rechtfertigt. `hatInhalt` und
  `VERBLASST_CLASS` sind bereits extrahiert; die zwei Pfeil-Wrapper-Klassen (`Aufklapper`,
  `ListenZeile`) unterscheiden sich in Farbe/Drehung – Zusammenlegen wäre Over-Engineering.
- Kein Code geändert; Vitest (942 in `app/components/ui` + `app/veranstaltung`), ESLint und `tsc`
  unverändert grün.

## Security-Notizen (`/security-review`, 2026-10-09)
- **PASSED** – [security-403.md](security-403.md): 0 kritisch, 0 wichtig. Reiner UI-Umbau ohne
  Server Action, Route Handler, Data-Layer- oder Dependency-Änderung. XSS (nur React-Escaping,
  Überschrift-Ebene als Literal-Union), Link-Ziele, `editable`-Gate und `prefetch={false}` geprüft.
  Einziger Hinweis: Wegwerf-Dateien `scripts/*403.tmp.sh` + `tasks/telemetry-raw-403-*.tmp.txt`
  (gitignoret) von Hand löschen.

## Codify-Notizen
- 2 Lessons + 2 Index-Zeilen (Details: [codify-403.md](codify-403.md)): Opt-in-E2E nie gelaufen /
  Tailwind-v4-`rotate` (`testing.md`); Rezidiv „X schützt vor Y" bei benannter Tailwind-Gruppe (`code-style.md`).
- Offen für den Menschen (Vor-Merge): Playwright-Lauf AK1.2/F1/F2/F4, Wegwerf-Dateien `scripts/*403.tmp.sh` und
  `tasks/telemetry-raw-403-*.tmp.txt` löschen. „Fertig / PR erstellt" bleibt deshalb offen.

---
Branch: `feature/403-bausteine-listenzeile-aufklapper-veranstaltungsliste`
Erstellt: 2026-10-09 14:39
