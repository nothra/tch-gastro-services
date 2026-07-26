## Codify-Report: Task 239

### Neue Regeln hinzugefügt
_Keine weiteren – das einzige generalisierbare Learning dieser Task wurde bereits als
Selbstfund während `/review` extrahiert (nicht erst hier):_

- `docs/factory/lessons/factory-workflow.md` (neuer Abschnitt) + Index-Zeile in
  `docs/factory/PROJECT-CONTEXT.md` unter „Index der ausgelagerten Learnings" (Gruppe
  `factory-workflow.md`) – **„Vorbestehenden, scheinbar unabhängigen Bash-Suite-Testfehlschlag
  mit zwei konkreten Prüfungen belegen, nicht nur behaupten"** (aus #239, /review-Selbstfund).
  Trigger: `/review`, `/test` – bei vorbestehendem, scheinbar unabhängigem Testfehlschlag.
  Wegen: Statt „betrifft mich nicht" zu behaupten, wurde die Trennung durch zwei prüfbare
  Kriterien belegt (Hunk-Scope des eigenen Diffs + Referenz-Check im E2E-Datei-Satz) – dieses
  Vorgehen ist wiederholbar und verdient eine Regel, kein Einzelfall.

Die drei behobenen Review-Nitpicks (Push-Meldungs-Symmetrie, positive statt nur negative
Testassertion, DRY-Helper-Extraktion) sind bereits durch bestehende generische Regeln gedeckt
(Symmetrie-Testing aus Lesson #211, Negativ-Test-Isolation aus Lesson #214, DRY aus
`clean-code.md`) – kein neuer Lessons-Eintrag nötig, da kein neues Muster.

### Keine Änderungen nötig
- **Security-Review:** PASSED ohne kritische/wichtige Findings, nur Hinweise, die bestehendes
  Fail-closed-Design bestätigen (kein neues Guard-Muster, keine neue Regel).
- **Nitpick 4** (doppelte Upstream-Prüfung in `push_branch`) wurde im Review bewusst als
  „Preis für den DRY-Helper" akzeptiert und unverändert belassen – kein Fehler-Muster, keine
  Regel nötig.
- Der vorbestehende, unabhängige Bash-Suite-Testfehlschlag (`#212 W3`-Block) ist bereits als
  eigenständiges Tracking-Issue [#244](https://github.com/nothra/tch-gastro-services/issues/244)
  angelegt (Label `bug`+`test`) – keine weitere Codify-Aktion dafür nötig.

### Empfehlung für nächste Features
Das Muster „Beleg statt Behauptung bei pre-existing Testfehlschlägen" hat sich in dieser Task
bereits im `/review`-Schritt selbst durchgesetzt (Selbstfund, nicht erst im Codify-Nachgang
entdeckt) – ein Hinweis darauf, dass die Lesson-Struktur (`lessons/factory-workflow.md` +
Index-Trigger) inzwischen so griffbereit ist, dass Agenten sie bereits während der Arbeit
anwenden, statt erst am Ende der Pipeline. Kein Handlungsbedarf, nur positiv vermerkt.
