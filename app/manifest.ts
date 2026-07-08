import type { MetadataRoute } from "next";

// Web-App-Manifest → installierbare PWA (Homescreen auf iOS + Android).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TCH Gastro Services",
    short_name: "TCH Gastro",
    description: "Erfassung der Gastronomie-Vorgänge des Tennisclub Heuchelheim.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0e7490",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
