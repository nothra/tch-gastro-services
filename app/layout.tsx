import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { STAGE, currentStage } from "@/lib/stage";
import { StageBanner } from "@/app/components/StageBanner";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <StageBanner />
        {children}
      </body>
    </html>
  );
}
