import type { MetadataRoute } from "next";
import { STAGE, currentStage } from "@/lib/stage";

// Web-App-Manifest → installierbare PWA (Homescreen auf iOS + Android).
// Name, Theme-Farbe und Icon je Stage → auch das Homescreen-Icon unterscheidet DEV/INT/PRD.
export default function manifest(): MetadataRoute.Manifest {
  const suffix = STAGE === "prd" ? "" : ` (${STAGE.toUpperCase()})`;
  return {
    name: `TCH Gastro Services${suffix}`,
    short_name: `TCH Gastro${suffix}`,
    description: "Erfassung der Gastronomie-Vorgänge des Tennisclub Heuchelheim.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: currentStage.color,
    lang: "de",
    icons: [
      {
        src: `/icon-${STAGE}.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
