# Spec: Bedienungsanleitung für Veranstalter

> Quelle Issue: [#221](https://github.com/nothra/tch-gastro-services/issues/221)
> Grundlage: [`docs/routes.md`](../routes.md), [`docs/specs/README-montagsrunde.md`](README-montagsrunde.md),
> `spec-48`, `spec-51`–`spec-55`, `spec-185`.

## Kontext

Der Veranstalter-Workflow (Veranstaltung anlegen, führen, Verzehr erfassen, Auslagen
erstatten, kassieren, Abschlussbericht) wird von Vereinsmitgliedern bedient, die **wenig
Erfahrung mit Smartphones/Apps** haben. Ohne eine bebilderte, laienverständliche Schritt-für-
Schritt-Anleitung ist die App für diese Zielgruppe nicht selbsterklärend. Ziel ist eine
**gedruckt nutzbare** Anleitung, die den kompletten Ablauf einer Veranstaltung von Anfang bis
Ende führt.

## Scope

**Inbegriffen:**

- Schritt-für-Schritt-Anleitung für die Rolle `veranstalter` über die sieben Workflow-Schritte
  (Anmelden → Veranstaltung anlegen → führen → Verzehr erfassen → Auslagen erstatten →
  Kassieren & Abschluss → Abschlussbericht).
- Zu jedem wesentlichen Schritt **mindestens ein aktueller, echter App-Screenshot**, erzeugt aus
  dem lokalen Dev-Server (`pnpm dev`) mit Testdaten.
- **Markdown-Quelle** mit eingebetteten Bildern als versionierte Quelle im Repo **plus** ein
  daraus **gerendertes, druckbares PDF**.
- Kurzes **Glossar** der Fachbegriffe (Veranstaltung, Teilnehmer, Verzehr, Auslage, Kasse,
  Spende) in Alltagssprache, mit Verweis auf die Ubiquitous Language.
- Ein **kurzer Hinweis** im Verzehr-Schritt auf die Selbstbedienung (Teilnehmer erfassen sich
  per Link/QR über `/theke/[token]`) – als erklärender Absatz, **kein** eigener Abschnitt.

**Nicht inbegriffen:**

- Anleitung für die Rolle `verwalter` (Katalog/Preise, Teilnehmer-Stammdaten) – separate Task.
- Ein vollständiger, eigener Selbstbedienungs-Abschnitt (nur der Hinweis oben).
- Änderungen am App-Code/Verhalten – dies ist eine reine Doku-Task.
- Automatisiert in die Screenshots eingezeichnete Pfeile/Markierungen (optional, siehe offene
  Fragen).

## Akzeptanzkriterien

- [ ] **AC1 – Reihenfolge/Vollständigkeit:** GIVEN die fertige Anleitung WHEN ein Veranstalter
      sie von oben nach unten liest THEN führen ihn nummerierte Schritte genau in der Reihenfolge
      Anmelden (`/login`) → Veranstaltung anlegen (`/veranstaltung`) → Veranstaltung führen
      (`/veranstaltung/[id]`) → Verzehr erfassen (`/veranstaltung/[id]/verzehr`) → Auslagen
      erstatten (`/veranstaltung/[id]/auslagen`) → Kassieren & Abschluss
      (`/veranstaltung/[id]/kassieren`) → Abschlussbericht herunterladen
      (`/api/veranstaltung/[id]/bericht`).
- [ ] **AC2 – Screenshot je Schritt:** GIVEN die fertige Anleitung WHEN ein wesentlicher Schritt
      betrachtet wird THEN zeigt er mindestens einen aktuellen App-Screenshot dieses Schritts.
- [ ] **AC3 – Laienverständlichkeit:** GIVEN eine nicht-app-affine Person WHEN sie einen Schritt
      liest THEN ist jeder Schritt einzeln, nummeriert und nach dem Muster „Was tue ich? → Was
      passiert?" formuliert, ohne unerklärte Fachbegriffe.
- [ ] **AC4 – Druckbares PDF + reproduzierbare Erzeugung:** GIVEN die Markdown-Quelle
      (`docs/anleitung/veranstalter/anleitung.md`) WHEN das PDF per **Browser-Druck** erzeugt
      wird THEN liegt `docs/anleitung/veranstalter/anleitung.pdf` im Repo und der Browser-Druck-
      Weg ist in der Quelle so dokumentiert, dass er wiederholbar ist.
- [ ] **AC5 – Glossar:** GIVEN die Fachbegriffe Veranstaltung, Teilnehmer, Verzehr, Auslage,
      Kasse, Spende WHEN sie in der Anleitung erstmals vorkommen THEN werden sie kurz in
      Alltagssprache erklärt (oder es wird auf die Ubiquitous Language verwiesen).
- [ ] **AC6 – Selbstbedienungs-Hinweis:** GIVEN der Verzehr-Schritt WHEN er gelesen wird THEN
      enthält er einen kurzen, laienverständlichen Hinweis, dass Teilnehmer sich per Link/QR
      (`/theke/[token]`) selbst erfassen können.
- [ ] **AC7 – Große, lesbare Darstellung:** GIVEN der Ausdruck bzw. das PDF WHEN es von einer
      sehsschwächeren Person gelesen wird THEN sind Text und Screenshots ausreichend groß und
      kontrastreich dargestellt.

## Fehlerszenarien

- [ ] **Falsche Rolle:** Die Anleitung erklärt kurz, was zu tun ist, wenn nach dem Anmelden die
      Veranstaltungs-Liste nicht erscheint (fehlende `veranstalter`-Rolle → an den Verwalter
      wenden). Kein technischer Jargon.
- [ ] **Screenshot-Aktualität:** Die Anleitung/Quelle vermerkt, dass Screenshots bei UI-
      Änderungen mitzupflegen sind, und enthält einen Stand/Datum-Hinweis.

## Entscheidungen (aus /requirements)

Die drei bei der Spec-Erstellung offenen Punkte sind geklärt:

- **Ablageort:** `docs/anleitung/veranstalter/` mit `anleitung.md`, Unterordner `bilder/` für die
  Screenshots und `anleitung.pdf` daneben. (Struktur erweiterbar um eine spätere Verwalter-
  Anleitung unter `docs/anleitung/verwalter/`.)
- **PDF-Erzeugung:** Manueller **Browser-Druck** der gerenderten Markdown-Ansicht nach PDF (kein
  neues Tooling, keine Dev-Abhängigkeit). Der exakte Weg wird **in der Quelle dokumentiert**
  (reproduzierbar), sodass das PDF bei Änderungen von Hand neu erzeugt werden kann.
- **Screenshot-Markierungen:** **Bildunterschriften genügen** – Tipp-Ziele werden präzise im
  Schritt-Text und in der Bildunterschrift beschrieben; keine eingezeichneten Pfeile/Rahmen
  (Issue verlangt Markierungen nur „nach Möglichkeit"). Weniger Pflegeaufwand bei UI-Änderungen.
