# Architecture Decision Records (ADRs) – TCH Gastro Services

Architekturentscheidungen der **App** (Datenmodell, Routen, UI-Bausteine, Deploy). Format, Statuswerte,
Vorlage und Nummerierungsregel stehen in [`docs/factory/adr/README.md`](../factory/adr/README.md).

> **Zwei Verzeichnisse, zwei Nummernfolgen (Factory-ADR-063 D8).** Entscheidungen zur **Factory** (Pipeline,
> Skills, Gates, Konfiguration) liegen unter [`docs/factory/adr/`](../factory/adr/README.md). Wer
> hier im Fließtext eine davon nennt, schreibt `Factory-ADR-NNN`; ein einfaches `ADR-NNN` meint
> eine ADR aus diesem Verzeichnis. Neue App-ADRs führen die Nummer ab der höchsten hier vorhandenen
> fort. Welche Datei welcher Seite gehört, steht in [`docs/factory/OWNERSHIP.md`](../factory/OWNERSHIP.md).

## Index

Jede ADR dieses Verzeichnisses in Nummernfolge (die Testsuite prüft, dass die Liste zum Verzeichnis
passt). Doppelte Nummern (027, 032) sind bekannt, siehe #321.

| Nr. | Titel | Status |
|---|---|---|
| 014 | [Tech-Stack-Wahl](014-tech-stack-selection.md) | Accepted |
| 015 | [Automatischer INT-DB-Refresh an jeden INT-Deploy gekoppelt](015-int-db-refresh-on-deploy.md) | Accepted |
| 016 | [RBAC – Mehrfach-Rollen (Verwalter/Abrechner) & serverseitige Durchsetzung](016-rbac-rollen-login.md) | Proposed |
| 017 | [Prod-DB-Migration & Post-Deploy-Healthcheck automatisiert im Deploy-Gate](017-prod-migration-im-deploy-gate.md) | Accepted |
| 020 | [Rate-Limit für den öffentlichen `/api/health`-Endpunkt](020-health-endpoint-rate-limit.md) | Accepted |
| 021 | [Geldbeträge als Integer-Cent speichern und rechnen](021-geldbetraege-integer-cent.md) | Accepted |
| 022 | [Teilnehmer-Datenmodell (Personen & Familien)](022-teilnehmer-datenmodell.md) | Accepted |
| 023 | [Veranstaltung-Datenmodell (Typen, Kasse, stehende Theke)](023-veranstaltung-datenmodell.md) | Accepted |
| 024 | [Lifecycle-Schnitt der Veranstaltung – Routen, Verzeichnis & Owner-Rolle](024-route-schnitt-veranstaltung-lifecycle.md) | Accepted |
| 025 | [Verzehr-Erfassung – Datenmodell, Nebenläufigkeit, Aktualität](025-verzehr-erfassung-datenmodell.md) | Accepted |
| 026 | [Verzehr auf soft-gelöschtem Katalogartikel – sichtbar und korrigierbar](026-verzehr-soft-geloeschter-artikel.md) | Accepted |
| 027 | [Verzehr-Erfassung – Größe anzeigen & gleichnamige Artikel gruppieren](027-verzehr-groesse-anzeigen-gruppieren.md) | Accepted |
| 027 | [Verzehr-Zusammenfassung – drei Kategorien statt „Getränke/Sonstige"](027-verzehr-summen-drei-kategorien.md) | Accepted |
| 028 | [Auslagenerstattung – Datenmodell, Status, Löschen](028-auslagen-datenmodell.md) | Accepted |
| 031 | [Architektur des rollenbewussten Navigationsmenüs](031-navigationsmenue-architektur.md) | Accepted |
| 032 | [Deploy-Freeze bei rotem Gate (Sentinel-Ref + fail-closed Promote-Guard)](032-deploy-freeze-bei-rotem-gate.md) | Accepted |
| 032 | [Session-Rotation nur bei mutierenden Requests unterdrücken](032-session-rotation-nur-bei-mutationen.md) | Accepted |
| 033 | [Kassieren & Abschluss – Erhalten/Status, Preis-Einfrieren, Abschluss-Guard, Protokoll](033-kassieren-abschluss-datenmodell.md) | Accepted |
| 034 | [Selbstbedienung – öffentliche Token-Route, capability-basierte Verzehr-Action, QR-Erzeugung](034-selbstbedienung-token-zugang.md) | Accepted |
| 035 | [Selbstbedienung – Erfasser/Ziel-Trennung, Fokus-Akkordeon, geräte-lokale Persistenz](035-selbstbedienung-erfasser-ziel-fokus.md) | Accepted |
| 036 | [Abschlussbericht-Erzeugung (Excel + PDF)](036-abschlussbericht-erzeugung-excel-pdf.md) | Accepted |
| 039 | [Verzehrerfassung – FokusListe route-neutral, F5 übernimmt das Fokus-Akkordeon](039-verzehrerfassung-fokusliste-route-neutral.md) | Accepted |
| 044 | [Rate-Limit für die öffentliche Selbstbedienungs-Action (pro Token, keyed In-Memory)](044-rate-limit-selbstbedienungs-action.md) | Accepted |
| 046 | [Abschlussbericht-Variante „nur Getränke" – Aufruf, Modell-Schnitt, Renderer](046-abschlussbericht-getraenke-variante.md) | Accepted |
| 048 | [Amplifikations-Bremse für die öffentliche Theken-Leseroute (globaler Zähler im Proxy)](048-rate-limit-theke-leseroute.md) | Accepted |
| 050 | [Katalog als Template-Entität – Modell, Standard-Katalog-Auflösung, Expand-Migration](050-katalog-als-template-entitaet.md) | Accepted |
| 052 | [UI-Grundlage – eigene schlanke Bausteine, semantische Tokens, Farb-Gate im Lint](052-ui-grundlage-eigene-bausteine-tokens-farb-gate.md) | Accepted |
| 053 | [Detailseite – gemeinsamer Dialog-Baustein, Mehrfach-Anlage in einem Statement, Kennzahlen aus den bestehenden Summen](053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md) | Accepted |
| 054 | [Verzehr-Erfassung als Einzelansicht je Person statt Fokus-Akkordeon](054-verzehr-einzelansicht-statt-fokus-akkordeon.md) | Accepted |
| 055 | [Kassieren – Spende live aus einer geteilten Formel, Rückmeldung aus der Action, Abschluss im Kopf der Detailseite](055-kassieren-spende-live-abschluss-im-kopf.md) | Accepted |
| 056 | [Detailseite – Kopfaktionen als Symbol-Schaltflächen (Teilen, Einstellungen, Löschen)](056-detailseite-kopfaktionen-symbol-schaltflaechen.md) | Accepted |
| 057 | [Header mit Wortmarke und Konto-Menü (natives Popover), Startseite mit offenen Veranstaltungen, `PublicHeader` auf der Theke](057-header-konto-menue-startseite-oeffentlicher-header.md) | Accepted |
| 058 | [Toast-Rückmeldung (react-hot-toast hinter eigenem Baustein), Meldung aus der Client-Hülle, Löschsperren vorab](058-toast-rueckmeldung-react-hot-toast-bestaetigen-sperrgruende.md) | Accepted |
| 059 | [Bausteine ListenZeile und Aufklapper – Slot statt Menü-Prop, CSS-only-Zustand, Abblendung ohne das Badge](059-bausteine-listenzeile-aufklapper.md) | Accepted |
| 060 | [ListenZeile als Dialog-Auslöser (Button-Variante) und Notice-Art „warnung"](060-listenzeile-dialog-ausloeser-notice-warnung.md) | Accepted |
| 061 | [Baustein „AktionsMenue", `ListenZeile`-Slot „kennzeichen" und Auslagen-Umbau](061-aktionsmenue-baustein-listenzeile-kennzeichen-auslagen.md) | Accepted |
| 062 | [„Katalog bearbeiten" – Mehr-Aktionen-Dialog mit Bestätigungsschritt statt Dialog über Dialog](062-katalog-bearbeiten-dialog-bestaetigungsschritt.md) | Accepted |
