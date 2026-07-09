// Stage-Erkennung (DEV/INT/PRD). Wird per NEXT_PUBLIC_STAGE gesetzt:
//   lokal (.env.local): dev · Vercel Preview/branch int: int · Vercel Production: prd
// NEXT_PUBLIC_* wird von Next zur Build-Zeit inlined → auch im Client verfügbar.
export type Stage = "dev" | "int" | "prd";

const raw = process.env.NEXT_PUBLIC_STAGE;
export const STAGE: Stage = raw === "int" || raw === "prd" ? raw : "dev";

export const isProd = STAGE === "prd";

export const stageConfig: Record<Stage, { label: string; color: string; showBanner: boolean }> = {
  dev: { label: "DEV · Lokale Entwicklung", color: "#475569", showBanner: true },
  int: { label: "INT · Integration", color: "#d97706", showBanner: true },
  prd: { label: "Produktion", color: "#0e7490", showBanner: false },
};

export const currentStage = stageConfig[STAGE];
