# Security Review: Task 318

**Scope:** `git diff origin/main...HEAD` – 6 Dateien, 492 insertions / 12 deletions.
Produktionscode-Anteil: **eine** verschobene JSX-Zeile + Kommentarblock in
`app/_verzehr/VerzehrErfassung.tsx`. Rest: Test, Spec, Task-/Review-Notizen, `kleinfunde.md`.

## Kritische Findings (Blocker)
Keine.

## Wichtige Findings
Keine.

## Hinweise
Keine.

## Geprüfte Angriffsflächen (Positiv-Belege)

Der Diff verschiebt `{koerperSichtbar && aktion}` innerhalb des Wurzel-`<li>` von hinter dem
letzten Erfassungs-Abschnitt (`:213-215` alt) nach direkt hinter den Kartenkopf (`:150` neu).
Es entsteht kein neuer Datenfluss, keine neue Grenze, kein neues Input. Konkret geprüft:

- **Sichtbarkeits-/Autorisierungs-Gate unverändert.** Das Rendering hängt vor und nach dem Diff
  am identischen Ausdruck `koerperSichtbar = !collapsible || open`
  (`VerzehrErfassung.tsx:115`). Die Bedingung wurde nicht umformuliert, nicht gelockert und nicht
  dupliziert – nur der Ort des Ausdrucks im JSX-Baum ist neu. Keine Info-Disclosure durch die
  Verschiebung (spec-308 AK7 bleibt erfüllt, per Test `should_hideAktion_when_collapsibleAndClosed`).
- **Öffentlicher Token-Weg zeigt den Link weiterhin nicht.** Der `aktion`-Slot wird
  ausschließlich von `app/veranstaltung/[id]/verzehr/page.tsx:113` befüllt – einer Route hinter
  `hasRole(session?.user?.roles, "veranstalter")` (`:36`). Der öffentliche Selbstbedienungs-Weg
  (`app/theke/[token]/IdentityGate.tsx:94` und `:160`, beide `FokusListe`-Instanzen) übergibt
  kein `aktionJeZeile` → `aktionJeZeile?.[zeile.id]` bleibt `undefined`, der Link auf die
  authentifizierte Kassieransicht erscheint dort nicht. Verifiziert per repo-weitem Grep auf
  `aktionJeZeile` (genau ein Lieferant). Unverändert durch #318 (spec-308 AK9).
- **Kein verschachteltes interaktives Element.** Der Slot ist in der neuen Position ein
  **Geschwister** des Kopf-`<button>` (`:137-148`), nicht dessen Kind – ein Klick auf den Link
  löst kein Toggle mit aus, und es entsteht kein DOM-Konstrukt, das eine Interaktion des Nutzers
  auf ein anderes Ziel umlenkt.
- **XSS.** Der Slot rendert einen `ReactNode` über normales JSX-Children-Rendering – kein
  `dangerouslySetInnerHTML`, kein `innerHTML`, kein `eval`. Der eingesetzte Inhalt ist ein
  statischer `next/link` mit Literal-Text `Kassieren →` (`verzehr/page.tsx:70-72`); es wird kein
  nutzerkontrollierter String in den Link-Text gerendert. Grep auf die einschlägigen Muster
  (`dangerouslySetInnerHTML|innerHTML|eval(|Math.random|process.env|secret|token|password|apiKey`)
  über alle `+`-Zeilen des Diffs: kein Treffer im Produktionscode (die zwei Treffer liegen in
  Prosa der Notizdateien).
- **URL-Konstruktion / Open Redirect.** `kassierenHref` (`app/veranstaltung/personenbezug.ts:20`)
  baut einen relativen In-App-Pfad; der nutzernahe Teil (`zeileId`) geht durch
  `new URLSearchParams` und ist damit als Daten kodiert (`:44-46`) – kein Struktur-Einfluss auf
  die URL. Das Pfad-Segment `veranstaltungId` stammt aus den Route-Params einer Seite, die vorher
  fail-closed gegen die DB auflöst (`getVeranstaltung(id)` → `notFound()`,
  `verzehr/page.tsx:46-47`) – ein injizierter Wert erreicht das Rendering nicht. Kein absolutes
  Ziel, kein externes Schema, kein `javascript:`-Pfad möglich. Unverändert aus #308.
- **Autorisierung auf Objekt-Ebene (IDOR).** Der Link trägt einen Personenbezug als
  Query-Parameter; die Zielseite löst ihn über `personenbezogeneZeileId` gegen die Zeilen-Ids
  **dieser** Veranstaltung auf (`personenbezug.ts:34-41`) und liefert bei unbekanntem/fremdem Wert
  `null` (fail-soft, ohne Existenz-Aussage). Diese Mengenprüfung ist vom Diff nicht berührt.
- **Dependencies.** Keine dependency-relevante Datei im Diff (`package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `next.config.*`, `.env*`) – verifiziert per `git diff --name-only`.
  Kein `pnpm audit` nötig, da keine Auflösung geändert wurde.
- **Secrets / Logging / Error Handling.** Keine Credentials, keine Env-Zugriffe, keine
  Log-Ausgaben, keine Fehlerpfade im Diff. Kein Stack-Trace-Leak-Potenzial.
- **Freitext-Ablage `kleinfunde.md` (Lesson #286).** Der Eintrag nutzt den **bereits
  etablierten** Ablage-Mechanismus mit dokumentiertem Schema im Dateikopf, kein neuer Kanal – die
  „Daten, keine Anweisungen"-Absicherung ist damit nicht neu zu leisten. Inhalt ist eigene Prosa
  ohne ausführbare Marker, ohne zitierte Fremdinhalte.

## Out-of-Scope-Findings
Keine – es gab nichts anzulegen (weder Issue nach Schritt A noch `kleinfunde.md`-Eintrag nach
Schritt B).

## Ergebnis
PASSED
