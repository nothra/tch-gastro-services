# Spec: Lifecycle-Schnitt der Veranstaltung – Routen, Verzeichnis & Rolle (F5–F8)

> ADR-Frage · Issue #120 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> **Deliverable dieser Task: kein Feature-Code, sondern die Rahmung einer Architektur-
> Entscheidung.** `/requirements` (diese Datei) formuliert die Frage, den Optionsraum und
> die Akzeptanzkriterien; die eigentliche Entscheidung trifft **`/architecture 120` →
> ADR-024**, die Umsetzung folgt in `/implement 120`.
>
> **Gebündelter Umfang (Entscheidung 2026-07-15):** #120 deckt zwei gekoppelte Concerns ab –
> (A) den **Lifecycle-orientierten Route-/Verzeichnis-Schnitt** und (B) das **Rollen-Modell**
> (eine Rolle `veranstalter` über den ganzen Lifecycle statt einer eigenen Rolle `abrechner`).
> Beides hängt am selben Leitgedanken (siehe Kontext) und wird deshalb in **einem** ADR
> entschieden.
>
> Kanonische Fachquelle bleibt [README-montagsrunde](README-montagsrunde.md) und die
> Feature-Specs [spec-51](spec-51-abend-anlegen.md) … [spec-55](spec-55-kassieren-abschluss.md);
> Rollen-Grundlage: [spec-48](spec-48-login-rollen.md) / [ADR-016](../adr/016-rbac-rollen-login.md).

## Kontext

**Leitgedanke (2026-07-15):** Das **Abrechnen ist eine Phase im Lebenszyklus einer
Veranstaltung**, kein eigenständiges Ding. Eine Veranstaltung wird **angelegt**, im Verlauf
werden **Getränke und Essen konsumiert** (erfasst), und am Ende wird sie **abgerechnet** und
**abgeschlossen**. Aus diesem Leitgedanken folgen zwei Beobachtungen, die heute nicht
konsistent umgesetzt sind:

1. **Die Route ist nach einer Phase benannt, nicht nach der Entität.** Der Feature-Baum liegt
   heute unter `app/abrechnung/veranstaltung/` – benannt nach *Abrechnung*, also nach **einer**
   Lifecycle-Phase. Wenn Abrechnen nur eine Phase ist, sollte der Baum nach der **Entität/dem
   Lebenszyklus** (`veranstaltung`) heißen, mit *abrechnen* als Phase darin.

2. **Die Rolle ist nach einer Phase benannt, nicht nach der Verantwortung.** Es gibt heute die
   Rolle **`abrechner`** ([spec-48](spec-48-login-rollen.md), [ADR-016](../adr/016-rbac-rollen-login.md)),
   obwohl dieselbe Rolle bereits die **Anlage** *und* das **Führen** *und* das **Kassieren**
   abdeckt (`createVeranstaltungAction`, `addZeileAction`, `setStatusAction` verlangen alle
   `abrechner`). Sie besitzt faktisch den **ganzen Lebenszyklus** – heißt aber nur nach der
   letzten Phase. Vorschlag: **`veranstalter`** (Owner des Lebenszyklus: Anlage → Führen →
   Abrechnung), **keine** eigene Rolle „Abrechner". `verwalter` (Stammdaten & Preise) bleibt
   unverändert.

**Ist-Stand des Feature-Baums** (flach, Stand F4/#51):

- `page.tsx` – Veranstaltungs-**Liste**
- `[id]/page.tsx` – **Veranstaltung führen** (Teilnehmer hinzufügen, Walk-in, Status)
- 7 colocated Client-Komponenten (`AddTeilnehmerForm`, `WalkInForm`, `ZeileRow`, `StatusToggle`, …)
- **ein** `actions.ts` (153 LOC, 7 Server Actions), dazu `schema.ts`, `labels.ts`

**Der Lebenszyklus** und die noch fehlenden Phasen-Features:

| Phase | Feature | Issue/Spec | Route/Rolle heute |
|-------|---------|-----------|-------------------|
| **anlegen** | F4 | #51 / [spec-51](spec-51-abend-anlegen.md) | ✅ vorhanden, Rolle `abrechner` |
| **durchführen** (Verzehr) | F5 | #52 / [spec-52](spec-52-verzehr-erfassen.md) | Strichliste, Essen, Kaffee, Live-Summen |
| **durchführen** (Selbstbedienung) | F7 | #54 / [spec-54](spec-54-selbstbedienung-link.md) | **Token-Route ohne Login** → außerhalb Auth-Gate |
| **abrechnen** (Auslagen) | F6 | #53 / [spec-53](spec-53-auslagen.md) | eigener Vorgang, eigene Actions |
| **abrechnen** (Kassieren) + **abschließen** | F8 | #55 / [spec-55](spec-55-kassieren-abschluss.md) | Erhalten/Spende, Kassenabrechnung |

Ohne bewussten Schnitt **jetzt** – vor dem Start von F5 – wachsen flaches Verzeichnis und
`actions.ts` unkontrolliert zum God-Module (Clean-Code: kleine Module, SRP), und die
phasen-benannten Namen (Route + Rolle) verfestigen sich mit jedem Feature weiter.

## Scope

**Inbegriffen (was die ADR entscheiden muss):**

**(A) Lifecycle-orientierter Route-/Verzeichnis-Schnitt** – ein kohärentes Zielbild über:
1. **Basis-Route/Benennung** – bleibt `/abrechnung/veranstaltung` oder wird nach Entität/
   Lebenszyklus benannt (`/veranstaltung…`), mit *abrechnen* als Phase darin.
2. **URL-Struktur der Phasen** – eine Detailseite mit Abschnitten vs. echte Unterrouten
   (`[id]/verzehr`, `[id]/auslagen`, `[id]/kassieren`).
3. **Verzeichnis-/Code-Schnitt** – Colocation je Phase/Domäne (`_verzehr/`, `_auslagen/`,
   `_kassieren/`) vs. flach.
4. **Server-Actions-Schnitt** – Aufteilung des heutigen `actions.ts` je Phase/Domäne.
5. **Öffentlicher F7-Zugang** – wo die login-freie Erfassungsroute liegt und wie sie
   fail-closed aus dem Auth-Gate herausgeschnitten wird.

**(B) Rollen-Modell** – der Lebenszyklus-Owner:
6. Rolle **`abrechner` → `veranstalter`** umbenennen (Owner von Anlage → Führen → Abrechnung);
   **keine** eigene Rolle „Abrechner". `verwalter` bleibt.
7. Migrationspfad des `user_role`-pgEnum-Werts sowie die Änderungen an [spec-48](spec-48-login-rollen.md),
   [ADR-016](../adr/016-rbac-rollen-login.md), PROJECT-CONTEXT und allen `requireRole`/`hasRole`-
   Aufrufstellen + Tests.

Ferner: **Migrationspfad** vom Ist-Stand (welche Dateien/URLs wandern, was stabil bleibt).

**Nicht inbegriffen:**
- Implementierung von F5–F8 (jeweils eigene Task/Spec).
- Datenmodell der Veranstaltung/Teilnehmer ([ADR-022](../adr/022-teilnehmer-datenmodell.md) /
  [ADR-023](../adr/023-veranstaltung-datenmodell.md)); **außer** der reinen Enum-Wert-Umbenennung `user_role`.
- Rolle `verwalter` (bleibt unverändert) und feingranulare Rechte über die zwei Rollen hinaus.
- Konkrete UI/UX, Layout, Styling.
- Fachliche Verhaltensänderung: der Owner-Wechsel ist eine **Umbenennung** – dieselbe Rolle
  darf schon heute Anlage + Führen + Kassieren; es entstehen **keine neuen Rechte**.

## Lifecycle-Modell (Referenz für den Schnitt)

```
Veranstaltung
  anlegen ─────────► durchführen ─────────► abrechnen ─────────► abgeschlossen
  (F4)               (F5 Verzehr,            (F6 Auslagen,        (F8 Abschluss;
                      F7 Selbstbedienung)     F8 Kassieren)        wieder öffnbar)

  Owner-Rolle: veranstalter (ganzer Lebenszyklus)
  Ausnahme:    F7-Selbstbedienung ist login-frei (Teilnehmer, kein Konto)
  verwalter:   nur Stammdaten & Preise (außerhalb dieses Lebenszyklus)
```

## Entscheidungsraum (für `/architecture` zu bewerten)

Die ADR bewertet mindestens diese Optionen (Kombinationen zulässig) und begründet die
Ablehnung der verworfenen (ADR-README: *Alternatives*).

**Route-Dimension:**
- **A – Flach belassen** unter `app/abrechnung/veranstaltung/`, ein wachsendes `actions.ts`.
- **B – Code-/Verzeichnis-Schnitt ohne URL-Änderung** (private `_ordner` je Phase; App-Router:
  `_ordner` erzeugt keine Route).
- **C – Echte Route-Segmente** je Phase (`[id]/verzehr`, `[id]/auslagen`, `[id]/kassieren`).
- **D – F7-Schnitt (quer zu A–C):** öffentliche Erfassung außerhalb `/abrechnung`
  (z. B. `app/theke/[token]/`), explizit im `proxy.ts`-Negativ-Lookahead freigegeben (#63).
- **E – Basis-Route nach Entität/Lebenszyklus** umbenennen (`/veranstaltung…` statt
  `/abrechnung/…`), *abrechnen* als Phase darin (folgt dem Leitgedanken).

**Rollen-Dimension:**
- **R1 – `abrechner` → `veranstalter` umbenennen** (Owner des Lebenszyklus), keine eigene
  Abrechner-Rolle. `ALTER TYPE user_role RENAME VALUE 'abrechner' TO 'veranstalter'`
  (kein drop-and-recreate nötig; Prod-Daten bleiben erhalten).
- **R0 – `abrechner` beibehalten** (Status quo; verworfen, wenn der Leitgedanke greift –
  Begründung in der ADR).

## Randbedingungen (bindend für die Entscheidung)

- **App-Router-Semantik:** Route-Segment = URL; `_ordner` = privat (keine Route); Route Group
  `(name)` = Gruppierung ohne URL-Segment; Nicht-Routen-Dateien dürfen colocated werden.
- **Auth-Grenze fail-closed (#63):** Jede unauthentifiziert erreichbare Route **explizit** in
  den eng gefassten `proxy.ts`-Negativ-Lookahead. F7 darf nicht hinter dem Gate landen (sonst
  307 → `/login`, nie erfassbar). Route-Schutz in **`proxy.ts`**, nicht `middleware.ts` (#48).
- **Rollen-Migration:** `user_role` ist ein pgEnum mit Prod-Daten → **`ALTER TYPE … RENAME
  VALUE`** (in-place, verlustfrei), **nicht** das drop-and-recreate-Muster aus #48. Migration
  lokal gegen Wegwerf-DB verifizieren. Guard/Prüfung über `lib/authz.ts` (`requireRole`/
  `requireAnyRole`, fail-closed) unverändert – nur der Wert wechselt.
- **Server Actions bevorzugt** (PROJECT-CONTEXT); Route Handler nur für externe/GET-Zugriffe.
- **`actions.ts` (153 LOC, 7 Actions)** wird mit F5–F8 zum God-Module → Schnitt je Phase/Domäne,
  SRP wahren, Testbarkeit erhalten.
- **Data-Layer bleibt in `db/`**; neue `lib/`-Module domänenspezifisch benennen, **kein**
  generisches `utils` (#105).
- **YAGNI/kein Gold-Plating:** nicht tiefer verschachteln, als F5–F8 es brauchen.
- **Zukunftsfestigkeit:** Backlog #56 (offene Posten) / #57 (Kassenbuch, Saldo je Kasse) setzt
  an der Kasse/Veranstaltung an – das Zielbild soll das nicht verbauen.

## Akzeptanzkriterien

Bezogen auf das **Artefakt ADR-024** (nicht auf Laufzeitverhalten):

**Route/Struktur (A):**
- [ ] GIVEN die fertige ADR WHEN sie gelesen wird THEN nennt sie das Ziel-Layout für alle fünf
      Punkte (Basis-Benennung, Phasen-URLs, Verzeichnis-/Code-Schnitt, Actions-Schnitt,
      F7-Zugang) konkret genug, dass F5 (#52) direkt danach starten kann.
- [ ] GIVEN die ADR WHEN Optionen abgewogen werden THEN sind mindestens **A–E** mit
      Vor-/Nachteilen dargestellt und die verworfenen begründet abgelehnt.
- [ ] GIVEN F7 (öffentlicher Link) WHEN das Layout festgelegt wird THEN liegt die
      Erfassungsroute **außerhalb** des Auth-Gates UND die ADR benennt die konkrete
      `proxy.ts`-Matcher-Konsequenz (Negativ-Lookahead, eng gefasst, fail-closed).
- [ ] GIVEN das heutige `actions.ts` WHEN das Zielbild steht THEN legt die ADR fest, wie die
      Server Actions je Phase/Domäne geschnitten werden.
- [ ] GIVEN bestehende Routen (Liste, `[id]`-Detail) WHEN das Zielbild greift THEN nennt die
      ADR den **Migrationspfad** und welche **URLs stabil** bleiben – keine Breaking-URL-
      Änderung ohne dokumentierte Begründung.

**Rolle (B):**
- [ ] GIVEN der Leitgedanke „Owner des Lebenszyklus" WHEN das Rollen-Modell entschieden wird
      THEN legt die ADR **`veranstalter`** als Owner-Rolle fest und begründet, warum es **keine**
      eigene Abrechner-Rolle gibt (R1 vs. R0).
- [ ] GIVEN `user_role` als pgEnum mit Prod-Daten WHEN die Umbenennung geplant wird THEN nennt
      die ADR den verlustfreien Migrationspfad (`ALTER TYPE … RENAME VALUE`) und grenzt ihn
      explizit vom #48-drop-and-recreate ab.
- [ ] GIVEN die ADR ist `Accepted` WHEN #120 abgeschlossen wird THEN sind
      [spec-48](spec-48-login-rollen.md), [ADR-016](../adr/016-rbac-rollen-login.md) und der
      Architektur-/Rollen-Abschnitt in [PROJECT-CONTEXT](../factory/PROJECT-CONTEXT.md) auf
      `veranstalter` aktualisiert (bzw. ADR-016 als „Superseded by ADR-024" markiert) und die
      Phasen-Specs (52…55) auf das Zielbild verwiesen; ADR-Nummer **024** und Status vergeben.

**Gemeinsam:**
- [ ] GIVEN das MVP-Prinzip WHEN das Layout dimensioniert wird THEN ist es **nicht** über den
      Bedarf von F5–F8 hinaus verschachtelt (kein Gold-Plating, YAGNI).

## Fehlerszenarien / Risiken (für die Entscheidung zu vermeiden)

- [ ] F7-Route versehentlich **hinter** dem Auth-Gate → 307 auf `/login`, nie erfassbar (exakt
      der #63-Fall; Unit-Test des Handlers wäre grün, der Bug zeigt sich erst live).
- [ ] Rollen-Migration als drop-and-recreate statt `RENAME VALUE` → Verlust bestehender
      `roles`-Zuordnungen in Prod (#48-Falle in die falsche Richtung angewandt).
- [ ] Unvollständige Umbenennung: eine `requireRole("abrechner")`-Stelle oder ein Test bleibt
      auf dem alten Wert → fail-closed sperrt den `veranstalter` aus (403), oder ein toter
      Enum-Wert bleibt zurück.
- [ ] Über-Verschachtelung: Route-Segmente ohne eigenen URL-Bedarf → unnötige Navigation.
- [ ] Verschieben der bestehenden `[id]`-URL bricht Deep-Links/Lesezeichen ohne Not.
- [ ] Verwechslung Route Group `(name)` vs. privater Ordner `_name` → ungewollte/fehlende URLs.

## Offene Fragen (Input für `/architecture 120`)

- [ ] Bekommen Verzehr/Auslagen/Kassieren **eigene URLs** (Deep-Link/Tab-Navigation) oder
      bleibt es **eine** Detailseite mit Abschnitten?
- [ ] Wird die Basis-Route umbenannt (`/veranstaltung…`)? Falls ja: Redirect von der alten
      `/abrechnung/veranstaltung`-URL nötig, oder gibt es noch keine externen Deep-Links?
- [ ] Wo genau liegt die F7-Route – `app/theke/[token]/` (top-level, public) – und wie heißt
      das Segment?
- [ ] Teilt der öffentliche F7-Zugang die F5-Komponenten (shared), und wie ohne
      Auth-Kopplung/Server-Action-Rollenprüfung?
- [ ] Braucht es Route Groups `(auth)`/`(public)` oder genügt der `proxy.ts`-Matcher?
