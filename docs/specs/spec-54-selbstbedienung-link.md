# Spec: Selbstbedienung – Zugang per Link/QR & Namenswahl

> Feature F7 · Issue #54 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> **Zielbild (ADR-024, #120):** F7 baut auf der bereits freigegebenen öffentlichen Route
> `app/theke/[token]` auf (login-frei, Seam im `proxy.ts`-Matcher) und teilt die Erfassungs-UI
> route-neutral über `app/_verzehr/` mit F5. Der authentifizierte Bereich heißt **`app/veranstaltung`**
> (vormals `app/abrechnung/veranstaltung`), die Owner-Rolle `abrechner` → **`veranstalter`**.
> Siehe [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).

## Kontext

Damit Teilnehmer ihre Getränke selbst erfassen können (Punkt 3 des Ablaufs), brauchen
sie Zugang zur Veranstaltung – **ohne** eigenes Konto. Der Veranstalter teilt einen Veranstaltungs-Link bzw.
QR-Code. Wer ihn öffnet, wählt seinen Namen aus der Teilnehmerliste der Veranstaltung und
erfasst wie in F5. Genutzt wird das hybrid: auf dem eigenen Handy und auf einem
gemeinsamen Theken-Gerät.

## Ist-Stand (Vorarbeit aus #51 – nicht Teil dieser Task, aber Grundlage)

F7 ist im Datenmodell bereits vorbereitet; diese Task setzt darauf auf:

- **`veranstaltung.token`** existiert (256-bit, unratbar, unique, `$defaultFn`) – für **jede**
  Veranstaltung, datiert wie stehende Theke (`db/schema.ts`).
- **`veranstaltung_typ`-Enum** (`veranstaltung` | `theke`) + stehende-Theke-Data-Layer
  (`ensureThekeForKasse`, `getThekeForKasse`, Seed) vorhanden.
- **`db/verzehr.ts`** ist bewusst **rollen-neutral** – der RBAC-Guard sitzt in der Action, damit F7
  dieselbe Data-Layer über eine **token-scoped Action** wiederverwendet (ADR-025 D6).
- **`proxy.ts`-Matcher** nimmt `theke/` bereits vom Auth-Gate aus (öffentlicher Seam, ADR-023 D6).
- **`app/_verzehr/`** – route-neutrale Erfassungs-UI (F5) – wird geteilt.

## Scope

**Inbegriffen:**
- Öffentliche, login-freie Route **`app/theke/[token]`** – bedient **jeden gültigen Token**:
  datierte Veranstaltung **und** stehende Theke (eine gemeinsame Route, ADR-023 D6).
- Je offener Veranstaltung ein teilbarer **Zugangs-Link** (Text) **und** **QR-Code**, dargestellt
  beim Veranstalter auf der Veranstaltungs-Detailseite (`app/veranstaltung/[id]`).
- Öffnen des Links zeigt die Veranstaltung und die Teilnehmerliste; **Namenswahl** aus der Liste.
- Nach Namenswahl: Erfassen von Getränken/Essen/Kaffee gemäß F5 (volle Sicht auf die ganze
  Liste) über eine **token-scoped Action**, die `app/_verzehr/` und `db/verzehr.ts` wiederverwendet.
- **Namens-Persistenz je Gerät** (localStorage): der gewählte Name bleibt gemerkt; über **„Person
  wechseln"** jederzeit umstellbar (gut fürs eigene Handy **und** das geteilte Theken-Gerät).
- Kein Passwort (bewusste Entscheidung).
- **Nur offene** Veranstaltungen sind über den Link **erfassbar**. Eine **abgeschlossene**
  Veranstaltung zeigt eine **Read-only-Ansicht** (Liste + laufende Summen sichtbar, keine Erfassung).
- **Token stabil, gültig solange offen** – keine Rotation, kein Zeitablauf.
- Selbstbedienung kann **keinen** neuen Teilnehmer anlegen (nur Auswahl aus der bestehenden Liste).

**Nicht inbegriffen:**
- **Anzeige/Drucken des festen Theke-QR/Links** (Aushang der stehenden Theke) → **eigenes
  Feature-Issue [#181](https://github.com/nothra/tch-gastro-services/issues/181)**. Diese Task
  liefert nur die gemeinsame Route + QR-Erzeugung; die Verwalter-Ansicht zum Aushängen ist dort.
- Persönliche Anmeldung/Konten (bewusst nicht, siehe F1/Rahmen).
- Kassieren über den Link (bleibt beim Veranstalter, F8).
- PIN-Schutz des Links (wurde als Option verworfen; ggf. später).
- Echtzeit-Sync zwischen Geräten (Neuladen genügt, wie F5) – Nebenläufigkeit ist über die
  Delta-Upserts in `db/verzehr.ts` bereits abgesichert.
- Rate-Limit/Missbrauchsbremse-Ausgestaltung → offen für /security-review.

## Gemeinsame Route – Essen an der Theke (bewusste Abweichung von spec-51)

Die stehende Theke wird über **dieselbe** Route und **dieselbe** `_verzehr`-UI bedient wie die
datierte Veranstaltung. Entscheidung 2026-07-20: **Essen bleibt eingeblendet** – #54 baut **keine**
theke-spezifische Essen-Ausblendung. Das deckt sich mit dem aktuell gebauten Zustand (keine
Essen-Restriktion im Code), **weicht aber bewusst von [spec-51](spec-51-abend-anlegen.md) B)**
ab („stehende Theke nur Getränke + Kaffee"). → spec-51 ist entsprechend anzugleichen; das ist eine
**Doku-Folgeaufgabe außerhalb von #54** (kein Verhalten in #54 hängt daran).

## Akzeptanzkriterien

### A) Zugang teilen (Veranstalter)
- [ ] GIVEN eine offene Veranstaltung WHEN der Veranstalter auf `app/veranstaltung/[id]` den Zugang
      teilt THEN sieht er den **Link** und einen **QR-Code**, die beide auf `theke/[token]` **genau
      dieser** Veranstaltung zeigen.

### B) Öffnen & Namenswahl (Teilnehmer, ohne Login)
- [ ] GIVEN eine offene Veranstaltung WHEN ein Teilnehmer den gültigen Link öffnet THEN sieht er –
      **ohne Login** – die Veranstaltung, die Teilnehmerliste und die laufenden Summen.
- [ ] GIVEN der geöffnete Link WHEN der Teilnehmer seinen Namen aus der Liste wählt THEN kann er
      Positionen für **die ganze** Liste erfassen (volle Transparenz) und die Summen aktualisieren
      sich sofort (F5-Mechanik).
- [ ] GIVEN ein Nutzer hat auf diesem Gerät einen Namen gewählt WHEN er den Link erneut öffnet THEN
      ist der Name **gemerkt** (Gerät), und über **„Person wechseln"** kann er jederzeit einen
      anderen Namen wählen.
- [ ] GIVEN ein Selbstbedienungs-Nutzer über den Link WHEN er einen **neuen** Teilnehmer anlegen
      will THEN ist diese Aktion **nicht verfügbar** (nur Auswahl aus der Liste; Walk-in bleibt beim
      Veranstalter, F3/F4).

### C) Status: offen vs. abgeschlossen
- [ ] GIVEN der Link zu einer **abgeschlossenen** Veranstaltung WHEN er geöffnet wird THEN erscheint
      eine **Read-only-Ansicht** (Liste + laufende Summen sichtbar), **ohne** Erfassungs-Controls.
- [ ] GIVEN ein Selbstbedienungs-Nutzer erfasst WHEN die Veranstaltung inzwischen **abgeschlossen**
      wurde THEN wird die Schreib-Aktion **serverseitig** abgelehnt (die token-scoped Action prüft
      `status = offen`), nicht nur clientseitig ausgeblendet.

### D) Token & Fehler
- [ ] GIVEN ein **ungültiges/unbekanntes** Token WHEN der Link geöffnet wird THEN erscheint ein
      **neutraler** Fehler (404), **ohne** dass Existenz, Namen oder andere Veranstaltungen
      preisgegeben werden.
- [ ] GIVEN eine offene Veranstaltung WHEN Zeit vergeht / Folgetage kommen THEN bleibt **derselbe**
      Link/Token gültig (keine Rotation, kein Ablauf), bis die Veranstaltung abgeschlossen wird.

### E) Gemeinsame Route & geteiltes Gerät
- [ ] GIVEN der Token der **stehenden Theke** WHEN er über `theke/[token]` geöffnet wird THEN
      funktioniert dieselbe Selbstbedienung (Namenswahl + Erfassung) wie bei einer datierten
      Veranstaltung (eine gemeinsame Route, Essen eingeblendet).
- [ ] GIVEN der QR-Code/Link am **geteilten Theken-Gerät** WHEN mehrere Teilnehmer nacheinander
      erfassen THEN funktioniert die Erfassung ohne persönliche Anmeldung, und **„Person wechseln"**
      erlaubt den schnellen Wechsel zwischen den Personen.

### F) Serverseitige Autorisierung (token-scoped)
- [ ] GIVEN die token-scoped Erfassungs-Action WHEN sie aufgerufen wird THEN wird der Schreibzugriff
      **allein** über den gültigen Token einer **offenen** Veranstaltung autorisiert (keine Rolle
      nötig), und die adressierte `zeile`/`teilnehmer` **muss zu genau dieser** Veranstaltung
      gehören (kein IDOR über fremde `veranstaltungId`; Codify #51).

## Fehlerszenarien
- [ ] Raten/Erraten fremder Veranstaltungen → durch unratbares Token (256-bit) **und** neutralen
      Fehler bei Miss verhindert (Detail /architecture, /security-review).
- [ ] Link nach Abschluss weiterverwendet → **keine** Schreibwirkung (nur Read-only-Ansicht).
- [ ] Token-Weitergabe an Unbeteiligte → im MVP akzeptiertes **Restrisiko** (Vertrauensmodell wie
      beim offenen Zettel); dokumentiert für /security-review.
- [ ] IDOR über die offene Action-Grenze → die token-scoped Action leitet `veranstaltungId` **aus
      dem Token** ab und bindet **alle** Zeilen-/Positions-Schreibvorgänge daran (kein Schreiben in
      fremde Veranstaltungen; Codify #51).

## Gesetzte Entscheidungen

**Aus Requirements-Session 2026-07-11:**
- **Walk-in nur durch Veranstalter:** Ein Selbstbedienungs-Nutzer legt **keinen** neuen Teilnehmer
  an; er wählt nur aus der bestehenden Liste der Veranstaltung. Neue Namen legt der Veranstalter an
  (F3/F4).

**Aus Requirements-Schärfung 2026-07-20 (diese Task):**
- **Gemeinsame Route für beide Zugänge:** `theke/[token]` bedient datierte Veranstaltung **und**
  stehende Theke; **Essen bleibt eingeblendet** (keine theke-spezifische Ausblendung in #54; spec-51
  wird als Doku-Folgeaufgabe angeglichen).
- **Anzeige/Drucken des Theke-QR** ist ein **eigenes Feature-Issue** (#181), nicht Teil von #54.
- **Namens-Persistenz je Gerät** (localStorage) + **„Person wechseln"**.
- **Abgeschlossene Veranstaltung** → **Read-only-Ansicht** (Liste + Summen, keine Erfassung).
- **Token stabil, gültig solange offen** – keine Rotation, kein Zeitablauf.

## Offene Fragen (für /architecture & /security-review)
- [ ] **Rate-Limit / Missbrauchsbremse** trotz fehlendem Passwort (der Theke-Token ist dauerhaft
      gültig, höheres Risiko als der per-Termin-Link)? → /security-review.
- [ ] **Read-only-Ansicht:** derselbe Read-Path wie „offen", nur ohne Erfassungs-Controls, oder
      eine eigene schlanke Ansicht? → /architecture.
- [ ] **localStorage-Schlüssel** der Namens-Persistenz: pro Token/Veranstaltung vs. global – und
      Verhalten, wenn der gemerkte Teilnehmer nicht mehr in der Liste ist. → /architecture.
- [ ] **QR-Erzeugung:** Bibliothek/Server- vs. Client-Rendering, Bündelgröße (PWA). → /architecture.
