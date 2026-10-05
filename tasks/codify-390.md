## Codify-Report: Task 390

### Neue Regeln hinzugefügt
- `docs/factory/lessons/build-tooling.md` + Index-Zeile in `docs/factory/PROJECT-CONTEXT.md`
  (Laden bei: `/requirements`, `/implement`, `/security-review` bei Deps-/Advisory-Durchgang):
  Der Alert-AK „Dependabot meldet nichts mehr" ist vor dem Merge nicht prüfbar, weil Dependabot nur den
  Default-Branch auswertet. Er gehört in einen Vorab-Teil (Floors gegen aufgelöste Versionen) und einen
  Nach-Merge-Teil. Bei defektem `pnpm audit` taugt die npm-Bulk-Advisory-API als Ersatz, mit
  Gegenprobe gegen Altversionen und über den ganzen Lockfile-Baum. So fiel `braces@3.0.3` auf (#396).
  Wegen: der AK blieb bis zum Merge offen, und die Restausnahme zeigte sich erst im Security-Review.
- `@import`-Dauerkontext: 926 von 1100 Zeilen, Grenze eingehalten.

### Keine Änderungen nötig
- Review-Findings (1 wichtig, 6 Nitpicks): Alle sind bestehende Lessons, die schon griffen:
  Floor-Guard erweitern statt parallel (#240), Mutationsbeleg (#214/#286), Advisory-Volllisten (#231),
  Präsens-Prosa nachziehen (#176/#211), sofortige Anlage von Kleinfunden (#345). Kein Rezidiv-Eintrag
  nötig, die Pipeline hat sie in Iteration 1 und 2 selbst korrigiert.
- Security-Review: PASSED, keine Findings im Scope. Der Fund `braces@3.0.3` ist per Issue #396 verankert.

### Empfehlung für nächste Features
- Nach dem Merge `gh api repos/nothra/tch-gastro-services/dependabot/alerts?state=open` ausführen.
  Erwartet ist genau ein offener Alert (`braces`, #396). Danach den offenen AK in der Task-Datei
  nachweisen, sonst bleibt er unbelegt.
- Der Review in Iteration 2 konnte die Advisory-Floors nicht erneut messen (`gh api advisories/…` nicht
  freigegeben). Bei der nächsten Deps-Task die Freigabe vorab klären oder die Bulk-API nutzen.
