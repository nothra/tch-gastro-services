// Wegwerf-Config (#374): wie playwright.config.ts, aber ohne webServer – der Capture-Lauf nutzt
// einen eigenen `next dev` auf Port 3374 gegen eine eigene Wegwerf-DB (Lesson #368).
import base from "./playwright.config";

export default { ...base, webServer: undefined };
