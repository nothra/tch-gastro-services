# Spec: Turn-Limit-Ceiling für `/implement` von 50 auf 80 anheben

## Kontext

`MAX_TURNS_CEILING` ist eine Gate-Policy-Konstante in
`scripts/checks/config-validation-check.sh` (ADR-009 §6 / ADR-010), bewusst **nicht** über
`factory.config.yml` überschreibbar – sonst könnte ein Team-Override die eigene Kosten-
Obergrenze aushebeln. `skills.implement.max_turns` steht bereits auf dem heutigen Maximum (50);
ein früherer Versuch, direkt auf 80 zu setzen, wurde vom Gate hart abgelehnt (Kommentar in
`factory.config.yml`, Zeile 46-48).

**Kein Einzelfall, sondern ein wiederkehrendes Muster – die Git-Historie von
`factory.config.yml` zeigt zwei frühere Eskalationen, die genau denselben Grund hatten:**

| # | Wert-Änderung | Auslöser |
|---|---|---|
| #102 (chore) | `max_turns` für `implement`/`pr-shepherd` erstmals angehoben | frühe Kalibrierung |
| **Task #49** (2026-07-14) | `implement` 20 → 40 | Mit Default 20 ist `/implement` **zweimal** mit „Reached max turns" abgebrochen, ohne Ergebnis. Mit 40 (manueller Retry) lief der Skill durch. |
| **Task #53** (`c300d14`, Review-Notiz `tasks/review-53.md:58`) | `implement` 40 → 50, zusätzlich `tier: light → heavy` | Sonnet 5 **riss 3× ab** bei größerem Scope (Auslagenerstattung); Tier- **und** Turn-Anhebung nötig, um durchzulaufen. 50 ist seither das Gate-Policy-**Maximum** (`MAX_TURNS_CEILING`) – ein späterer Versuch, direkt auf 80 zu setzen, wurde vom Gate abgelehnt (`factory.config.yml:46-48`). |
| **Task #324** (aktuell, s. u.) | Ceiling selbst reicht nicht mehr | `/implement` riss **erneut 3×** ab, diesmal *am bereits maximal erlaubten Wert* (50) – die Config kann diesmal nicht mehr helfen, weil die Policy-Grenze selbst erreicht ist. |

Jede der drei Eskalationsrunden hatte dasselbe Symptom: `/implement` bricht bei größerem
Scope mehrfach mit „Reached max turns" ab, ohne Ergebnis, bis der Turn-Deckel angehoben
wird. Das Muster wiederholt sich trotz zweimaliger Anhebung – ein Hinweis, dass die
*bisherige* Ceiling (50) für größer skopierte Tasks strukturell zu knapp bemessen ist, nicht
nur ein Ausreißer war.

**Aktueller Auslöser im Detail (Issue #324, `docs/factory/lessons/factory-workflow.md`
„Turn-Limit-Exhaustion", Nachtrag #324):** `PR_SHEPHERD=true bash scripts/run-pipeline.sh 324`
riss den `/implement`-Schritt bei der aktuellen Ceiling (50) **dreimal** ins Turn-Limit ab
(Task mit 15 Akzeptanzkriterien über 6 Produktionsmodule) und brach die gesamte Pipeline ab –
obwohl im Arbeitsbaum bereits ein **funktional fast fertiger, committierbarer Diff** lag (alle
laut ADR betroffenen Module geändert, Lint + Ziel-Tests grün). Ein Mensch musste den Zustand
manuell finden und fertigstellen. Der `codify-324`-Report empfiehlt, größer skopierte Tasks
mit vielen AC als reales Turn-Limit-Risiko zu behandeln.

Anders als bei #49/#53 kann diesmal keine Config-Änderung allein helfen: `/implement` steht
bereits auf dem Gate-Policy-Maximum. Nur eine Anhebung der **Ceiling selbst** – mit
dokumentierter Architektur-Begründung, damit sie kein stilles Aushebeln des Kosten-Guards ist
(ADR-009 §6) – schafft wieder Spielraum.

Eine reine `factory.config.yml`-Änderung reicht nicht: `MAX_TURNS_CEILING` ist Gate-Policy,
keine Config-Zahl. Die eigentliche Entscheidung – *warum* 80 statt eines kleineren Werts – ist
eine **Architektur-Entscheidung** (ADR-009 §6 / ADR-010) und läuft über `/architecture`, nicht
über diesen Spec-Schritt selbst.

## Scope

**Inbegriffen:**
- Anheben der Policy-Konstante `MAX_TURNS_CEILING` in `scripts/checks/config-validation-check.sh`
  von `50` auf `80`, inkl. aktualisiertem Kommentar-Verweis auf die neue Architektur-Entscheidung.
- Anheben von `skills.implement.max_turns` in `factory.config.yml` von `50` auf `80`, mit
  aktualisiertem `@reason`-Kommentar (Bezug auf Incident #324 statt der überholten
  „ein Versuch mit 80 wurde abgelehnt"-Notiz).
- Architektur-Entscheidung, die die neue Ceiling **begründet** und ADR-009 §6 / ADR-010 (bzw.
  eine neue, darauf verweisende Amendment-ADR) auf den neuen Wert nachzieht (Drift-Regel:
  „PR ändert die von einer ADR namentlich beschriebene Mechanik → ADR-Beschreibung im selben
  PR mitpflegen", `PROJECT-CONTEXT.md`).
- Testerweiterung in `scripts/checks/tests/run-tests.sh`: Gate akzeptiert `max_turns: 80`
  (Positiv-Fixture) und lehnt `max_turns: 81` weiterhin fail-closed ab (Grenzfall-Negativ-Fixture).

**Nicht inbegriffen:**
- Änderung anderer Skill-Werte (`pr-shepherd`, `codify`, `test`) – bleiben unverändert (20/30/40).
- Fix des Orchestrator-Defekts „Retry ohne `git status`-Prüfung" (Issue #275) – separates Issue,
  nicht Teil dieser Task.
- Änderung des Validierungs-**Mechanismus** selbst (yq-natives Gate, abgeleitete Key-Oberfläche
  aus den Defaults, ADR-010-Entscheidung) – nur der Zahlenwert der Ceiling ändert sich.
- Änderung des Defaults in `factory.defaults.yml` (Default bleibt unverändert; nur der
  Team-Override in `factory.config.yml` nutzt den neuen Spielraum).
- `MIN_TIER_REQUIRED`/`model_tiers.heavy`-Policy (Task 241/249) – unberührt.

## Akzeptanzkriterien

- [ ] GIVEN die dokumentierte Eskalationshistorie (Task #49: 20→40, Task #53: 40→50 – jeweils
      nach mehrfachem Turn-Limit-Abbruch – und aktuell #324: erneut 3× Abbruch **am bereits
      maximal erlaubten Wert** 50, trotz fast fertigem Diff über 6 Module/15 AC) WHEN die
      Architektur-Entscheidung getroffen wird THEN referenziert ADR-009 §6 bzw. ADR-010 (oder
      eine neue, darauf verweisende Amendment-ADR) das **wiederkehrende Muster** (nicht nur den
      Einzel-Incident #324) explizit als Begründung für die neue Ceiling 80.
- [ ] GIVEN `scripts/checks/config-validation-check.sh` WHEN `MAX_TURNS_CEILING` gelesen wird
      THEN ist der Wert `80` (nicht mehr `50`), mit aktualisiertem Kommentar-Verweis auf die
      neue Architektur-Entscheidung statt nur auf ADR-009 §6 / ADR-010 allein.
- [ ] GIVEN `factory.config.yml` WHEN der Override `skills.implement.max_turns` gelesen wird
      THEN ist der Wert `80`, und der `@reason`-Kommentar verweist auf Incident #324 statt auf
      die überholte Ablehnungs-Notiz („ein Versuch mit 80 wurde ... hart abgelehnt").
- [ ] GIVEN das Validierungs-Gate WHEN ein Override `max_turns: 80` gesetzt wird THEN akzeptiert
      das Gate ihn (Exit 0).
- [ ] GIVEN das Validierungs-Gate WHEN ein Override `max_turns: 81` gesetzt wird THEN lehnt das
      Gate ihn weiterhin fail-closed ab (Exit ≠ 0) – die neue Ceiling bleibt eine harte
      Obergrenze, kein Freibrief nach oben.
- [ ] GIVEN die effektive Config nach dem Merge WHEN `run-pipeline.sh` sie für `/implement` lädt
      THEN nutzt der Lauf `max_turns=80` (kein stiller Fallback auf den alten Wert).
- [ ] GIVEN andere Skills (`pr-shepherd`, `codify`, `test`) WHEN die effektive Config nach dieser
      Änderung gelesen wird THEN bleiben ihre `max_turns`-Werte unverändert (20/30/40).
- [ ] GIVEN die betroffenen ADRs (009 §6 / 010 bzw. eine neue Amendment-ADR) WHEN sie im selben
      PR geändert werden THEN ist ihr Status/Text konsistent mit der neuen Ceiling – keine Drift
      zwischen ADR-Prosa und Gate-Skript.

## Fehlerszenarien

- [ ] Ein Override mit `max_turns` zwischen 51 und 80 für einen **anderen** Skill (nicht
      `implement`) wird vom Gate ebenfalls akzeptiert, da die Ceiling global gilt (kein
      Skill-spezifisches Limit – bereits in ADR-010 „Konsequenzen" so festgelegt, keine neue
      Regel nötig, aber im PR nicht überraschend, weil hier dokumentiert).
- [ ] Ein Tippfehler-Override (`max_turn` statt `max_turns`) bleibt weiterhin fail-closed
      (unverändert von dieser Task – Regression-Check, kein neues Verhalten).
- [ ] `max_turns: 0` bzw. negative/nicht-Integer-Werte bleiben weiterhin fail-closed (unverändert
      – Regression-Check).

## Offene Fragen

- [ ] Amendment-Form: Soll die Architektur-Entscheidung als Status-Update/neuer Abschnitt in
      ADR-010 selbst erfolgen, oder als eigenständige neue ADR (nächste freie Nummer), die auf
      009/010 verweist (analog zum bereits etablierten Muster ADR-046 „Erweitert ADR-036")? →
      Entscheidung liegt bei `/architecture`.
- [ ] Soll `docs/factory/lessons/factory-workflow.md` (Nachtrag zum #324-Eintrag) einen kurzen
      Hinweis „Ceiling seit #348 auf 80 angehoben" erhalten, um Drift zwischen Lesson-Text und
      aktuellem Stand zu vermeiden? Empfehlung: ja, kurzer Nachtrag – kein hartes AC, da die
      Lesson selbst nicht falsch wird (sie beschreibt den Incident bei der *damaligen* Ceiling).
