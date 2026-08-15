# ADR 044: Rate-Limit für die öffentliche Selbstbedienungs-Action (pro Token, keyed In-Memory)

## Status
Accepted

## Date
2026-08-15

## Kontext

[ADR-034](034-selbstbedienung-token-zugang.md) D7 delegiert die Missbrauchsbremse für
`adjustVerzehrByTokenAction` (F7, #54) ausdrücklich an einen eigenen Task (#182,
[spec-182](../specs/spec-182-rate-limit-selbstbedienung.md)). Diese Action ist die einzige
öffentliche, unauthentifizierte **Schreib**-Grenze der App: der gültige Token einer offenen
Veranstaltung ist die alleinige Autorisierung (capability-based, kein `requireRole`). Wer den
geteilten Link/QR kennt, kann heute unbegrenzt `adjustMenge`-Writes absetzen.

Die Spec legt Schlüssel/Schwellwert/Fail-Modus/Fehlertext bereits fest (mit dem Auftraggeber
abgestimmt): **pro Token**, Fixed-Window 60 s, Schwellwert 60/Fenster, fail-open, fester
Fehlertext. Offen für diese ADR sind die **beiden Punkte, die die Spec ausdrücklich an
`/architecture` delegiert**:

1. Wie wird der bestehende Baustein `lib/rate-limit.ts` ([ADR-020](020-health-endpoint-rate-limit.md))
   für einen **Pro-Schlüssel**-Fall (ein Zähler je Token statt ein globaler Zähler) erweitert?
2. Wächst der Zustand über die Zeit unkontrolliert, und ist das akzeptabel?

Zusätzlich legt diese ADR die **Platzierung** des Guards in `adjustVerzehrByTokenAction` fest,
weil sie die tatsächlich erreichte Kosten-/Schutzwirkung bestimmt.

## Entscheidung

### D1 · Erweiterung von `lib/rate-limit.ts` um `createKeyedRateLimiter` (kein neues Modul)

`lib/rate-limit.ts` bekommt eine zweite Fabrikfunktion, die **intern das bestehende
`createRateLimiter`** wiederverwendet (DRY, ein Ort für die Fenster-Arithmetik):

```ts
export interface KeyedRateLimiter {
  /** true = erlaubt, false = gedrosselt – pro key ein eigenes Fenster. */
  tryAcquire(key: string): boolean;
}

export function createKeyedRateLimiter(options: RateLimiterOptions): KeyedRateLimiter {
  const limiters = new Map<string, RateLimiter>();
  return {
    tryAcquire(key: string): boolean {
      let limiter = limiters.get(key);
      if (!limiter) {
        limiter = createRateLimiter(options);
        limiters.set(key, limiter);
      }
      return limiter.tryAcquire();
    },
  };
}

export const selfServiceVerzehrRateLimiter = createKeyedRateLimiter({ limit: 60, windowMs: 60_000 });
```

`options.now` wird unverändert an jeden inneren `createRateLimiter`-Aufruf durchgereicht – die
injizierbare Uhr aus ADR-020 bleibt für deterministische Tests erhalten, auch über mehrere
Schlüssel hinweg (ein gemeinsam injizierter `now`, mehrere unabhängige Fenster-Zustände).

### D2 · Keine Bereinigung alter Map-Einträge (YAGNI, wie ADR-020 begründet)

Die Map wächst mit der Zahl **unterschiedlicher** Token, die eine warme Function-Instanz
bedient hat – nicht mit der Zahl der Requests. Bei der erwarteten Vereins-Skala (eine
überschaubare, einstellige bis niedrig-zweistellige Zahl gleichzeitig relevanter Veranstaltungen
pro Woche) ist das kein praktisches Speicherproblem, zumal Vercel-Serverless-Instanzen ohnehin
zyklisch recycelt werden (Cold-Start setzt die gesamte Map zurück – dieselbe Eigenschaft, die
ADR-020 für den globalen Zähler als „inhärent fail-open" nutzt). Eine explizite
TTL-/Eviction-Logik wäre zusätzliche Mechanik ohne belegten Bedarf.

### D3 · Guard ganz am Anfang der Action, Schlüssel = roher Token-String

```ts
export async function adjustVerzehrByTokenAction(
  token: string,
  _prevState: VerzehrActionState | undefined,
  formData: FormData,
): Promise<VerzehrActionState> {
  if (!selfServiceVerzehrRateLimiter.tryAcquire(token)) {
    return { error: TOO_MANY_REQUESTS };
  }

  const ziel = await getVeranstaltungByToken(token);
  if (!ziel) return { error: NOT_FOUND };

  const result = await applyVerzehrAdjust(ziel, formData);
  if (result.ok) revalidatePath(thekePath(token));
  return result;
}
```

Der Token-String selbst ist der Schlüssel – **vor** `getVeranstaltungByToken`. Das spart bei
Drosselung zusätzlich den Token-Lookup-DB-Read (FS-3: Throttle-Pfad reine In-Memory-Prüfung,
kein I/O) und braucht keine Fallunterscheidung zwischen bekanntem/unbekanntem Token. Da Token
laut ADR-034 D2 nicht rotieren und 256-bit-unratbar sind, ist „Schlüssel = Token" stabil über
die gesamte Lebensdauer einer Veranstaltung und keine Enumerationsfläche (ADR-034 D2 gilt
unverändert: ein Timing-Orakel auf „Token existiert" hat keinen praktikablen Gewinn gegen
2²⁵⁶ – das Rate-Limit ändert daran nichts).

`TOO_MANY_REQUESTS = "Zu viele Anfragen – bitte kurz warten."` wird als neue Konstante neben
`NOT_FOUND`/`NOT_OFFEN`/`ZEILE_NOT_FOUND`/`ITEM_NOT_FOUND` in `app/veranstaltung/actions.ts`
geführt (bestehendes Muster, keine neue Konvention).

### Fail-open ist strukturell, nicht defensiv nachgerüstet

Wie beim Health-Endpoint (ADR-020) ist `tryAcquire` reine synchrone Map-/Zähler-Arithmetik ohne
I/O – es gibt keinen realistischen Fehlerpfad, den ein `try/catch` behandeln müsste. Fail-open
(FS-1) ist **strukturell** erfüllt: ein noch nicht gesehener Token bekommt einen frischen
Zähler (= erlaubt), genau wie ein Cold-Start beim globalen Zähler. Ein künstlicher
`try/catch`-Fallback um einen Aufruf, der durch das Typsystem und die Implementierung bereits
nicht fehlschlagen kann, wäre ein durch `clean-code.md` ausdrücklich ausgeschlossener toter
Fallback (unerreichbarer Zweig, verfehlt Coverage). Der Test zu FS-1 verifiziert daher das
**Cold-Start-Verhalten** (erster Aufruf mit unbekanntem Token wird nicht gedrosselt), nicht eine
simulierte Exception – analog zum bestehenden `lib/rate-limit.test.ts`.

## Alternativen

### D1 – Modul-Wahl

**Option A (gewählt): `createKeyedRateLimiter` in `lib/rate-limit.ts`.**
Pro: Eine kanonische Quelle für Rate-Limit-Arithmetik (Referenz-Prinzip aus
`factory-workflow.md`), Wiederverwendung von `createRateLimiter` (DRY), keine neue Datei für
eine eng verwandte Fähigkeit.
Con: Das Modul bekommt zwei Exporte statt eines – vertretbar, da beide dieselbe Kernidee
(Fixed-Window-Zähler) auf unterschiedlichen Zustandsformen (einzeln vs. keyed) anwenden.

**Option B: Neues Modul `lib/self-service-rate-limit.ts`.**
Pro: Klarere Trennung „Health" vs. „Selbstbedienung".
Con: Verstößt gegen „Neue `lib/`-Module domänenspezifisch benennen, kein generisches Muster
duplizieren" (Codify #105) in die andere Richtung – hier läge dieselbe Fenster-Arithmetik
zweimal vor, wenn `createRateLimiter` nicht re-exportiert/wiederverwendet würde. Mehr Fläche
für ein einziges zusätzliches Verhalten (keyed statt global), ohne Zusatznutzen.
→ A gewählt.

### D2 – Speicher-Hygiene

**Option A (gewählt): keine Bereinigung, YAGNI.**
Pro: Kein zusätzlicher Code-Pfad, keine Zeit-/Aufräum-Logik zu testen; passt zur
Vereins-Skala und zum Instanz-Recycling-Argument aus ADR-020.
Con: Keine harte Obergrenze der Map-Größe – theoretisch unbegrenzt, wenn eine Instanz
außergewöhnlich lange lebt und viele verschiedene Veranstaltungen bedient.

**Option B: TTL-Eviction je Eintrag (z. B. bei Zugriff alte Einträge verwerfen).**
Pro: Harte Obergrenze, robuster bei langlebigen Instanzen.
Con: Zusätzliche Mechanik + Tests für ein Szenario ohne belegten Bedarf (aktuell: eine
Handvoll Veranstaltungen pro Woche) – Über-Architektur für die aktuelle Skala. Bei
Bedarfswechsel jederzeit reversibel nachrüstbar, ohne die Aufrufstelle in der Action zu
ändern (die Schnittstelle `tryAcquire(key)` bleibt gleich).

### D3 – Guard-Platzierung

**Option A (gewählt): vor `getVeranstaltungByToken`, Schlüssel = roher Token.**
Pro: Spart den Token-Lookup-DB-Read bei Drosselung, keine Fallunterscheidung nötig, Schlüssel
ist ohne DB-Zugriff verfügbar.
Con: Ein (praktisch irrelevanter) Flood mit vielen verschiedenen unbekannten Tokens bekäme
je Token ein eigenes Budget – aber das ist kein neues Risiko: ein 256-bit-Token ist laut
ADR-034 D2 nicht erratbar, Enumeration ist unabhängig vom Rate-Limit bereits ausgeschlossen.

**Option B: nach Token-Auflösung, Schlüssel = `veranstaltung.id`.**
Pro: Semantisch „pro Veranstaltung" statt „pro Token" (identisch, solange Token nicht
rotieren).
Con: Der Token-Lookup-DB-Read liefe auch bei bereits ausgeschöpftem Budget – widerspricht
FS-3 (Throttle-Pfad muss billiger sein) ohne Gegenwert, da Token laut ADR-034 D2 ohnehin
stabil bleiben.
→ A gewählt.

## Begründung

Alle drei Entscheidungen folgen demselben Muster wie ADR-020: **maximale Wiederverwendung**
(ein Baustein, zwei Fabrikfunktionen statt Duplikat-Logik), **YAGNI** (keine Mechanik ohne
belegten Bedarf – weder externer Store noch Eviction) und **Kosten vor Schutz im Zweifel**
(fail-open, Throttle-Pfad günstiger als der reguläre Pfad). Die Entscheidung ist vollständig
reversibel: Sollte die Vereins-Skala wachsen oder ein harter Cross-Instance-Cap nötig werden,
lässt sich hinter derselben `KeyedRateLimiter`-Schnittstelle ein geteilter Store oder eine
Eviction-Strategie nachrüsten, ohne `adjustVerzehrByTokenAction` zu ändern.

## Konsequenzen

**Positiv:**
- Ein Ort für Fixed-Window-Arithmetik (`lib/rate-limit.ts`), kein Duplikat.
- Drosselte Anfragen verursachen keinerlei DB-Zugriff (auch nicht den Token-Lookup) – maximale
  Kostenersparnis im Missbrauchsfall.
- Fail-open ist strukturell garantiert, kein künstlicher Fallback-Code, keine toten
  Coverage-Zweige.
- Vollständig reversibel/erweiterbar (geteilter Store, Eviction) ohne Änderung an der Action.

**Negativ / Trade-offs:**
- Keine harte instanzübergreifende Garantie (wie bei ADR-020: bei M warmen Instanzen ist die
  aggregierte Last ≤ Schwellwert × M pro Token und Fenster) – akzeptiert für die Vereins-Skala.
- Die Map wächst mit der Zahl unterschiedlicher, von einer Instanz je bedienter Token, ohne
  explizite Obergrenze – akzeptiert (D2), bei Bedarf später nachrüstbar.
- Zwei eng verwandte Exporte in `lib/rate-limit.ts` statt eines – vertretbar für die
  Wiederverwendung der Kernarithmetik.

## Implementierungs-Hinweise

Siehe Technische Notizen in
[`tasks/task-182-rate-limit-selbstbedienungs-action.md`](../../tasks/task-182-rate-limit-selbstbedienungs-action.md):
betroffene Dateien, TDD-Reihenfolge, Testfälle je AK/FS.
