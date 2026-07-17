# FAQ – Häufige Fragen zur Nutzung

Antworten auf wiederkehrende Fragen der Anwenderinnen und Anwender. Für
Entwicklungs- und Betriebsthemen siehe [README.md](../README.md).

---

## Bedienung

### Im Safari springt die Tab-Taste nicht auf Buttons – in Chrome/Edge schon

**Das ist kein Fehler der App, sondern eine Einstellung von macOS/Safari.**

Safari auf dem Mac nimmt standardmäßig **Buttons, Links, Checkboxen, Auswahlfelder
und Dropdowns aus der Tab-Reihenfolge** heraus – mit `Tab` springt man dort nur
zwischen **Textfeldern**. Chrome und Edge ignorieren diese Betriebssystem-Einstellung
und springen immer durch *alle* Bedienelemente. Deshalb tritt das Verhalten nur im
Safari auf.

**Lösung (Einstellung auf dem Gerät, nichts an der App):**

- **macOS Ventura (13) und neuer:**
  Systemeinstellungen → **Tastatur** → Schalter **„Tastaturnavigation"** einschalten.
  Danach springt `Tab` im Safari durch alle Bedienelemente.
  Schnell umschalten: **Ctrl + F7** (`⌃ F7`).
- **Ältere macOS-Versionen:**
  Systemeinstellungen → Tastatur → Kurzbefehle → **„Tastaturnavigation verwenden, um
  den Fokus zwischen Steuerelementen zu bewegen"** aktivieren.
- **iPhone/iPad mit externer Tastatur:**
  Einstellungen → Bedienungshilfen → Tastaturen → **„Vollständiger Tastaturzugriff"**.

Die App selbst verwendet ausschließlich Standard-Bedienelemente (echte `<button>`- und
`<input>`-Felder in natürlicher Reihenfolge, ohne manuelle Tab-Reihenfolge). Die
Tastaturbedienung funktioniert damit in allen Browsern korrekt, sobald die
Betriebssystem-Einstellung aktiv ist.
