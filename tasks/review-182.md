# Review: Task 182

Reviewt: `git diff origin/main...HEAD` (7 Dateien, +622/−4) gegen
[spec-182](../docs/specs/spec-182-rate-limit-selbstbedienung.md) und
[ADR-044](../docs/adr/044-rate-limit-selbstbedienungs-action.md).
Verifikation: `pnpm vitest run lib/rate-limit.test.ts app/veranstaltung/actions.test.ts
app/api/health/route.test.ts` → 3 Dateien / 115 Tests grün.

## Kritische Findings (müssen behoben werden)

_Keine._ Alle AK (AK-1…AK-6) und Fehlerszenarien (FS-1…FS-3) sind umgesetzt und
durch Tests belegt; die Umsetzung folgt ADR-044 D1/D2/D3 wörtlich.

## Wichtige Findings (sollten behoben werden)

- [ ] `docs/adr/034-selbstbedienung-token-zugang.md:88-92` und `:146` – **ADR-034 D7 ist durch
  diesen PR überholt, wird aber weiter im Präsens als offener Punkt beschrieben.** D7 lautet
  „Missbrauchsbremse (Rate-Limit) bewusst NICHT in #54 … wird an **/security-review** delegiert",
  Zeile 146 nennt sie unter *Negative/Trade-offs* als „offener /security-review-Punkt (D7)".
  Genau diese Bremse liefert der PR. Codify #211 (PR ändert die von einer ADR namentlich
  beschriebene Mechanik → ADR im selben PR mitpflegen) und #176 (Prosa, die einen offenen
  Follow-up nennt, beim Erledigen nachziehen) verlangen die Korrektur hier, nicht in einem
  Folge-PR. Vorschlag: D7-Text auf „umgesetzt in #182/ADR-044" umstellen und Zeile 146
  entsprechend entschärfen. Nebenbefund gleicher Ursache: `docs/adr/044-…:11-13` referiert D7
  als Delegation „an einen eigenen Task (#182)", während ADR-034 D7 tatsächlich
  „/security-review" als Adressat nennt – beim Nachziehen mit angleichen.

- [ ] `lib/rate-limit.ts:14` – **JSDoc `/** Erlaubte Anfragen pro Fenster (Produktion: 30). */`
  ist seit diesem PR nicht mehr richtig.** `RateLimiterOptions` wird jetzt von zwei produktiven
  Limitern genutzt (`healthRateLimiter` = 30, `selfServiceVerzehrRateLimiter` = 60, beide
  `windowMs: 60_000`). Ein Leser dieser Schnittstelle schließt aus „Produktion: 30", 30 sei *der*
  Produktionswert. Der Modul-Header darüber wurde für die zweite Einheit korrekt mitgepflegt
  (Codify #207) – dieselbe Pflege fehlt eine Ebene tiefer an der Options-Doku. Vorschlag:
  „(Produktion: 30 für `/api/health`, 60 für die Selbstbedienungs-Action)" oder den konkreten
  Wert ganz aus dem JSDoc nehmen, da beide Werte an der Singleton-Definition stehen.

- [ ] `app/veranstaltung/actions.test.ts:871` – **`should_processNormallyAndRevalidate_when_underRateLimit`
  ist ein Rumpf-Duplikat des bestehenden `should_adjustAndReturnAuthoritativeMenge_when_tokenValidAndOpen`
  (`:816`).** Beide laufen mit dem `beforeEach`-Default `tryAcquireMock.mockReturnValue(true)`,
  beide assertieren `result toEqual { ok: true, menge: 1 }` und
  `adjustMenge → ("z1","c1",1)`; einziger Mehrwert des neuen Tests ist die
  `revalidatePath("/theke/tok")`-Assertion. Codify #240 („neue Assertion gegen bereits
  vorhandene mit identischem Rumpf abgleichen, bevor eine parallele daneben gelegt wird").
  Vorschlag: die `revalidatePath`-Assertion in den bestehenden Test ziehen und dort per Kommentar
  auf AK-1 verweisen; den neuen Test entfernen.

## Nitpicks (optional)

- [ ] `lib/rate-limit.test.ts:110` – `should_allow60AndThrottle61st_when_sameTokenWithinWindow`
  läuft als einziger Test gegen die echte Wanduhr (der Singleton kennt kein injizierbares `now`).
  Das ist für einen Parameter-Nachweis am produktiv verdrahteten Objekt vertretbar und im
  Kommentar begründet; formal kollidiert es mit „kein `Date.now()` ohne Clock-Mock"
  (`testing-standards.md`), weil ein Fenster-Straddle zwischen Aufruf 1 und 61 den Test
  theoretisch grün-falsch macht. Risiko praktisch null (61 synchrone Map-Operationen), daher
  nur als bewusste Ausnahme notiert – keine Änderung empfohlen.

- [ ] `app/veranstaltung/actions.test.ts:895` – Testname `should_countPerToken_when_differentTokensUsed`
  verspricht einen Zähl-/Isolationsnachweis, assertiert aber (korrekterweise, weil der Limiter
  hier gemockt ist) nur den übergebenen Schlüssel. Ein Name wie
  `should_passRawTokenAsRateLimitKey_when_differentTokensUsed` beschriebe das geprüfte Verhalten
  genauer; die eigentliche Isolation liegt in `lib/rate-limit.test.ts:70`.

- [ ] Beobachtung zum Schwellwert (keine Änderung gefordert – Parameter ist laut spec-182 mit dem
  Auftraggeber gesetzt): 60 Anfragen/Minute gelten pro **Token**, nicht pro Person. Bei einer
  Veranstaltung mit vielen gleichzeitig erfassenden Teilnehmern (z. B. 20 Personen × ≥3 Taps/Min.)
  kann der reguläre Betrieb das Fenster erreichen; die Drosselung ist dann für alle sichtbar
  („Zu viele Anfragen – bitte kurz warten."). Entschärfend: der Zähler ist pro Function-Instanz,
  bei M warmen Instanzen liegt der effektive Deckel bei ≈60 × M – die Abweichung geht also in die
  fail-open-Richtung. Falls im Betrieb Fehlalarme auftreten, ist der Wert an genau einer Stelle
  (`lib/rate-limit.ts:78-81`) änderbar.

## Positives

- **ADR-044 1:1 umgesetzt**, ohne Abweichung und ohne Gold-Plating: `createKeyedRateLimiter`
  wiederverwendet `createRateLimiter` (eine Quelle für die Fenster-Arithmetik, D1), keine
  Eviction (D2), Guard als erste Zeile vor `getVeranstaltungByToken` (D3). ADR-Status steht
  korrekt auf `Accepted` (Codify #197).
- **AK-5/FS-3 sind wirklich belegt, nicht behauptet:** `actions.test.ts:880` assertiert die
  Abwesenheit *jedes* awaited DB-Calls (`getVeranstaltungByToken`, `getZeile`, `getCatalogItem`,
  `adjustMenge`) plus `revalidatePath` und den exakten State `{ error: … }` – damit sind
  „kein Seiteneffekt" und „Throttle-Pfad ohne I/O" strukturell statt per Zeitmessung geprüft
  (richtige Entscheidung gegen einen flaky Laufzeit-Test).
- **AK-6 in beide Richtungen assertiert** (`actions.test.ts:797`): der F5-Pfad läuft bei
  `tryAcquire → false` durch **und** konsultiert den Limiter gar nicht erst – genau die
  Symmetrie, die Codify #211/#211-Spiegelregel für Spiegel-AK verlangt.
- **Die Mock-Lücke ist erkannt und geschlossen:** weil `actions.test.ts` `@/lib/rate-limit`
  mockt (zu Recht – Singleton-State erzeugt sonst Testreihenfolge-Abhängigkeit), wären die
  produktiven Parameter sonst nur behauptet. `lib/rate-limit.test.ts:109` prüft 60 erlaubt /
  61. abgelehnt am echten Singleton.
- **Fail-open bleibt strukturell** (frischer Zähler bei unbekanntem Schlüssel) statt als
  `try/catch` um einen nicht fehlschlagenden synchronen Aufruf – kein toter Zweig,
  konform zu `clean-code.md` („Keine Fallbacks für vom Typsystem ausgeschlossene Fälle").
- **Modul-Header von `lib/rate-limit.ts` mitgepflegt**, als das Modul von einer auf zwei
  Ausprägungen wuchs (Codify #207) – dieselbe Klasse Drift, die dieser Review eine Ebene tiefer
  (Zeile 14) noch findet.
- **Keine Routen-Änderung** → `docs/routes.md` korrekt unberührt (#145 greift nicht: weder
  `page.tsx`/`route.ts` hinzugefügt/entfernt noch Pfad oder Zugriff geändert).
- **Die YAGNI-Begründung aus D2 trägt tatsächlich:** der Token ist ein serverseitig gebundenes
  Action-Argument (`app/theke/[token]/page.tsx:31`, `bind(null, token)`) und die Seite antwortet
  bei unbekanntem Token mit `notFound()`. Der Map-Schlüsselraum bleibt damit auf real existierende
  Veranstaltungs-Token beschränkt – ein Angreifer kann die Map nicht mit beliebigen Fremdschlüsseln
  aufblähen, obwohl der Guard vor der Token-Auflösung sitzt. (Geprüft, weil D3-Option-A diese
  Frage nur unter dem Aspekt „Enumeration", nicht unter „Speicherwachstum" abwägt.)

## Empfehlung

NEEDS_REWORK

Keine kritischen Findings – die Funktionalität ist korrekt, vollständig und testgedeckt.
Die drei wichtigen Findings sind mechanische Drift-/Duplikat-Korrekturen (ADR-034-Prosa,
JSDoc-Parameterwert, doppelter Testrumpf), jede mit einem bereits codifizierten Präzedenzfall
(#211/#176, #207, #240). Zusammen ≤ 20 Zeilen Änderung.
