# ADR 049: Telemetrie-Persistenz je Pipeline-Lauf – in `run-pipeline.sh` integriert, Default an, Ablage im gemeinsamen git-Verzeichnis

## Status

Proposed

## Datum

2026-09-11 (Entscheidungen E3 und E4 am selben Tag revidiert – siehe „Revisionen")

## Kontext

[ADR-006](006-measurement-architecture.md) trennt zwei Messebenen: **Prozess** (Git/GitHub) und
**Telemetrie** (Token/Kosten/Modell-Nutzung via OTEL). Die Prozess-Ebene läuft seit #314
automatisch je Lauf ([ADR-045](045-prozess-messung-je-pipeline-lauf.md)). Die Telemetrie-Ebene
existiert dagegen nur als Beispiel-Datei mit Default aus – es entsteht **keine Historie**.

Damit fehlt die Grundlage für eine Entscheidungsklasse, die die Factory laufend trifft:
**welches Modell für welchen Schritt.** [ADR-038](038-modell-tiers-groessenabhaengig.md) vergibt
Tiers größenabhängig, [ADR-009](009-factory-configuration.md) nennt als späteren
Kalibrierungs-Input ausdrücklich „OTEL-Historie (ADR-006) → Pro-Skill-Verteilung → kalibrierte
Defaults", und [ADR-047](047-import-kontext-guidelines-nach-erzwungenheit.md) musste ohne
Kostenzahlen entscheiden. `spec-314` hat die „Ernte" bewusst vertagt: sie liege „genau auf der
Grenze, die ADR-006 zieht (Option B …) – das braucht eine eigene ADR und eine eigene Issue".
Issue = #334, ADR = diese.

Anforderungen stehen in
[`spec-334`](../specs/spec-334-otel-metriken-je-lauf-persistieren.md) (AK1–AK8). Zwei
Auftraggeber-Vorgaben prägen jede Option:

1. **Rein lokal, kein zentraler Versand** (AK5). Grund ist nicht Bequemlichkeit: die Attribute
   tragen `user.email`, `user.id`, `user.account_id`, `user.account_uuid` und
   `organization.id`.
2. **Die Erzeugung ist Teil des normalen Pipeline-Laufs und standardmäßig an**, abschaltbar per
   Parameter (Auftrag vom 2026-09-11). Das kehrt die ursprüngliche Fassung dieser ADR um und
   verschiebt AK4 von *opt-in* auf *opt-out*.

Die Faktenlage ist in Task 334 gemessen, nicht angenommen (Details in `spec-334`). Relevant:
`agent.name` existiert und weist Sub-Agenten als eigene, disjunkte Messreihe aus; `skill.name`
erscheint beim Aufrufweg der Pipeline (Skill-Datei-Text als Prompt, `run-pipeline.sh:271`)
**nie**; je Pipeline-Schritt startet ein **eigener** `claude`-Prozess; der Console-Output stört
die Pipeline-Logik nicht, weil `run_skill` Exit-Code und Report-*Dateien* auswertet.

**Neu gemessen für E4** (Wegwerf-Worktree, 2026-09-11): `git worktree remove` löscht eine
gitignorete Datei im Arbeitsbaum **ohne `--force` und ohne jede Warnung** mit – Git zählt
ignorierte Dateien nicht als „untracked" und verweigert daher nicht. Da CLAUDE.md das Entfernen
des Worktrees nach dem Merge vorschreibt, hätte die ursprünglich geplante Ablage unter `tasks/`
die Historie bei jedem abgeschlossenen Task lautlos vernichtet.

## Entscheidung

### E1 – Das Konsumieren des OTEL-Kanals ist **nicht** die abgelehnte Option B

ADR-006 lehnte Option B mit zwei Gründen ab: „fragiler **Nachbau** einer Funktion, die Claude
Code nativ und genauer liefert" und „nicht gateway-portabel". Beide greifen hier nicht:

- Es wird nichts nachgebaut. Übernommen werden ausschließlich die von der CLI **selbst
  berechneten** Ist-Werte (`claude_code.token.usage`, `claude_code.cost.usage`). Es entsteht
  kein eigenes Token-Zähl- oder Preismodell.
- OTEL ist laut ADR-006 selbst „client-seitig und backend-unabhängig" – die Ernte überlebt
  einen Gateway-/Modellwechsel genauso wie der Kanal selbst.

Der dritte Kern von Option B – **ein einziger** Metrics-Baustein, der beide Ebenen vermischt –
bleibt abgelehnt und wird respektiert: `scripts/metrics.sh` wird **nicht** erweitert (siehe E4).

**Verbindliche Grenze dieser ADR:** Es wird nie ein Wert selbst berechnet, geschätzt,
interpoliert oder aus Roh-Verkehr rekonstruiert. Emittiert die CLI einen Wert nicht, bleibt er
**leer** und wird als fehlend ausgewiesen. Sobald eine Umsetzung anfängt zu rechnen, ist sie
Option B und damit von ADR-006 verboten.

### E2 – Erhebung über den Console-Exporter, abgesichert durch einen Format-Drift-Guard

`OTEL_METRICS_EXPORTER=console`; die Ernte liest den Roh-Output des Laufs. Die „fragil"-Kritik
aus ADR-006 wird nicht weggeredet, sondern **beherrscht**: ein Drift-Guard prüft das erwartete
Ausgabeformat gegen eine Fixture und schlägt **laut** fehl, wenn das Format nicht mehr erkannt
wird. Stille Null- oder Teilwerte sind unzulässig – ein unerkanntes Format ist ein Fehler, keine
Messung von 0.

### E3 – Integration in `run-pipeline.sh`, Default **an**, Abschaltung per Parameter

Die Telemetrie-Erzeugung ist Teil des regulären Pipeline-Laufs. `scripts/run-pipeline.sh`
aktiviert sie selbst und erntet am Ende; es gibt **keinen** zweiten Einstiegspunkt.

- **Default an.** Ein Lauf ohne weitere Angabe erzeugt Telemetrie.
- **Abschaltbar per Parameter** – ein Schalter analog zum bestehenden `--dry-run` (dessen
  Argument-Parsing in `run-pipeline.sh:53–60` das Muster vorgibt).
- **Die Erhebung darf den Lauf nie gefährden** (AK6, fail-open): Ein Fehler in Aktivierung,
  Ernte oder Auswertung lässt den ursprünglichen Exit-Code unberührt. Das ist bei Default an
  strikter zu nehmen als bei opt-in, weil nun **jeder** Lauf betroffen ist.
- Die Schritt-Zuordnung (AK3) entsteht aus den Marker-Zeilen, die `run_skill` ohnehin ausgibt
  (`→ Starte: /<skill> <id>`, `run-pipeline.sh:250`) – nicht aus `skill.name`, das auf diesem
  Aufrufweg nachweislich fehlt.

**Diese Entscheidung ändert zwei bestehende Zusicherungen; beide sind im selben PR
nachzuziehen, nicht stillschweigend zu brechen:**

1. Die fail-closed-Assertion `run-tests.sh:292` („OTEL ist opt-in (nicht automatisch in
   run-pipeline.sh gesourct)") wird **ungültig**. Sie ist durch eine Assertion zu **ersetzen**,
   die die neue Zusicherung bewacht – dass die Erzeugung standardmäßig läuft **und** der
   Abschalt-Parameter sie wirklich abschaltet. Ersatz, nicht Löschung: ein entfernter Guard
   hinterlässt eine unbewachte Zusicherung.
2. Die ADR-045-Invariante „OTEL bleibt opt-in: die Verdrahtung fasst `config/otel.env*` nicht
   an. Die bestehende Assertion … bleibt gültig." ist überholt. ADR-045 ist entsprechend zu
   ergänzen (Verweis auf diese ADR), damit die beiden ADRs sich nicht widersprechen.

### E4 – Ablage im **gemeinsamen git-Verzeichnis**, je Lauf eine Datei

Ablageort ist ein Unterverzeichnis des von `git rev-parse --git-common-dir` gelieferten Pfades,
je Lauf eine eigene Datei (Lauf-Zeitstempel und Task-ID im Namen). Gemessene Eigenschaften:

- **Überlebt `git worktree remove`** – der eigentliche Grund für diese Wahl.
- Liegt außerhalb jedes Arbeitsbaums: `git status` bleibt sauber, die Datei erscheint nicht
  einmal als ignoriert. AK7 ist damit **strukturell** erfüllt, nicht durch eine Regel.
- **Kein `.gitignore`-Eintrag nötig** – eine Regel weniger, die jemand versehentlich aufheben
  kann.
- Alle Worktrees desselben Klons teilen die Ablage; die Historie ist über Tasks hinweg
  zusammenhängend.

Format: CSV mit Kopfzeile – maschinenauswertbar über viele Läufe (der Zweck) und im Editor
lesbar. Je Messwert eine Zeile mit mindestens: Lauf-Zeitstempel, Task-ID, Pipeline-Schritt,
**Modell** (AK8), Herkunft (Hauptsession vs. Sub-Agent inkl. `agent.name`, AK2), Metrik,
Werttyp (`input`/`output`/`cacheRead`/`cacheCreation`) und Wert.

Ausdrücklich **nicht**: ein Abschnitt in `tasks/metrics-<datum>.md`. Diese Datei geht über
`metrics.sh --publish` als Issue-Kommentar nach GitHub und würde AK5 verletzen; zudem
vermischte es die zwei Ebenen, die ADR-006 trennt, und sie ist tagesbasiert (mehrere Läufe
überschrieben sich, AK1).

## Alternativen

### Zu E3 – Eigener Wrapper-Einstiegspunkt (ursprüngliche Fassung dieser ADR, verworfen)

Ein Skript neben `run-pipeline.sh`, das aktiviert, die unveränderte Pipeline aufruft und erntet.

**Vorteile:** Gate `run-tests.sh:292` und ADR-045-Invariante bleiben unberührt; reversibel (Datei
löschen = Zustand vorher); hält die Orchestrierung frei von einer fremden Belangschicht.

**Nachteile:** zwei Einstiegspunkte, und der telemetriefreie ist der bequemere – die Historie
entsteht nur, wenn man an den richtigen Befehl denkt. Genau das widerspricht dem Zweck: eine
Kalibrierungs-Grundlage, die von Disziplin bei der Befehlswahl abhängt, hat Lücken genau dann,
wenn es eilig war. **Verworfen** auf Auftraggeber-Entscheidung (2026-09-11) zugunsten von
„Default an, abschaltbar".

### Zu E3 – Integration, aber Default aus (opt-in per Parameter/Datei)

**Vorteile:** ein Einstiegspunkt und trotzdem keine Verhaltensänderung für bestehende Läufe;
ADR-006 „Default aus" bliebe wörtlich gültig.

**Nachteile:** teilt den Kernnachteil der Wrapper-Variante – ohne bewusstes Zutun keine Daten.
Verworfen aus demselben Grund.

### Zu E4 – Ablage unter `tasks/` mit `.gitignore`-Muster (ursprüngliche Fassung, verworfen)

**Vorteile:** neben den Prozess-Reports, ein Ablageort für alles Messbare; vertrautes Muster
(`tasks/metrics-*.md`).

**Nachteile:** **stirbt mit dem Worktree** – gemessen: `git worktree remove` löscht die
gitignorete Datei ohne `--force` und ohne Warnung mit. Da CLAUDE.md dieses Aufräumen nach jedem
Merge vorschreibt, wäre die Historie systematisch verloren, und zwar unbemerkt. Verworfen.

### Zu E4 – Ablage außerhalb des Repos (z. B. unter `$HOME`)

**Vorteile:** überlebt sogar das Löschen des gesamten Klons.

**Nachteile:** verliert die Bindung an das Repo, in dem gemessen wurde; bei mehreren Klonen oder
Projekten vermischen sich die Reihen, und die Zuordnung müsste künstlich wiederhergestellt
werden. Das gemeinsame git-Verzeichnis erfüllt die Anforderung, ohne diese Bindung aufzugeben.

### Zu E2 – Lokaler OTLP-Empfänger (Collector-Container) auf `localhost`

**Vorteile:** strukturierte Daten statt Text-Parsing, kein Format-Drift-Risiko; der spätere Weg
zu einem echten Backend wäre nur eine Endpunkt-Änderung. Bleibt lokal, erfüllt AK5.

**Nachteile:** macht einen laufenden Container zur Vorbedingung. Läuft er nicht, gehen die Daten
**still** verloren – genau das Verhalten, das `spec-334` als Fehlerszenario ausschließt. Bei der
Messung in Task 334 lauschte auf 4317/4318 nichts; der Normalzustand ist „läuft nicht". Bei
Default an wäre ein stiller Datenverlust in jedem Lauf besonders schädlich.

### Zu E2 – Prometheus-Exporter

**Nachteile:** scheidet an der Prozess-Lebensdauer aus. Die Pipeline startet je Schritt einen
kurzlebigen `claude --print`-Prozess; dessen HTTP-Port stirbt mit ihm. Kein verlässlicher
Scrape-Zeitpunkt, ohne Scrape keine Persistenz.

## Begründung

**Vollständigkeit der Messreihe schlägt Reversibilität** – das ist die Umkehrung gegenüber der
ersten Fassung und der eigentliche Kern der Revision. Die erste Fassung hatte den Wrapper mit
dem Argument gewählt, er sei löschbar und lasse Gate und Invariante unberührt. Das bleibt
richtig, wiegt aber weniger als der Zweck: Eine Historie, die als Grundlage für Modell- und
Tier-Entscheidungen dienen soll, darf keine Lücken haben, die davon abhängen, welchen von zwei
Befehlen jemand unter Zeitdruck getippt hat. Der Preis – ein zu ersetzender Guard und eine zu
korrigierende ADR-Invariante – wird bewusst bezahlt und ist im selben PR fällig.

**Fehler sind Teil des Designs** trägt E2 und den fail-open-Teil von E3. Bei Default an ist
fail-open keine Höflichkeit mehr, sondern Bedingung: eine Messung, die einen erfolgreichen Lauf
scheitern lassen kann, wäre schlimmer als keine Messung. Und ein erkennbares Risiko
(Format-Drift, laut scheiternd) ist einem stillen (nicht laufender Collector) vorzuziehen.

**Strukturelle Zusicherungen schlagen Regeln** trägt E4. Die ursprüngliche Ablage erfüllte AK7
über einen `.gitignore`-Eintrag – eine Regel, die jemand aufheben kann, und die das eigentliche
Problem (Tod mit dem Worktree) gar nicht adressierte. Die neue Ablage liegt außerhalb jedes
Arbeitsbaums: sie *kann* den Arbeitsbaum nicht verschmutzen und *kann* nicht mit dem Worktree
verschwinden. Zusicherungen, die aus der Struktur folgen, brauchen keinen Guard.

**Separation of Concerns** bleibt gewahrt, wenn auch anders als zuvor: Die Ernte-Logik gehört in
einen eigenen, testbaren Seam unter `scripts/lib/` (Muster wie `tier-select.sh`), nicht in den
Rumpf von `run-pipeline.sh`. Der Orchestrator ruft, er rechnet nicht. `metrics.sh` bleibt
unberührt – die Ebenen-Trennung aus ADR-006 gilt weiter für die *Ablage*, auch wenn der
*Auslöser* jetzt derselbe Lauf ist.

Die Abgrenzung in E1 ist keine Formalie: ohne sie unterläuft die Umsetzung eine bestehende
ADR-Ablehnung stillschweigend.

## Konsequenzen

**Positiv:**

- Kosten je Lauf, je Schritt und je Modell entstehen **ab dem nächsten Lauf ohne Zutun** –
  die Kalibrierung aus ADR-009 und die Tier-Wahl aus ADR-038 bekommen eine lückenlose
  empirische Grundlage.
- Der Sub-Agenten-Anteil wird sichtbar; er verursacht den Großteil der Last.
- Die Historie überlebt das Aufräumen von Worktrees – gemessen, nicht angenommen.
- Ein Einstiegspunkt, ein Befehl. Keine Wahl, die man falsch treffen kann.
- Keine Infrastruktur, keine Secrets, kein Netzwerkziel – die Daten können den Rechner nicht
  verlassen.

**Negativ / Trade-offs:**

- **Jeder Lauf verhält sich ab jetzt anders.** Default an ist eine echte Verhaltensänderung;
  AK4 der Spec kippt von opt-in auf opt-out. Wer das nicht will, braucht den Parameter.
- **Zwei bestehende Zusicherungen werden gebrochen** (Gate `run-tests.sh:292`,
  ADR-045-Invariante). Beide sind im selben PR zu ersetzen bzw. zu korrigieren; ein
  gelöschter statt ersetzter Guard wäre die schlechtere Variante.
- **Abhängigkeit von einem Debug-Ausgabeformat.** Der Console-Exporter ist kein zugesagter
  Vertrag; ein CLI-Update kann ihn ändern. Beherrscht, nicht beseitigt – der Drift-Guard macht
  es zu einem laut scheiternden Fall. Bei Default an trifft ein solcher Bruch jeden Lauf, das
  Signal muss also eindeutig sein.
- **Keine `skill.name`-Attribution.** Die Zuordnung hängt an Marker-Zeilen der Pipeline; ändert
  sich deren Wortlaut, bricht die Zuordnung. Auch das gehört unter den Drift-Guard.
- **Ablage wächst monoton.** Je Lauf eine Datei im gemeinsamen git-Verzeichnis, plus begrenzt
  vorzuhaltender Roh-Output (ein Mini-Aufruf erzeugte ~1300 Zeilen). Kein Automatismus räumt
  dort auf; die Roh-Ablage ist zu begrenzen, und ein späteres Aufräum-/Rotationskonzept ist
  offen.
- **Roh-Ausgaben enthalten personenbezogene Attribute** (`user.email`, Account-/Organisations-IDs).
  Deshalb: lokale Ablage, kein Versand. Ein Wechsel auf ein zentrales Ziel ist eine **neue**
  Entscheidung mit eigener Datenschutz-Prüfung – diese ADR deckt ihn nicht.
- Die Ablage liegt in `.git/`. Das ist bewusst gewählt (Überlebensfähigkeit, strukturelle
  Sauberkeit), aber ein ungewöhnlicher Ort für Nutzdaten: er ist zu dokumentieren, damit die
  Dateien auffindbar sind und niemand sie für git-Interna hält.

## Betroffene Stellen

- `scripts/run-pipeline.sh` – Aktivierung, Abschalt-Parameter (Muster: `--dry-run`,
  Zeilen 53–60), Ernte-Aufruf am Ende (fail-open, Exit-Code unberührt)
- **Neu:** Ernte-/Auswertungs-Logik als eigener, testbarer Seam unter `scripts/lib/`
- `scripts/checks/tests/run-tests.sh:292` – Assertion **ersetzen** (Default an + Parameter
  schaltet ab), zusätzlich Format-Drift-Guard samt anonymisierter Fixture
- `docs/adr/045-prozess-messung-je-pipeline-lauf.md` – überholte OTEL-Invariante korrigieren,
  Verweis auf diese ADR
- `docs/specs/spec-334-*.md` – AK4 auf opt-out, AK7 auf die neue Ablage nachziehen
- **Doku:** `CLAUDE.md` bzw. `docs/factory/OPERATING.md` – Default an, Abschalt-Parameter,
  Ablageort
- **Unverändert (ausdrücklich):** `scripts/metrics.sh`, `config/otel.env.example`, ADR-006
  (Ebenen-Trennung und Option-B-Ablehnung gelten weiter)

## Revisionen

- **2026-09-11, E3 und E4 revidiert** (Auftraggeber-Entscheidung bzw. Messergebnis, noch vor
  dem Merge dieser ADR):
  - **E3:** von „eigener Wrapper-Einstiegspunkt, Gate und Invariante unberührt" zu
    „Integration in `run-pipeline.sh`, Default an, Abschaltung per Parameter". Grund:
    Vollständigkeit der Messreihe; ein optionaler zweiter Befehl erzeugt Lücken.
  - **E4:** von „`tasks/telemetry-*.csv` mit `.gitignore`-Muster" zu „Unterverzeichnis des
    gemeinsamen git-Verzeichnisses". Grund: gemessen – `git worktree remove` löscht
    gitignorete Dateien ohne `--force` und ohne Warnung mit; die Historie hätte das nach
    CLAUDE.md vorgeschriebene Aufräumen nicht überlebt.

## Quelle

Anforderung, Lokal-Vorgabe und die Default-an-Entscheidung: Auftraggeber (Sessions
2026-09-10/11, Issue #334). Vertagt und bedingt gestellt von `spec-314` (#314).
Telemetrie-Ebene ursprünglich angestoßen durch Rene Lengwinat (Teams, 2026-06-17, via ADR-006).
