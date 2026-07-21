import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

// Regression-Guard für #193 (PDF-Abschlussbericht → HTTP 500 auf Vercel, lokal grün).
//
// Root Cause: pdfmake nutzt pdfkit, das seine Standard-Font-Metriken zur LAUFZEIT über
// `fs.readFileSync(__dirname + "/data/Helvetica.afm")` lädt. Bündelt Turbopack pdfkit in den
// Route-Chunk, ersetzt es `__dirname` durch den Build-Sentinel `/ROOT/...` (ein absoluter Pfad,
// der zur Laufzeit nicht existiert) → ENOENT → 500. Der reine Renderer-Unit-Test bleibt grün,
// weil vitest die Quelle direkt lädt (echtes `__dirname`) – der Fehler existiert nur im
// gebündelten Serverless-Output. `outputFileTracingIncludes` allein reicht NICHT: es lieferte die
// Dateien zwar aus, der gebündelte Code sucht sie aber weiterhin unter `/ROOT/...`.
//
// Fix: pdfmake aus dem Server-Bundle externalisieren. Dann bleibt pdfkit in `node_modules`, sein
// `__dirname` ist zur Laufzeit korrekt, und das File-Tracing (@vercel/nft) zieht die `.afm`-Dateien
// an ihren echten Pfad. Dieser Guard hält die Externalisierung fest, damit die Regression nicht
// stillschweigend zurückkehrt (ein leerer Server-Bundle-Test würde den 500er erst live zeigen).
describe("next.config: pdfmake bundling (#193)", () => {
  it("should_externalizePdfmakeFromServerBundle_toKeepPdfkitFontReadsResolvable", () => {
    expect(nextConfig.serverExternalPackages).toContain("pdfmake");
  });
});
