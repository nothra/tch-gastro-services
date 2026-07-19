# Spec: Rollen-Rename `abrechner` → `veranstalter` in den lebenden Docs

> Issue #148 · Doku-Folgeaufgabe aus dem `/review` von #144 (out-of-scope).
> Kanonische Rollen-Quelle: [spec-48](spec-48-login-rollen.md) + [PROJECT-CONTEXT](../factory/PROJECT-CONTEXT.md).
> Entscheidungsgrundlage: [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).

## Kontext

[ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md) (#120) hat die Owner-Rolle
`abrechner` in **`veranstalter`** umbenannt (Owner des ganzen Veranstaltungs-Lebenszyklus,
reine Umbenennung, keine Rechte-Änderung) und die neue Vokabel in spec-48, PROJECT-CONTEXT
sowie den Phasen-Specs spec-52/54/55 propagiert. **Nicht** nachgezogen wurde die Rolle im
Fließtext weiterer lebender Fach-Specs und der Übersicht — dadurch divergiert die **kanonische
Fachquelle** (`README-montagsrunde.md`) von PROJECT-CONTEXT/spec-48 bei der Rollen-Vokabel.

#144 (Terminologie „Abend" → „Veranstaltung") hat den Mismatch an denselben Zeilen sichtbar
gemacht, die Rollen-Umbenennung aber bewusst **nicht** angefasst (anderer Scope). Diese Task
schließt genau diese Lücke – **konsistent über alle lebenden Docs** (Entscheidung 2026-07-19),
damit keine neue Teil-Divergenz entsteht (der Auslöser dieses Issues war eine halbe Ersetzung).

**Wichtige Wortgrenze (nicht verhandelbar):** Ersetzt wird nur die **Rolle/Person**
`Abrechner`/`abrechner`. Die **Tätigkeit** `Abrechnung`/`Abrechnungs-` (z. B. „Abrechnungsvorgang",
„Digitale Veranstaltungs-**Abrechnung**", „Abrechnungs-Phase") bleibt **unverändert** – sie
enthält den Teilstring `abrechner` ohnehin nicht (`abrechnUNG` ≠ `abrechnER`), ist aber beim
Sichten sauber auseinanderzuhalten.

## Scope

**Inbegriffen** (lebende Docs – Rolle im Fließtext/Tabellen/AC-Zeilen → `Veranstalter`/`veranstalter`):
- `docs/specs/README-montagsrunde.md` (Rollen-Tabelle Z. 20; Prosa Z. 10, 88, 96)
- `docs/specs/spec-49-getraenke-katalog.md` (Z. 53)
- `docs/specs/spec-50-teilnehmer-stammdaten.md` (Z. 40, 54, 60)
- `docs/specs/spec-51-abend-anlegen.md` (alle Rollen-Vorkommen im Fließtext/AC)
- `docs/specs/spec-52-verzehr-erfassen.md` (Fließtext-Rollen)
- `docs/specs/spec-53-auslagen.md` (Fließtext-Rollen)
- `docs/specs/spec-54-selbstbedienung-link.md` (Fließtext-Rollen)
- `docs/specs/spec-55-kassieren-abschluss.md` (Fließtext-Rollen)
- `docs/factory/guidelines/git-workflow.md` (Z. 93 Prosa-Beispiel „Verwalter vs. Abrechner")
- Per-Spec-Header-Notizen in spec-52/53/54/55: die „…meint diese Rolle"-Klausel entfällt,
  es bleibt ein **knapper historischer ADR-024-Pointer** analog spec-48
  (`Rolle \`abrechner\` → \`veranstalter\` umbenannt (ADR-024)`).

**Nicht inbegriffen (bewusst unberührt – historische Records / Tätigkeitsbegriff):**
- `docs/specs/spec-120-route-schnitt-abrechnung-veranstaltung.md` – dokumentiert die
  Rename-**Entscheidung** selbst (nennt den alten Namen als Betrachtungsgegenstand).
- Alle `docs/adr/**` und abgeschlossene `tasks/**`-Records.
- Historische Pointer in `docs/factory/PROJECT-CONTEXT.md` (Z. 57 „vormals `abrechner`",
  Codify-/ADR-Notizen Z. 219/683/724) – beschreiben korrekt einen vergangenen Zustand.
- Der Tätigkeitsbegriff `Abrechnung`/`Abrechnungs-` überall.
- Dateinamen (`spec-51-abend-anlegen.md`, `spec-120-…-abrechnung-…`) und Links darauf.
- Produktionscode / `db/` / Tests (dort ist die Rolle bereits `veranstalter`, ADR-024) –
  diese Task ist rein dokumentarisch.

## Akzeptanzkriterien

- [ ] **AC1 (README-Rollen):** GIVEN `README-montagsrunde.md` WHEN gelesen THEN nennt die
      Rollen-Zeile der Entscheidungstabelle (Z. 20) **„Veranstalter"** und die Prosa (Z. 10,
      88, 96) nutzt **„Veranstalter"** statt „Abrechner"; „Veranstaltungs-**Abrechnung**"
      (Titel/Z. 3) bleibt unverändert.
- [ ] **AC2 (spec-49):** GIVEN `spec-49-getraenke-katalog.md` Z. 53 WHEN gelesen THEN
      „ein angemeldeter **Veranstalter** (ohne Verwalter-Rolle)".
- [ ] **AC3 (spec-50):** GIVEN `spec-50-teilnehmer-stammdaten.md` WHEN gelesen THEN nutzen
      Z. 40, 54, 60 durchgängig **„Veranstalter"** (inkl. Walk-in-Prosa).
- [ ] **AC4 (spec-51):** GIVEN `spec-51-abend-anlegen.md` WHEN gelesen THEN nutzen **alle**
      Rollen-Vorkommen **„Veranstalter"** (Fließtext + AC-Zeilen), inkl. Komposita
      („Abrechner-Rolle" → „Veranstalter-Rolle"); der Tätigkeitsbegriff „Abrechnungsvorgang"
      (Z. 7) bleibt unverändert.
- [ ] **AC5 (spec-52/53/55):** GIVEN spec-52, spec-53, spec-55 WHEN gelesen THEN nutzt der
      Fließtext (inkl. AC-Zeilen und „Abrechner-Rolle"-Komposita) durchgängig **„Veranstalter"**.
- [ ] **AC6 (spec-54):** GIVEN `spec-54-selbstbedienung-link.md` WHEN gelesen THEN nutzt der
      Fließtext durchgängig **„Veranstalter"**.
- [ ] **AC7 (Header-Notizen kondensiert):** GIVEN spec-52/53/54/55 WHEN die Kopf-Notiz gelesen
      wird THEN enthält sie **keine** „…meint diese Rolle"-Klausel mehr, sondern nur noch einen
      knappen historischen Pointer der Form „Rolle `abrechner` → `veranstalter` umbenannt
      (ADR-024)" – konsistent mit dem spec-48-Muster.
- [ ] **AC8 (git-workflow.md):** GIVEN `docs/factory/guidelines/git-workflow.md` Z. 93 WHEN
      gelesen THEN lautet das Beispiel „**Verwalter vs. Veranstalter**".
- [ ] **AC9 (Konsistenz-Guard, positiv):** GIVEN der Baum nach der Änderung WHEN
      `git grep -i abrechner -- docs/specs docs/factory/guidelines/git-workflow.md` läuft THEN
      verbleiben **ausschließlich** die sanktionierten historischen Rename-Pointer der Form
      `abrechner` → `veranstalter` (spec-48 + die kondensierten Notizen in spec-52/53/54/55) –
      **kein** Vorkommen bezeichnet die Rolle als aktuellen Begriff im Fließtext.
- [ ] **AC10 (Substring-Sweep):** GIVEN dieselbe Dateimenge WHEN **sowohl** `git grep -w -i
      abrechner` (Wort inkl. Bindestrich-Komposita) **als auch** `git grep -i abrechner`
      (Substring) laufen THEN decken sich beide Ergebnisse mit der AC9-Erlaubnismenge – kein
      übersehenes Kompositum (z. B. „abrechnerweit", „Abrechner-Rolle").
- [ ] **AC11 (Tätigkeit unangetastet):** GIVEN der Diff WHEN geprüft THEN wurde **keine**
      Stelle mit `Abrechnung`/`Abrechnungs-` verändert (die Tätigkeit bleibt).
- [ ] **AC12 (Historie unberührt):** GIVEN der Diff WHEN geprüft THEN sind spec-120, alle
      `docs/adr/**`, `tasks/**` und die historischen PROJECT-CONTEXT-Pointer **nicht** verändert.
- [ ] **AC13 (kanonische Übereinstimmung):** GIVEN README + Specs nach der Änderung WHEN gegen
      [spec-48](spec-48-login-rollen.md) (Rollentabelle „Verwalter/Veranstalter") und
      PROJECT-CONTEXT abgeglichen THEN ist die Rollen-Vokabel deckungsgleich – keine Divergenz mehr.

## Fehlerszenarien / Fallen (aus #144-Codify)

- [ ] **`-w`-Grep allein genügt nicht:** Der Wortgrenzen-Grep übersieht Substring-Komposita –
      immer zusätzlich der Substring-Sweep (AC10). Abschluss-Beleg braucht **beide**.
- [ ] **Tätigkeit ≠ Rolle:** `Abrechnung`/`Abrechnungs-` niemals mit-ersetzen (AC11); beim
      Sichten Zeile für Zeile unterscheiden, nicht blind `sed`-ersetzen.
- [ ] **Own-Voice vs. historisches Zitat:** In Records, die einen vergangenen Zustand
      dokumentieren (spec-120, PROJECT-CONTEXT-Historie), keine Falschbehauptung über den
      alten Wortlaut erzeugen – unberührt lassen (AC12).
- [ ] **Groß/Klein + Code-Span:** Substantiv „Abrechner" → „Veranstalter"; Backtick-`abrechner`
      im Fließtext → `veranstalter`. In den kondensierten historischen Pointern bleibt
      `abrechner` als alter Name stehen (das ist die erlaubte Rest-Menge, AC9).

## Offene Fragen

- Keine. Scope-Breite (voll konsistent) und Header-Notiz-Behandlung (ADR-024-Pointer)
  sind in der Requirements-Session 2026-07-19 entschieden.
