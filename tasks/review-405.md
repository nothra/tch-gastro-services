# Review: Task 405

Diff: `git diff origin/main...HEAD` (22 Dateien, +1295/−227), Stand `fb3ba90`. Gates lokal per
`bash scripts/checks/pre-push.sh` grün: Lint, 1673 Tests (118 Dateien), Typecheck (deckt die
`@ts-expect-error`-Wächter in `ListenZeile.test.tsx`), Format, Routen-Doku, Import-Kontext.
Die drei Runden liefen ohne Fork-Delegation direkt im Orchestrator (Lessons #298/#267).

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

_Keine._

## Nitpicks (optional)

- [ ] [app/verwaltung/teilnehmer/page.test.tsx:155] `should_keepListOrderWithinGroups_when_rendered`
  liest die Namen über den Styling-Selektor `.font-semibold` – eine Optik-Änderung an `ListenZeile`
  bräche den Reihenfolge-Test. Robuster: `within(zeile).getByRole("button")` + Name, oder
  `getAllByRole("button")` je Abschnitt und `accessibleName` vergleichen.
- [ ] [app/components/useErsatzFokus.ts:43] Das neue Ersatzziel „`<summary>` des zugeklappten
  `<details>`" ist Verhalten des geteilten Hooks (auch `useBestaetigung`, `FormularDialog`), wird
  aber nur über den Konsumenten `TeilnehmerRow.test.tsx` (beide Richtungen) belegt. Kein Defekt –
  ein eigener `useErsatzFokus.test.ts` würde den Vertrag beim Baustein halten (Lesson #369
  „Verhaltensvertrag in den Baustein").
- [ ] [e2e/anleitung-veranstalter.spec.ts:124] Kommentar „Frisch geseedete DB (Header)" – der
  Klammerzusatz ist ohne Kontext unklar; gemeint ist wohl der Kopfkommentar der Spec.

## Out-of-Scope (klassifiziert, ADR-043 Schritt B)

- `ArtikelAktivUmschalten` (`CatalogRow.tsx:89-110`) und `TeilnehmerAktivUmschalten`
  (`TeilnehmerRow.tsx:79-102`) sind bis auf Zusatzfelder/Texte gleich. ADR-060 D3 hat die Übernahme
  des Gerüsts bewusst entschieden; die Extraktion berührt `CatalogRow` und liegt damit außerhalb
  von #405 → Eintrag „Aktiv-Umschalten-Formular in `CatalogRow` und `TeilnehmerRow` handkopiert"
  in `docs/factory/kleinfunde.md` (unter zehn Zeilen netto).

## Positives

**Runde 1 – Backend/Logik**
- Alle AK aus spec-405 sind umgesetzt und belegt: AK1 (Button-Zeile, Untertitel in allen vier
  Kombinationen, ≥ 44 px per E2E), AK2.1–AK2.10 inkl. beider Sperr-Richtungen und „bearbeitete
  Felder gehen beim Umschalten nicht mit" (`formData.get("name")` ist `null`), AK3.1–AK3.7 inkl.
  Gegenrichtung „nur Deaktivierte → kein Aktiv (0)", AK4 (`Notice` `warnung`, `DuplikatWarnung`
  auch für den Veranstaltungs-Dialog), AK5, AK6.
- Gruppenwechsel geprüft: die beiden `TeilnehmerGruppe`-Positionen bleiben stabil (eine leere
  Gruppe rendert `null` an ihrem Platz), ein vom Nutzer aufgeklapptes „Deaktiviert" bleibt beim
  Revalidieren offen; React setzt `open` nur bei Prop-Änderung.
- Der Fokus-Fallback auf das `<summary>` einer zugeklappten Gruppe ist ein echter Browserbefund
  (jsdom sieht ihn nicht), sauber per Playwright + Gegenprobe belegt und in ADR-060 D3
  nachgezogen.
- F1–F3: Ablehnungen bleiben im Dialog als `Notice`, kein `<form action>`-Reset (`onSubmit` über
  `useDialogFormular`), Server Actions und Rollenprüfung unverändert.

**Runde 2 – Code-Qualität**
- `ListenZeile`: Inhalt einmal gebaut, nur das umschließende Element wechselt – kein
  Doppel-Markup; Union mit `never`-Gegenstücken, durch `@ts-expect-error`-Test plus Typecheck-Gate
  abgesichert.
- Tests verhaltensnah (Rollen, Namen, `FormData`), Mehrrichtungs-AK beidseitig assertiert
  (Lesson #211), nie auflösende Promises am Testende aufgelöst (Lesson #370), Wirkungssätze als
  benannte Konstanten.
- Farb-Gate-Gegenprobe vor dem Erweitern der Liste auf den ungelisteten Nachbarn `AuslageForm.tsx`
  umgestellt (Lesson #371); der zugehörige `kleinfunde.md`-Eintrag ist mitgekürzt, Anker geprüft.

**Runde 3 – Architektur & Patterns**
- ADR-060 (Accepted) deckt beide API-Änderungen, ADR-059 trägt den Nachtrag-Verweis; der Code
  folgt D1–D3 (Union statt Flag, `anhang`-Slot, `role="status"` für `warnung`).
- `TeilnehmerRow` folgt dem `CatalogRow`-Gerüst (`useFormularDialog`, zwei Formulare, stabile
  Zeilen-Id); die Gruppierung folgt `VeranstaltungListe` (`section aria-labelledby` + `Aufklapper`
  mit `ueberschrift`). `ListenZeile` bleibt Server-tauglich für Link-Konsumenten.
- Keine Route geändert (`docs/routes.md`-Drift-Check grün); Glossar-Anker
  (`TeilnehmerRow.tsx:83`, `CatalogRow.tsx:93`) stimmen; verschobene Überschrift in
  `listenseiten.spec.ts` und der Capture-Spec mitgezogen (Lesson #391).

## Empfehlung
APPROVED
