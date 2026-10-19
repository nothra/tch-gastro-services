## Codify-Report: Task 420

### Neue Regeln hinzugefügt
- `docs/factory/lessons/frontend-react.md` + Index-Zeile in `PROJECT-CONTEXT.md` – Sonderzweig (leer/gesperrt) in einer Komponente mit Erfassen-/Bearbeiten-Betriebsart: Texte aus einer Hilfsfunktion für beide Zweige – wegen Review-Iteration 1 W1 (deaktiviertes „Erfassen“ erschien auch beim Bearbeiten).

### Keine Änderungen nötig
- Security-Review ohne Findings. Review-Iteration 2 APPROVED; N1–N3 waren Doku-/Test-Feinschliff ohne Musterwert (spec-Querverweise, `className`-Vergleich statt Literal – deckt bereits Testing-Standards „gegen erwarteten Wert prüfen“). Folge-Issue #423 (Auslage ohne Teilnehmer nicht bearbeitbar) existiert bereits; keine neuen Out-of-Scope-Funde.

### Empfehlung für nächste Features
- Bei UI-Änderungen an gemeinsam genutzten Formularen vor `/implement` die Betriebsarten (Anlegen/Bearbeiten) aufzählen und in der Spec je Betriebsart ein Fehlerszenario festhalten.
