# Review: Task 374

> Diff-Basis: `git diff origin/main...HEAD` (37 Dateien, Commits `808dca4`…`5498ed4`).
> Gates im Review-Lauf nachgeprüft: `pre-commit.sh` (Lint) und `pre-push.sh` (1398 Tests grün,
> 112 übersprungen, Typecheck, Prettier, `routes-doc-check`, Import-Kontext 920/1100) – alles grün.
> AK5.4 (Anleitung + Screenshots) ist laut Spec bewusst erst **nach** diesem Review dran und nicht
> Gegenstand dieser Runde.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/theke/[token]/page.tsx:24-47 / docs/adr/056-header-konto-menue-startseite-oeffentlicher-header.md:83-89] **ADR-056 D4 beschreibt die umgesetzte Mechanik nicht vollständig.** Die Seite ruft jetzt zusätzlich `auth()` auf und blendet den `PublicHeader` aus, wenn eine Session besteht (`!session?.user`), weil das Layout dann schon den `AppHeader` zeigt. Die ADR sagt nur „nach `notFound()`, mit `contextLabel`". Neu sind damit zwei Dinge: der erste `auth()`-Aufruf in der öffentlichen Route und die Bedingung „Gast vs. angemeldet". Beides ist sinnvoll und getestet (`should_notAddSecondHeader_when_userHasSession`), gehört laut Lesson #211/#55 aber in denselben PR in die ADR (ein Satz in D4 reicht).
- [ ] [app/components/KontoMenue.test.tsx:6] **Der Verweis auf den E2E-Nachweis zeigt auf die falsche Datei.** Im Kommentar steht, dass `e2e/navigation.spec.ts` Öffnen, Escape, Klick außerhalb und Fokus-Rücksprung belegt. Diese Fälle stehen aber in `e2e/header-startseite.spec.ts`, `navigation.spec.ts` prüft sie nicht. Weil die Unit-Tests ihre Lücke (jsdom ohne Popover-API) ausdrücklich über diesen Verweis rechtfertigen, ist eine falsche Fundstelle mehr als Kosmetik (Lesson „X erzwingt Y ist eine überprüfbare Behauptung", #319).

## Nitpicks (optional)

- [ ] [app/components/KontoMenue.tsx:29] Der Popover-Abstand `top-[calc(env(safe-area-inset-top)+3.75rem)]` ist fest an die Header-Höhe gekoppelt (`py-2` + `min-h-11`). Auf DEV/INT steht darüber noch der `StageBanner` (≈ 1,5 rem), dort überdeckt das Menü den unteren Rand der Kopfzeile samt Teil des Konto-Knopfs. Nach dem Scrollen (Header nicht sticky) hängt das Menü ebenfalls losgelöst vom Knopf. In PRD fällt das kaum auf. Für die AK5.4-Screenshots aber prüfen, ob sie mit Banner aufgenommen werden; zumindest ein WHY-Kommentar zur Herleitung der 3,75 rem wäre hilfreich.
- [ ] [e2e/header-startseite.spec.ts:67-73] AK1.3 verlangt den Fokus-Rücksprung auf den Knopf auch beim Klick außerhalb. Der Test prüft ihn nur nach Escape. Nach meinem Verständnis der HTML-Spec setzt Light-Dismiss den Fokus nicht zurück auf den Knopf (in diesem Review nicht im Browser nachgeprüft). Entweder die AK-Formulierung präzisieren („Fokus-Rücksprung bei Escape") oder das tatsächliche Verhalten assertieren.
- [ ] [app/components/AppNav.test.tsx:167] Der Kommentar nennt noch „Header-Bedienelemente (Hamburger, Abmelden)". „Abmelden" steht nicht mehr im Header, jetzt ist es der Konto-Knopf.
- [ ] [app/_verzehr/VerzehrEinzelansicht.test.tsx:345-383] Die Fixtures nutzen weiter `Kassieren →` als Aktions-Link. Der reale Konsument (Verzehr-Seite) rendert seit AK4.5 „Kassieren" ohne Pfeil. Die Tests bleiben gültig, spiegeln aber nicht mehr die Produktions-Kombination (Lesson #318).
- [ ] [app/veranstaltung/personenbezug.ts:10] Der Satz „„Kassieren" (seit #374 ohne Pfeil) steht seit #370 als Button-Link …" liest sich holprig, weil zweimal „seit" vorkommt. Vorschlag: „Der Hinweg „Kassieren" steht seit #370 als Button-Link (seit #374 ohne Pfeil) …".
- [ ] [docs/adr/056-…md:117-121] Die ADR verlangt, die Mindestversion für die Popover-API (Chrome 114 / Safari 17 / Firefox 125) „als Browser-Anforderung zu dokumentieren". Bisher steht sie nur in der ADR selbst. Mit AK5.4 ließe sich ein Satz in der Anleitung ergänzen.

## Positives

- **Konto-Menü auf nativer Popover-API** ohne eigenen Zustand oder Fokus-Code, deklarativ verdrahtet und damit ohne JS bedienbar (Fehlerszenario erfüllt). Der zugängliche Name „Konto" hängt nicht an der E-Mail.
- **E2E prüft `aria-expanded` über den echten AX-Baum (CDP)** in beiden Richtungen. Das ist sauber begründet, weil Playwrights eigene ARIA-Berechnung die aus `popovertarget` abgeleitete Eigenschaft nicht kennt.
- **Startseite:** Das Rollen-Gate liegt vor dem Laden (AK2.4, Test `listOffeneMock not called`). Der `try/catch` umfasst genau den einen DB-Aufruf (Lesson #353). Bei einem Fehler bleiben die Kacheln, getestet mit `role="alert"`. Die Reihenfolge Abschnitt → Kacheln wird per `compareDocumentPosition` belegt.
- **Data-Layer:** Der Filter läuft in der DB. Die gemeinsame Sortierung `NEUESTE_ZUERST` verhindert Drift zwischen Übersicht und Startseite. Der Integrationstest ist robust gegen parallele Testdateien (filtert auf eigene IDs) und schließt Theke und abgeschlossene Veranstaltungen explizit aus.
- **AK3.3 Namensleck:** Der `PublicHeader` kommt erst nach `notFound()`. Der Test belegt zusätzlich, dass bei ungültigem Token nicht einmal `auth()` aufgerufen wird.
- **AK4:** `PageHeader` wird konsequent wiederverwendet, der Pfeil ist `aria-hidden` und der Test prüft Name und Text getrennt (`/^←Zur Veranstaltung$/`).
- **Farb-Gate** genau um die fünf vollständig umgestellten Dateien erweitert (ADR-056 D5), mit Begründung, warum die vier Seiten noch fehlen. `docs/routes.md` Zeile `/` beschreibt den neuen Zugriffsunterschied.
- Alt-Specs (`auth`, `verzehr-einzelansicht`, `anleitung-veranstalter`) wurden minimal nachgezogen.

## Empfehlung

APPROVED

Keine kritischen Findings. Die beiden wichtigen Findings betreffen nur Doku und Kommentare (ADR-056 D4 ergänzen, E2E-Verweis korrigieren). Sie sollen vor dem Merge erledigt sein, am besten zusammen mit dem AK5.4-Schritt (Anleitung + Screenshots). Eine weitere Review↔Implement-Runde braucht es dafür nicht.
