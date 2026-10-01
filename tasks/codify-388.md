## Codify-Report: Task 388

Task: Anleitungs-Screenshots `05`–`07` neu erzeugen. Verlauf: `/requirements` (Spec, Q1 Dev-DB-Reset), `/implement` (vier DB-Resets,
Capture-Spec zweimal repariert, dann FS1-Rückfrage → „nur 05–07 liefern"), `/review` 2 Iterationen (2 wichtige → APPROVED),
`/test`, `/refactor`, `/security-review` (PASSED). Alle Aufrufe ab `/test` kamen mit der Task-ID `369`; gemeint war jeweils #388.

### Neue Regeln hinzugefügt
- `docs/factory/lessons/testing.md` + Index – **Playwright-`hasText` mit String ist ein Teilstring-Treffer** (`Bier` trifft
  `Weizenbier`): Namen exakt matchen; und eine **Fehlerursache erst an den echten Daten messen**, bevor sie in Kleinfund oder
  Task-Notiz steht. Wegen: Ursache zuerst aus der Seed-Migration „gelesen" (falsch), erst `/review` fragte die Verzehr-Zeilen ab.
- `docs/factory/lessons/testing.md` + Index – **Manuell gestartete Capture-/E2E-Spec rottet unbemerkt**: Zählungen relativ zum
  Startwert, Seed-/Migrations-PRs auf absolute Startannahmen prüfen, Dialog-Screenshots erst nach Fokus-/Scroll-Reset (`<dialog>`
  fokussiert und scrollt das Link-Feld). Wegen: `Artikel (1)` brach an den 16 migrierten Standard-Artikeln, `07` zeigte nur das URL-Ende.
- `docs/factory/lessons/factory-workflow.md` + Index – **Scope-Kürzung durch den Menschen mitten in `/implement` sofort in die Spec
  schreiben** (Q-Eintrag, AK „zurückgestellt/angepasst", AK-Wortlaut der Task angleichen). Wegen: `/review` fand den Spec-Drift
  als Wichtig-Finding und kostete einen Rework-Zyklus.

### Keine Änderungen nötig
- `CLAUDE.md`, Guidelines und `scripts/checks/`: kein automatisierbarer Fehler, keine generische Regel. Der @import-Dauerkontext bleibt
  unter der Grenze (915 von 1100 Zeilen).
- Ein Guardrails-Hook-Hinweis („liest Credential-Datei") nach einem Wegwerf-Skript mit `.env.local` im Kommentar wurde nicht als
  Lesson aufgenommen: Die auslösende Stelle ist nicht belegt (Kommentarwort vs. Befehl), eine Regel darauf wäre eine Vermutung.

### Folge-Arbeit (außerhalb des Scopes)
- `docs/factory/kleinfunde.md`: „Capture-Spec der Anleitung läuft nicht bis zum Ende durch – Bilder `10`–`12` ungeprüft" (Verzehr-Schritt auf
  exakten Treffer umstellen, `anleitung.md:236` auf „Pflicht") und „`anleitung.pdf` ist seit #221 nicht neu erzeugt worden". Kein Issue
  nötig (Doku/Capture, kein Defekt der App, Auslöser nur bei manuellem Lauf).

### Empfehlung für nächste Features
- Wer die Capture-Spec das nächste Mal fährt, bringt den Verzehr-Schritt in einem Zug in Ordnung (zehn Zeilen), wertet `10`–`12`
  aus und druckt `anleitung.pdf` neu – die zwei Kleinfunde sind dafür geschnitten.
- Bei Slash-Befehlen mit abweichender Task-ID (hier `369` statt `388`) die Annahme am Anfang nennen, nicht still umdeuten.
