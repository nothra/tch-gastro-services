# Review: Task 291

Diff-Scope: `git diff origin/main...HEAD` (3 Commits, 6 Dateien) · Spec:
`docs/specs/spec-291-dependabot-alerts-schliessen.md` · Runde 1 (Korrektheit/Logik),
Runde 2 (Clean Code/Tests), Runde 3 (Architektur/Patterns) in dieser Session gefahren.

**Eigenständig verifiziert** (nicht aus der Task-Datei übernommen):

- Aufgelöste Lockfile-Versionen: `next@16.2.12`, `postcss@8.5.26`, `nanoid@3.3.18`,
  `brace-expansion@1.1.18` + `2.1.4` (+ eine nicht advisory-behaftete `5.0.7`), `sharp@0.35.3`,
  `undici@7.29.0`, `js-yaml@4.3.1` – **alle über ihrem Floor** (AK-3/AK-4/AK-6 sachlich erfüllt).
- `bash scripts/checks/tests/run-tests.sh` → **965 grün, 0 rot** (inkl. des neuen `#291`-Blocks).
- `sort -V` ist auf dieser Plattform verfügbar (`sort 2.3-Apple`) → der Floor-Vergleich ist
  portabel (macOS/BSD + GNU/busybox), Guideline „Portabilität in Gate-Skripten" gewahrt.
- Deklarierte Ranges der Parents (aus `node_modules/**/package.json`):
  `next → postcss: 8.4.31` (exakt), `next → sharp: ^0.34.5`, `postcss@8.5.26 → nanoid: ^3.3.17`,
  `minimatch@3.1.5 → brace-expansion: ^1.1.7`, `minimatch@5.1.9 → ^2.0.1`,
  `jsdom → undici: ^7.25.0`, `@eslint/eslintrc@3.3.5 → js-yaml: ^4.1.1`.
- `gh api …/dependabot/alerts` ist auch in dieser Session nicht aufrufbar → der AK-5-Blocker der
  Implementierung ist echt (Umgebung), nicht übergangen.
- Keine Routen-Änderung im Diff → `docs/routes.md` ist korrekt unangetastet (#145 n/a).

## Kritische Findings (müssen behoben werden)

- [ ] **`pnpm-workspace.yaml:38` – `nanoid@<3.3.17` ist mutmaßlich ein No-op und damit genau die
      tote Config, die dieser Task beseitigen will.** `postcss@8.5.26` deklariert selbst
      `"nanoid": "^3.3.17"` (verifiziert in
      `node_modules/.pnpm/postcss@8.5.26/node_modules/postcss/package.json:81`). Sobald der
      postcss-Override greift, kann `nanoid@3.3.15` seine Parent-Range nicht mehr erfüllen –
      pnpm muss ohnehin auf ≥ 3.3.17 auflösen, auch ohne den Eintrag. Spec-Fehlerszenario 4
      („Ein neu angelegter Override ist ein No-op … erzeugt genau die tote Config, die #169
      beseitigen will") verbietet das explizit; AK-7 misst denselben Maßstab an den
      Alt-Einträgen. **Begründung/Nachweis:** dieselbe Methode wie beim esbuild-Beleg anwenden –
      Eintrag entfernen, neu auflösen, aufgelöste `nanoid`-Version prüfen. Ist sie ≥ 3.3.17,
      Eintrag streichen (Kommentarzeile `:22` mit); bleibt sie darunter, den Grund im Kommentar
      festhalten. Der neue Test-Guard prüft die **aufgelöste** Version und bleibt in beiden
      Fällen grün – das Entfernen ist regressionsfrei möglich.
      *Gegenprobe zur Abgrenzung: für `brace-expansion` (1.x/2.x), `undici` und `js-yaml` liegen
      die Floors innerhalb der Parent-Ranges, die Parent-Version selbst ändert sich aber nicht –
      dort hält der Override den Floor real und ist kein No-op. Nur `nanoid` hängt an einem
      Parent, der im selben Schritt hochgezogen wurde.*

- [ ] **`docs/factory/lessons/build-tooling.md:51-57` – die Lesson lehrt weiter genau die
      Override-Form, die dieser PR als schädlich nachweist, und nennt #169 als offenen
      Follow-up, den dieser PR schließt.** Wörtlich: „Bei Security-Overrides die **konditionale**
      Selektor-Form nutzen (`"postcss@<8.5.10": ">=8.5.10"`)" – das offene `>=`-Ziel ist die Form,
      gegen die `pnpm-workspace.yaml:14-17` jetzt eine „immer Caret"-Regel setzt. Dazu:
      „Sobald die Parents die Patches selbst mitbringen, werden sie zu No-ops und sollten
      entfernt werden (Follow-up-Issue #169)" – die No-op-Erwartung ist für `esbuild` in diesem
      Task **empirisch widerlegt**, und #169 ist mit AK-7 erledigt. **Begründung:** Lesson
      „Auch Lesson-/Kontext-Doku im Präsens beschreibt eine Mechanik / nennt einen offenen
      Follow-up (#N) – erledigt der PR die Mechanik/den Follow-up, dieselbe Prosa im selben PR
      nachziehen" (aus #176) plus „Fix für falschen WHY-Kommentar per Grep auf Geschwister-Stellen
      ausweiten" (aus #264). Bleibt der Text stehen, führt die Regelbasis den nächsten Agenten
      genau in den `>=`-Major-Sprung zurück, den dieser PR abgeschafft hat. Zulässiger
      Erledigungsort: `/implement` jetzt **oder** `/codify` in diesem Pipeline-Lauf – aber vor
      dem Merge, nicht danach (Doku auf `main` braucht einen neuen PR).

## Wichtige Findings (sollten behoben werden)

- [ ] **`pnpm-workspace.yaml:14-17` vs. `:44-45` – die neue Regel „Ziel-Range **immer** als Caret
      innerhalb DERSELBEN Major-Linie" wird zwei Zeilen darunter von zwei Einträgen gebrochen,
      und der Schaden ist im Baum bereits messbar.** `"esbuild@<0.25.0": ">=0.25.0"` und
      `"uuid@<11.1.1": ">=11.1.1"` benutzen exakt die verbotene offene Form; `uuid` löst dadurch
      auf **14.0.1** auf, während `exceljs@4.4.0` `uuid: ^8.3.2` deklariert (Lockfile:
      `exceljs@4.4.0 → uuid: 14.0.1`) – also drei Major-Linien über dem Floor 11.1.1 und sechs
      über der deklarierten Range. Das ist der Effekt, den der neue Kommentar als Begründung
      anführt. **Fix im Scope dieses PRs:** den Absolutheitsanspruch der Regel an den Bestand
      angleichen (z. B. „für neue Einträge; die Alt-Einträge `esbuild`/`uuid` tragen noch die
      offene Form – siehe Kleinfund") – ein Kommentar, der sich selbst widerspricht, ist
      schlechter als keiner. Das **Umstellen** der beiden Alt-Ranges liegt außerhalb des
      Spec-Scopes („kein Refactoring an `pnpm-workspace.yaml` über die betroffenen
      Override-Einträge hinaus") und ist als Kleinfund abgelegt (siehe unten).

- [ ] **AK-5 unerfüllt: den sechs neuen Floors fehlen die Advisory-IDs** (`nanoid`,
      `brace-expansion` 1.x + 2.x, `sharp`, `undici`, `js-yaml`; bei `postcss:19-21` ist nur die
      Alt-GHSA genannt, die des 8.5.23-Folge-Advisories fehlt). Die Spec verlangt „Kommentar mit
      Advisory-ID, Parent-Paket und Scope" – Parent und Scope sind da, die ID nicht.
      **Einordnung:** kein Implementierungsfehler, sondern Umgebung – `gh api
      …/dependabot/alerts` ist auch in dieser Review-Session nicht freigegeben, und die IDs
      stehen nirgends im Repo. Raten wäre schlimmer als die Lücke. **→ Eskalation an den
      Menschen:** Alert-Liste einmal abrufen (oder `gh api` freigeben), IDs nachtragen; eine
      Review-/Implement-Iteration kann das nicht lösen.

- [ ] **`pnpm-workspace.yaml:41` + `:27-28` – `sharp` wird bewusst **außerhalb** der von `next`
      deklarierten Range erzwungen; die von der Spec dafür geforderte explizite Entscheidung
      fehlt.** `next@16.2.12` deklariert `"sharp": "^0.34.5"` (= `>=0.34.5 <0.35.0`), der
      Override setzt 0.35.3. Weil `sharp` eine *optionale*, keine Peer-Dependency ist, warnt
      `pnpm install` nicht – die Eskalationsschwelle aus Fehlerszenario 2 („Override erzwingt eine
      Version, die einen Peer-Konflikt auslöst … zurücknehmen und den Alert als bewusst offen
      dokumentieren") wird also nie ausgelöst, obwohl der Sachverhalt vorliegt. Der Kommentar
      erwähnt nur „Minor-Bump" und den Post-Install-Build, nicht den Range-Bruch.
      **Entlastend und ebenfalls nachtragen:** die App nutzt `next/image` nirgends
      (`grep -rn "next/image\|<Image" app components lib` → kein Treffer, keine `images`-Config in
      `next.config.ts`), `sharp` wird zur Laufzeit also nie aufgerufen – das Restrisiko ist
      praktisch null, aber genau diese Reachability-Einordnung ist die Begründung, die AK-6
      braucht und die weder Task-Datei noch Kommentar enthält. Zwei Sätze in `:27-28` bzw. in der
      Task-Notiz; alternativ (falls sauberer gewünscht) den Override fallen lassen und den Alert
      nach AK-10 Halbsatz 2 als bewusst offen dokumentieren.

## Nitpicks (optional)

- [ ] **`scripts/checks/tests/run-tests.sh:5121` / `:5147` – der Konditionalitäts-Guard sieht nur
      **quotierte** Override-Schlüssel** (`f && /^  "/`). Ein unquotierter Eintrag
      (`nanoid@<3.3.17: "^3.3.17"` – in YAML zulässig, Prettier ergänzt keine Quotes) fällt aus
      der Extraktion heraus und würde als unbedingter Eintrag **nicht** gemeldet; derselbe
      Blindfleck gilt für die postcss-Zählung. Robuster: `/^  [^ ]/` extrahieren und die Zahl der
      extrahierten Zeilen gegen die Zahl aller Nicht-Kommentar-Zeilen im `overrides:`-Block
      assertieren – dann kann kein Eintrag lautlos an der Prüfung vorbeilaufen.

- [ ] **`docs/factory/lessons/build-tooling.md:53-55` – „Nachweis ist Pflicht … nach
      `pnpm install` mit `pnpm audit` **und** `pnpm why <paket>` belegen".** `pnpm audit` ist in
      dieser Umgebung seit #228 nicht belastbar (Gzip-Decoding-Bug) und die Spec zu #291 schließt
      es ausdrücklich als Kriterium aus. Da derselbe Absatz für das kritische Finding oben
      ohnehin angefasst wird: Nachweis-Satz auf „aufgelöste Lockfile-Version + Dependabot-API"
      umstellen.

- [ ] **`pnpm-workspace.yaml:12` – „Entfernen, sobald die Parents die Patches selbst mitbringen"
      ist für `postcss` unerreichbar.** `next` pinnt `postcss` **exakt** auf `8.4.31`; dieser
      Override wird also dauerhaft gebraucht, solange der Pin steht. Ein halber Satz an `:19-21`
      erspart dem nächsten Leser die Suche nach einer Entfernbarkeit, die es nicht gibt.

## Positives

- **Die sachliche Wirkung stimmt und ist am richtigen Ort gemessen.** Alle neun Floors sind im
  **aufgelösten** Lockfile erreicht, nicht nur deklariert – genau die Verifikationsebene, die die
  Spec fordert. Der `next`-Pin ist exakt, `eslint-config-next` im Lockstep (AK-1/AK-2).
- **Der `brace-expansion`-Befund ist echte Ingenieursarbeit, nicht Spec-Abnicken.** Dass
  `<2.1.4` auch auf `1.1.15` passt und ein offenes `>=`-Ziel über die Major-Grenze springt, ist
  empirisch belegt, mit disjunkten Selektoren korrekt gelöst und im Kommentar begründet – die
  Abweichung vom Spec-Wortlaut ist transparent gemacht und inhaltlich richtig.
- **`esbuild`: der No-op-Verdacht aus #169 wurde nicht angenommen, sondern getestet** (Eintrag
  entfernen → `esbuild@0.18.20` kommt zurück) und das Ergebnis gegen die Spec-Erwartung
  dokumentiert. Genau dieses Vorgehen fehlt nur noch bei `nanoid` (Finding 1).
- **Der Test-Guard prüft die richtige Größe** – die aufgelöste Lockfile-Version je Paket **und
  Major-Linie**, fail-closed bei unlesbaren Quellen, mit zwei echten Mutationsbelegen
  (Floor-Kette und Konditionalitäts-Ausdruck), die denselben Assert-Ausdruck ausführen. Erfüllt
  die Lessons aus #214/#258/#286 sauber; kein vakuoses Grün.
- **Keine Duplikation:** in `scripts/` existierte vorher kein Versions-Vergleichs-Helper
  (`grep -rn "sort -V\|version_below"` → nur der neue Block), das #240-Muster „parallele
  Schleife daneben" ist vermieden; Helper-Namen sind sprechend und die Kommentare erklären WHY.
- **Scope-Disziplin gehalten:** kein Minor-Sprung auf `next` 16.3, keine Fremd-Updates aus #231,
  kein Umbau von `pnpm-workspace.yaml` über die betroffenen Einträge hinaus, kein neues
  Produktverhalten.

## Out-of-Scope-Funde (ADR-018/ADR-043)

- **Unterhalb der Schwelle → `docs/factory/kleinfunde.md`:** „Alt-Overrides `esbuild`/`uuid`
  tragen offene `>=`-Ziel-Ranges" (Eintrag in diesem Review-Lauf ergänzt). Kein
  Sicherheitsrisiko und kein reproduzierbarer Defekt – Tests, Typecheck und Build sind mit
  `uuid@14.0.1` grün –, aber ein latentes Risiko im Bericht-Renderer und ein Verstoß gegen die
  Regel, die dieser PR aufstellt. Aufwand: zwei Zeilen plus Verifikationslauf.
- **Kein neues Issue angelegt.** Nichts oberhalb der Schwelle gefunden: alle übrigen Funde liegen
  in den in diesem PR geänderten Dateien und sind hier zu beheben.

## Offene Akzeptanzkriterien (nicht durch Rework lösbar)

- **AK-9** (Playwright-Auth-E2E): weiterhin offen, Umgebung (kein `.env.local` im Worktree, kein
  Docker-Daemon; `.env*` ist per `.claude/settings.json` gesperrt). Vor dem Merge nachzuholen
  oder über `/post-merge-verify` abzudecken – dies ist das einzige AK, das das
  Middleware-/Auth-Bypass-Szenario abdeckt, also nicht stillschweigend fallen lassen.
- **AK-10**: planmäßig erst nach dem Merge auf dem Default-Branch prüfbar.

## Empfehlung

NEEDS_REWORK
