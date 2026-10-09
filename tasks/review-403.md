# Review: Task 403

> Iteration 2 · Diff `origin/main...HEAD` (29 Dateien, +1857/−187), Rework-Commit `c429c6a` ·
> drei Runden (Logik, Code-Qualität, Architektur) als Sub-Agenten; Kritisch-/Wichtig-Befunde im
> Orchestrator gegengeprüft – Tailwind-Ausgabe per Wegwerf-Kompilat (`tailwindcss` 4.3.3:
> `.rotate-90 { rotate: 90deg }`, `transition-transform` umfasst `rotate`, `py-0` steht nach `p-4`,
> `group-open/aufklapper:` erzeugt `:is(:where(.group\/aufklapper):is([open], …) *)`).
> Vitest/Playwright in diesem Schritt nicht ausgeführt (Review ist lesend). Iteration-1-Bericht:
> `git show 2b0925f:tasks/review-403.md`.

## Status Iteration 1
- K1 (E2E `transform` statt `rotate`) – **behoben**: `toHaveCSS("rotate", "90deg" | "none")`,
  am Kompilat bestätigt; `toHaveCSS` wiederholt bis zum Ende der Transition.
- W1 (`line-subtle`) – behoben als Ausnahme in ADR-059 D1 (Begründung lückenhaft → W3 unten).
- W2 (Farben per `className`) – **behoben**: `Card className="py-0"`, `text-muted` am Inhalt.
- W3 (Pfeil der schreibgeschützten `ZeileRow`) – **behoben**, beide Richtungen getestet.
- W4 (E2E-Lauf) – **offen** → W4 unten.
- Nitpicks: 9 behoben, Kachel-Ausrichtung begründet abgelehnt (akzeptiert), benannte Gruppe nur
  teilweise wirksam → W1 unten, `scripts/format403.tmp.sh` liegt weiter.

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [docs/adr/059-bausteine-listenzeile-aufklapper.md:77-79, app/components/ui/Aufklapper.tsx:8-10,
  app/components/ui/Aufklapper.test.tsx:37-43, tasks/task-403-…md (Rework-Notiz „benannte Gruppe")]
  Falsche Wirkungsbehauptung: „Mit dem Namen reagiert jeder Aufklapper nur auf sein eigenes
  `<details>`". Tailwind v4 erzeugt für `group-open/aufklapper:` einen **Nachfahren**-Selektor
  (`:where(.group\/aufklapper):is([open],…) *`, am Kompilat geprüft); jeder Aufklapper trägt
  dieselbe Klasse `group/aufklapper`. Ein zugeklappter Aufklapper in einem offenen dreht also
  weiterhin den Pfeil und zeigt „Ausblenden" – genau der Fall, den ADR und Kommentar ausdrücklich
  als gelöst nennen. Der Name schützt nur vor fremden, unbenannten `.group`-Vorfahren. Der Test
  `should_reactOnlyToOwnDetails_when_nestedInOtherGroup` verschachtelt nichts und belegt nur die
  Abwesenheit von `group-open:` – sein Name verspricht mehr (Lesson „X erzwingt Y", #319). Heute
  ohne Auswirkung (nichts verschachtelt), aber ADR-059 ist die Vorlage für die Folge-Issues.
  Fix: Aussage an allen Stellen auf „schützt vor fremden `.group`-Vorfahren; Aufklapper nicht
  verschachteln" korrigieren und Testnamen angleichen – **oder** Selektor an das eigene `<details>`
  binden (z. B. `in-[[open]>summary]:rotate-90` o. ä. mit direktem Kind-Kombinator) und dann einen
  echten Verschachtelungs-Beleg ergänzen.
- [ ] [docs/adr/055-kassieren-spende-live-abschluss-im-kopf.md:91-95, docs/adr/059-…md „Bezug zu
  anderen ADRs"] ADR-Drift (Lesson #211/#55): ADR-055 D4 sagt weiter „‚Abrechnung im Detail' ist
  ein natives `<details>`, **kein neuer Baustein** … ein gemeinsamer `Disclosure`-Baustein wäre
  erst bei einem dritten Verbraucher gerechtfertigt". Dieser PR führt genau diesen Baustein
  (`Aufklapper`) ein und stellt die Stelle um. Nachtrag „(#403) → ADR-059 D2" in ADR-055 D4 und
  ADR-055 in ADR-059 „Bezug zu anderen ADRs" ergänzen.
- [ ] [docs/adr/059-bausteine-listenzeile-aufklapper.md:60-64 mit
  app/veranstaltung/[id]/ArbeitsschrittKacheln.tsx:33] Die Begründung der `line-subtle`-Ausnahme
  („erkennbar ist die Zeile an Titel **und Pfeil**") trägt nicht für die Kacheln: sie laufen mit
  `pfeil={false}` und hatten vor dem PR `border-line` (Diff gegen `origin/main`). Gerade bei der
  Variante, in der der Rahmen neben dem Text das einzige Karten-Signal ist, fehlt die Begründung.
  Fix: ADR-059 D1 um die pfeillose Variante ergänzen (Text-Link, WCAG 1.4.11 gilt nicht für Text;
  Kacheln stehen im `nav` mit Kennzahl) **oder** die Abwägung bewusst anders treffen.
- [ ] [e2e/bausteine-listenzeile-aufklapper.spec.ts, tasks/task-403-…md:18,24-26] Übertrag W4:
  F1/F2/F4 und der Browser-Beleg für AK1.2/AK1.3 hängen allein an dieser Spec (nur mit
  `E2E_BAUSTEINE_403=1`, noch nie gelaufen). Zugleich ist „AK1.1–AK1.7" abgehakt, obwohl AK1.2
  (Pfeil dreht) nur im Browser belegbar ist – Checkbox Z. 18 und Z. 24 widersprechen sich. Lauf
  braucht die Freigabe des Menschen (lokale DB, `.env.local`, eigener Port, `localhost`; Lessons
  #368/#374/#370). Dabei die Tipp-Höhe von „Abrechnung im Detail" (`Card py-0`) mit ansehen.

## Nitpicks (optional)
- [ ] [docs/adr/059-…md:98,109] D3-Kontrastwerte leicht abweichend nachgerechnet (Runde 3, von Hand,
  nicht im Test): `foreground`·0,6 auf `surface` hell ≈ 4,67 (ADR 4,8), dunkel ≈ 6,46 (ADR 6,3),
  auf `accent-subtle` dunkel ≈ 5,4 (ADR „≥ 4,5"). Test prüft nur ≥ 4,5 – nur Doku angleichen.
- [ ] [docs/adr/059-…md:110] D3 noch in Planungsform („Ein Test in `tokens.test.ts` (oder
  `ListenZeile.test.tsx`) rechnet …") – Test liegt fest in `tokens.test.ts`.
- [ ] [docs/adr/059-…md:148,168,182, e2e/bausteine-listenzeile-aufklapper.spec.ts:7] Nennen noch
  die unbenannte Variante `group-open:`; Z. 182 beschreibt das Tailwind-Update-Risiko der Mechanik.
- [ ] [docs/adr/052-…md:108-109] D2 sagt weiter absolut „immer `line`, nie `line-subtle`" – die
  Ausnahme steht nur im Nachtrag unter D1. Querverweis „(Ausnahme: ADR-059 D1)" an D2.
- [ ] [app/components/ui/ListenZeile.tsx:18-21] JSDoc nennt `x && …` → `false`/`""`; `0 && …`
  liefert `0`, `hatInhalt(0)` ist `true` – bei `aktion` erschiene „0" und der Pfeil fiele weg.
  Heute kein Konsument betroffen; `0` als Inhalt bewusst dokumentieren.
- [ ] [app/components/ui/ListenZeile.test.tsx:129-132,139-143] Label-Spalte (`"false"`, `"null"`,
  `"leer"`) wird von `%s` nicht genutzt – Testname endet für `""` leer. `$label`-Objektzeilen.
- [ ] [app/components/ui/ListenZeile.test.tsx:154, ZeileRow.test.tsx:96,107] `toHaveLength(2)`/`(1)`
  ohne Herleitung (Lesson #189) – kurz kommentieren (Textblock + Pfeil; Link + Aktions-Container).
- [ ] [app/components/ui/tokens.test.ts:91] `VERBLASST_OPACITY = 0.6` nicht an `VERBLASST_CLASS`
  gekoppelt – Änderung auf `opacity-50` ließe den Kontrastnachweis grün.
- [ ] [e2e/bausteine-listenzeile-aufklapper.spec.ts:147] Fokusring per einmaligem `evaluate` –
  konsistent zum K1-Fix wäre `toHaveCSS("outline-style", "solid")`.
- [ ] [app/components/ui/Aufklapper.test.tsx:5] Kommentarzeile nach der Umbenennung > 100 Zeichen.
- [ ] [tasks/task-403-…md:38-40, 61-62] Planungs-/Implement-Notizen (`className="group"`,
  „Rahmen/Fläche/`px-4` am `<details>`") durch den Rework überholt – „(überholt, siehe Rework)".
- [ ] [scripts/format403.tmp.sh, scripts/review403.tmp.sh] Wegwerf-Dateien (gitignoret) im
  Worktree; die zweite ist die Tailwind-Sonde dieses Reviews – `rm` war nicht freigegeben, vor dem
  Merge von Hand löschen (Lesson `build-tooling.md`).

## Positives
- Rework aus Iteration 1 gründlich: K1 mit der richtigen CSS-Eigenschaft und wiederholender
  Assertion, W2 über die vorhandene `Card` statt Farbklassen am Baustein, W3 in beiden Richtungen
  getestet, Doku-Drift aus Iteration 1 (ADR-059, Spec Q1–Q5, Glossar) nachgezogen.
- Alle AK gegen den Code geprüft ohne Abweichung (Runde 1); Edge Cases `zaehler=0` („Offen (0)"),
  leerer `zustand`/`untertitel`/`aktion` sind getestet.
- Bausteine route-neutral; Konsumenten übergeben nur noch Layout (`min-w-0`, `text-sm`, `py-0` an
  `Card`); Farb-Gate um beide Dateien erweitert, keine rohen Farbklassen/`dark:` (Runde 3).
- `aria-hidden` nur am Hinweis – zugänglicher Name bleibt „Abgeschlossen (2)", E2E-`getByText`
  bleibt gültig; `STATUS_LABEL` und Glossar-Badge-Regel konsistent.
- Kontrast-Tests je Theme getrennt mit Gegenprobe `muted` in beiden Themes.
- Keine Routen-Änderung → `docs/routes.md` zu Recht unberührt.

## Out-of-Scope
- Keine neuen Funde. Startseiten-Navigation (`app/page.tsx`) bleibt wie in Iteration 1 bewusst
  kein Fund. „Einstellungen" (ADR-053 D6) ist ebenfalls ein natives `<details>`, aber nicht in
  Issue #403 genannt – Umstellung gehört in eins der Folge-Issues, kein eigener Eintrag.

## Empfehlung
NEEDS_REWORK
