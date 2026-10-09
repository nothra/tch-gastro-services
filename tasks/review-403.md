# Review: Task 403

> Iteration 3 (Circuit Breaker: dritter Review auf denselben Code) · Diff `origin/main...HEAD`
> (30 Dateien, +1924/−188), Rework-Commit `785d482`. Die drei Runden (Logik, Code-Qualität,
> Architektur) liefen direkt im Orchestrator, nicht als Sub-Agenten: der Rework-Diff ist klein
> (11 Dateien, +115/−43), und die Iteration-2-Befunde ließen sich einzeln gegen den Code prüfen.
> Gates in diesem Schritt ausgeführt: `vitest run app/components/ui app/veranstaltung`
> (51 Dateien, 942 Tests grün), `pnpm lint` grün, `prettier --check app e2e` + ADR-059 grün,
> `tsc --noEmit` ohne Fehler. Playwright nicht ausgeführt (siehe W1).
> Iteration-2-Bericht: `git show dadcd1c:tasks/review-403.md`.

## Status Iteration 2
- W1 (benannte Gruppe, falsche Wirkungsbehauptung) – **behoben**: ADR-059 D2, Kopfkommentar
  `Aufklapper.tsx:8-10` und Testname `should_useOnlyNamedGroupVariant_when_rendered` sagen jetzt,
  dass der Name nur vor fremden `.group`-Vorfahren schützt → „Aufklapper nicht verschachteln".
  Gegengeprüft: Kein Konsument verschachtelt heute. `VerzehrAufschluesselung` liegt in der
  Personen-Detailansicht (`kassieren/page.tsx:225`), nicht in „Abrechnung im Detail" (`:272`).
- W2 (ADR-055 D4) – **behoben**: Nachtrag in ADR-055, ADR-055 in ADR-059 „Bezug zu anderen ADRs".
- W3 (`line-subtle` für die pfeillosen Kacheln) – **behoben**: ADR-059 D1 begründet die Variante
  (Text-Link, `nav`, Kennzahl, einheitlicher Kartenrand). Der Kopfkommentar `ListenZeile.tsx`
  ist angeglichen.
- W4 (E2E-Lauf) – **offen**, braucht den Menschen → W1 unten.
- Nitpicks: alle 12 behoben. Die D3-Werte sind angeglichen und D3 steht nicht mehr in
  Planungsform. `group-open/aufklapper:` ist durchgängig benannt. ADR-052 D2 verweist auf die
  Ausnahme. `hatInhalt` dokumentiert `0`. `$label`-Zeilen und die `toHaveLength`-Herleitungen
  stehen, `VERBLASST_OPACITY` wird aus `VERBLASST_CLASS` gelesen (mit eigenem Parser-Test). Der
  Fokusring wird per `toHaveCSS` geprüft, und die überholten Notizen sind markiert.

## Kritische Findings (müssen behoben werden)
_Keine._

## Wichtige Findings (sollten behoben werden)
- [ ] [e2e/bausteine-listenzeile-aufklapper.spec.ts, tasks/task-403-…md (AK1.2- und
  Playwright-Checkbox)] **Eskalation an den Menschen (Circuit Breaker).** F1/F2/F4 und der
  Browser-Beleg für AK1.2/AK1.3 hängen allein an dieser Spec. Sie läuft nur mit
  `E2E_BAUSTEINE_403=1` und ist noch nie gelaufen. Ein weiterer `/implement`-Lauf kann das nicht
  lösen, denn der Lauf braucht die Freigabe des Menschen: lokale DB mit `db:migrate` +
  `db:seed`, `.env.local` per `dotenv`, eigener Dev-Server-Port und `localhost` statt `127.0.0.1`
  (Lessons #368/#370/#374). Dabei die Tipp-Höhe von „Abrechnung im Detail" (`Card py-0`) und
  die Kachel-Ausrichtung mit ansehen. Die Task-Datei hält beide Checkboxen ehrlich offen; vor
  dem Merge müssen sie grün abgehakt sein.

## Nitpicks (optional)
- [ ] [docs/adr/059-bausteine-listenzeile-aufklapper.md:192-193] Der Umbruch „ein
  Tailwind-Update, das sie / ändert, fiele …" hinterlässt eine Kurzzeile mitten im Satz. Der
  Absatz sollte neu umbrochen werden, nur Optik.
- [ ] [scripts/format403.tmp.sh, scripts/review403.tmp.sh] Die Wegwerf-Dateien (gitignoret) aus
  `/implement` und den Reviews sollten vor dem Merge weg sein (Lesson `build-tooling.md`).

## Positives
- Der Rework hat jeden Iteration-2-Befund an **allen** genannten Stellen nachgezogen (ADR,
  Kommentar, Testname, Task-Notiz). Die korrigierte Wirkungsbehauptung ist jetzt exakt und
  benennt den Ausweg (Kind-Kombinator + Browser-Test).
- `VERBLASST_OPACITY` wird aus der Baustein-Klasse gelesen, und ein fail-closed Parser wirft bei
  unerwarteter Form. Damit kann der Kontrastnachweis nicht mehr still von der Implementierung
  abdriften. Der Blend-Stützwert nutzt bewusst das Literal `0.6` (Test gegen erwarteten Wert).
- Alle AK sind weiter gegen den Code erfüllt, außer dem nur im Browser belegbaren AK1.2. Die
  Bausteine sind route-neutral, das Farb-Gate deckt beide umgestellten Dateien ab, und es gibt
  keine rohen Farbklassen und kein `dark:`.
- Keine Routen-Änderung → `docs/routes.md` zu Recht unberührt.

## Out-of-Scope
- Keine neuen Funde.

## Empfehlung
APPROVED

> Code, Unit-Tests und Doku sind abnahmereif. Ein weiterer `/implement`-Zyklus würde nichts
> lösen; der einzige offene Punkt ist der Playwright-Lauf (W1). Gemäß Circuit Breaker geht er an
> den Menschen und ist **Vor-Merge-Bedingung**: Die Task gilt erst als fertig, wenn AK1.2 und die
> Playwright-Checkbox abgehakt sind.
