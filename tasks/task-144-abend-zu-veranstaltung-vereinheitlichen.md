# Task 144: abend-zu-veranstaltung-vereinheitlichen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Rein **dokumentarische** Begriffs-Vereinheitlichung „Abend" → „Veranstaltung" in den lebenden
Docs (`docs/`, `tasks/`), mit korrekter Grammatik. **Kein Code betroffen.** Spec:
[spec-144](../docs/specs/spec-144-abend-zu-veranstaltung-vereinheitlichen.md).
Stand bei Start: 115 Vorkommen in 28 Dateien (ohne die in #53 bereits bereinigten).

## Akzeptanzkriterien
<!-- Von /requirements befüllt – Detail-GIVEN/WHEN/THEN in spec-144 -->
- [x] `docs/factory/PROJECT-CONTEXT.md`: Synonym-Paar „Veranstaltung/Abend" aufgelöst, `git grep -w -i abend` → 0 (verifiziert)
- [x] `README-montagsrunde.md` + aktive Specs (`spec-48/49/50/52/54/55`, `spec-116/127`, `spec-51`, `spec-120`): Prosa durchgängig „Veranstaltung"; einzige verbleibende `git grep -w -i abend`-Treffer sind die 4 Markdown-Links auf `spec-51-abend-anlegen.md` (dokumentierte Ausnahme, s. u.)
- [x] Grammatisch korrekte Ersetzung (Genus „die Veranstaltung", Komposita „Veranstaltungs-Ebene"); Fehlform-Grep (`einen/diesen/… Veranstaltung`, `Veranstaltungsrunde`, `Veranstaltungsabend`) → 0
- [x] ADRs (`021–024`) + abgeschlossene Task-Records inhaltlich unverzerrt (nicht angefasst)
- [x] Dateinamen `spec-51-abend-anlegen.md` / `task-51-abend-anlegen-fuehren.md` **nicht** umbenannt; alle 4 Referenzen intakt
- [x] Diff berührt ausschließlich `docs/` – keine Code-/UI-/Test-Änderungen (`app/db/lib/e2e/components`-Grep → 0)

## Technische Notizen
**12 Doku-Dateien** angepasst; nur `docs/` betroffen, kein Code.

Bewusste Entscheidungen (je Datei/Fall dokumentiert):
- **Filename-Ausnahme (Entscheidung: nicht umbenennen):** Die Markdown-Links auf
  `spec-51-abend-anlegen.md` bleiben (README Z. 11/33, spec-120 Z. 17/53) – sonst brächen die
  4 Referenzen (auch ADR-023, task-51). `git grep -w -i abend` matcht den Bindestrich-Wortteil
  im Dateinamen; das sind die einzigen verbleibenden Treffer, alles andere ist Prosa-bereinigt.
- **spec-127** (dokumentiert eine abgeschlossene Doku-Migration): Die „Abend"-Stellen waren
  **Beschreibungen des alten Modells**, keine wörtlich-kritischen Zitate. Auf die kanonische
  Terminologie angeglichen (Entität „Veranstaltung", „je Veranstaltung"); technische Aussage
  (Essen war früher je Veranstaltung fixiert) bleibt erhalten. Stale Zeilennummern-Verweise
  („Zeile 36/38–39") sind vorbestehend und außerhalb #144-Scope.
- **spec-120** F7-Route-Beispiel `app/abend/[token]/` → `app/theke/[token]/` (Z. 120/206):
  zunächst (Implement) auf `app/veranstaltung/[token]/` gesetzt; im Review korrigiert, da
  `app/veranstaltung/` laut ADR-024 D1 der **authentifizierte** Bereich ist und die öffentliche
  F7-Route in ADR-023 D6/ADR-024 als `theke/[token]` beschlossen wurde – `theke/[token]` ist
  terminologisch „Abend"-frei **und** faktisch korrekt.
- **`Abrechner`** (alte Rolle, in ADR-024 → `veranstalter`) **nicht** angefasst – außerhalb
  #144-Scope (nur Abend→Veranstaltung). Die Rollen-Rename-Propagierung in README/spec-49/50/54
  ist vorbestehend offen → Folge-Issue (s. Review-Findings).
- **spec-51:147** durchgestrichenes Alt-Kompositum „abendweit" → „je Veranstaltung einheitlich"
  (Historien-Text bleibt als `~~…~~ überholt` erhalten).
- **README-Begriffshinweis** (Z. 7–11) **gekürzt** (nicht entfernt): Synonym-Klausel „‚Abend' ist
  nur ein Synonym" gestrichen, der Block mit Datum-Pflichtfeld + `theke`-Erklärung bleibt.
- **Obsolete Übergangs-Notizen entfernt**: spec-52-Synonym-Zeile, spec-51 „statt Abend"/„Bezug
  Abend als Veranstaltung lesen" – nach der Vereinheitlichung ohne Wert.

Verifikation (git grep): siehe Akzeptanzkriterien. Keine Oberflächen-/Unit-Tests nötig
(reine Doku, kein Laufzeitverhalten).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/144-abend-zu-veranstaltung-vereinheitlichen`
Erstellt: 2026-07-18 06:38
