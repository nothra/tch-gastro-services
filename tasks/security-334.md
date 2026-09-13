# Security Review: Task 334

## Kritische Findings (Blocker)

- [ ] [Data Exfiltration / Whitelist-Bypass] Die Whitelist-Projektion in
  `scripts/lib/telemetry-harvest.sh` (§E5) filtert nur nach **Feldnamen**
  (`model`, `query_source`, `"agent.name"`, `type`), prüft aber **nie die Form des Werts**.
  Jeder String, der `clean()`s erlaubtes Alphabet (`[A-Za-z0-9._@:+-]`) einhält, wird
  unverändert in die getrackte, automatisch gepushte CSV übernommen – unabhängig davon, ob
  er wirklich vom OTEL-Exporter stammt oder aus der **Konversationsausgabe des Agenten**
  (Teil desselben `claude --print`-Streams, den `telemetry_capture` unverändert mitschreibt).

  Empirisch belegt (Ernte gegen ein Roh-Log, in dem ein „Agenten-Antwort"-Textblock einem
  echten `cost.usage`-Datenpunkt vorausgeht, dessen `model`-Feld eine E-Mail-Adresse trägt):
  ```
  $ harvest_telemetry_csv raw.txt T 334
  run_timestamp,task_id,step_seq,step,metric,model,query_source,agent_name,value_type,value
  T,334,1,implement,claude_code.cost.usage,opfer@beispielfirma.de,main,,,0.01
  ```
  Dasselbe funktioniert gleichermaßen über `query_source`, `"agent.name"` und `type` –
  alle vier Felder wurden einzeln mit demselben Ergebnis geprüft.

  **Angriffskette:** Ein Angreifer, der bereits einen Prompt-Injection-Fuß in der Tür hat
  (z. B. eine von `/implement` gelesene, manipulierte Datei, ein kompromittiertes
  MCP-Tool-Ergebnis), kann den Agenten anweisen, eine Textzeile auszugeben, die exakt der
  vom Parser erwarteten OTEL-Blockstruktur entspricht (`{` … `attributes: {` … `model: "…"`
  … `value: …`). Der Ernte-Seam unterscheidet nicht zwischen „echtem" Exporter-Output und
  Agenten-Konversationstext an derselben Stelle im Stream – beides landet ununterschieden im
  selben Roh-Log.

  **Warum kritisch:** AK5 dieser Task lautet wörtlich „keine Personendaten in den
  persistierten Werten … Projektion als Whitelist". Die Whitelist filtert tatsächlich nur
  **bekannte Feldnamen** heraus, nicht **den erwarteten Wertebereich** dieser Felder – genau
  die Asymmetrie, die ADR-049 §E5 selbst als Begründung für „Whitelist statt Blacklist"
  anführt ("ein Fehler ist nicht zurücknehmbar, weil die Git-Historie ihn konserviert"), gilt
  identisch auf der Werte-Ebene: einmal committet und gepusht, ist ein exfiltrierter Wert aus
  der Historie nicht mehr entfernbar.

  **Empfohlene Lösung:** Die vier Felder zusätzlich auf ein **Werte-Whitelist-Muster** prüfen,
  bevor sie übernommen werden – nicht nur auf ein sicheres Zeichen-Alphabet:
  - `model`: gegen ein Muster bekannter Modellnamen (z. B. `^claude-[a-z0-9.-]+$` oder eine
    Liste bekannter Modell-Präfixe), sonst das Feld leer lassen statt den Roh-Wert zu
    übernehmen (konsistent mit §E1 „fehlt ein Wert, bleibt er leer").
  - `query_source`: exakt `main` oder `subagent`, sonst leer.
  - `type`: exakt eines aus `input`/`output`/`cacheRead`/`cacheCreation`, sonst leer.
  - `"agent.name"`: optional lockerer (Sub-Agent-Namen wie „Explore" sind nicht abschließend
    aufzählbar), aber mindestens eine Längenbegrenzung und ein Ausschluss von `@`
    (E-Mail-typisches Zeichen, in keinem bekannten Agent-Namen sinnvoll).
  Dazu ein Test analog zum bereits vorhandenen Personendaten-Guard: eine Roh-Eingabe mit
  genau dieser Angriffsform (Wert-Whitelist-Bypass über ein erlaubtes Feld) muss in der CSV
  **kein** unerwartetes Muster hinterlassen.

## Wichtige Findings

*(keine)*

## Hinweise

- [ ] [CSV-Injection / Formeleinschleusung] `clean()` erlaubt `+`, `-`, `@`, `.` als Zeichen
  in jedem Feldwert. Ein Feld, das mit einem dieser Zeichen **beginnt** (z. B. `model` oder
  `agent_name`), wird von Excel/Google Sheets beim Öffnen der CSV potenziell als Formel
  interpretiert (klassische CSV-Injection). Die meisten gefährlichen Payload-Zeichen (Pipe,
  Leerzeichen, Anführungszeichen, Klammern – nötig für DDE-artige Payloads) werden von
  `clean()` bereits entfernt, das Risiko ist dadurch spürbar reduziert, aber nicht
  strukturell ausgeschlossen. Falls die CSV routinemäßig in Tabellenkalkulationen geöffnet
  wird (statt nur maschinell ausgewertet): führende `=`/`+`/`-`/`@` in einem Feldwert mit
  einem Apostroph oder Tab-Präfix neutralisieren. Kein Blocker, da (a) die Whitelist-Fix
  oben den praktisch relevanten Angriffspfad (PII/beliebiger Text) bereits schließt und (b)
  die primäre Auswertung laut Spec maschinell erfolgt (`AK8`), nicht interaktiv in Excel.

## Ergebnis

NEEDS_FIXES
