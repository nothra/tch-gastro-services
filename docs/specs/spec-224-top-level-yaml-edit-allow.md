# Spec: Top-Level-Konfigurationsdateien ohne Permission-Prompt bearbeitbar

## Kontext

`.claude/settings.json` gibt Schreibzugriff über zwei Muster-Klassen frei: **Verzeichnis-Globs**
(`Edit(app/**)`, `Edit(scripts/**)`, `Edit(config/**)`, …) und einige **Top-Level-Extensions**
(`Edit(*.ts)`, `Edit(*.tsx)`, `Edit(*.mjs)`, `Edit(*.json)`, `Edit(*.md)` – eingeführt mit #88).
Eine Datei im Repo-Root, die in **kein** freigegebenes Verzeichnis fällt und **keine** dieser
Extensions trägt, hat damit keine Allow-Regel. Für YAML (`*.yml`/`*.yaml`) fehlt der Eintrag
vollständig.

In einer interaktiven Session ist das eine Rückfrage. In einem Stage-3-Lauf
(`run-pipeline.sh` → `claude --print`, `FACTORY_STAGE=3`) gibt es niemanden, der sie beantwortet:
Der Agent bleibt blockiert (ADR-019 §Kontext).

**Beobachteter Vorfall (Task 201 / PR #222):** `/implement` sollte drei inerte Skill-Einträge aus
`factory.defaults.yml` (Repo-Root, `*.yml`) entfernen. Der Agent fragte über drei
Rework-Iterationen hinweg nach Schreibfreigabe, bekam sie im automatisierten Lauf nie, `/review`
blieb konsequent `NEEDS_REWORK`, und nach zwei nicht-konvergierenden Review↔Implement-Iterationen
löste der Circuit Breaker aus. Der Fix musste manuell in einer interaktiven Session nachgezogen
werden.

Die Lücke ist nicht auf `factory.defaults.yml` beschränkt. Getrackte Top-Level-YAML-Dateien sind
heute:

| Datei | Von Agenten zu ändern? |
|-------|------------------------|
| `factory.defaults.yml` | ja – Factory-Konfiguration (Vorfall #222) |
| `factory.config.yml` | ja – Projekt-Overrides (ADR-009) |
| `pnpm-workspace.yaml` | ja – `overrides`/pnpm-Settings gehören laut Lesson aus #167 genau hierhin |
| `docker-compose.yml` | ja – lokale Infrastruktur |
| `pnpm-lock.yaml` | **nein** – generiertes Lockfile, nie von Hand editieren |

**Ziel:** Ein Stage-3-Agent kann Top-Level-YAML-Konfiguration im Rahmen seines Task-Scopes ändern,
ohne dass ein unbeantwortbarer Permission-Prompt den Lauf blockiert – während die
#88-Sicherheitsgrenze (`.claude/**` gegen Selbst-Eskalation, `.env*` gegen Secrets) unangetastet
bleibt und das generierte Lockfile explizit geschützt wird.

**Entschiedener Zuschnitt** (mit dem Entwickler abgestimmt, 2026-07-26):

1. **YAML generisch statt Einzeldatei.** `Edit(factory.defaults.yml)` allein würde nur den einen
   beobachteten Fall schließen; `pnpm-workspace.yaml` und `docker-compose.yml` lösten weiterhin
   denselben Interrupt aus. Freigegeben wird die Dateiklasse, geschützt wird die Ausnahme
   (`pnpm-lock.yaml` per `deny` – deny schlägt allow).
2. **Write-Symmetrie.** Die `Write`-Allow-Liste kennt heute **gar keine** Top-Level-Extensions –
   auch `Edit(*.ts)`/`Edit(*.md)` haben kein `Write`-Pendant. Das Anlegen einer neuen Root-Datei
   prompted damit selbst dort, wo das Bearbeiten längst erlaubt ist. Dieselbe Lücken-Klasse wird
   in einem Zug geschlossen.

## Scope

**Inbegriffen:**

- **Allow-Liste in `.claude/settings.json` erweitern:**
  - `Edit` für Top-Level-YAML: `*.yml`, `*.yaml`.
  - `Write`-Pendants zu **allen** Top-Level-Extension-Regeln, sodass `Edit`- und `Write`-Liste
    symmetrisch sind: `*.ts`, `*.tsx`, `*.mjs`, `*.json`, `*.md`, `*.yml`, `*.yaml`.
- **Deny-Liste erweitern:** `pnpm-lock.yaml` für `Edit` **und** `Write` – das generierte Lockfile
  bleibt trotz generischer YAML-Freigabe gesperrt (Änderungen laufen über `pnpm`, nicht über einen
  Datei-Edit).
- **Lieferung über den Patch-Workflow.** `.claude/**` ist für den Agenten hard denied
  (`Edit(.claude/**)`/`Write(.claude/**)`, #88-Grenze). Die Änderung wird als
  `tasks/patch-224.diff` geliefert, **programmatisch** erzeugt (nicht von Hand getippt, aus #94),
  read-only per `git apply --check` verifiziert, und der Blocker in der Task-Datei protokolliert.
  Nach dem Anwenden durch den Menschen: Checkboxen auf `[x]`, Blocker als erledigt markieren,
  stale Patch-Datei entfernen – alles vor dem Merge (aus #145).
- **Regressionstest** in `scripts/checks/tests/run-tests.sh`, Abschnitt
  „#91 Permissions-Konsistenz (`.claude/settings.json`)".
- **Stale Prosa nachziehen:** `docs/factory/lessons/factory-workflow.md` behauptet im Präsens, dass
  „auch `factory.defaults.yml` (root `*.yml`) … nicht in der Allow-Liste [ist] und … einen
  Interrupt aus[löst]" – das ist nach diesem PR falsch und wird im selben PR korrigiert
  (aus #211/#176).

**Nicht inbegriffen:**

- **Weitere Top-Level-Dateiklassen ohne Extension-Treffer** (`LICENSE`, `.prettierignore`,
  `.gitignore`, `factory.config.yml.example`). Kein beobachteter Bedarf; ein generischer
  Root-Catch-all (`Edit(*)`) wurde bewusst verworfen, weil er die Schreibfläche weit über den
  belegten Bedarf hinaus öffnet.
- **Änderungen an der Verzeichnis-Glob-Liste** (`app/**`, `lib/**`, …) – die funktioniert.
- **Änderungen an der `Bash`-Allow-Liste** und am Commit-Seam (ADR-019) – nicht betroffen.
- **Aufweichen der #88-Grenze.** `.claude/**` und `.env*` bleiben in `deny`; dass diese Task ihre
  eigene Änderung deshalb nur als Patch liefern kann, ist gewolltes Verhalten, kein zu behebender
  Reibungspunkt.
- **Nachpflege von ADR-019 „Betroffene Artefakte" („`deny` unverändert (`.claude/**`, `.env*`)").**
  Der Satz beschreibt das **Delta jener Entscheidung**, nicht eine fortgeltende Invariante über den
  aktuellen Dateizustand – historische Delta-Beschreibungen bleiben stehen (Abgrenzung zu #211:
  dort beschrieb die ADR die *laufende* Mechanik im Präsens).
- **Rückwirkende Reparatur von Task 201 / PR #222** – bereits manuell nachgezogen und gemergt.

## Akzeptanzkriterien

- [ ] **AK1 – Top-Level-YAML ist ohne Prompt editierbar:** GIVEN einen nicht-interaktiven
      Stage-3-Agenten (`FACTORY_STAGE=3`, `claude --print`) WHEN er eine getrackte
      Top-Level-YAML-Datei (`factory.defaults.yml`, `factory.config.yml`, `pnpm-workspace.yaml`,
      `docker-compose.yml`) mit `Edit` ändern will THEN greift die Allow-Liste und es entsteht
      **kein** Permission-Prompt und **kein** Interrupt.

- [ ] **AK2 – Neue Top-Level-Datei ist ohne Prompt anlegbar (Write-Symmetrie):** GIVEN denselben
      Agenten WHEN er mit `Write` eine **neue** Datei im Repo-Root mit einer der freigegebenen
      Extensions (`*.yml`, `*.yaml`, `*.ts`, `*.tsx`, `*.mjs`, `*.json`, `*.md`) anlegt THEN
      geschieht das ohne Permission-Prompt – die `Write`-Liste erlaubt für Top-Level-Extensions
      genau das, was die `Edit`-Liste erlaubt (Symmetrie).

- [ ] **AK3 – Das Lockfile bleibt gesperrt:** GIVEN die generische YAML-Freigabe aus AK1
      WHEN ein Agent `pnpm-lock.yaml` per `Edit` **oder** `Write` ändern will THEN wird das
      abgelehnt, weil `pnpm-lock.yaml` in der `deny`-Liste steht (deny hat Vorrang vor allow).

- [ ] **AK4 – Die #88-Grenze ist unverändert:** GIVEN die erweiterten Listen WHEN ein Agent
      `.claude/**` oder `.env*` schreiben will THEN bleibt das gesperrt – die bestehenden
      `deny`-Einträge (`Edit(.claude/**)`, `Write(.claude/**)`, `Edit(.env*)`, `Write(.env*)`,
      `Read(.env*)`) existieren unverändert weiter und wurden weder entfernt noch aufgeweicht.

- [ ] **AK5 – Regressionstest prüft die geparsten Listen, in beide Richtungen:** GIVEN
      `bash scripts/checks/tests/run-tests.sh` WHEN die Permissions-Konsistenz-Tests laufen THEN
      wird die **geparste** `permissions.allow`- bzw. `permissions.deny`-Liste geprüft (nicht ein
      bloßes Vorkommen der Zeichenkette irgendwo im Dateitext), und zwar in beide Richtungen:
      die neuen Allow-Einträge sind vorhanden (AK1/AK2) **und** die Deny-Einträge aus AK3/AK4 sind
      vorhanden. Entfällt genau ein geforderter Eintrag, wird genau die zugehörige Assertion rot.

- [ ] **AK6 – Der Test misst den committeten Endzustand, nicht das Patch-Artefakt:** GIVEN die
      Änderung wird per Patch-Workflow geliefert WHEN der Regressionstest aus AK5 läuft THEN liest
      er `.claude/settings.json` im Arbeitsbaum (die Live-Datei) – er greift **nicht** auf
      `tasks/patch-224.diff` zu und bleibt daher grün, nachdem die stale Patch-Datei entfernt
      wurde (aus #212).

- [ ] **AK7 – Die Lesson-Prosa ist nicht mehr stale:** GIVEN `docs/factory/lessons/factory-workflow.md`
      benennt `factory.defaults.yml` (root `*.yml`) im Präsens als „nicht in der Allow-Liste …
      löst einen Interrupt aus" WHEN dieser PR die Allow-Regel ergänzt THEN ist genau diese Aussage
      im selben PR korrigiert, während die `.claude/**`-Patch-Workflow-Regel selbst (weiterhin
      gültig) und die historische Vorfall-Schilderung erhalten bleiben.

- [ ] **AK8 – `settings.json` bleibt valides JSON:** GIVEN den angewendeten Patch WHEN
      `.claude/settings.json` geparst wird THEN ist die Datei syntaktisch valides JSON mit
      unveränderter Struktur (`hooks`, `permissions.allow`, `permissions.deny`) – ein Parse-Fehler
      würde jede Permission-Auswertung und damit jeden Stage-3-Lauf brechen.

## Fehlerszenarien

- [ ] **Patch lässt sich nicht anwenden:** `git apply --check tasks/patch-224.diff` schlägt fehl
      (z. B. weil `main` zwischenzeitlich `settings.json` geändert hat). Der Agent liefert keinen
      unverifizierten Patch aus – er erzeugt ihn gegen den aktuellen Stand neu und verifiziert
      erneut read-only.
- [ ] **Patch wird angewendet, aber die Task-Datei bleibt im Patch-Zustand:** Checkboxen stehen
      weiter auf `[~]`, der Blocker fordert weiter `git apply`, `tasks/patch-224.diff` liegt als
      totes Artefakt herum (`git apply --check` schlägt darauf jetzt fehl). Muss vor dem Merge
      aufgelöst sein – sonst „offene Checkboxen → kein Done" (aus #145).
- [ ] **Zu breite Regel geht unbemerkt durch:** Ein Test, der nur „Eintrag vorhanden" prüft, bliebe
      auch bei einer versehentlich alles erfassenden Regel grün. Deshalb die
      Gegenrichtungs-Assertions aus AK5 (Deny-Einträge müssen weiter existieren).
- [ ] **Prompt trotz Allow-Regel:** Greift das Muster nicht wie erwartet (siehe offene Frage zur
      Pfad-Verankerung), ist der Vorfall aus #222 nicht behoben, obwohl alle Datei-Assertions grün
      sind. Deshalb ist AK1/AK2 an einer echten Probe zu belegen, nicht nur am Dateiinhalt.

## Offene Fragen

- [ ] **Sind Top-Level-Extension-Muster pfad-verankert?** Matcht `Edit(*.yml)` nur das Repo-Root
      (wie #88 es gemeint hat) oder auch verschachtelte Pfade? Für die Sicherheit dieser Änderung
      ist es unkritisch (die betroffenen Unterverzeichnisse `config/**`, `.github/workflows/**`
      sind ohnehin freigegeben, `.claude/**` bleibt per deny gesperrt, `pnpm-lock.yaml` liegt im
      Root) – für die Formulierung der Deny-Ausnahme aber relevant. In `/implement` zu verifizieren.
- [ ] **Wie wird AK1/AK2 belastbar belegt?** Eine verhaltensbasierte Prüfung der
      Permission-Auswertung ist aus der Shell-Testsuite heraus nicht möglich (die Auswertung liegt
      in Claude Code, nicht in einer Repo-Bibliothek). Präzedenz aus Task #88: einmalige, im
      Task-File dokumentierte `claude --print`-Probe (Positiv- und Negativfall), zusätzlich zu den
      Datei-Assertions aus AK5. Falls diese Probe im Rahmen dieser Task nicht durchführbar ist,
      ist das als Blocker zu protokollieren, nicht stillschweigend zu überspringen.
