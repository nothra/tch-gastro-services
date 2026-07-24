# Review: Task 221

Multi-Persona-Review (3 Runden: Korrektheit/AC · Code-Qualität · Architektur/Patterns) des Branches
`docs/221-bedienungsanleitung-veranstalter`. Diff-Scope: nur #221-Dateien (Anleitung, 12 Bilder,
PDF, Capture-Spec, Spec/Task) – keine Fremd-PRs, kein App-Code, keine Routen berührt.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [x] **[docs/anleitung/veranstalter/anleitung.md:229-247] PDF-Erzeugungsweg ≠ committetes Artefakt (AC4).**
  Dokumentiert ist der manuelle Browser-Druck (VS-Code-Markdown-Vorschau bzw. GitHub → Drucken); das
  committete `anleitung.pdf` (A4, 12,5 pt, gerahmte Screenshots) entstand aber über ein Chromium-Skript
  mit eigener Print-CSS, das **nicht** im Repo liegt. Folgen: (a) Wer der Doku folgt, erhält ein
  optisch/umbruchmäßig anderes PDF (ohne die versprochenen Rahmen/Farben aus AC7); (b) der als
  Alternative genannte **GitHub-Druck rendert die relativen `bilder/…`-Pfade nicht** → PDF ohne
  Screenshots. AC4 („so dokumentiert, dass er wiederholbar ist") ist damit nur formal erfüllt.
  → Entweder den tatsächlich genutzten Generator (Konverter + Print-CSS) als kleines Skript ins Repo
  aufnehmen und dokumentieren, **oder** die Doku ehrlich herunterstufen (VS-Code-Vorschau als
  einziger Weg, GitHub-Alternative streichen, kein Rahmen-/Farb-Versprechen) und das PDF passend dazu
  neu erzeugen. (Runde 1 §1, Runde 3 §1 – Konsens)

- [x] **[e2e/anleitung-veranstalter.spec.ts:145] Brüchiger Selektor `row.locator("form > span")` mit Strict-Mode-Risiko.**
  Die `MengeControl`-`<form>` hat je nach State **zwei** direkte `<span>`-Kinder (Menge + Fehler-Span,
  `MengeControl.tsx:48,59`). Im Fehlerfall trifft der Selektor zwei Elemente → Strict-Mode-Verletzung.
  Im Happy-Path der Capture greift es zufällig, ist aber fragil. → `.first()` anhängen (Menge-Span steht
  im DOM vor dem Fehler-Span) oder über ein stabileres Merkmal selektieren. (Runde 2 §1)

- [x] **[e2e/anleitung-veranstalter.spec.ts:38-42] Irreführender Funktionsname `login()`.**
  Die Funktion füllt nur E-Mail/Passwort, klickt aber **nicht** „Anmelden" (Klick erst in Z. 184 nach
  dem Screenshot). `clean-code.md` verbietet irreführende Namen explizit. → Umbenennen, z. B.
  `fillLoginForm`/`zugangsdatenEingeben`. (Runde 2 §3)

## Nitpicks (optional)

- [ ] **[e2e/anleitung-veranstalter.spec.ts:142] `locator("li.justify-between")`** koppelt an eine
  Tailwind-Layout-Utility (auch in `ZeileRow`/`AuslageRow`). Funktioniert, ist aber brüchiger als der
  Rest der Suite (sonst durchgängig rollen-/aria-basiert). (Runde 2 §1, Runde 3 §3)
- [ ] **[e2e/anleitung-veranstalter.spec.ts:158] `page.locator("li").filter(...).first()`** – generischer
  `li`-Selektor; `.first()` maskiert, dass genau ein Treffer erwartet wird (funktioniert nur, weil Namen
  eindeutig sind). Sauberer: `getByRole("listitem")` ohne stilles `.first()`. (Runde 2 §2)
- [ ] **[e2e/anleitung-veranstalter.spec.ts:246-262] Keine Assertion auf die Geldbeträge.** Der „E2E-Smoke"
  prüft nur „bezahlt"/„Offene Zeilen: 0", nie die Fachlogik-Ausgabe (Spende 0,50 €, Kassenveränderung).
  Eine gezielte Betrags-Assertion würde echten Regressionsschutz statt „klickt durch" liefern. (Runde 2 §5)
- [ ] **[e2e/anleitung-veranstalter.spec.ts:210-248] Ablauf-Werte als verstreute Inline-Strings** (Walk-in-Name,
  Verzehr-Mengen, Auslage/Kassier-Beträge) – Katalog/Teilnehmer sind vorbildlich als `const` extrahiert, die
  fachlich verknüpften Beträge nicht. (Runde 2 §4)
- [ ] **[docs/anleitung/veranstalter/anleitung.md:148,163] Feld-Labels leicht ungenau:** „Betrag"/„Erhalten"
  statt der realen „Betrag (EUR)"/„Erhalten (EUR)". (Runde 1 §4)
- [ ] **[e2e/anleitung-veranstalter.spec.ts:182-183] Login-Screenshot zeigt die ausgefüllte Seed-E-Mail.**
  `admin@tch.example` ist eine reservierte Dummy-Adresse (kein echtes Leak); wer echte Adressen seedet,
  sollte den Shot vor dem Befüllen aufnehmen. (Runde 1 §3)
- [ ] **[e2e/anleitung-veranstalter.spec.ts:51] Magic Number `scrollBy(0, -12)`** ohne WHY-Kommentar
  (Header-Offset?); analog Viewport/`deviceScaleFactor` (ein „iPhone-Portrait, Retina"-Kommentar würde
  die Absicht festhalten). (Runde 2 §6)

## Positives

- **AC-Abdeckung vollständig (Runde 1):** 7 Schritte in korrekter Reihenfolge, je ≥1 Screenshot (alle 12
  PNGs vorhanden + referenziert), durchgängig „Was tue ich?/Was passiert?", Glossar mit allen 6 Begriffen,
  Selbstbedienungs-Hinweis im Verzehr-Schritt, F1 (falsche Rolle) doppelt, F2 (Stand + „Bilder aktualisieren").
- **Fachlich korrekt gegen die Domäne:** „Auslage mindert den Verzehr nicht", Spende = Erhalten − Verzehr-Gesamt,
  erstattete Auslage senkt die Kassenveränderung – deckt sich mit PROJECT-CONTEXT. Kein fachlicher Fehler.
- **Capture-Spec überdurchschnittlich sauber:** eindeutige Neu-Identifikation der Veranstaltung per href-Diff
  mit Count-Wait, deterministische Waits statt `sleep` (`toHaveValue("")`, wachsende Listen-Zählung, Badge
  „bezahlt", „Offene Zeilen: 0") statt der stehenbleibenden Toast-Meldung, zweistufiger Auslagen-Vorgang mit
  Gegenprobe. Sehr gute WHY-Kommentare. Assertions nicht tautologisch.
- **Sauber ins Bestehende eingepasst:** Login-/`SEED_ADMIN_*`-Muster wie `auth.spec.ts`/`navigation.spec.ts`,
  respektiert `baseURL`/`reuseExistingServer`. **Kein Leak in den Unit-Lauf** (`vitest.config.ts` `exclude: e2e/**`
  + `.spec.ts` außerhalb des `*.test.*`-Include). **Kein Verschmutzen von `pnpm test:e2e`** (Describe-Skip
  `CAPTURE_ANLEITUNG` greift zur Collection-Zeit → nur „skipped", keine Daten/Bilder).
- **ADR-Verzicht korrekt** (reine Doku-Task, keine Technologie-/Muster-Entscheidung); `.gitignore` deckt
  `test-results`/`playwright-report`/`.env*` ab; Ablage `docs/anleitung/veranstalter/` erweiterbar.
- **Geprüft & unkritisch:** `locator("form").filter({has: getByLabel("Bezeichnung")})` (spec:102) ist
  eindeutig – das zweite Formular „Stehende Theke" hat kein „Bezeichnung"-Feld (nur „Kasse"); der Capture-Lauf
  bestätigt es (keine Strict-Mode-Verletzung).

## Rework (Runde 1 – erledigt)

Auf Basis der Nutzer-Entscheidung (PDF-Option **B** „Doku ehrlich herunterstufen"; Umfang „Wichtig +
sinnvolle Nitpicks") umgesetzt:

- **#1 (AC4/PDF):** `anleitung.md` – GitHub-Alternative entfernt, „Farben/Rahmen"-Versprechen gestrichen,
  ehrlicher Hinweis ergänzt (Aussehen abhängig vom druckenden Programm; Inhalt/Screenshots identisch;
  GitHub-Ausdruck ohne lokale Bilder). Committetes PDF neu erzeugt mit schlichterer, generischer
  Markdown-Optik (Bild-Rahmen entfernt, Blockquote neutralgrau) → näher am dokumentierten Vorschau-Druck.
- **#2 (Selektor):** `form > span` → `.first()`; zusätzlich `li.justify-between` durch layout-klassen-freien
  Selektor ersetzt (`li` mit Artikeltext + „Menge erhöhen"-Button, `.last()` = Positionszeile).
- **#3 (`login()`):** umbenannt in `fillLoginForm`; Login-Screenshot (`01`) nun vom **leeren** Formular
  (keine Zugangsdaten im Bild) → deckt zugleich den Nitpick „Login-Shot ohne Zugangsdaten" ab.
- **Nitpicks erledigt:** `li.justify-between` (s. o.), `(EUR)`-Labels in `anleitung.md`, `kassiere` nutzt
  jetzt `getByRole("listitem")`.
- **Bewusst offen gelassen** (Umfang): Betrags-Assertions im Capture, Bündelung der Ablauf-Beträge als
  `const`, `scrollBy(-12)`-Kommentar.

Capture erneut grün; alle 12 Screenshots + PDF regeneriert.

## Empfehlung

~~NEEDS_REWORK~~ → **APPROVED** (nach Rework-Runde 1; WICHTIG-Findings behoben, verbleibende Nitpicks bewusst zurückgestellt)

> Kein KRITISCH-Finding; die Anleitung selbst ist inhaltlich vollständig und fachlich korrekt. Die drei
> WICHTIG-Punkte sind aber schnell behebbar und einer (PDF-Reproduzierbarkeit) betrifft direkt AC4 – daher
> eine kurze Rework-Runde vor Approval. Empfohlener Rework-Umfang: die 3 WICHTIG-Findings; Nitpicks nach
> Ermessen (v. a. `li.justify-between` .first()/Robustheit und die „(EUR)"-Labels bieten sich mit an).
