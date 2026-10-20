# Lessons: Code-Stil (Projekt)

> Ausgelagerte `/codify`-Learnings (Volltext) – projektspezifische Learnings (TCH Gastro Services) zu **Code-Stil**.
> **Nicht** `@import`-geladen (ADR-037) – bei Bedarf gezielt lesen. Kanonische Quelle je
> Regel ist der jeweilige Eintrag hier; im @import-Pfad (`PROJECT-CONTEXT.md`) steht nur eine Index-Zeile.
> Neue Learnings kommen in die Lesson-Datei **ihrer Seite** (Zuordnungsregel: betrifft das Learning eine
> Datei der Factory laut `docs/factory/OWNERSHIP.md` → `docs/factory/lessons/`, sonst → `docs/project/lessons/`;
> siehe `/codify` + ADR-037).
> Factory-Anteil dieses Themas: [`docs/factory/lessons/code-style.md`](../../factory/lessons/code-style.md).

### Neue `lib/`-Module domänenspezifisch benennen, kein generisches `utils` (aus #105, Review-Finding)

Beim Zentralisieren eines gemeinsamen Helfers entsteht der Reflex, ihn in ein
`lib/form-utils.ts` / `lib/helpers.ts` / `lib/utils.ts` zu legen – auch wenn ein Issue
diesen Namen bereits vorschlägt (in #105 lautete der Issue-Titel wörtlich „… in
`lib/form-utils.ts` zentralisieren"). Das kollidiert mit der etablierten `lib/`-Konvention:
alle Module tragen sprechende Domänennamen (`authz`, `money`, `credentials`, `rate-limit`,
`stage`). Ein generisches „utils" benennt die technische Kategorie statt der Verantwortung
und wird zur „Grabbelkiste", in der Unzusammenhängendes landet (clean-code.md: „Keine
generischen Namen … ohne Kontext").

**Regel:** Ein neues `lib/`-Modul nach seiner **Verantwortung** benennen, nicht nach der
technischen Kategorie – z. B. `form-errors.ts` (Zod-Fehlermeldung → Nutzertext), nicht
`form-utils.ts`. Ein im Issue vorgeschlagener generischer Name ist **kein** Freibrief:
er wurde als Platzhalter notiert, nicht als bindende Design-Entscheidung – im Zweifel im
Review hinterfragen und umbenennen (kostet 1 Datei + Imports). Landet später mehr im Modul,
das keine gemeinsame Verantwortung teilt, ist das ein Zeichen, es aufzuteilen, nicht ein
`utils` zu rechtfertigen.

### Magic-Number-Konsistenz-Bewertung braucht projektweiten Grep, nicht nur Datei-/PR-lokalen Vergleich (aus #142, Review→Refactor-Diskrepanz)

`/review` Runde 2 (Code-Qualität) bewertete das duplizierte Literal `2_147_483_647` in
`catalogItemSchema` (`priceCents`-Refine + neues `sortOrder`-Max) als „kein Finding" mit der
Begründung: „Kein neues Muster – `priceCents` nutzt bereits denselben Inline-Literal, Konsistenz
mit dem etablierten Muster ist ein triftiger Grund, dies nicht zu werten." Das war die falsche
Schlussfolgerung: Es existierte bereits eine zentrale Konstante `INT4_MAX` in `lib/money.ts`
(dokumentiert, in `app/veranstaltung/schema.ts` bereits genutzt) – der Review verglich nur
**innerhalb derselben Datei** und schloss daraus fälschlich auf „kein Bedarf für eine Konstante",
statt projektweit zu prüfen, ob eine passende Konstante schon existiert. Erst `/refactor` fand es
per Codebase-weitem Grep nach dem Zahlenwert.

**Smell:** Ein Review-Finding zu einem duplizierten Literal/Magic Number wird mit „konsistent zu
einem bestehenden Muster in derselben Datei/demselben PR" abgeschlossen, **ohne** dass zuvor
projektweit (nicht nur im Diff oder der betroffenen Datei) nach einer bereits existierenden
benannten Konstante für denselben Wert gesucht wurde.

**Regel:** Bevor ein Magic-Number-/Literal-Duplikations-Finding als „kein Fix nötig" abgeschlossen
wird, per `grep -rn` nach dem konkreten Wert **und** nach naheliegenden Domänennamen (z. B.
`INT4_MAX`, `MAX_*`) über die gesamte Codebase suchen – nicht nur gegen die geänderte Datei oder
denselben PR vergleichen. „Konsistent mit bestehendem Muster" ist nur dann ein gültiger Grund,
eine Konstante wegzulassen, wenn diese Suche keine bereits existierende zentrale Konstante zutage
fördert. Gilt für `/review` (Code-Qualität-Perspektive) ebenso wie für `/refactor`.

### JSDoc auf einem geteilten Options-Interface, die einen konkreten Produktionswert nennt, driftet beim zweiten Konsumenten (aus #182, Review-Runde 1 W2 + Runde 2 Nitpick 1)

`RateLimiterOptions` in `lib/rate-limit.ts` wurde ursprünglich nur von einem Singleton
(`healthRateLimiter`, `limit: 30`) genutzt; das JSDoc auf dem `limit`-Feld nannte entsprechend
„(Produktion: 30)". Task #182 fügte einen zweiten Konsumenten mit abweichendem Wert hinzu
(`selfServiceVerzehrRateLimiter`, `limit: 60`) – das Feld-JSDoc wurde dabei nicht angepasst und
war ab da schlicht falsch für die Hälfte der Instanzen. Review-Runde 1 (W2) korrigierte das
`limit`-Feld auf einen Verweis statt eines Werts. Genau dieselbe Drift lag zeitgleich am
Nachbarfeld `windowMs` (ebenfalls „(Produktion: 60_000)") vor, obwohl beide Felder derselben
Options-Struktur angehören und vom selben Commit betroffen waren – erst Review-Runde 2 (Nitpick 1)
fiel das zweite Feld auf, weil der erste Fix nur die gemeldete Zeile behandelte, nicht das Muster
auf dem ganzen Interface.

**Smell:** „Ich instanziiere ein geteiltes Options-/Config-Interface ein zweites Mal mit einem
anderen konkreten Wert für ein Feld X – nennt das JSDoc von X (oder eines **Nachbarfelds
derselben Struktur**) bereits einen konkreten Produktionswert aus der ersten Instanziierung?"

**Regel:** JSDoc auf einem Feld eines wiederverwendbaren Options-/Config-Interfaces beschreibt
die **Bedeutung** des Felds, nie einen konkreten Wert – sobald absehbar ist (oder gerade passiert),
dass eine zweite Instanziierung einen anderen Wert nutzt. Verweis auf die Stelle, an der die
tatsächlichen Werte stehen (z. B. „die produktiven Werte stehen an den Singletons unten"), statt
eines Literals im Kommentar. Beim Beheben eines gemeldeten Falls **alle Felder derselben
Interface-Definition** auf denselben Drift-Typ prüfen, nicht nur das gemeldete – Spezialfall der
Sweep-Pflicht aus #264 (falscher WHY-Kommentar an kopierten Geschwisterstellen), hier auf
Nachbarfelder statt kopierte Dateien angewendet.

### Rezidiv „X schützt vor Y": benannte Tailwind-Gruppe als Wirkungsbehauptung (aus #403, Review-Iteration 2 W1)

ADR, Kopfkommentar und Testname behaupteten, `group/aufklapper` verhindere das Mitdrehen verschachtelter Aufklapper.
Der Name schützt nur vor fremden `.group`-Vorfahren, nicht vor Verschachtelung desselben Bausteins (der Selektor trifft
jeden Nachfahren der Gruppe). Gefunden erst im Review, an drei Stellen gleichlautend.

**Regel:** Wirkungsbehauptung über einen CSS-/Selektor-Mechanismus (Schutz, Isolation, Scope) vor dem Schreiben gegen
die tatsächliche Selektorsemantik prüfen und im Zweifel enger formulieren („schützt vor …, nicht vor …") – gleiche
Fehlerklasse wie die Erzwingungs-Behauptung oben (#319).
