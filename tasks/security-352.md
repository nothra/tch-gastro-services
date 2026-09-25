# Security Review: Task 352

Diff-Scope: `git diff origin/main...HEAD` (21 Dateien, kein `package.json`/`pnpm-lock.yaml`-Delta
– bestätigt: keine neue Dependency). Geprüft gegen `docs/factory/PROJECT-CONTEXT.md` (RBAC,
Zod-an-jeder-Grenze, Drizzle-only), `tasks/task-352-…md`, `tasks/review-352.md` (4 Runden,
zuletzt APPROVED), `docs/specs/spec-352-…md` (AK1–AK12, FS1–FS6), sowie die beiden vom Auftrag
benannten bewussten Risikoakzeptanzen (Kassenwechsel ohne Sperre, TOCTOU vor Hard-Delete).

## Kritische Findings (Blocker)

_– keine –_

## Wichtige Findings

_– keine –_

Begründung zu den beiden explizit zu bewertenden Risikoakzeptanzen:

**1. Kassenwechsel ohne Sperre (`updateVeranstaltungMetaAction`, `app/veranstaltung/actions.ts:191-197`).**
Aus Security-Sicht kein eigenständiges Risiko: Der Angreifer-relevante Faktor bei einer
Fehlnutzung ist ausschließlich ein bereits authentifizierter `veranstalter` (RBAC-Gate
`requireRole("veranstalter")`, `actions.ts:203`, plus serverseitiges Seiten-Gate
`app/veranstaltung/[id]/page.tsx:71-78`). Es entsteht keine neue Rechteausweitung, kein IDOR (die
`id` wird über die guarded WHERE-Bedingung `datierteOffeneVeranstaltung` gegen Typ/Status
geprüft, `db/veranstaltung.ts:95-101`, `:117-127`), kein Datenverlust und keine Möglichkeit für
einen nicht autorisierten Dritten, etwas zu bewirken. Das fehlende Audit-Trail ist eine
Nachvollziehbarkeits-/Produktentscheidung (interner Vertrauens-Fall, ein bekannter Nutzer mit
bereits weitreichenden Rechten verschiebt einen Geldtopf), keine Sicherheitslücke im engeren
Sinn (keine Vertraulichkeits-, Integritäts- oder Verfügbarkeitsverletzung gegenüber einem nicht
autorisierten Akteur). Einordnung als „architektonisch vertretbar" ist auch aus Security-Sicht
zutreffend – bestätigt, keine Nachbesserung nötig.

**2. TOCTOU vor dem Hard-Delete (`deleteVeranstaltungAction`, `actions.ts:243-291`).**
Geprüft wurde insbesondere, ob die im Auftrag vermutete Verschärfung („unauthentifiziertes
Zeitfenster vor einem unumkehrbaren Delete") zutrifft. Ergebnis: **teilweise falsch, in einem für
die Einstufung entscheidenden Punkt.**

- Der Kommentar in `actions.ts:246-248` behauptet, der nebenläufige Schreiber sei
  „`adjustVerzehrByTokenAction`/`kassiereZeileAction` über den Theke-Link, kein `requireRole`".
  Das ist für `kassiereZeileAction` **sachlich falsch**: Die Funktion ruft selbst
  `requireRole("veranstalter")` (`actions.ts:446`) auf und ist ausschließlich unter
  `/veranstaltung/[id]/kassieren` verdrahtet (`app/veranstaltung/[id]/kassieren/page.tsx:100`) –
  einer Route hinter dem Auth-Gate. Sie ist über den öffentlichen Theke-Link
  (`app/theke/[token]/page.tsx`) **nicht erreichbar**; dort ist ausschließlich
  `adjustVerzehrByTokenAction` verdrahtet (`app/theke/[token]/page.tsx:6,28`). Der real
  unauthentifiziert erreichbare nebenläufige Schreiber ist also **ausschließlich**
  `adjustVerzehrByTokenAction` (Verzehr-Deltas, `adjustMenge`) – **nicht** das Kassieren
  (`erhaltenCents`). Damit ist die im Auftrag beschriebene Prämisse „unauthentifiziertes
  Race-Fenster mit Zugriff auf beide Sperrbedingungen" zu eng gefasst zugunsten des Risikos: der
  unauthentifizierte Angreifer kann im Fenster nur die Verzehr-Sperre (`hatErfasstenVerzehr`)
  betreffen, nicht die Kassiert-Sperre.
- **Erlangbarkeit des Tokens:** korrekt wie im Auftrag beschrieben – der Token steht im
  QR-Code/Link, der an alle Teilnehmer verteilt wird (`ZugangTeilen`, referenziert in
  `app/veranstaltung/[id]/page.tsx:160` gemäß Task-Historie). Kein Geheimnis, das ein Angreifer
  erst erlangen müsste – jeder Teilnehmer hat ihn bereits.
- **Rate-Limiting:** vorhanden (ADR-044) und wirkt gegen Volumen, nicht gegen Präzisions-Timing.
  `selfServiceVerzehrRateLimiter` (`lib/rate-limit.ts:58` bzw. äquivalent, `createKeyedRateLimiter`
  mit 60/60s je Token) ist ein **Fixed-Window**-Zähler (`lib/rate-limit.ts:27-45`): Er lässt einen
  Burst von bis zu 60 Requests praktisch ohne Verzögerung durch, solange das Fenster noch nicht
  ausgeschöpft ist. Die Bremse begrenzt also die Anzahl möglicher Treffer pro Minute, verhindert
  aber nicht, dass ein einzelner, gut getimter Request exakt in das enge Zeitfenster zwischen
  Vor-Check und `DELETE` fällt.
- **Größe des Zeitfensters:** die vier seriellen `neon-http`-Roundtrips
  (`assertVeranstaltungAenderbar`→`getVeranstaltung`, `hatErfasstenVerzehr`→`listPositionen`,
  `listZeilen`, `listAuslagen`, dann `deleteVeranstaltung`) laufen serverseitig innerhalb **einer**
  einzigen Server-Action-Ausführung, ausgelöst durch den Klick des Veranstalters. Die im Code
  behauptete Größenordnung „typisch < 1 s" ist plausibel (typische Neon-HTTP-Latenz einstellig bis
  niedrig-zweistellig ms pro Roundtrip, vier davon seriell), aber **nicht gemessen** – der Kommentar
  formuliert eine Schätzung als Tatsachenbehauptung.
- **Realistische Ausnutzbarkeit:** Um das Fenster zu treffen, müsste ein Angreifer den exakten
  Moment kennen, in dem ein bestimmter Veranstalter auf „Endgültig löschen" klickt – dieser Moment
  ist für einen externen Angreifer nicht beobachtbar (keine Nebenkanal-Information, kein
  Vorab-Request, der den Lösch-Versuch ankündigt). Ohne diese Information ist ein Treffer reines
  Zufallstiming über ein Fenster von grob geschätzt niedrigen zweistelligen Millisekunden bis unter
  einer Sekunde – kein automatisierbarer, gezielter Angriff, sondern ein seltener Zufallsfall. Das
  unterscheidet dieses Szenario deutlich von klassischen TOCTOU-Ausnutzungen (z. B. Datei-Symlink-
  Races), bei denen der Angreifer den kritischen Moment durch eigene Aktionen provoziert oder
  vorhersagen kann.
- **Maximaler Schaden bei Treffer:** Verlust der Aufzeichnung eines einzelnen, kleinen
  Verzehr-Eintrags (ein Strich auf einer Position) im Zuge einer ohnehin vom Veranstalter
  gewollten, vollständigen Löschung der Veranstaltung. Keine Preisgabe von Daten, keine
  Rechteausweitung, kein Zugriff auf fremde Veranstaltungen (der Token bleibt self-scoped). Die
  fehlende Erfassung dieses einen Verzehrs ist ein Kassen-/Bilanz-Rundungsfehler im Cent- bis
  Euro-Bereich, kein Sicherheits-Incident.

**Einordnung:** Die Risikoakzeptanz 3b ist damit im Ergebnis vertretbar, aber auf einer
schwächeren/anderen Grundlage als im Code dokumentiert – die Prosa überschätzt die Angriffsfläche
(zieht `kassiereZeileAction` fälschlich als unauthentifiziert erreichbar hinein) und unterschätzt
zugleich, wie schwer das Fenster ohne Timing-Vorabwissen tatsächlich zu treffen ist. Das ist eine
Kommentar-Genauigkeits-Lücke in einer sicherheitsrelevanten Begründung, kein Code-Fehler und kein
eigenständiger Blocker – siehe Hinweis unten. Fachlich bleibt festzuhalten: eine Verschärfung auf
„eigene Klasse mit anderer Einstufung als bisher" ist nach dieser Prüfung nicht gerechtfertigt,
weil weder der reale unauthentifizierte Schreibzugriff die Kassiert-Sperre erreicht, noch der
Angreifer den Trigger-Moment kennt oder beeinflussen kann.

## Hinweise

- [x] `app/veranstaltung/actions.ts:246-248` – **Behoben.** Der WHY-Kommentar zur TOCTOU-Risikoakzeptanz nannte
      `kassiereZeileAction` als Teil des unauthentifizierten nebenläufigen Schreibers über den
      Theke-Link. Das ist falsch: `kassiereZeileAction` verlangt `requireRole("veranstalter")`
      (`actions.ts:446`) und ist nur unter der authentifizierten Route
      `/veranstaltung/[id]/kassieren` verdrahtet (`app/veranstaltung/[id]/kassieren/page.tsx:100`),
      nicht unter `/theke/[token]`. Der tatsächlich unauthentifiziert erreichbare Schreiber ist
      ausschließlich `adjustVerzehrByTokenAction`. Empfehlung: Kommentar korrigieren – nennt nur
      noch `adjustVerzehrByTokenAction` als unauthentifizierten Pfad und stellt klar, dass die
      Kassiert-Sperre (`erhaltenCents`) über diesen Pfad gar nicht unterlaufen werden kann, weil
      Kassieren ausschließlich über eine authentifizierte Route läuft. Das ist keine
      Sicherheitslücke, aber eine falsche Tatsachenbehauptung in einer sicherheitsrelevanten
      Begründung (vgl. Lesson „`code-style.md` – „X erzwingt Y" ist eine überprüfbare
      Tatsachenbehauptung").
- [x] `app/veranstaltung/actions.ts:253` – **Behoben.** Die Größenangabe „typisch < 1 s" für das
      TOCTOU-Fenster war eine plausible, aber unbelegte Schätzung (keine Messung, kein Verweis
      auf eine Quelle). Kommentar jetzt als ausdrückliche Schätzung formuliert („grobe Schätzung,
      nicht gemessen"). Eine tatsächliche Zeitmessung (z. B. Logging der vier
      Roundtrip-Latenzen in Produktion) bliebe für eine künftige Verschärfung der Bewertung eine
      stärkere Grundlage.
- [ ] Optionale Härtung (keine Pflicht, da Risiko wie oben begründet gering): Ein `NOT EXISTS`-
      Subquery im guarded `DELETE` (`db/veranstaltung.ts:135-143`), der Zeilen mit
      `erhaltenCents IS NOT NULL` oder Verzehr-Positionen mit `menge > 0` ausschließt, würde das
      Fenster zwar nicht vollständig schließen (Auslagen-Check bliebe außen vor, da `auslage`
      eine Fremdtabelle ohne trivialen Correlated-Subquery-Zugriff im selben Statement ist), aber
      zumindest den Verzehr-Fall strukturell abdecken, ohne die Unumkehrbarkeit selbst
      aufzuheben. Bewusst nicht als Blocker eingestuft, da die Task-Dokumentation diese Option
      bereits erwogen und mit nachvollziehbarer Begründung verworfen hat (Restrisiko klein, nicht
      automatisiert ausnutzbar) und die obige Analyse diese Einschätzung bestätigt.

## Ergebnis
PASSED
