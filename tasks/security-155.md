# Security Review: Task 155

Zweistufig geprüft: (A) führen die Diff-Dateien selbst ein Risiko ein, (B) beschreibt die
in ADR-029 dokumentierte Ruleset-Config eine Schwachstelle. Diff: docs-only + Shell-Guards.

## Kritische Findings (Blocker)
- _Keine._

## Wichtige Findings
- _Keine._

## Hinweise
- [ ] [Config-Posture] **`required_approving_review_count: 0`** – es gibt kein
      plattform-erzwungenes menschliches Vier-Augen-Gate. Die Sicherheitszusage ruht auf den
      Pipeline-Schritten `/review` + `/security-review` und den required Checks. Das ist eine
      **bewusste** Entscheidung (ADR-029 Option B1), zwingend für den autonomen Auto-Merge
      (ADR-008), und für das Bedrohungsmodell (nicht-kommerzielle Vereins-PWA, Einzel-
      Maintainer) angemessen. Restrisiko: ein kompromittierter `gh`/CI-Token könnte einen PR
      autonom mergen – aber nur bei **grünen required Checks** und **ohne** Force-Push/Bypass
      (auch für Admins gesperrt). Kein Handlungsbedarf, bewusst dokumentiert.
- [ ] [Config-Posture] **`strict_required_status_checks_policy: false`** – ein PR kann gegen
      einen leicht veralteten `main` mergen (semantisches Konfliktfenster). Sicherheitsimpact
      gering: textuelle Konflikte bleiben blockiert, der Factory-Flow rebased vor Push.
      Bewusster Trade-off (ADR-029 Option C2), nötig wegen parallelem Factory-/Handbetrieb.
- [ ] [Defense-in-Depth] `/security-review` ist ein **Pipeline-Schritt**, kein required CI-
      Check im Ruleset – ein Merge ist technisch möglich, ohne dass dieser Schritt lief. Das
      entspricht dem bestehenden Factory-Design (Security-Review als Skill, nicht als
      Status-Check; ADR-008/ADR-019) und ist **nicht** durch diese Task eingeführt. Bewusst
      nur als Hinweis notiert, **kein** Out-of-Scope-Issue: eine Änderung würde die
      dokumentierte Autonomie-Architektur berühren und gehört – falls gewünscht – in eine
      eigene ADR-Diskussion, nicht in einen spekulativen Backlog-Eintrag.

## Positives
- **Kein Secret / kein Token** im Diff (Scan der added lines); die ADR-Erwähnung „CI-Token"
  ist Prosa über einen Bypass-Vektor, kein Credential. Die Ruleset-ID (`19162920`) ist kein
  Geheimnis (Repo-Read-sichtbar).
- **Guards ohne Injection-Fläche:** fixe String-Literale (`ADR-029`, `umgehbar`) und ein aus
  `$FACTORY_ROOT` abgeleiteter Pfad; kein user-/config-kontrollierter Suchwert → kein
  `grep -F --`-Bedarf (clean-code.md-Regel greift hier nicht, da kein Fremdinput).
- **Starke Grund-Posture** dokumentiert: `bypass_actors: []` (gilt auch für Admins),
  Force-Push + Deletion blockiert, PR-Pflicht, required Checks – der ADR beschreibt eine
  **Härtung**, keine Schwächung. Deckt sich exakt mit dem Live-Ruleset (in `/review` gegen
  `gh api` verifiziert).

## Ergebnis
PASSED

> Die Änderung dokumentiert eine Sicherheits-**Härtung** und führt selbst keine Angriffs-
> fläche ein. Die drei Hinweise sind bewusste, in ADR-029 begründete Trade-offs, kein
> Handlungsbedarf. Kein Out-of-Scope-Issue angelegt.
