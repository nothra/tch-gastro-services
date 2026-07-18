# Sicherheitsrichtlinie

Danke, dass du hilfst, TCH Gastro Services sicher zu halten. Dieses Projekt ist eine
nicht-kommerzielle Anwendung für die Gastronomie-Abrechnung des Tennisclub Heuchelheim.

## Eine Schwachstelle melden

**Bitte melde Sicherheitslücken nicht über öffentliche GitHub-Issues, Pull Requests
oder Diskussionen** – so wäre die Lücke für alle sichtbar, bevor ein Fix bereitsteht.

Nutze stattdessen den vertraulichen Kanal:

- **GitHub Private Vulnerability Reporting:** Reiter **„Security" → „Report a vulnerability"**
  im Repository. Der Bericht ist nur für die Maintainer sichtbar.

Bitte gib im Bericht so viel wie möglich an:

- Art der Schwachstelle (z. B. Auth-Umgehung, IDOR, XSS, Secret-Leak)
- Betroffene Datei, Route oder Funktion
- Schritte zum Reproduzieren oder ein Proof-of-Concept
- Mögliche Auswirkung (welche Daten/Rollen sind betroffen)

## Was du erwarten kannst

- **Eingangsbestätigung** in der Regel innerhalb von 7 Tagen.
- Wir bewerten den Bericht, halten dich über den Fortschritt auf dem Laufenden und
  informieren dich, sobald ein Fix veröffentlicht ist.
- Als kleines, ehrenamtlich betriebenes Vereinsprojekt können wir kein Bug-Bounty
  oder feste Reaktionszeiten zusagen – wir behandeln Sicherheitsmeldungen aber vorrangig.

## Geltungsbereich

Relevant sind insbesondere:

- Authentifizierung und rollenbasierte Zugriffskontrolle (RBAC)
- Umgang mit Secrets und Zugangsdaten
- Zugriff auf personenbezogene Daten (Teilnehmer/Familien)
- Manipulation von Abrechnungs-/Kassendaten

**Nicht im Geltungsbereich:** Angriffe, die einen bereits kompromittierten Account oder
physischen Gerätezugriff voraussetzen, sowie Findings in Dritt-Abhängigkeiten ohne
konkreten Ausnutzungsweg in dieser Anwendung (bitte dort beim jeweiligen Projekt melden).

## Verantwortungsvolle Offenlegung

Bitte gib uns angemessene Zeit, eine gemeldete Schwachstelle zu beheben, bevor du sie
öffentlich machst. Wir nennen dich – wenn gewünscht – gern in den Release-Notes des Fixes.
