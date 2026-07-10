import { defineConfig, devices } from "@playwright/test";

// Ziel-Stage steuert baseURL + ob ein lokaler Dev-Server gestartet wird.
//   lokal (test:e2e, .env.local):  NEXT_PUBLIC_STAGE=dev → http://localhost:3000 (+ webServer)
//   INT   (test:e2e:int, .env.int): NEXT_PUBLIC_STAGE=int → INT-Preview + Vercel-Bypass-Header
const stage = process.env.NEXT_PUBLIC_STAGE ?? "dev";
const INT_URL = "https://tch-gastro-services-git-int-tch-developers.vercel.app";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? (stage === "int" ? INT_URL : "http://localhost:3000");

const isLocal = baseURL.includes("localhost");

// Vercel Deployment Protection umgehen (nur INT): Header an jede Anfrage.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = bypass
  ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Remote-INT ist deutlich langsamer als localhost (Vercel-Bypass-/validate + Internet-Latenz);
  // Assertions/Navigation brauchen mehr Zeit als das 5-s-Default.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    extraHTTPHeaders,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Lokal den Dev-Server automatisch starten (DB muss via `pnpm db:up` laufen).
  webServer: isLocal
    ? {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
