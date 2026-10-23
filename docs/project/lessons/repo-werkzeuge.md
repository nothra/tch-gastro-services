# Lessons: Werkzeuge über die Repo-Historie (Projekt)

> Ausgelagerte `/codify`-Learnings (Volltext) – projektspezifische Learnings (TCH Gastro Services) zu
> **Werkzeugen, die Historie oder Inhalt des ganzen Repos umschreiben oder scannen** (Herauslösen der
> Factory per `scripts/project/factory-extract.sh`, Massen-Umschreibung, Secret-/PII-Gates vor einem
> öffentlichen Push). **Nicht** `@import`-geladen (ADR-037) – bei Bedarf gezielt lesen; im @import-Pfad
> (`PROJECT-CONTEXT.md`) steht nur eine Index-Zeile.

### Gate um einen fremden Scanner: alle Abschalt-Eingänge und alle Datenflächen vorab aufzählen (aus #427, Security-Review + Re-Review)

`factory-extract.sh scan` ist das einzige Gate vor einem nicht rückholbaren öffentlichen Push. Der erste
Entwurf rief `gitleaks git <ziel>` mit eigener Ignore-Datei auf und galt als fertig – der Security-Review
fand drei Fail-open-Pfade, und der Fix für einen davon führte zwei neue ein, die erst das Re-Review fand:

- **Abschalt-Eingänge, die nicht im Aufruf stehen:** gitleaks liest `.gitleaks.toml` und `.gitleaksignore`
  aus der Wurzel des gescannten Repos **und** eine `.gitleaksignore` aus dem Arbeitsverzeichnis des
  Aufrufers (auch neben `--gitleaks-ignore-path`), dazu `GITLEAKS_CONFIG`/`GITLEAKS_CONFIG_TOML` aus der
  Umgebung; ein Inline-`gitleaks:allow` unterdrückt Funde trotz gepinnter `--config`; ein Fingerprint
  ohne Commit (`datei:regel:zeile`, bei `stdin` `:regel:zeile`) gilt für alle Commits.
- **Datenflächen, die der Scan-Modus nicht abdeckt:** `gitleaks git` scannt Diffs, ein Blob-Scan nur
  Datei-Inhalte – **Commit- und Tag-Messages** prüft keiner von beiden (real gefunden:
  `Co-authored-by`-Trailer mit Firmenadresse und Personalnummer). `git clone --bare` übernimmt nur
  Branches und Tags; Commits, die nur über `refs/remotes`/`refs/notes` erreichbar sind, fallen heraus –
  während die übrigen Prüfungen mit `--all` auf dem Original arbeiten.

**Regel:** Bevor ein Gate um einen externen Scanner als fertig gilt, zwei Listen schreiben und je Eintrag
einen Test anlegen, der die **Messung** bricht (Stub bzw. echter Scanner in einem Wegwerf-Repo): (1) jeder
Weg, auf dem der Scanner Ausnahmen oder Konfiguration annimmt (Dateien im Ziel, im Arbeitsverzeichnis,
Umgebung, Inline-Marker, Ignore-Formate) – Ziel: Scanner im leeren Verzeichnis, gegen einen
`--mirror`-Klon ohne Arbeitsbaum, mit gepinnter `--config`, ohne Umgebungs-Konfiguration; Inline-Marker
zählen und rot melden; (2) jede Datenfläche, die öffentlich wird (Blobs, Diffs, Commit-/Tag-Messages,
alle Refs) – je Fläche eine Berichtszeile. Ein Fix an einem solchen Gate bekommt **vor** dem Commit einen
Gegenbeweis mit dem echten Scanner, nicht nur mit dem Stub: der Stub zeigt die Verdrahtung, nicht das
Verhalten des Scanners.

### Umschreibregel über Repo-Inhalt: alte gegen neue Regel auf dem echten Bestand vergleichen (aus #427, Review-Iteration 1)

Die Regel `#<nr>` → `nothra/tch-gastro-services#<nr>` war gegen ein Dutzend Fixture-Zeilen getestet und hätte
in `docs/factory/OPERATING.md` alle 21 Markdown-Sprunganker (`](#0-einmal-setup)`) zerstört; der erste
Gegenentwurf (`(?!-)` hinter der Nummer) hätte zusätzlich echte Verweise wie `#36-Gate` übersprungen.
Beides zeigte erst ein Vergleich über den **tatsächlichen** Bestand, nicht die Fixtures.

**Regel:** Jede Änderung an einer Regel, die Inhalt oder Messages des ganzen Repos umschreibt, mit einem
Wegwerf-Vergleich prüfen: alte und neue Regel auf alle betroffenen Dateien bzw. alle Commit-Messages
anwenden und **jede abweichende Zeile** ansehen (Anzahl + Liste) – erst dann die Fixtures um die
gefundenen Formen ergänzen. Für Commit-Messages zusätzlich festhalten, ob das Ergebnis byte-identisch
zum letzten Probelauf ist (sonst ändern sich Commit-Hashes und daran hängende Fingerprints).
