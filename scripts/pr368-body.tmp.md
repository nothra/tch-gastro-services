Closes #368

Task #368: UI-Grundlage mit semantischen Farb-Tokens (hell/dunkel), Bausteinen unter `app/components/ui/` (Button, Field, Card, Badge, Notice, PageHeader), Geist als Schrift, Typo-Skala, `tabular-nums` für Beträge und einem Farb-Gate als ESLint-Regel (ADR-052). Umgestellt sind Login und `app/verwaltung/katalog/**`.

## Nachweis AK5.3 (375 px, hell und dunkel)

Lokaler Dev-Server dieses Worktrees (`next dev -p 3368`), 375 px breit, je hell und dunkel:

| Ansicht | hell | dunkel |
|---|---|---|
| Login | light-1-login | dark-1-login |
| Login, leer abgeschickt | light-2-login-leer | dark-2-login-leer |
| Login, falsches Passwort | light-3-login-fehler | dark-3-login-fehler |
| Katalog | light-4-katalog | dark-4-katalog |
| Katalog, Inline-Bearbeitung | light-5-katalog-bearbeiten | dark-5-katalog-bearbeiten |
| Katalog, Umbenennen-Dialog | light-6-katalog-dialog | dark-6-katalog-dialog |

Ergebnis: kein horizontaler Scroll (`scrollWidth − clientWidth = 0`), nichts abgeschnitten. Im Dunkeln trägt der aufgehellte Akzent dunklen Text. Es wurden keine Daten angelegt. E2E gegen denselben Server: 10 grün, 6 opt-in übersprungen.

Die Screenshots hängen als Kommentar an diesem PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
