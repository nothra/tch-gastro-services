import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { STAGE, currentStage } from "@/lib/stage";
import { StageBanner } from "@/app/components/StageBanner";
import { AppHeader } from "@/app/components/AppHeader";
import { Toaster } from "@/app/components/ui/Toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Titel je Stage kenntlich (DEV/INT im Browser-Tab sichtbar), PRD ohne Suffix.
const stageSuffix = STAGE === "prd" ? "" : ` [${STAGE.toUpperCase()}]`;

export const metadata: Metadata = {
  title: `TCH Gastro Services${stageSuffix}`,
  description: "Erfassung der Gastronomie-Vorgänge des Tennisclub Heuchelheim.",
  applicationName: `TCH Gastro${stageSuffix}`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: `TCH Gastro${stageSuffix}`,
  },
};

export const viewport: Viewport = {
  themeColor: currentStage.color,
  // Inhalt bis in die Display-Ausschnitte ziehen, damit env(safe-area-inset-*) auf iOS
  // echte Werte liefert (sonst 0) – Grundlage der Safe-Area-Abstände der Navigation (ADR-031).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* `font-sans` löst auf `--font-geist-sans` auf (globals.css → @theme inline). Bis #368
          verdeckte ein Arial-Override in `globals.css` die geladene Schrift Geist. */}
      <body className="flex min-h-full flex-col font-sans">
        <StageBanner />
        <AppHeader />
        {children}
        {/* Im Root-Layout, damit ein Toast den Seitenwechsel überlebt (ADR-058 D1). */}
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
