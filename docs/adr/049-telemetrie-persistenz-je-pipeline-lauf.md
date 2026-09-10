# ADR 049: Telemetrie-Persistenz je Pipeline-Lauf – eigener Einstiegspunkt, Console-Ernte, gitignoretes Artefakt

## Status

Proposed

## Datum

2026-09-11

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

Anforderungen und Randbedingungen stehen in
[`spec-334`](../specs/spec-334-otel-metriken-je-lauf-persistieren.md) (AK1–AK8). Zwei prägen
jede Option: die Auftraggeber-Vorgabe **rein lokal, kein zentraler Versand** (AK5) und die
ADR-045-Invariante **kein dirty Arbeitsbaum** (AK7), weil ein getracktes Mess-Artefakt die
Endzustands-Verifikation des *nächsten* Laufs nach [ADR-040](040-endzustands-verifikation.md)
brechen würde.

Die Faktenlage ist in Task 334 gemessen (nicht angenommen), Details in `spec-334`. Relevant für
diese Entscheidung: `agent.name` existiert und weist Sub-Agenten als eigene, disjunkte Messreihe
aus; `skill.name` erscheint beim Aufrufweg der Pipeline (Skill-Datei-Text als Prompt,
`run-pipeline.sh:271`) **nie**; je Pipeline-Schritt startet ein **eigener** `claude`-Prozess;
der Console-Output stört die Pipeline-Logik nicht, weil `run_skill` Exit-Code und
Report-*Dateien* auswertet, nicht den Text-Output.

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

### E3 – Verankerung in einem eigenen Einstiegspunkt, nicht in `run-pipeline.sh`

Ein neues Wrapper-Skript aktiviert die Telemetrie, ruft die unveränderte Pipeline auf und erntet
danach. `scripts/run-pipeline.sh` wird **nicht** angefasst. Damit bleiben das fail-closed-Gate
`run-tests.sh:292` („OTEL ist opt-in (nicht automatisch in run-pipeline.sh gesourct)") und die
ADR-045-Invariante unverändert gültig – diese ADR revidiert sie **nicht**.

Zwei Pflichten des Wrappers:

- Er **verändert den Exit-Code der Pipeline nicht** (AK6, fail-open). Ein Fehler in Erhebung
  oder Auswertung darf einen erfolgreichen Lauf nicht zum Fehlschlag machen und umgekehrt.
- Die Schritt-Zuordnung (AK3) entsteht aus den Marker-Zeilen, die `run_skill` ohnehin ausgibt
  (`→ Starte: /<skill> <id>`, `run-pipeline.sh:250`) – nicht aus `skill.name`, das auf diesem
  Aufrufweg nachweislich fehlt.

### E4 – Eigenes, gitignoretes Artefakt je Lauf; niemals im veröffentlichten Prozess-Report

Je Lauf ein eigenes Artefakt unter `tasks/telemetry-<task-id>-<zeitstempel>.csv`, gedeckt durch
ein neues `.gitignore`-Muster. CSV mit Kopfzeile: maschinenauswertbar über viele Läufe (der
eigentliche Zweck) und im Editor lesbar, ohne ein Format zu erfinden.

Je Messwert eine Zeile mit mindestens: Lauf-Zeitstempel, Task-ID, Pipeline-Schritt, **Modell**
(AK8), Herkunft (Hauptsession vs. Sub-Agent inkl. `agent.name`, AK2), Metrik, Werttyp
(`input`/`output`/`cacheRead`/`cacheCreation`) und Wert.

Ausdrücklich **nicht**: ein Abschnitt in `tasks/metrics-<datum>.md`. Diese Datei geht über
`metrics.sh --publish` als Issue-Kommentar nach GitHub und würde AK5 verletzen; zudem vermischte
es die zwei Ebenen, die ADR-006 trennt.

## Alternativen

### Option A: Lokaler OTLP-Empfänger (Collector-Container) auf `localhost`

**Vorteile:** strukturierte Daten statt Text-Parsing, damit kein Format-Drift-Risiko; ein
Empfänger sammelt über alle Prozesse und Läufe hinweg; der spätere Weg zu einem echten Backend
wäre nur eine Endpunkt-Änderung. Bleibt lokal und erfüllt AK5.

**Nachteile:** macht einen laufenden Container zur Vorbedingung der Messung. Läuft er nicht,
gehen die Daten **still** verloren – genau das Verhalten, das `spec-334` als Fehlerszenario
ausschließt. Widerspricht AK4 („ein Lauf ohne aktivierte Telemetrie verhält sich unverändert"),
weil die Aktivierung nun zwei Zustände hat, die von außen nicht unterscheidbar sind. Bei der
Messung in Task 334 lauschte auf 4317/4318 nichts – der Normalzustand ist „läuft nicht".

### Option B: Prometheus-Exporter (`OTEL_METRICS_EXPORTER=prometheus`)

**Vorteile:** kein Text-Parsing, kein zusätzlicher Dienst; die CLI stellt die Werte selbst
bereit.

**Nachteile:** scheidet an der Prozess-Lebensdauer aus. Die Pipeline startet je Schritt einen
kurzlebigen `claude --print`-Prozess; dessen HTTP-Port stirbt mit ihm. Es gibt keinen
verlässlichen Scrape-Zeitpunkt, und ohne Scrape keine Persistenz.

### Option C: `run-pipeline.sh` bedingt erweitern (`config/otel.env` sourcen, wenn vorhanden)

**Vorteile:** ein einziger Einstiegspunkt; Telemetrie wirkt für jeden Lauf, ohne dass man den
richtigen Befehl kennen muss.

**Nachteile:** kollidiert frontal mit dem fail-closed-Gate `run-tests.sh:292` **und** der
ausdrücklich formulierten ADR-045-Invariante. Beide wären zu ändern – eine schwer reversible
Entscheidung, die die Orchestrierung mit einer Belangschicht belädt, die ihr nicht gehört.
Der Gewinn (ein Befehl statt zwei) wiegt das nicht auf.

### Option D: Abschnitt in `tasks/metrics-<datum>.md` ergänzen

**Vorteile:** ein Ort für alle Kennzahlen; die #314-Mechanik (EXIT-Trap, fail-open) wäre
wiederverwendbar.

**Nachteile:** verletzt AK5, weil diese Datei über `--publish` nach GitHub veröffentlicht wird.
Vermischt die von ADR-006 getrennten Ebenen und macht `metrics.sh` zu dem „einzigen
Metrics-Baustein", den ADR-006 als Option B abgelehnt hat. Zudem ist die Datei
tagesbasiert – mehrere Läufe am selben Tag überschrieben sich (AK1).

## Begründung

**Separation of Concerns** trägt E3 und E4: Orchestrierung (`run-pipeline.sh`), Prozess-Ebene
(`metrics.sh`) und Telemetrie-Ebene (neuer Wrapper + eigenes Artefakt) bleiben je in ihrer Spur.
Das ist keine neue Erfindung, sondern die Ebenen-Trennung, die ADR-006 bereits beschlossen hat –
konsequent auf die Ablage angewendet.

**Reversibilität** (Guideline „Evolutionäre Architektur") entscheidet zwischen E3 und Option C:
Ein Wrapper ist löschbar, und danach ist der Zustand exakt der vorherige. Das Ändern eines
fail-closed-Gates und einer namentlich formulierten ADR-Invariante ist die teurere, schwerer
rückholbare Wahl. Bei gleichem Nutzen gewinnt die reversible Option.

**Fehler sind Teil des Designs** trägt E2: Option A verliert Daten still, wenn der Container
nicht läuft. Der Console-Weg hat immer Output; sein Risiko ist Format-Drift, und Format-Drift
ist mit einem Guard **erkennbar** zu machen – ein Muster, das dieses Repo an vielen Stellen
nutzt (Routen-Doku-Drift, Contract-Drift-Guard). Ein erkennbares Risiko ist einem stillen
vorzuziehen.

Die Abgrenzung in E1 ist keine Formalie: ohne sie unterläuft die Umsetzung eine bestehende
ADR-Ablehnung stillschweigend. Mit der verbindlichen Grenze („nie selbst rechnen") bleibt
ADR-006 in Kraft und diese ADR beschreibt genau das, was ADR-006 als Telemetrie-Ebene ohnehin
vorgesehen hat.

## Konsequenzen

**Positiv:**

- Kosten je Lauf, je Schritt und je Modell werden über viele Läufe auswertbar – die Kalibrierung
  aus ADR-009 und die Tier-Wahl aus ADR-038 bekommen erstmals eine empirische Grundlage.
- Der Sub-Agenten-Anteil wird sichtbar; er verursacht den Großteil der Last.
- Gate, ADR-045-Invariante und ADR-006-Ebenentrennung bleiben unverändert gültig. Kein
  bestehender Lauf ändert sein Verhalten.
- Keine Infrastruktur, keine Secrets, kein Netzwerkziel – die Daten können den Rechner nicht
  verlassen.

**Negativ / Trade-offs:**

- **Zwei Einstiegspunkte** in die Pipeline. Bewusst akzeptiert: der Preis dafür, die
  Orchestrierung frei von Telemetrie zu halten. Zu dokumentieren, damit niemand den
  Telemetrie-Weg für den Normalweg hält.
- **Abhängigkeit von einem Debug-Ausgabeformat.** Der Console-Exporter ist kein zugesagter
  Vertrag; ein CLI-Update kann ihn ändern. Beherrscht, nicht beseitigt – der Drift-Guard macht
  es zu einem laut scheiternden Fall.
- **Keine `skill.name`-Attribution.** Die Zuordnung hängt an Marker-Zeilen der Pipeline; ändert
  sich deren Wortlaut, bricht die Zuordnung. Auch das gehört unter den Drift-Guard.
- **Roh-Ausgaben enthalten personenbezogene Attribute** (`user.email`, Account-/Organisations-IDs)
  und liegen als Datei auf der Platte. Deshalb: Ablage gitignored, kein Versand, und die
  Roh-Ablage ist zu begrenzen statt unbegrenzt zu wachsen (ein Mini-Aufruf erzeugte ~1300
  Zeilen). Ein späterer Wechsel auf ein zentrales Ziel ist eine **neue** Entscheidung mit
  eigener Datenschutz-Prüfung – diese ADR deckt ihn nicht.

## Betroffene Stellen

- **Neu:** Wrapper-Einstiegspunkt unter `scripts/` (aktiviert, ruft `run-pipeline.sh`, erntet)
- **Neu:** Ernte-/Auswertungs-Logik als eigener, testbarer Seam unter `scripts/lib/`
- **Neu:** `.gitignore`-Muster für `tasks/telemetry-*`
- **Neu:** Format-Drift-Guard samt Fixture in der Bash-Testsuite (`scripts/checks/tests/`)
- **Unverändert (ausdrücklich):** `scripts/run-pipeline.sh`, `scripts/metrics.sh`,
  `run-tests.sh:292`, `config/otel.env.example`, ADR-006, ADR-045
- **Doku:** `CLAUDE.md` bzw. `docs/factory/OPERATING.md` – Existenz und Zweck des zweiten
  Einstiegspunkts

## Quelle

Anforderung und Lokal-Vorgabe: Auftraggeber (Session 2026-09-10/11, Issue #334). Vertagt und
bedingt gestellt von `spec-314` (#314). Telemetrie-Ebene ursprünglich angestoßen durch
Rene Lengwinat (Teams, 2026-06-17, via ADR-006).
