## Codify-Report: Task 144

### Neue Regeln hinzugefügt

- **`docs/factory/PROJECT-CONTEXT.md` → Bekannte Stolpersteine:** „Terminologie-Sweep: `-w`-Grep
  ist blind für Komposita, und Pfad-Beispiele sind nicht ‚neutral' (aus #144)". Bündelt vier
  konkrete Regeln für Begriffs-Vereinheitlichungen:
  1. Zweifach verifizieren (`git grep -w` **und** Substring-Sweep `git grep -i`) – `-w` allein
     übersieht Komposita.
  2. Pfad-/Route-/Identifier-Beispiele vor der Ersetzung gegen die ADRs prüfen – der
     naheliegende Entitäts-Begriff kann mit einem belegten Segment kollidieren.
  3. Own-Voice-Prosa von historischen Zitaten trennen (spec-127-Muster).
  4. Scope-Grep gegen die **Ausgabe** prüfen, nicht gegen `git diff`-Exit-Code.

### Fehler-Muster (Herkunft der Regeln)

- **Review-Runde 1 (Nitpick N1):** `git grep -w -i abend` (das AC-Kommando) übersah das
  durchgestrichene Kompositum „abendweit" in spec-51:147. → Regel 1.
- **Review-Runde 3 (Wichtig W1):** Meine Implement-Ersetzung `app/abend/[token]/` →
  `app/veranstaltung/[token]/` kollidierte mit dem authentifizierten Bereich (ADR-024 D1); die
  öffentliche F7-Route ist `theke/[token]`. → Regel 2 (im Review auf `theke/[token]` korrigiert).
- **Review-Runde 2 (Wichtig W1):** Change-Record beschrieb den README-Begriffshinweis als
  „entfernt", tatsächlich nur „gekürzt". → im Review korrigiert; Regel 3 (Genauigkeit von
  Historie-/Record-Aussagen) deckt das mit ab.
- **/test-Selbstfund:** Mein AC6-Verifikations-Guard `git diff --name-only … && echo` feuerte
  falsch (git diff exit=0 immer). → Regel 4.

### Out-of-Scope-Learning als Issue

- **#148** (angelegt in `/review`): ADR-024-Rollen-Rename `abrechner` → `veranstalter` in
  README/spec-49/50/54 propagieren. Genau der Task-Typ, für den die neue Stolperstein-Regel
  gilt – dort direkt anwenden.

### Was gut funktioniert hat

- Die **frühe Klärungsfrage** zur Datei-Umbenennung (`AskUserQuestion`) hat den Scope sauber
  fixiert und die Filename-Link-Ausnahme von Anfang an dokumentierbar gemacht.
- Der **3-Runden-Review** (Korrektheit / Qualität / Architektur) hat sich für eine „triviale"
  Doku-Task ausgezahlt: Runde 3 (Architektur/ADR) fand den F7-Route-Fehler, den die reinen
  Text-Perspektiven nicht gesehen hätten.

### Empfehlung für nächste Features

- Für #148 und künftige Renames: die neue Stolperstein-Regel als Checkliste abarbeiten
  (Doppel-Grep, ADR-Abgleich bei Identifiern, Historie-Trennung).
