# Review: Task 264

> **Review-Runde 2** (Iteration 2 von max. 3, Circuit Breaker). Diff-Scope:
> `git diff origin/main...HEAD` → `scripts/checks/tests/run-tests.sh` (+125),
> `docs/factory/lessons/factory-workflow.md`, `docs/factory/PROJECT-CONTEXT.md`,
> `docs/specs/spec-264-…md` (neu), `tasks/task-264-…md` (neu).
>
> **Runde 1 (1 kritisch / 2 wichtig / 3 Nitpicks) ist vollständig abgearbeitet** – siehe
> „Positives". Die Findings unten sind **neu** und betreffen ausschließlich den in der
> Rework-Runde hinzugekommenen Drift-Guard bzw. die Spec-Prosa.
>
> **Verifikations-Hinweis (unverändert zu Runde 1):** Ein eigener Lauf von
> `scripts/checks/tests/run-tests.sh` war auch in dieser Session nicht möglich – die
> Ausführung ist freigabepflichtig und wurde nicht erteilt. Alle Aussagen unten sind statisch
> gegen `scripts/run-pipeline.sh`, `scripts/lib/verify-final-state.sh`, `scripts/factory-poll.sh`
> und die Datei selbst belegt; die Zahlen 803 grün / 0 rot sowie der Red-Beleg (`env -u` an
> `#101` entfernt → 802/1 rot) stammen aus der Implementierungsphase und wurden nicht
> reproduziert.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] `scripts/checks/tests/run-tests.sh:3534` (Drift-Guard, Erkennungsmuster): Der Guard
      erkennt eine Aufrufstelle nur über das Literal
      `bash "<pfad>run-pipeline.sh"` – doppelte Anführungszeichen **und** der ausgeschriebene
      Dateiname im Pfad. Die in **derselben Datei bereits etablierte** Schreibweise über eine
      Pfad-Variable entkommt ihm vollständig: `PIPELINE="$FACTORY_ROOT/scripts/run-pipeline.sh"`
      (`:181`, genutzt in `cp "$PIPELINE" …` beim Scaffolding der betroffenen Blöcke selbst,
      `:3427`) und `PIPELINE214="$SCRIPTS_DIR/run-pipeline.sh"` (`:2142`). Schreibt jemand einen
      neuen realen Testblock als `bash "$PIPELINE" 99` – naheliegend, weil die Variable direkt
      daneben schon für `cp` benutzt wird –, meldet der Guard **kein** MISSING, die Assertion
      „ALLE realen `run-pipeline.sh`-Aufrufe … tragen `env -u`" (`:3573`) bleibt grün, und die
      Untergrenze `>= 5` (`:3568`) wird von den fünf bereits gehärteten Stellen erfüllt. Damit
      ist genau die stille Regressionsklasse offen, die der Guard laut seinem eigenen
      Kommentar (`:3511–3515`) strukturell schließen soll – der Guard *behauptet* eine
      Vollständigkeit, die sein Muster nicht trägt. Dasselbe gilt für unquotierte
      (`bash $T/scripts/run-pipeline.sh`) und direkt ausgeführte Formen
      (`"$T/scripts/run-pipeline.sh" 78`). Das Review aus Runde 1 hatte als Auflösung (a) „jeden
      `bash …/run-pipeline.sh`-Aufruf" verlangt; umgesetzt ist eine Teilmenge davon.
      **Auflösung:** Muster so erweitern, dass es die Pfad-Variablen-Formen mitfasst (z. B.
      zusätzlich `bash "\$PIPELINE[0-9]*"` / `bash "\$[A-Z_]*PIPELINE[^"]*"`), oder – robuster
      und fail-closed – die Logik umdrehen: jede logische Kommandozeile mit `bash ` **und** einem
      Pipeline-Bezug (Dateiname *oder* bekannte Pfad-Variable) muss entweder `--dry-run` oder
      `env -u PR_SHEPHERD -u FACTORY_STAGE` tragen, wobei Nicht-Ausführungs-Kontexte (`cp `,
      `grep `, `printf `, Zuweisung) explizit ausgenommen werden. Beide Kontrollen aus `:3543–3561`
      um je einen Fall in der neuen Schreibweise ergänzen (Positiv-Kontrolle mit
      `bash "$PIPELINE" 1` → muss erkannt werden), sonst wandert die Lücke nur.
      *Nebenbefund, kein eigenes Finding:* Der transitive Vektor
      (`factory-poll.sh:171` startet `run-pipeline.sh`) ist aktuell **kein** Leck – die beiden
      realen `factory-poll.sh`-Aufrufe in der Suite (`:505`, `:538`) laufen gegen einen
      `run-pipeline.sh`-Stub (`:491`, `:523`), und `factory-poll.sh` liest `PR_SHEPHERD`/
      `FACTORY_STAGE` selbst nicht. Ein Halbsatz im Guard-Kommentar, dass der Guard nur
      **direkte** Aufrufe abdeckt, macht diese Grenze für die nächste Person sichtbar.

- [ ] `docs/specs/spec-264-env-isolation-run-tests.md:36–49` (Kontext-Tabelle), `:54–64`
      (Scope) und `:78–100` (Akzeptanzkriterien): Die Spec ist in **diesem** PR entstanden und
      beschreibt die Lieferung inzwischen falsch. Sie nennt durchgängig **vier** reale
      Aufrufstellen („Von den … gefundenen `run-pipeline.sh`-Aufrufen sind **vier real**",
      Scope: „Kurzer Code-Kommentar an den **vier** gehärteten Aufrufstellen") – geliefert sind
      **fünf** gehärtete Aufrufstellen, weil der neue `#264`-Regressionstest selbst eine fünfte
      reale Aufrufstelle ist (`:3488–3492`). Und der in der Rework-Runde
      hinzugekommene **Drift-Guard** (`:3510–3573`) – ein eigenständiges, dauerhaftes Artefakt
      mit sechs Assertionen – kommt in Scope und Akzeptanzkriterien überhaupt nicht vor. Konkret
      sichtbare Folge: Die Untergrenze `>= 5` im Guard (`:3568`) ist gegen die Spec nicht
      herleitbar; wer sie prüft, findet dort vier. **Begründung:** Verstoß gegen die kodifizierte
      Projektregel „Frisch im selben PR erstellte/geänderte Spec braucht denselben Drift-Check
      wie ADRs/Lessons – Code gegen die eigene Spec-Prosa spiegeln" (aus #253, Index in
      `PROJECT-CONTEXT.md`, Trigger `/review`) – dieselbe Klasse wie das kritische Finding K1 aus
      Runde 1, nur auf der Spec statt auf der Lesson. Die Task-Datei wurde nachgezogen, die Spec
      nicht. **Auflösung:** In der Spec-Tabelle die fünfte (durch den Regressionstest entstandene)
      Aufrufstelle ergänzen bzw. den Zählungssatz relativieren, und Scope + ein AK um den
      Drift-Guard erweitern (Invariante: „jede reale Aufrufstelle bleibt gehärtet, eine neue
      ungehärtete macht die Suite rot"). Der Nachtrag darf als „ergänzt in der Umsetzung"
      gekennzeichnet werden – Hauptsache, Spec und Code sagen dasselbe.

## Nitpicks (optional)

- [ ] `scripts/checks/tests/run-tests.sh:3528`: `unhardened_pipeline_calls` gibt **alle** realen
      Aufrufstellen aus (`OK` *und* `MISSING`), nicht nur die ungehärteten – der zweite Konsument
      (`dg264_calls`/`dg264_total`, `:3566–3567`) verlässt sich genau darauf. Der Name verspricht
      etwas anderes und trifft die Regel „keine irreführenden Namen: wenn `getUser` auch Daten
      schreibt, ist das falsch" (`clean-code.md` → Naming). `audit_pipeline_calls` oder
      `pipeline_call_isolation_report` beschreibt beide Nutzungen ehrlich; der Exit-Code bleibt
      wie er ist.

- [ ] `scripts/checks/tests/run-tests.sh:3536`: Der Guard verlangt die exakte Flag-Reihenfolge
      `env -u PR_SHEPHERD -u FACTORY_STAGE`. Die semantisch identische Umkehrung
      (`-u FACTORY_STAGE -u PR_SHEPHERD`) gilt als MISSING → False-Positive-Rot bei korrektem
      Code. Die Richtung ist fail-closed und damit vertretbar (lieber ein Fehlalarm als ein
      Leck), aber ein Halbsatz im Kommentar („bewusst kanonische Schreibweise erzwungen, nicht
      nur Semantik") spart der nächsten Person die Diagnose am roten Gate.

- [ ] `scripts/checks/tests/run-tests.sh:3575–3586`: Der `#264 K1`-Doku-Regressionsblock hat
      keine eigene `echo`-Überschrift und erscheint im Testoutput unter
      „#264 Drift-Guard: reale run-pipeline.sh-Aufrufe in run-tests.sh sind env-isoliert" (`:3522`),
      obwohl er Lesson-/Index-Prosa prüft. Eine eigene `echo`-Zeile analog zur Konvention der
      Datei (jeder Block nennt sein Thema) macht ein rotes Ergebnis sofort zuordenbar.

## Positives

- **Alle sechs Findings aus Runde 1 sind sachlich geschlossen, nicht wegdiskutiert.**
  - *K1 (Lesson-Drift):* Überschrift und Schlusssatz in `lessons/factory-workflow.md:827,849–857`
    sowie die Index-Zeile in `PROJECT-CONTEXT.md:301` nennen jetzt den Erledigt-Stand; die
    weiterhin gültige Diagnose-Regel bleibt stehen und ist sauber vom **Stand**-Absatz getrennt.
    Zusätzlich gegen stilles Zurückdrehen abgesichert (Negativ- + Positiv-`grep -qF`, `:3578–3586`),
    Testphrasen je auf einer Zeile – Lesson #240/#249 korrekt beachtet.
  - *W1 (falsche WHY-Kommentare):* `:2624–2627` und `:3400–3403` behaupten keine Phase-7-Kausalität
    mehr, sondern nennen den tatsächlichen Abbruchpunkt (Lint-Gate bzw. Interrupt-Sentinel in
    Phase 1) und deklarieren sich als Konsistenz-Härtung – deckungsgleich mit `spec-264…md:46–49`.
    Der real beobachtete Vektor wird nur noch an den beiden `#212 W3`-Stellen behauptet, wo er
    stimmt.
  - *W2 (Abdeckung):* Auflösung (a) gewählt, Lücke geschlossen statt in ein Issue verschoben.
  - *N1–N3:* Wording entschärft, Idempotenz-Kopplung des dritten `$TMP_E2E`-Laufs explizit
    gemacht, `e2e_env` → `e2e_dirty_env` umbenannt.
- **Der `awk`-Blockextraktor ist handwerklich korrekt.** Die Fortsetzungszeilen werden vor der
  Bewertung zur logischen Kommandozeile zusammengefügt (`:3530–3533`) – Lesson #114/#255/#261/#265
  richtig angewandt statt Fragment-Grep. Token-Verschmelzung beim Zusammenfügen kann nicht
  auftreten: die Fortsetzungszeilen sind eingerückt, das Trennzeichen bleibt erhalten. Der
  Selbstreferenz-Fallstrick ist erkannt und über `RP_NAME` + `%s` gelöst (`:3544–3548`) – die
  Fixture-Zeilen sehen für den Guard nicht wie Aufrufstellen aus; gegengeprüft: auch die
  `awk`-Programmzeile `:3534` matcht ihr eigenes Muster nicht.
- **Guard-Kontrollen sind vollständig und diskriminierend.** Positiv-Kontrolle (ungehärtet →
  erkannt), zwei Negativ-Kontrollen (gehärtet mehrzeilig; `--dry-run` ohne `env -u` bleibt
  erlaubt) und eine Nicht-Vakuitäts-Untergrenze. Die Untergrenze statt einer exakten Zahl ist die
  richtige Wahl – eine künftige *gehärtete* Stelle macht den Guard nicht rot. Der Red-Beleg wurde
  laut Task-Notiz am **realen** Ziel geführt (`env -u` an `#101` entfernt → genau die
  Guard-Assertion rot), nicht nur gegen Fixtures (Lesson #214).
- **Der Guard steht bewusst außerhalb des `HAS_YQ`-Gates** (`:3508` schließt den yq-Block, der
  Guard beginnt `:3510`) – er läuft also auch in einer Umgebung ohne `yq`, in der der
  Verhaltenstest übersprungen wird. Das ist genau richtig: der strukturelle Schutz darf nicht an
  derselben Voraussetzung hängen wie der Verhaltenstest.
- **Beide Assertion-Signale des Verhaltenstests sind gegen die Quelle verifiziert.** `Phase 7`
  existiert als Ausgabe ausschließlich im `PR_SHEPHERD`-Zweig (`run-pipeline.sh:486`); und
  `Endzustand verifiziert (sauber, gepusht)` ist tatsächlich diskriminierend – bei
  `pr_shepherd=true` hängt `run-pipeline.sh:512–514` `, PR merge-ready/gemergt` **vor** die
  schließende Klammer, der gesuchte Literal-String kann dann nicht matchen. Die entschärfte
  Kommentar-Formulierung („zusätzlicher Positiv-Beleg, kein zweiter unabhängiger Beweis",
  `:3499–3500`) trifft den Sachverhalt jetzt exakt.
- **Die divergenzerzeugende Aktion bleibt echt.** Der `export` innerhalb der
  Kommando-Substitutions-Subshell (`:3488`) stellt den in #262 beobachteten Zustand her, ohne
  nachfolgende Blöcke zu maskieren – die Begründung steht am Code und in der Task-Notiz
  (Lesson #253 korrekt umgesetzt).
- **Kein ADR, sauber begründet** (Prüfung gegen die vier ADR-Trigger aus Spec-002/ADR-002);
  keine Routen-Änderung → `docs/routes.md` zu Recht unberührt; `skip_yq`-Zweig blockweise
  mitgepflegt; `rm -rf`-Aufräumzeile korrekt hinter den neuen Block gezogen.

## Empfehlung

NEEDS_REWORK

> **Einordnung für die Rework-Runde (Iteration 2 von 3):** Alle sechs Akzeptanzkriterien der
> Spec sind erfüllt – die fachliche Härtung selbst ist korrekt, belegt und gegen Regression
> geschützt. Die beiden wichtigen Findings betreffen die **Reichweite** des neu hinzugekommenen
> Drift-Guards (W1) und die **Doku-Kohärenz** der im selben PR entstandenen Spec (W2). Beide sind
> eng umrissen und ohne Verhaltensänderung an der Härtung zu beheben; die Rework-Runde sollte
> sich strikt darauf beschränken.
