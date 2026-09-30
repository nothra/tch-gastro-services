# Review: Task 368

Diff-Basis: `git diff origin/main...HEAD` (5 Commits, 36 Dateien). Gates in dieser Session:
`bash scripts/checks/pre-commit.sh` grün (inkl. `pnpm lint` mit aktivem Farb-Gate),
`pnpm vitest run app/components/ui eslint app/login app/verwaltung/katalog` → 22 Dateien,
278 Tests grün.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] **W1** [eslint/no-raw-color-classes.mjs:12-44] **Das Farb-Gate hat Lücken gegenüber dem
  installierten Tailwind 4.3.3.** Per Wegwerf-Probe gegen das echte Gate (`ESLint.lintText`,
  `filePath: app/login/page.tsx`) nachgewiesen: Von
  `bg-taupe-500 text-mauve-700 border-olive-300 bg-mist-100 data-[open]:bg-red-500
  inset-shadow-red-500 inset-ring-red-500 drop-shadow-red-500 text-shadow-red-500 !bg-red-500
  bg-red-500` meldet die Regel **nur** `bg-red-500`. Alle anderen erzeugt Tailwind als echte,
  rohe Farben. Es gibt drei Ursachen:
  1. `PALETTE_COLORS` fehlen die Paletten `mauve`, `mist`, `olive`, `taupe`. Sie stehen in
     `node_modules/tailwindcss/theme.css`.
  2. `COLOR_UTILITY` fehlen `inset-shadow`, `inset-ring`, `drop-shadow` und `text-shadow`.
  3. `VARIANT_PREFIX` (`[a-z0-9-]+:`) lässt keine Arbitrary-/Daten-Varianten zu
     (`data-[…]:`, `aria-[…]:`, `[&>*]:`), keine benannten Gruppen (`group-hover/item:`), keine
     Container-Queries (`@sm:`) und kein führendes `!` (in v4 noch unterstützt).

  ADR-052 D3 verspricht „beliebige Varianten-Präfixe", AK6.1 verlangt die Erkennung „auch mit
  Präfix". Damit liegt der Fund im Scope.
  **Fix:** Palette und Utilities ergänzen, das Präfix-Muster auf beliebige Nicht-Leerzeichen bis
  zum letzten `:` außerhalb von `[…]` erweitern und ein optionales führendes `!` zulassen.
  Je Form einen `invalid`-Fall in `no-raw-color-classes.test.ts` anlegen. Dazu einen
  **Drift-Test**, der die Palettennamen aus `node_modules/tailwindcss/theme.css`
  (`--color-<name>-500`) liest und gegen `PALETTE_COLORS` prüft. Sonst öffnet der nächste
  Tailwind-Bump die Lücke still wieder (Lesson #214: Kopplungs-Guard mit Negativtest je Seite).
  Die Utility-Liste in ADR-052 D3 im selben PR nachziehen (Lesson #211).

- [ ] **W2** [tasks/task-368-…md, AK5.3 · PR #378] **Der AK5.3-Nachweis ist abgehakt, aber
  nicht geliefert.** AK5.3 verlangt einen „Nachweis per Screenshot in der Task-Datei/PR". Die
  12 Screenshots liegen nur lokal und gitignoret unter `test-results/ux368/`. Der PR-Body ist
  noch der Standard-Draft (`Closes #368` + Titel). Lesson #233: Ein AK mit Pflichtinhalt im PR
  füllt der Draft-Body nicht automatisch.
  **Fix:** Die Screenshots vor dem Merge an PR #378 anhängen (hell/dunkel × Login leer/Fehler,
  Katalog, Bearbeiten, Dialog), dazu eine kurze Nachweis-Zusammenfassung (kein horizontaler
  Scroll, `scrollWidth − clientWidth = 0`). Stichprobe `dark-5-katalog-bearbeiten.png`
  gesichtet: Die Darstellung ist in Ordnung, es fehlt nur die Ablage.

## Nitpicks (optional)

- [ ] **N1** [app/globals.css:1-57] Kein `color-scheme: light dark` auf `:root`. Native Teile
  (Auswahl-Popup von `<select>`, Zahlen-Spinner, Radio-Rahmen, Scrollbalken, UA-Farben von
  `<dialog>`) bleiben deshalb im Dunkelmodus hell. Eine Zeile behebt das.
- [ ] **N2** [app/components/ui/tokens.test.ts:52-76] Die Hover-Paare, die die Buttons wirklich
  rendern (`on-accent`/`accent-hover`, `on-danger`/`danger-hover`), fehlen in `TEXT_PAIRS`.
  Heute liegen sie weit über 4,5 : 1, sind aber gegen künftige Farbänderungen nicht abgesichert.
  `accent` auf `surface`/`background` steht in `NON_TEXT_PAIRS` doppelt: Das 4,5-Paar schließt 3 : 1 schon ein.
- [ ] **N3** [app/components/ui/Button.test.tsx:61-65] `should_markDisabledOptically_when_disabled`
  ist tautologisch. `disabled:` steht in `BASE_CLASSES` und damit auf jedem Button. Der Test
  bliebe auch ohne `disabled`-Prop grün. Entweder `toBeDisabled()` zusätzlich prüfen oder den
  Test als „Klassen-Kontrakt" benennen.
- [ ] **N4** [app/components/ui/Button.tsx:13-18] Ein deaktivierter Button zeigt weiter die
  Hover-Farbe (`hover:bg-accent-hover` o. ä.). Mit `enabled:hover:` bliebe der
  Deaktiviert-Zustand eindeutiger (AK2.2).
- [ ] **N5** [app/components/ui/Field.tsx:79,97] Ein vom Konsumenten übergebenes
  `aria-describedby`/`aria-invalid` wird von `{...control}` still überschrieben. Heute nutzt es
  niemand. Bei Bedarf sollte der eigene Wert mit `describedBy` zusammengeführt werden, statt verloren zu gehen.
- [ ] **N6** [app/verwaltung/katalog/CatalogRow.tsx:38] `opacity-60` auf inaktiven Zeilen drückt
  auch das neue `Badge` und `text-muted` unter AA. Das Verhalten gab es schon vorher. Mit den
  Tokens wäre es ein Kandidat für einen gedämpften Token-Ton statt Deckkraft (ggf. in #369–#374).

## Positives

- Sauberer, schlanker Baustein-Satz ohne neue Abhängigkeit. Alle Bausteine sind route-neutral
  (nur `react`/`next/link`), die Varianten stehen als typisierte `Record`-Tabellen
  (ADR-052 D1 eingehalten).
- Der Kontrastnachweis ist **ausführbar**: `tokens.test.ts` liest `globals.css` und rechnet die
  WCAG-Formel nach, statt Werte zu duplizieren. Der Dunkel-Block muss jedes Token explizit
  setzen (AK1.2).
- `buttonClasses()` wird von `Button` und `ButtonLink` geteilt: ein Klassenstring, der Link
  bleibt semantisch ein Link (AK2.3). Der Default `type="button"` hat einen Formular-Test (AK2.4).
- Das Farb-Gate ist verhaltensbasiert getestet: gelistet/nicht gelistet mit ähnlichem
  Nachbarpfad `app/verwaltung/teilnehmer/`, Test-Datei-Ausnahme, fail-closed-Loader mit
  explizitem `repoRoot` (Lessons #172/#297). Das Aufwärmen in `beforeAll` folgt #238.
- `CatalogModal` zieht drei wortgleich kopierte Dialog-Hüllen zusammen. `Notice` rendert ohne
  Inhalt nichts, damit entsteht kein leerer `role="alert"` (Fehlerszenario).
- Die AK5.2-Falle (fremder Dev-Server über `reuseExistingServer`) wurde erkannt und sauber
  gegen den eigenen Worktree-Server wiederholt. ADR-052 steht auf `Accepted`, ADR-014 und
  `PROJECT-CONTEXT.md` sind mitgepflegt. Es gibt keine Routen-Änderung, `docs/routes.md` bleibt also korrekt unberührt.

## Empfehlung

NEEDS_REWORK
