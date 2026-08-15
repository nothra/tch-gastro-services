# Spec: Rate-Limit/Missbrauchsbremse für die öffentliche Selbstbedienungs-Action

> Issue: #182 · Delegiert aus [ADR-034](../adr/034-selbstbedienung-token-zugang.md) D7 (F7, #54).
> Kanonischer Endpunkt-Kontext für das wiederverwendete Muster: [ADR-020](../adr/020-health-endpoint-rate-limit.md)
> (`lib/rate-limit.ts`, bislang nur für `/api/health`).

## Kontext

`adjustVerzehrByTokenAction` (`app/veranstaltung/actions.ts:305`) ist die einzige öffentliche,
unauthentifizierte **Schreib**-Grenze der App (F7, ADR-034 D3). Sie hat bewusst **kein**
`requireRole` – Autorisierung ist rein capability-basiert: ein gültiger 256-bit-Token einer
**offenen** Veranstaltung genügt. Die fail-closed-Grundlagen (unratbarer Token, Status-Gate,
IDOR-Bindung `getZeile(zeileId, ziel.id)`, Soft-Delete-Prüfung, neutrale Fehler) sind in #54
gelegt (ADR-034 D3); ADR-034 D7 delegiert die **Missbrauchsbremse** ausdrücklich an diesen
Task.

**Restrisiko ohne Bremse:** Wer den geteilten Link/QR kennt (am Veranstaltungsort öffentlich
ausgehängt), kann unbegrenzt ±1-Anpassungen auf beliebigen Zeilen der Veranstaltung absetzen –
Verfälschung der Abrechnung plus Kostentreiber auf Neon-Free/Vercel-Functions (DB-Write pro
Aufruf, `adjustMenge`).

**Entscheidungen (mit dem Auftraggeber abgestimmt, gelten als gesetzt – keine offenen
Architektur-Fragen zu Schlüssel/Schwellwert/Fail-Modus/Fehlertext):**
- **Zähl-Dimension: pro Token**, nicht pro Token+IP. Ein Veranstaltungs-Token wird oft von
  mehreren Teilnehmern im selben WLAN geteilt (IP wäre kein trennscharfes Signal); die Map ist
  durch die Zahl gleichzeitig offener Veranstaltungen natürlich beschränkt.
- **Parameter: Fixed-Window 60 s, Schwellwert 60 Anfragen/Fenster** (analog ADR-020-Muster,
  aber großzügiger als der Health-Endpoint-Wert, weil hier reale gleichzeitige menschliche
  Nutzung – nicht nur ein einzelner Healthcheck – bedient werden muss).
- **Fail-Modus: fail-open** (konsistent mit ADR-020) – ein Fehler in der Limiter-Logik selbst
  darf die Erfassung an der Theke nicht blockieren.
- **Fehlertext bei Drosselung:** `"Zu viele Anfragen – bitte kurz warten."` im bestehenden
  `VerzehrActionState.error`-Feld (kein Leak-Risiko wie bei einem unbekannten Token – hier
  bekommt der drosselnde Teilnehmer ohnehin schon Zugriff auf diese Veranstaltung).

## Scope

**Inbegriffen:**
- Ein Rate-Limit **ausschließlich** auf `adjustVerzehrByTokenAction` (die öffentliche,
  unauthentifizierte Schreib-Grenze).
- Zähl-Dimension **pro Token** (ein Zähler je Veranstaltungs-Token), Fixed-Window 60 s,
  Schwellwert 60/Fenster.
- Bei Drosselung: **kein** DB-Zugriff (weder `getZeile` noch `getCatalogItem` noch
  `adjustMenge`), **kein** `revalidatePath`; Rückgabe `{ error: "Zu viele Anfragen – bitte
  kurz warten." }`.
- **Fail-open**, wenn der Limiter-Zustand nicht ausgewertet werden kann.
- Wiederverwendung des bestehenden `lib/rate-limit.ts`-Bausteins (`createRateLimiter`) bzw.
  einer sinnvollen Erweiterung davon für den Pro-Schlüssel-Fall – konkrete Modul-/
  Schnittstellenwahl liegt bei `/architecture`.

**Nicht inbegriffen:**
- **Kein** Rate-Limit auf `adjustVerzehrAction` (F5, authentifiziert über `requireRole` –
  kein öffentliches Missbrauchsrisiko in diesem Sinn).
- **Kein** Rate-Limit auf das reine Laden der Route `app/theke/[token]` (GET, Read-only,
  außerhalb dieses Issues – F7/ADR-034 nennt explizit nur die Schreib-Action als Angriffsfläche).
- **Kein** geteilter/externer Store (Redis/KV) – bleibt Best-Effort in-memory pro
  Function-Instanz, wie bei ADR-020 begründet (keine Kosten/Secrets/Netz-Abhängigkeit im
  Schreibpfad).
- **Kein** Rate-Limit nach IP/`X-Forwarded-For` – bewusst verworfen (s. o.).
- **Keine** Sperrung/Blockliste einzelner Token über das laufende Zeitfenster hinaus (kein
  Lockout, kein manuelles Banning) – reines Fenster-Throttling.
- **Keine** Änderung an `applyVerzehrAdjust` selbst (der gemeinsame Kern mit F5 bleibt
  unverändert) – das Rate-Limit sitzt **vor** dem Aufruf, in `adjustVerzehrByTokenAction`.

## Akzeptanzkriterien

- [ ] **AK-1 (Normalfall unverändert):** GIVEN die Aufrufrate für einen Token liegt unter dem
  Schwellwert WHEN `adjustVerzehrByTokenAction` mit gültigem Token, offener Veranstaltung,
  existierender Zeile und aktivem (oder bereits erfasstem) Katalogartikel aufgerufen wird
  THEN läuft `applyVerzehrAdjust` wie bisher durch (`ok: true`, autoritative `menge`,
  `revalidatePath` wird ausgelöst) – keine Verhaltensänderung ggü. heute.

- [ ] **AK-2 (Deckelung pro Token):** GIVEN 61 Aufrufe von `adjustVerzehrByTokenAction` mit
  demselben Token innerhalb eines 60-Sekunden-Fensters WHEN der 61. Aufruf im selben Fenster
  erfolgt THEN wird dieser Aufruf abgelehnt (`{ error: "Zu viele Anfragen – bitte kurz
  warten." }`), **ohne** dass `getZeile`, `getCatalogItem` oder `adjustMenge` ausgeführt werden.

- [ ] **AK-3 (Isolation zwischen Veranstaltungen):** GIVEN Token A hat seinen Schwellwert im
  aktuellen Fenster ausgeschöpft WHEN ein Aufruf mit einem anderen, gültigen Token B (eigene
  offene Veranstaltung) im selben Zeitraum erfolgt THEN wird Aufruf B **nicht** gedrosselt
  (eigener Zähler je Token).

- [ ] **AK-4 (Fenster-Reset):** GIVEN Token A war im Fenster N gedrosselt WHEN nach Ablauf des
  60-Sekunden-Fensters ein neuer Aufruf mit Token A erfolgt THEN wird dieser Aufruf wieder
  normal verarbeitet (Zähler ist zurückgesetzt).

- [ ] **AK-5 (Kein Seiteneffekt bei Drosselung):** GIVEN ein Aufruf wird gedrosselt THEN
  entsteht **kein** DB-Write (`adjustMenge` nicht aufgerufen) und **kein**
  `revalidatePath`-Aufruf – der zurückgegebene State enthält weder `ok: true` noch `menge`.

- [ ] **AK-6 (Andere Actions unberührt):** GIVEN das Rate-Limit ist für `adjustVerzehrByTokenAction`
  aktiv WHEN `adjustVerzehrAction` (F5, authentifiziert) im selben Zeitraum beliebig oft
  aufgerufen wird THEN wird sie **nicht** gedrosselt (Rate-Limit gilt ausschließlich für den
  token-scoped Pfad).

## Fehlerszenarien

- [ ] **FS-1 (Fail-open bei Limiter-Störung):** GIVEN die Rate-Limit-Auswertung selbst schlägt
  unerwartet fehl oder kann keinen Zustand ermitteln (z. B. Cold-Start) WHEN
  `adjustVerzehrByTokenAction` aufgerufen wird THEN wird die Anfrage **durchgelassen** (normale
  `applyVerzehrAdjust`-Verarbeitung), der Schutz degradiert bewusst statt die Erfassung zu
  blockieren.

- [ ] **FS-2 (Kein Cross-Token-Lockout):** GIVEN ein einzelner Token wird geflutet (weit über
  dem Schwellwert) WHEN gleichzeitig andere Veranstaltungen über ihre eigenen Token bedient
  werden THEN bleiben deren Aufrufe unbeeinflusst (kein globaler Zähler, der andere Events
  mitdrosselt).

- [ ] **FS-3 (Throttle-Pfad billiger als Verarbeitungspfad):** GIVEN eine Anfrage wird
  gedrosselt THEN ist die Antwortzeit nicht langsamer als der reguläre Verarbeitungspfad
  (reine In-Memory-Prüfung, kein zusätzlicher I/O auf dem Throttle-Pfad).

## Offene Fragen

- [ ] **Modul-/Schnittstellenwahl:** Erweiterung von `lib/rate-limit.ts` um eine
  Pro-Schlüssel-Variante (`Map<token, RateLimiter>`, lazy angelegt) vs. eigenständiges neues
  Modul – Entscheidung inkl. Namensgebung liegt bei `/architecture`.
- [ ] **Speicher-Hygiene über die Zeit:** Da Token nicht rotieren und Veranstaltungen dauerhaft
  existieren, wächst die Map über die Lebenszeit einer warmen Function-Instanz mit der Zahl
  unterschiedlicher Token, die sie bedient hat (kein Leak im klassischen Sinn, da Instanzen
  ohnehin recyclet werden – aber zu bewerten, ob eine einfache Bereinigung
  abgeschlossener/alter Einträge sinnvoll ist, oder ob das bei der erwarteten Vereins-Skala
  YAGNI ist, analog zur Begründung in ADR-020). → `/architecture` entscheidet und begründet.
- [ ] **Test-Strategie für modul-lokalen State:** wie in ADR-020 (injizierbare Uhr,
  deterministische Fenster-Tests) – konkrete Umsetzung bei `/implement`/`/test`.
