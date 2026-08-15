# Security Review: Task 182

> Scope: `git diff origin/main...HEAD` (Stand 2026-08-15, nach `/refactor`).
> Produktionscode im Diff: `lib/rate-limit.ts` (+34 Zeilen), `app/veranstaltung/actions.ts` (+7).
> Rest sind Tests, ADRs, Spec und Task-/Review-Dateien.
> Prüfkatalog: OWASP Top 10 + Projekt-Basics (`docs/factory/agents/security-agent.md`).

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [x] **[Information Disclosure / Doku-Drift · in Scope, behoben]** `db/schema.ts:151-152` beschrieb
  im Präsens „Länge/Rotation/**Rate-Limit** sind offen für F7/#54 & **/security-review**" – genau
  das liefert dieser PR. Dieselbe Drift-Klasse wie W1 aus Review-Runde 1 (ADR-034 D7) und der
  einzige Ort im Repo, der `/security-review` noch als offenen Adressaten dieses Punkts nannte
  (Codify #211/#176: Prosa, die eine Mechanik/einen offenen Follow-up beschreibt, im selben PR
  nachziehen). **In diesem Schritt korrigiert:** Rate-Limit als nachgeliefert markiert (#182,
  ADR-044), Länge/Rotation bleiben ausdrücklich offen. Reine Kommentaränderung, kein Verhalten.
  Gates danach erneut grün (`pnpm lint`, `pnpm format:check`, `pnpm test` – 687 passed / 59 skipped).

- [ ] **[Availability · akzeptiertes Restrisiko, keine Änderung gefordert]** Das Budget ist
  **pro Token**, nicht pro Nutzer: jeder Teilnehmer mit dem Link kann die 60 Anfragen/Fenster
  allein aufbrauchen und damit alle übrigen Teilnehmer derselben Veranstaltung für den Rest des
  Fensters aussperren (Co-Tenant-DoS). Das ist eine bewusst mit dem Auftraggeber gesetzte
  Spec-Entscheidung (spec-182: „pro Token, nicht pro Token+IP" – IP wäre im geteilten Theken-WLAN
  kein trennscharfes Signal) und im Vertrauensmodell vertretbar (Zugang setzt physische Präsenz
  am ausgehängten QR voraus). Der Schaden ist zudem nicht persistent: das Fenster läuft nach
  60 s ab, es gibt keinen Lockout. **Bewertung: akzeptabel**, hier nur als Restrisiko notiert.

- [ ] **[Memory / DoS · geprüft, geringer als in ADR-044 D3 beschrieben]** ADR-044 D2/D3 nennt als
  „Con" einen Flood mit vielen **verschiedenen, unbekannten** Token, der je Token einen
  Map-Eintrag anlegt. Praktisch ist diese Fläche kleiner als dort angenommen: der Token ist ein
  **serverseitig gebundenes Closure-Argument** (`app/theke/[token]/page.tsx:31`,
  `.bind(null, token)`), das Next.js 16 verschlüsselt an den Client ausliefert – ein Client kann
  der Action also keinen frei gewählten Token unterschieben. Um überhaupt einen Schlüssel in die
  Map zu bekommen, muss zuerst `/theke/<token>` rendern, und die Seite antwortet bei unbekanntem
  Token mit `notFound()` (`page.tsx:19-20`). Der Schlüsselraum ist damit faktisch auf **real
  existierende Veranstaltungs-Token** begrenzt, nicht auf beliebige Angreifer-Strings. Zusammen
  mit `Map` statt Plain-Object (kein `__proto__`-/Prototype-Pollution-Risiko bei
  angreifernahen Schlüsseln) ist die D2-Entscheidung „keine Eviction, YAGNI" tragfähig.
  **Keine Änderung nötig** – nur die ADR-Formulierung ist konservativer als die Realität, was
  in die sichere Richtung irrt.

- [ ] **[Logging & Monitoring · OWASP A09, bewusst nicht nachgerüstet]** Eine Drosselung ist
  serverseitig **stumm**: kein Log, kein Counter, keine Metrik. Ein anhaltender Missbrauch bliebe
  daher unbemerkt, solange niemand die Abrechnung prüft. Das ist konsistent mit ADR-020
  (`/api/health` loggt ebenfalls nicht) und mit dem Projekt-Scope (keine Logging-/Alerting-
  Infrastruktur vorhanden). Ein `console.warn` im Throttle-Zweig wäre die billigste Verbesserung,
  ist aber weder von spec-182 gefordert noch ohne Log-Auswertung nutzbringend – **kein Finding,
  nur Transparenz**.

- [ ] **[Konfiguration · dokumentiert]** Best-Effort pro Function-Instanz: bei M warmen Vercel-
  Instanzen liegt die real durchgelassene Rate bei bis zu `60 × M` pro Token und Fenster. In
  ADR-044 („Negativ / Trade-offs") und spec-182 explizit als akzeptiert festgehalten; die
  Schnittstelle `tryAcquire(key)` erlaubt ein späteres Nachrüsten eines geteilten Stores, ohne die
  Action zu ändern.

## Prüfkatalog – Ergebnis im Detail

**Input-Validierung & Injection:** Der neue Guard verarbeitet den Token nur als Map-Schlüssel
(kein SQL, kein Shell, kein Template). Der bestehende Pfad validiert unverändert per Zod und
Drizzle-Parametrisierung (`db/veranstaltung.ts:47-51`, `eq(veranstaltung.token, token)`). Der
Fehlertext `TOO_MANY_REQUESTS` ist ein Literal und wird von React escaped gerendert
(`app/_verzehr/MengeControl.tsx:59`) – kein XSS-Vektor. ✅

**AuthN/AuthZ:** Der Guard sitzt **vor** der Autorisierung, kann sie aber nicht umgehen – er kann
nur ablehnen, nie zusätzlich freigeben. Die capability-basierte Kette (Token → offene
Veranstaltung → IDOR-Bindung `getZeile(zeileId, ziel.id)` → Soft-Delete-Prüfung) ist unverändert.
Die authentifizierte Schwester-Action `adjustVerzehrAction` importiert den Limiter nicht (AK-6,
beidseitig getestet). Keine hartkodierten Credentials im Diff. ✅

**Fehlerpfad / Oracle-Analyse:** Die Drosselung antwortet **unabhängig von der Token-Gültigkeit**
(Guard läuft vor dem Lookup) – `TOO_MANY_REQUESTS` verrät also nicht, ob ein Token existiert.
Umgekehrt bleibt der neutrale `NOT_FOUND` für unbekannte Token erhalten. Der Throttle-Pfad ist
zudem schneller als der reguläre (kein DB-Read), verkürzt also die Antwortzeit nur für Anfragen,
deren Absender das Budget selbst aufgebraucht hat – kein verwertbares Timing-Orakel gegen
2²⁵⁶ (ADR-034 D2 gilt unverändert). Keine Stack Traces, keine internen Details nach außen. ✅

**Sensible Daten:** Der Token liegt jetzt zusätzlich als Map-Schlüssel im Prozessspeicher. Er
steht ohnehin in der DB, in der URL und in den Client-Props derselben Seite – keine neue
Exposition. Keine Secrets im Diff, keine `Math.random()`-Nutzung (Token-Erzeugung unverändert
über `crypto.randomUUID()`, 2×128 bit). ✅

**Dependencies:** `package.json`/`pnpm-lock.yaml` sind im Diff **unverändert** – keine neue
Abhängigkeit, keine neue Advisory-Fläche. Ein `pnpm audit`-Lauf ist für diesen PR daher
gegenstandslos (und in dieser Sandbox ohnehin durch den bekannten Gzip-Decoding-Bug blockiert,
Lesson #228). ✅

## Out-of-Scope-Finding → Issue

- **[#297](https://github.com/nothra/tch-gastro-services/issues/297)** ·
  *Rate-Limit/DB-Amplifikations-Bremse für die öffentliche GET-Route `/theke/[token]`*
  (`enhancement` + `security`). Die Lese-Route ist im Auth-Proxy freigeschaltet (`proxy.ts:42`)
  und führt für **jeden** GET mit beliebigem Pfad-Segment mindestens `getVeranstaltungByToken`
  aus – dort ist der Token, anders als bei der Action, ein frei wählbarer URL-Parameter. Nach
  #182 ist der Schreibpfad gedeckelt und dieser ungedeckelte Lesepfad die verbleibende, billigste
  DB-Amplifikationsfläche auf Neon-Free. Keine Regression aus diesem PR (besteht seit F7/#54) und
  von spec-182 ausdrücklich ausgeschlossen; die Zähl-Dimension lässt sich nicht aus #182
  übernehmen (dort ist der Schlüsselraum durch die Closure-Verschlüsselung begrenzt, hier wäre er
  angreiferkontrolliert) → braucht eine eigene `/architecture`-Runde. Kein Vertraulichkeitsrisiko:
  `notFound()` antwortet neutral, der Token bleibt unratbar.

## Ergebnis

PASSED
