# Review: Task 161

Reine Doku-Änderung (5 Dateien, 137 Zeilen). Review inline über drei Fokus-Runden – kein
Sub-Agenten-Fan-out, da für einen Prosa-Diff dieser Größe unverhältnismäßig (Token-Effizienz).
Scope gegen `origin/main` bestimmt (lokales `main` war hinter `origin/main` → #170-Dateien im
`main...HEAD`-Diff sind Fremd-Noise, nicht Teil dieser Task).

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- Keine.

## Nitpicks (optional)
- [ ] `docs/factory/OPERATING.md` (neue Sektion) / `CLAUDE.md:60`: Die Formulierung „Phase 1 …
      **immer** interaktiv (Mensch ↔ Claude)" liest sich streng genommen minimal reibend mit dem
      unbeaufsichtigten Pfad in §1.3, wo es **keine** interaktive Claude-Sitzung gibt und der
      **Issue-Text die Spec** ist. Inhaltlich kein Widerspruch (das Schärfen bleibt Handarbeit des
      Menschen – nur vorab im Issue statt im Dialog), und §1.3 reconciled das bereits. Optional:
      im „Warum das zählt"-Block einen Halbsatz ergänzen („bzw. vorab im Issue-Text, siehe §1.3"),
      damit „immer interaktiv" nicht absolut wirkt. Bewusst als Nitpick, nicht als Rework – die
      Zwei-Phasen-Aussage (Phase 1 = menschliches Urteil, nicht automatisiert) trägt so oder so.

## Positives
- **Alle sechs Akzeptanzkriterien erfüllt und verifizierbar:** zwei Phasen + Start-Skripte (AC1),
  Phase 1 immer Mensch↔Claude (AC2), Phase 2 vollautomatisierbar (AC3), manueller Skill-Fallback
  bleibt (AC4, in der Tabelle „oder wahlweise Skill für Skill" + §2 unangetastet), Kosten-Hinweis
  bleibt (AC5, eigener „Kosten"-Block + §1.2 unberührt), Phasengrenze in CLAUDE.md + konsistenter
  OPERATING-Verweis in README (AC6).
- **Kanonische-Quellen-Regel sauber eingehalten** (CLAUDE.md-Guideline): OPERATING.md ist die
  einzige Volltext-Quelle; CLAUDE.md und README verweisen darauf, statt zu duplizieren. Keine
  widersprüchlichen Parallel-Beschreibungen.
- **Anker-Links korrekt** – inkl. der em-dash-Doppelbindestrich-Falle:
  `#12-automatik-laufen-lassen--ein-kommando-bis-zum-merge` gegen den echten Header verifiziert
  (gleiches Muster wie das bestehende `#11-…--bleibt-handarbeit`).
- **Scope diszipliniert eingehalten:** keine Skript-Änderung, kein Produktionscode, kein
  Reflex-Check-Skript (deckt sich mit Codify-Grundsatz OPERATING §5.1 und dem Issue-Scope).
- CHANGELOG `[Unreleased]` korrekt ergänzt; ASCII-Phasendiagramm in beiden Dateien konsistent.

## Empfehlung
APPROVED
