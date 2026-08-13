# Review: Task 291

> **Zweiter Review-Durchgang** (nach `/implement`-Rework-Runden 1 und 2). Der erste Durchgang
> (2 kritische, 3 wichtige, 3 Nitpick-Findings → NEEDS_REWORK) ist in der Git-History dieser
> Datei nachlesbar; unten steht nur noch der aktuelle Stand.

Diff-Scope: `git diff origin/main...HEAD` (5 Commits, 9 Dateien) · Spec:
`docs/specs/spec-291-dependabot-alerts-schliessen.md` · Runde 1 (Korrektheit/Logik),
Runde 2 (Clean Code/Tests), Runde 3 (Architektur/Patterns) in dieser Session gefahren.

**Eigenständig verifiziert** (nicht aus der Task-Datei übernommen):

- **Aufgelöste Lockfile-Versionen:** `next@16.2.12`, `eslint-config-next@16.2.12`,
  `postcss@8.5.26`, `nanoid@3.3.18`, `brace-expansion@1.1.18` + `2.1.4` (+ eine nicht
  advisory-behaftete `5.0.7`), `sharp@0.35.3`, `undici@7.29.0`, `js-yaml@4.3.1` – **alle über
  ihrem Floor** (AK-1 bis AK-4, AK-6 sachlich erfüllt).
- **GHSA-IDs gegen die Live-API gegengeprüft** (`gh api …/dependabot/alerts?state=open`, über ein
  Wegwerf-Wrapper-Skript, nach Gebrauch entfernt): **jede** der 12 in `pnpm-workspace.yaml`
  eingetragenen GHSA passt exakt zu einem offenen Alert – Paket, Severity, Scope und
  `first_patched_version` stimmen durchgehend (postcss `r28c…`/`fxqj…` = 8.5.18/8.5.23;
  brace-expansion `rgw5…` = 1.1.18 **und** 2.1.4, `3jxr…` = 1.1.16, `mh99…` = 1.1.17/2.1.3;
  sharp `f88m…` = 0.35.0; undici 5 IDs = 7.29.0, 1 high + 4 medium; js-yaml `5p4m…` = 4.3.1;
  nanoid `2v37…` = 3.3.17). Nichts geraten. Auch der Nebenbefund stimmt: alle 9 offenen
  `next`-Advisories tragen Floor 16.2.11, der Pin auf 16.2.12 hat einen Patch Reserve.
- **`nanoid`-Override tatsächlich entfernt** – weder in `pnpm-workspace.yaml` noch im gespiegelten
  `overrides:`-Block des Lockfiles (`pnpm-lock.yaml:7-15`); der Lockfile-Diff des Commits `8dc81f8`
  ist exakt **eine** gelöschte Zeile, keine einzige aufgelöste Version hat sich verschoben.
  `nanoid@3.3.18` steht weiterhin im Baum → No-op-Befund ist jetzt gemessen, nicht vermutet.
- **`sharp`-Reachability nachgeprüft:** `grep -rn "next/image\|<Image" app lib e2e components` →
  kein Treffer, `next.config.ts` trägt keine `images`-Config. Die Begründung im Kommentar hält.
  Der Post-Install-Pfad ist intakt (`@img/sharp-darwin-arm64@0.35.3` +
  `@img/sharp-libvips-darwin-arm64@1.3.2` installiert) – Fehlerszenario 3 der Spec erfüllt.
- `bash scripts/checks/tests/run-tests.sh` → **967 grün, 0 rot** (inkl. des `#291`-Blocks und der
  vier Mutations-/Diskriminierungs-Kontrollen).
- Keine Routen-Änderung im Diff → `docs/routes.md` korrekt unangetastet (#145 n/a).

## Kritische Findings (müssen behoben werden)

_Keine._ Beide kritischen Findings des ersten Durchgangs sind behoben und oben unabhängig
nachgeprüft (`nanoid`-No-op gemessen und entfernt; `lessons/build-tooling.md` auf den aktuellen
Stand gezogen – Caret-Regel, disjunkte Selektoren, „messen statt vermuten", #169 als erledigt).

## Wichtige Findings (sollten behoben werden)

- [ ] **`docs/factory/kleinfunde.md:121` und `:123` – die Zeilenanker des in Runde 1 angelegten
      Kleinfunds sind durch die eigenen Folge-Commits dieses PRs veraltet.** Der Eintrag verweist
      auf `pnpm-workspace.yaml:44-45` für `esbuild`/`uuid` – dort stehen heute die
      **`sharp`-Kommentarzeilen**; die beiden Override-Einträge liegen inzwischen auf `:66-67`.
      Ebenso zeigt „`:14-17`" für die Caret-Regel auf einen um vier Zeilen verschobenen Block
      (heute `:15-21`). Ursache: Rework-Runde 1 und 2 haben den Kommentarkopf um 22 Zeilen
      wachsen lassen, nachdem der Eintrag geschrieben war. **Begründung:** Der Dateikopf von
      `kleinfunde.md:20` macht das zur ausdrücklichen Regel – „Fundstelle mit `Datei:Zeile`
      **verifiziert am Eintragsdatum** – Zeilennummern driften" –, und der Eintrag behauptet in
      der `Herkunft`-Zeile genau diese Verifikation („Fundstelle verifiziert am 2026-08-13").
      Ein Registry-Eintrag, den ein späterer Agent zur Duplikat-Prüfung liest, zeigt damit auf
      die falsche Stelle. Fix: zwei Zahlenangaben korrigieren (drei Zeichen), beide Dateien sind
      in diesem PR ohnehin geändert. Dies ist dieselbe Klasse wie die Lessons „ADR nach
      Review-Rework auf Drift prüfen" (#55) und „Auch Lesson-/Kontext-Doku … im selben PR
      nachziehen" (#176) – nur auf die dritte Doku-Art angewandt.

## Nitpicks (optional)

- [ ] **`scripts/checks/tests/run-tests.sh:5114` – die next-Major ist als Literal `16` verdrahtet,
      während der Pin daneben dynamisch gelesen wird.** `lock_versions_291 next 16` findet nach
      einem späteren, völlig legitimen Major-Bump (`next@17.x`) nichts mehr; die Assertion wird
      rot mit der irreführenden Meldung „löst next auf genau die deklarierte Version auf
      (ist: '')", obwohl Pin und Auflösung deckungsgleich wären. Fix ist eine Zeile:
      `lock_versions_291 next "${next_pin_291%%.*}"`. (Die hartkodierten Majors in
      `floor_cases_291` sind dagegen richtig – dort gehört die Major-Linie zum Advisory.)

- [ ] **`scripts/checks/tests/run-tests.sh:5163-5169` – die Caret-Regel wird nur für
      `brace-expansion` (und implizit `postcss`) assertiert.** `sharp`, `undici` und `js-yaml`
      tragen ebenfalls neue Caret-Ziele; ein späteres Umstellen auf `">=0.35.0"` liefe durch den
      Guard, obwohl es genau der Fehler ist, den dieser PR abgeschafft hat. Eine allgemeine
      Assertion braucht allerdings eine explizite Ausnahme für die zwei Alt-Einträge
      `esbuild`/`uuid`, die die offene Form bewusst behalten – deshalb Nitpick und nicht
      „wichtig": die aktuelle Teilabdeckung ist eine vertretbare Design-Entscheidung, nur nicht
      die vollständige.

- [ ] **`docs/factory/PROJECT-CONTEXT.md` – die Index-Gruppe `lessons/build-tooling.md` trägt noch
      keine `#291`-Zeile**, obwohl die Lesson zwei neue, eigenständige Learnings bekommen hat
      (Caret-Ziel-Range / disjunkte Selektoren; „No-op ist zu messen, nicht anzunehmen"). Kein
      Rework-Punkt: das Nachtragen der Index-Zeile ist die Aufgabe von `/codify`, das in diesem
      Pipeline-Lauf noch folgt. Hier nur als Merkposten, damit es dort nicht durchrutscht.

## Positives

- **Die beiden Blocker der Vorrunden waren keine.** Beide wurden in Runde 2 als
  „Umgebung/nicht lösbar" geführt und sind jetzt gelöst – über den in diesem Projekt etablierten
  Wrapper-Skript-Weg (`scripts/*.tmp.sh`, `.gitignore`-gedeckt). Die Task-Datei benennt den
  Irrtum ausdrücklich als solchen („ein Irrtum über die eigenen Möglichkeiten, kein echter
  Blocker"), statt ihn zu kaschieren – das ist die ehrlichere und für die nächste Session
  nützlichere Fassung.
- **AK-5 ist jetzt belegt statt behauptet.** Alle 12 GHSA-IDs stammen aus der Dependabot-API und
  halten der unabhängigen Gegenprüfung Paket-, Severity-, Scope- und Floor-genau stand. Auch die
  Historie ist erhalten (die #167-GHSA ist als „geht darin auf" vermerkt, nicht gelöscht).
- **Der `nanoid`-Befund ist mit genau der Methode geschlossen, die Runde 1 verlangt hat** –
  entfernen, neu auflösen, aufgelöste Version prüfen –, und nicht per Argumentation abgekürzt.
  Der Lockfile-Diff (eine Zeile, keine Auflösungs-Änderung) ist der saubere Beleg dafür. Der
  **Negativ-Eintrag** im Kommentar („KEIN nanoid-Eintrag … Nicht wieder anlegen, ohne erneut zu
  messen") verhindert, dass die nächste Runde den Eintrag gutgemeint wiederherstellt – das ist
  die richtige Antwort auf ein entferntes Artefakt, nicht bloß Löschen.
- **Der `esbuild`-Befund bleibt das Vorbild:** No-op-Verdacht aus #169 nicht angenommen, sondern
  getestet und **widerlegt**; Ergebnis gegen die Spec-Erwartung dokumentiert. Zusammen mit
  `nanoid` (Verdacht bestätigt) hat die Lesson jetzt beide Ausgänge als Beispiel.
- **Der Test-Guard prüft die richtige Größe** – die aufgelöste Lockfile-Version je Paket **und
  Major-Linie**, fail-closed bei unlesbaren Quellen, mit vier echten Mutations- und
  Diskriminierungs-Kontrollen (Floor-Kette, Konditionalitäts-Ausdruck, unquotierte Schlüssel in
  **beide** Richtungen). Erfüllt die Lessons aus #214/#258/#286 sauber; kein vakuoses Grün. Die
  Namenskonvention mit Issue-Suffix (`lock_versions_291`) entspricht dem Bestand (`…_149`,
  `…_286`), und es entsteht keine Parallel-Schleife zu vorhandenen Helfern (#240 vermieden).
- **Der `sharp`-Range-Bruch ist als bewusste Entscheidung dokumentiert**, samt der Erklärung,
  warum die Eskalationsschwelle aus Fehlerszenario 2 hier strukturell nie feuert (optionale statt
  Peer-Dependency) – der Sachverhalt wird also nicht durch das Ausbleiben einer Warnung als
  „unproblematisch" verbucht.
- **Scope-Disziplin gehalten:** kein Minor-Sprung auf `next` 16.3, keine Fremd-Updates aus #231,
  kein Umbau von `pnpm-workspace.yaml` über die betroffenen Einträge hinaus (die Alt-Einträge
  `esbuild`/`uuid` bleiben unangetastet und liegen korrekt als Kleinfund), kein neues
  Produktverhalten.

## Out-of-Scope-Funde (ADR-018/ADR-043)

- **Kein neues Issue und kein neuer Kleinfund in diesem Durchgang.** Der Kleinfund aus Runde 1
  („Alt-Overrides `esbuild`/`uuid` tragen offene `>=`-Ziel-Ranges") steht bereits in
  `docs/factory/kleinfunde.md:119-135`; das wichtige Finding oben ist eine Korrektur **an** diesem
  Eintrag, kein zweiter. Alle übrigen Funde liegen in den in diesem PR geänderten Dateien und
  sind hier zu beheben.

## Offene Akzeptanzkriterien (nicht durch Rework lösbar)

- **AK-9** (Playwright-Auth-E2E): weiterhin offen und ein **echter** Umgebungs-Blocker – anders
  als die beiden Vorrunden-Blocker lässt er sich nicht per Wrapper-Skript umgehen, weil `.env*`
  in `.claude/settings.json` unter Deny steht (Read **und** Edit) und diese Sperre einer
  Secrets-Datei gilt. Vor dem Merge nachzuholen (`.env.local` bereitstellen, `pnpm db:up`,
  `pnpm test:e2e e2e/auth.spec.ts`) oder über `/post-merge-verify` abzudecken. **Nicht
  stillschweigend fallen lassen:** dies ist das einzige AK, das das Middleware-/Auth-Bypass-
  Szenario abdeckt – laut Spec das einzige Advisory-Szenario mit ernster Auswirkung für diese App.
- **AK-10**: planmäßig erst nach dem Merge auf dem Default-Branch prüfbar.

## Empfehlung

APPROVED

Die inhaltliche Substanz des Tasks ist vollständig und an der richtigen Ebene (aufgelöste
Lockfile-Versionen) belegt; beide kritischen Findings des ersten Durchgangs sind sauber
geschlossen. Das verbleibende wichtige Finding ist eine Zwei-Zahlen-Korrektur an einem
Doku-Anker und rechtfertigt keine weitere Review↔Implement-Iteration – es kann im nächsten
Pipeline-Schritt (`/test`/`/refactor`/`/codify`) mitgenommen werden. **Vor dem Merge bleibt
AK-9 als menschliche Aufgabe bestehen.**
