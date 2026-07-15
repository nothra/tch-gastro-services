# ADR 024: Lifecycle-Schnitt der Veranstaltung – Routen, Verzeichnis & Owner-Rolle

## Status
Accepted

## Date
2026-07-15

## Context

Rahmung: [spec-120](../specs/spec-120-route-schnitt-abrechnung-veranstaltung.md) (#120).

Vor dem Start der Phasen-Features **F5–F8** (#52 Verzehr, #53 Auslagen, #54
Selbstbedienung, #55 Kassieren) ist der Schnitt des Veranstaltungs-Bereichs zu entscheiden.
Heute liegt alles **flach** unter `app/abrechnung/veranstaltung/` (Liste, `[id]`-Detail,
7 colocated Komponenten, **ein** `actions.ts` mit 153 LOC / 7 Actions, `schema.ts`, `labels.ts`).

**Leitgedanke (Entscheidung 2026-07-15):** Das **Abrechnen ist nur eine Phase** im
Lebenszyklus einer Veranstaltung (anlegen → durchführen/Verzehr → abrechnen → abschließen).
Zwei Namen widersprechen dem heute:

1. Der Bereich heißt `app/abrechnung/…` – benannt nach **einer** Phase. [ADR-023](023-veranstaltung-datenmodell.md)
   D6 hat ihn bewusst als „**Abrechner-Bereich**" angelegt.
2. Die Rolle heißt **`abrechner`** ([spec-48](../specs/spec-48-login-rollen.md), [ADR-016](016-rbac-rollen-login.md)),
   obwohl dieselbe Rolle bereits Anlage **und** Führen **und** Kassieren abdeckt
   (`requireRole("abrechner")` in allen sechs Actions) – sie besitzt faktisch den **ganzen
   Lebenszyklus**, heißt aber nach der letzten Phase.

Beide Namen sind derselbe phasen-benannte Fehlgriff und werden – gebündelt (spec-120) – in
diesem ADR korrigiert.

**Bereits entschiedene, hier zu respektierende Fundamente ([ADR-023](023-veranstaltung-datenmodell.md) D6/D7):**
- Data-Layer allein in `db/veranstaltung.ts` (rollen-neutral).
- **Öffentlicher, login-freier Zugang unter `app/theke/[token]/`** – bereits als Seam im
  `proxy.ts`-Negativ-Lookahead (`theke/`) freigegeben. Die öffentliche Seite baut F7 (Zugang)
  + F5 (Erfassung) und dient **datierten Veranstaltungen und der stehenden Theke** über die
  `token`-Spalte. → Dieser ADR entscheidet die F7-Route **nicht** neu, sondern baut darauf auf.

Befund zur Migrationskosten: Es gibt **keine** Navigations-/Deep-Links auf den Bereich
(Home und `AppHeader` enthalten keine Links; einzige interne Verweise sind der Zurück-Link in
`[id]/page.tsx` und die Detail-Links der Liste). Ein Bereichs-Rename ist damit lokal und billig.

## Entscheidung

### Concern A – Route-, Verzeichnis- & Actions-Schnitt

**D1 — Bereich nach der Entität benennen, nicht nach einer Phase.**
`app/abrechnung/veranstaltung/` → **`app/veranstaltung/`**. Liste unter `/veranstaltung`,
Detail unter `/veranstaltung/[id]`. Die redundante Zwei-Ebenen-Schachtelung (`/abrechnung`
hatte nur ein Kind) entfällt. **Supersedes** die „Abrechner-Bereich"-Benennung aus
[ADR-023](023-veranstaltung-datenmodell.md) D6 (nur die Pfad-/Rollen-Benennung; Datenmodell
und Data-Layer bleiben unberührt).

**D2 — Jede Lifecycle-Phase als eigene Unterroute.**
Der Abend hat eine **Übersichts**-Detailseite plus je eine Unterroute pro Phase:
`[id]/verzehr` (F5), `[id]/auslagen` (F6), `[id]/kassieren` (F8). Begründung: die Phasen sind
fachlich getrennte Vorgänge – F6 ist laut spec-53 ausdrücklich ein **eigener Vorgang** – und
verdienen klare Trennung, Deep-Links und je eigenen Code-Ort. Die volle Transparenz („ganze
Liste sehen", spec-52/54) gilt **innerhalb** der jeweiligen Phase, nicht als Zwang zur
Einzelseite. (Entscheidung des Menschen im Review 2026-07-15; die zuvor vorgeschlagene
Einzelseite-mit-Abschnitten ist die verworfene Alternative, s. u.)

**D3 — Code colocatet in seiner Route; der einzige geteilte Teil liegt route-neutral.**
Mit echten Unterrouten (D2) landet der Code jeder Phase in **ihrem** Route-Segment
(`[id]/verzehr/`, `[id]/auslagen/`, `[id]/kassieren/` – je `page.tsx`, Komponenten, `actions.ts`,
`schema.ts`, Tests). Der **einzige** über zwei Routen geteilte Teil ist die **Verzehr-Erfassung**
(genutzt von `[id]/verzehr` **und** der öffentlichen `theke/[token]`-Route). Er liegt deshalb in
einem **route-neutralen Modul** – Vorschlag `app/_verzehr/` (privater, nicht-routender Ordner auf
app-Ebene; von beiden Konsumenten **gleichberechtigt** importiert, kein Griff in den privaten
Ordner einer fremden Route). Auslagen/Kassieren sind nur authentifiziert und brauchen **keinen**
neutralen Ort – sie bleiben in ihren Route-Segmenten.

```
app/
  veranstaltung/
    page.tsx                 # Liste (+ Anlege-/Listen-Komponenten, actions)
    [id]/
      page.tsx               # Übersicht: Status/Führen + Navigation zu den Phasen
      verzehr/               # F5 authentifiziert → importiert @/app/_verzehr
      auslagen/              # F6 (eigene page/actions/schema/Tests)
      kassieren/             # F8 (eigene page/actions/schema/Tests)
  theke/[token]/page.tsx     # öffentlich (F7) → importiert @/app/_verzehr
  _verzehr/                  # route-neutrale Verzehr-Erfassung (shared, kein Duplikat)
```

> Der genaue Basispfad des neutralen Moduls (`app/_verzehr/` vs. top-level `features/verzehr/`)
> ist eine kleine, reversible Namenswahl; `app/_verzehr/` hält die etablierte app-Colocation
> ohne neue Top-Level-Konvention.

**D4 — Server Actions je Phase schneiden.**
Das heutige `actions.ts` (7 Actions: Anlegen/Führen/Status) bleibt beim Übersichts-/Listen-Teil
(`app/veranstaltung/`); F5/F6/F8 legen ihre Actions in ihr jeweiliges Route-Segment bzw. – für
Verzehr – in `app/_verzehr/`. RBAC bleibt an der Action-Grenze (`requireRole`/`requireAnyRole`,
fail-closed). **Ausnahme Verzehr-Erfassung:** die von `theke/[token]` genutzten Erfassungs-Actions
dürfen **nicht** die Owner-Rolle verlangen; sie autorisieren über **gültige Rolle _oder_ gültiges
Abend-Token** (Detail-Design in F5/F7). Dieser ADR legt nur den Schnitt fest, nicht die Token-Prüfung.

**D5 — Keine Route Groups, Auth-Grenze bleibt am `proxy.ts`-Matcher.**
`(auth)`/`(public)`-Gruppen sind nicht nötig: der authentifizierte Bereich `/veranstaltung`
liegt im Default-Schutz, die öffentliche `theke/[token]`-Ausnahme ist bereits eng gefasst im
Negativ-Lookahead (fail-closed, Codify #63). YAGNI.

### Concern B – Owner-Rolle

**D6 — Rolle `abrechner` → `veranstalter` umbenennen.**
Eine Rolle besitzt den **ganzen Lebenszyklus** (Anlage → Führen → Abrechnung); es gibt
**keine** eigene Rolle „Abrechner". `verwalter` (Stammdaten & Preise) bleibt unverändert. Das
ist eine **Umbenennung, keine Rechte-Änderung** – dieselbe Rolle durfte bereits alle drei
Phasen. **Amendment** zur Rollen-Benennung aus [ADR-016](016-rbac-rollen-login.md) (dort
Rückverweis auf diesen ADR ergänzen; ADR-016 bleibt ansonsten gültig).

**D7 — Verlustfreie In-Place-Enum-Migration.**
`user_role` ist ein pgEnum mit Prod-Daten. Die Migration ist **`ALTER TYPE "user_role"
RENAME VALUE 'abrechner' TO 'veranstalter';`** – in-place, verlustfrei, erhält bestehende
`roles`-Arrays. **Nicht** das drop-and-recreate-Muster aus Codify #48 (das galt dem *Entfernen*
von Enum-Werten). Da `drizzle-kit generate` bei Enum-Wert-Änderungen interaktiv nachfragt bzw.
inkohärentes SQL erzeugt (#48), wird die Migration `0007_*.sql` **von Hand** als `RENAME VALUE`
geschrieben, der Snapshot konsistent gehalten und **lokal gegen eine Wegwerf-DB** verifiziert
(0000→0007 grün).

## Alternativen

### Frage 1 – Bereichs-Benennung (D1)
- **Option A: `/abrechnung/veranstaltung` beibehalten.** Vorteil: null Änderung. Nachteil:
  zementiert den phasen-benannten Bereich, inkonsistent zur neuen Owner-Rolle; die
  Zwei-Ebenen-Schachtelung bleibt sinnlos. *Verworfen* – widerspricht dem Leitgedanken bei
  vernachlässigbarem Migrationsnutzen.
- **Option B: `/veranstaltung` (gewählt, D1).** Vorteil: Name = Entität/Lebenszyklus, konsistent
  mit `veranstalter`; flacher. Nachteil: einmaliges Verschieben + Link-Anpassung (billig, da
  keine Nav-/Deep-Links existieren).

### Frage 2 – Phasen als Route vs. Abschnitt (D2)
- **Option A: Echte Unterrouten (gewählt, D2)** (`[id]/verzehr`, `[id]/auslagen`,
  `[id]/kassieren`). Vorteil: fachlich getrennte Vorgänge klar getrennt (F6 = eigener Vorgang),
  Deep-Links, je eigener Code-Ort, geringere Kopplung. Nachteil: mehr Route-Boilerplate, mehr
  Navigation.
- **Option B: Eine Detailseite mit Abschnitten.** Vorteil: eine kohärente Abend-Sicht, weniger
  Ceremony. Nachteil: `[id]/page.tsx` komponiert viel; vermischt getrennte Vorgänge auf einer
  Seite. *Verworfen* – die klare fachliche Trennung (v. a. F6) wiegt schwerer als die eingesparte
  Navigation.

### Frage 4 – Ort des geteilten Verzehr-Codes (D3)
- **Option A: `app/veranstaltung/_verzehr/`** (unter der Entität, `theke/[token]` importiert quer).
  Vorteil: alles zur Veranstaltung colocated. Nachteil: die öffentliche Route greift in den
  privaten Ordner einer **fremden** Route – asymmetrisch. *Verworfen.*
- **Option B: Route-neutrales Modul `app/_verzehr/` (gewählt, D3).** Vorteil: beide Konsumenten
  importieren **gleichberechtigt**, kein Cross-Route-Griff; klare „shared"-Semantik. Nachteil:
  ein Modul außerhalb der beiden Feature-Bäume – bewusst, weil es genau das ist: geteilt.

### Frage 3 – Owner-Rolle (D6)
- **Option R0: `abrechner` beibehalten.** Vorteil: keine Migration/Code-Änderung. Nachteil:
  Rolle nach einer Phase benannt, obwohl sie den ganzen Lebenszyklus besitzt – dauerhafte
  Fehlbenennung. *Verworfen* – widerspricht dem Leitgedanken.
- **Option R1: `veranstalter` (gewählt, D6/D7).** Vorteil: Name = Verantwortung; ein Owner
  über den Lebenszyklus. Nachteil: einmalige Enum-Migration + Rename an ~4 Code-Stellen +
  Tests + Doku – begrenzt und verlustfrei (`RENAME VALUE`).

## Begründung

Der Leitgedanke „Abrechnen ist eine Phase, kein eigenes Ding" trägt **beide** Umbenennungen;
sie gehören in **einen** ADR, weil sie derselben Ursache entspringen. Alle Änderungen sind
**reversibel** (Dateien zurückschieben; Enum erneut umbenennen) → schnelle Entscheidung
gerechtfertigt (architecture-principles: reversibel = günstig zu ändern). Der Code-Schnitt
über `_`-Ordner (D3) verbessert **Testbarkeit** (kleine, phasen-fokussierte Action-Module
statt God-`actions.ts`, SRP) und ermöglicht die **Wiederverwendung** der Erfassungs-UI durch
die öffentliche `theke/[token]`-Route ohne Duplikat. Bestehende ADRs werden respektiert:
ADR-023 (Modell/Data-Layer/`theke/[token]`) bleibt gültig, dieser ADR **überschreibt gezielt**
nur die Pfad-/Rollen-**Benennung** aus D6 und **ergänzt** ADR-016 um die Rollen-Umbenennung.

## Konsequenzen

Für `/implement 120` (dieser ADR implementiert **keinen** Code):

**Struktur (A):**
- Verzeichnis `app/abrechnung/veranstaltung/` → `app/veranstaltung/` verschieben; Zurück-Link
  in `[id]/page.tsx` (`/abrechnung/veranstaltung` → `/veranstaltung`) und die Detail-Links der
  Liste anpassen. Kein Redirect nötig (keine externen Deep-Links; interne PWA).
- Anlege-/Listen-/Führen-Code bleibt bei `app/veranstaltung/` bzw. `[id]/page.tsx`; die
  Phasen-Unterrouten `[id]/verzehr|auslagen|kassieren/` entstehen mit F5/F6/F8 (eigene Tasks).
- Route-neutrales `app/_verzehr/` als geteilte Verzehr-Erfassung anlegen, sobald F5 landet;
  `[id]/verzehr` und `theke/[token]` importieren es. Import-Pfade + Tests nachziehen.
- `proxy.ts`: der authentifizierte Bereich wechselt von `abrechnung/veranstaltung` zu
  `veranstaltung` – **im Default-Schutz** (kein Matcher-Eintrag nötig); `theke/`-Ausnahme
  bleibt unverändert. `_verzehr` ist keine Route → kein Matcher-Thema.

> **Scope dieser Task (#120) vs. Folge-Tasks:** #120 setzt **nur** um, was heute schon existiert –
> Bereichs-Rename (D1) und Rollen-Rename (D6/D7). Die Phasen-Unterrouten (`[id]/verzehr|auslagen|
> kassieren`) und `app/_verzehr/` werden **nicht** vorab als leere Stubs angelegt, sondern
> entstehen mit **F5/F6/F8** (YAGNI). D2–D4 sind hier nur die **verbindliche Vorzeichnung**, an
> die sich diese Folge-Tasks halten – kein Implementierungsauftrag für #120.

**Rolle (B):**
- Migration `db/migrations/0007_*.sql`: `ALTER TYPE "user_role" RENAME VALUE 'abrechner' TO
  'veranstalter';` (Snapshot konsistent, lokal gegen Wegwerf-DB verifizieren, #48).
- `db/schema.ts`: `pgEnum("user_role", ["verwalter", "veranstalter"])`.
- Code: `requireRole("abrechner")` (×5) und `requireAnyRole(["verwalter","abrechner"])` (×1) in
  `_fuehren/actions.ts`, `hasRole(..., "abrechner")` in `page.tsx` + `[id]/page.tsx` → jeweils
  `"veranstalter"`; alle Tests mit `["abrechner"]` mitziehen (Codify: `requireRole`-Guard-
  Branches brauchen Tests).
- Doku synchronisieren (kanonische Quelle zuerst, dann Kopien – Codify W-02/W-03):
  [spec-48](../specs/spec-48-login-rollen.md) (Titel + Rollen), [ADR-016](016-rbac-rollen-login.md)
  (Rückverweis „Rolle in ADR-024 umbenannt"), `PROJECT-CONTEXT.md` (Rollen-Zeile + Coding-
  Konvention), und der Verweis in den Phasen-Specs (52…55) auf das Zielbild.

**Risiken (aus spec-120, beim Implementieren zu prüfen):**
- Unvollständiger Rename → `veranstalter` fail-closed ausgesperrt (403) oder toter Enum-Wert.
  Gegenmittel: repo-weiter Grep auf `abrechner` = 0 nach dem Rename; Migration lokal verifiziert.
- F5/F7-Erfassung: die öffentliche Route darf die Owner-Rolle **nicht** verlangen (Token-Pfad) –
  in F5/F7 durch einen Nachweis auf **Proxy-Ebene** (Gate/e2e) absichern, nicht nur Handler-Unit
  (Codify #63).
- Migrationsart verwechseln (drop-and-recreate statt `RENAME VALUE`) → Verlust der Prod-`roles`.

**Reversibilität:** hoch (Move rückgängig; `RENAME VALUE` zurück). Keine irreversible Festlegung.
