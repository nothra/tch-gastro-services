import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfmake/pdfkit aus dem Server-Bundle externalisieren (#193). pdfkit lädt seine
  // Standard-Font-Metriken zur Laufzeit über `fs.readFileSync(__dirname + "/data/*.afm")`.
  // Bündelt Turbopack pdfkit in den Route-Chunk, ersetzt es `__dirname` durch den Build-
  // Sentinel `/ROOT/...` (existiert zur Laufzeit nicht) → ENOENT → HTTP 500 auf Vercel.
  // Extern gehalten bleibt pdfkit in node_modules mit korrektem `__dirname`; das File-Tracing
  // (@vercel/nft) zieht die `.afm`-Dateien an ihren echten Pfad. Einziger Konsument ist der
  // Abschlussbericht-PDF-Renderer (`app/veranstaltung/berichtPdf.ts`, Node-Route).
  serverExternalPackages: ["pdfmake"],
};

export default nextConfig;
