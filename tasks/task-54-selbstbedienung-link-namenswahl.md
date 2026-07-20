# Task 54: selbstbedienung-link-namenswahl

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [x] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [x] Codify ausgeführt
- [x] Fertig / PR erstellt

## Beschreibung

Feature **F7** (Epic „Digitale Veranstaltungs-Abrechnung"). Teilnehmer erfassen ihren Verzehr
**selbst** – ohne Konto/Login – über einen geteilten **Link/QR** und Wahl ihres Namens aus der
Teilnehmerliste. Kanonische Spec: [`docs/specs/spec-54-selbstbedienung-link.md`](../docs/specs/spec-54-selbstbedienung-link.md).

Baut auf der in #51 vorbereiteten Grundlage auf: `veranstaltung.token` (unratbar), `veranstaltung_typ`,
rollen-neutrale `db/verzehr.ts`, `proxy.ts`-Seam für `theke/`, route-neutrale `app/_verzehr/`-UI.

**Kern der Umsetzung:** öffentliche Route `app/theke/[token]`, token-scoped Verzehr-Action,
Namenswahl-UI (+ Merken/„Person wechseln"), Link/QR-Anzeige beim Veranstalter, Read-only bei
abgeschlossener Veranstaltung, neutraler Fehler bei ungültigem Token.

**Geschärft am 2026-07-20:** gemeinsame Route für datierte Veranstaltung **und** stehende Theke
(Essen bleibt eingeblendet); Namens-Persistenz je Gerät; abgeschlossen → Read-only; Token stabil
solange offen. Theke-QR-Aushang ausgegründet nach **#181**.

## Akzeptanzkriterien
<!-- Kanonische Quelle: spec-54; hier gespiegelt für den Fortschritt -->

**A) Zugang teilen (Veranstalter)**
- [x] Offene Veranstaltung → Veranstalter sieht auf `veranstaltung/[id]` Link **und** QR-Code auf `theke/[token]` dieser Veranstaltung.

**B) Öffnen & Namenswahl (ohne Login)**
- [x] Gültiger Link → Veranstaltung, Teilnehmerliste und laufende Summen ohne Login sichtbar.
- [x] Namenswahl aus der Liste → Erfassen für die ganze Liste (volle Transparenz), Summen aktualisieren sich (F5).
- [x] Name wird je Gerät gemerkt; „Person wechseln" jederzeit möglich.
- [x] Neuen Teilnehmer anlegen ist über den Link **nicht** verfügbar (nur Auswahl).

**C) Status offen vs. abgeschlossen**
- [x] Abgeschlossene Veranstaltung → Read-only-Ansicht (Liste + Summen), keine Erfassungs-Controls.
- [x] Erfassung bei inzwischen abgeschlossener Veranstaltung → serverseitig abgelehnt (Action prüft `offen`).

**D) Token & Fehler**
- [x] Ungültiges/unbekanntes Token → neutraler 404, keine Preisgabe anderer Veranstaltungen.
- [x] Token bleibt gültig, solange die Veranstaltung offen ist (keine Rotation/kein Ablauf).

**E) Gemeinsame Route & geteiltes Gerät**
- [x] Theke-Token über `theke/[token]` → dieselbe Selbstbedienung wie datierte Veranstaltung (Essen eingeblendet).
- [x] Geteiltes Theken-Gerät → mehrere Teilnehmer nacheinander, Wechsel via „Person wechseln".

**F) Serverseitige Autorisierung (token-scoped)**
- [x] Schreibzugriff nur über gültigen Token einer offenen Veranstaltung; adressierte `zeile`/`teilnehmer` muss zu dieser Veranstaltung gehören (kein IDOR, Codify #51).

## Technische Notizen
<!-- Von /architecture befüllt -->

Architektur-Entscheidung: **[ADR-034](../docs/adr/034-selbstbedienung-token-zugang.md)**
(öffentliche Token-Route, capability-basierte Verzehr-Action, QR server-seitig). **Keine
Datenmodell-Änderung/Migration** – F7 ist reine Präsentations-/Action-Schicht auf dem #51-Fundament
(`veranstaltung.token`, rollen-neutrale `db/verzehr.ts`, `proxy.ts`-Seam für `theke/`,
`app/_verzehr/`).

### Neue Abhängigkeit (Dependency-Schritt zuerst)
- `pnpm add qrcode` + `pnpm add -D @types/qrcode` (server-only, ADR-034 D5). **Nur** server-seitig
  importieren (Detailseite), nie im Client-Bundle.

### Betroffene Dateien / TDD-Reihenfolge (Red → Green → Refactor)
1. **`db/veranstaltung.ts`** – `getVeranstaltungByToken(token): Promise<Veranstaltung | undefined>`
   (indizierte `unique`-Selektion). *Test:* Treffer / Miss → `undefined` (`db/veranstaltung.test.ts`).
2. **`app/veranstaltung/actions.ts`** – privaten Kern `applyVerzehrAdjust(veranstaltung, formData)`
   aus `adjustVerzehrAction` extrahieren (Verhalten unverändert – bestehende Tests bleiben grün),
   dann `adjustVerzehrByTokenAction(token, prev, formData)`: `getVeranstaltungByToken` → `undefined`
   ⇒ neutraler Fehler; **kein** `requireRole`; danach `applyVerzehrAdjust`. `revalidatePath` auf
   `\`/theke/${token}\``. *Tests (je Guard einer, Codify #51):* ungültiger Token, abgeschlossen →
   abgelehnt, **IDOR** (fremde `zeileId` einer anderen Veranstaltung → `ZEILE_NOT_FOUND`, fremde
   Zeile unverändert), Happy-Path liefert `menge`.
3. **`app/theke/[token]/page.tsx`** (Server Component) – `getVeranstaltungByToken` → `notFound()`
   bei Miss; lädt `listZeilen`/`listActiveCatalog`/`listPositionen`; `editable = status==="offen"`;
   Action via `adjustVerzehrByTokenAction.bind(null, token)`; rendert `IdentityGate` mit
   `VerzehrErfassung` als Children.
4. **`app/theke/[token]/IdentityGate.tsx`** (`"use client"`) – localStorage `tch:sb:name:<token>`,
   Namens-Picker aus `zeilen`, „Person wechseln", **stale-Fallback** (gemerkter Name nicht in
   `zeilen` → Picker), bei `!editable` **kein** Gate (Children direkt). *Tests:* Picker bei leerem
   Storage; gemerkt → direkt Erfassung; stale → Picker; „Person wechseln" leert; read-only ohne Gate.
5. **`app/veranstaltung/[id]/page.tsx`** – Abschnitt „Zugang teilen": absolute URL aus `headers()`
   (`host` + `x-forwarded-proto`, env-Fallback `AUTH_URL`/`NEXTAUTH_URL`), Link zum Kopieren +
   QR-SVG (`QRCode.toString(url,{type:"svg"})`, server-seitig). *Test:* Link/QR nur wenn sinnvoll;
   URL enthält `/theke/<token>`.

### Pflichten / Gates
- **`docs/routes.md` mitpflegen** (CLAUDE.md-Guardrail + Drift-Check): neue öffentliche Seite
  `/theke/[token]` – Funktion „Selbstbedienung (Namenswahl + Verzehr erfassen)", Zugriff **öffentlich
  (proxy-exempt, Token)**.
- **`proxy.ts`** braucht **keine** Änderung (`theke/` ist bereits ausgenommen) – nur verifizieren.
- Zod: kein neues Integer-/Text-Feld ohne Grenze (bestehendes `verzehrAdjustSchema` wird
  wiederverwendet).
- 100 % Coverage auf neuem Code; jeder Guard-Branch ein eigener Test (Codify #51).

### Verifikation (Oberflächentest, /implement)
Gegen `pnpm dev`: `/theke/<gültiger-token>` → Namens-Picker → wählen → +1 erhöht Menge & Summe;
ungültiger Token → 404; abgeschlossene Veranstaltung → Read-only ohne +/−; Detailseite zeigt
Link + QR.

### Implementierungs-Notiz [2026-07-20]
Alle sechs AC-Gruppen (A–F) sind implementiert und durch Unit-/Component-Tests abgedeckt:
- **Data-Layer:** `getVeranstaltungByToken` (`db/veranstaltung.ts`, Integrationstest Treffer/Miss).
- **Action:** `applyVerzehrAdjust`-Kern extrahiert (F5-Tests unverändert grün) + capability-basierte
  `adjustVerzehrByTokenAction` (`app/veranstaltung/actions.ts`): kein `requireRole`, neutraler Fehler
  bei ungültigem Token, Status-Gate `offen`, IDOR-Bindung über `getZeile(zeileId, ziel.id)`.
- **Route:** `app/theke/[token]/page.tsx` (`notFound()` bei Miss, `editable = status==="offen"`).
- **Gate:** `IdentityGate.tsx` (localStorage `tch:sb:name:<token>` via `useSyncExternalStore` –
  kein set-state-in-effect; Stale-Fallback, „Person wechseln", kein Gate im Read-only).
- **Zugang teilen:** `ZugangTeilen.tsx` (server-seitiger QR-SVG via `qrcode`, absolute URL via
  `lib/base-url.ts`), nur für offene Veranstaltungen eingebunden.
- **Pflichten:** `docs/routes.md` gepflegt (`/theke/[token]` öffentlich, proxy-exempt); `proxy.ts`
  nimmt `theke/` bereits aus (nur verifiziert, keine Änderung nötig); `qrcode`/`@types/qrcode`
  ergänzt.

**Gates grün** (`scripts/checks/pre-push.sh`): Tests 528 passed / 59 skipped, Typecheck, Format,
Routen-Doku-Drift, Branch-Name. Die 59 Skips sind DB-Integrationstests (`skipIf(!hasDb)`) – laufen
in CI mit DB.

**Offen (Stage 2):** Interaktive Browser-/E2E-Verifikation gegen `pnpm dev` erfordert lokale DB
(`pnpm db:up` + `.env.local`); nicht in dieser Session ausgeführt. Nachweis erfolgt über
`/post-merge-verify` bzw. eine E2E-Spec, falls in `/test` ergänzt.

### Test-Vervollständigung [2026-07-20, /test]
AC-Vollständigkeitsprüfung gegen spec-54 (A–F + Fehlerszenarien) durchgeführt; zwei Lücken
identifiziert und geschlossen (AC E1 „Theke-Typ arbeitet identisch inkl. Essen", AC B4 „kein
Anlegen neuer Teilnehmer über den Link") – zwei neue Tests in `app/theke/[token]/page.test.tsx`.
Alle Tests grün: 531 passed / 59 skipped. Details, AC-Tabelle und bewusst offene Punkte (u. a.
DB-Integrationstests ohne lokale DB, `IdentityGate`-SSR-Fallback-Funktionscoverage, Out-of-Scope-
Funde) in [`tasks/coverage-54.md`](coverage-54.md).

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

Alle Requirements-Fragen sind entschieden (spec-54 → „Gesetzte Entscheidungen"); die
Architektur-Fragen sind in **ADR-034** entschieden. **Verbleibend nur für /security-review:**
Rate-Limit/Missbrauchsbremse der token-scoped öffentlichen Action (ADR-034 D7).

**Doku-Folgeaufgabe (außerhalb #54):** spec-51 B) an „Essen an der Theke bleibt eingeblendet"
angleichen. **Ausgegründet:** #181 (Theke-QR/Link anzeigen & drucken).

## Review-Findings
<!-- Wird durch /review befüllt -->

**Review-Runde 1 (`tasks/review-54.md`): NEEDS_REWORK – behoben [2026-07-20, /implement]:**
- **W1 (AC-B1-Abweichung):** `IdentityGate` zeigte vor der Namenswahl **nur** den Namens-Picker,
  nicht die laufenden Summen – Verstoß gegen spec-54 AC B1. **Fix:** `IdentityGate` rendert jetzt die
  route-neutrale `VerzehrErfassung` selbst mit `editable = offen && nameGewählt`. Liste + Summen sind
  sofort read-only sichtbar; die ±-Controls bleiben hinter dem Namens-Gate. `page.tsx` reicht dazu die
  Daten-Props (statt `children`) an `IdentityGate`; `VerzehrErfassung` wird auf der Theke-Route
  client-seitig gerendert (unverändert für F5). Kein Spec-Nachzug nötig (Code an kanonische Spec
  angeglichen, Codify #55).
- **Nitpicks behoben:** `lib/base-url.ts` `127.0.0.1`-Zweig eigenständig getestet (Branch-Coverage
  100 %); leere Liste zeigt im Selbstbedienungs-Pfad den neutralen öffentlichen Hinweis.
- **Bewusst offen (optionale Nitpicks):** Namens-Wiedererkennung über Anzeigenamen statt `zeile.id`
  (ADR-034 D4, anonyme Erfassung – harmlos); Cross-Tab-`storage`-Event ohne eigenen Test
  (Registrierung ist zeilengedeckt, 100 % Branch/Line auf `IdentityGate`).
- **Gates grün** (`scripts/checks/pre-push.sh`): 529 passed / 59 skipped, Typecheck, Format,
  Routen-Doku-Drift, Branch-Name.

### Refactoring [2026-07-20, /refactor]
Duplicate-Code-Fund (Checkliste „Struktur"): `app/theke/[token]/page.tsx` duplizierte die
Zeilen-/Artikel-Mapping-Logik von `app/veranstaltung/[id]/verzehr/page.tsx` (F5) byte-identisch.
Extrahiert nach `app/_verzehr/verzehr-props.ts` (`toVerzehrZeilen`, `toVerzehrArtikelListe`) –
route-neutral, DB-Row-Typen nur als `import type`. Beide Seiten rufen jetzt den gemeinsamen
Adapter statt inline `.map()`. Kein neues Verhalten – Gates grün (531 passed / 59 skipped,
Typecheck, Format, Routen-Doku-Drift, Branch-Name).

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

Review APPROVED / Security PASSED, keine offenen kritischen/wichtigen Findings. Eine neue
projektspezifische Regel ergänzt (`docs/factory/PROJECT-CONTEXT.md` → „Schreib-Gate darf die
Lese-Ansicht nicht mitverstecken – vorhandenes `editable`-Flag nutzen", aus Review-Runde-1-Finding
an `IdentityGate`). Details: [`tasks/codify-54.md`](codify-54.md). Folge-Issues #181/#182 bereits
vorhanden, keine neuen angelegt.

---
Branch: `feature/54-selbstbedienung-link-namenswahl`
Erstellt: 2026-07-20 07:22
