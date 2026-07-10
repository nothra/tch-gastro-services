import { NextResponse } from "next/server";

// Öffentlicher Versions-Endpunkt: liefert den deployten Commit-SHA + Stage.
// Genutzt vom Deploy-Gate, um deterministisch auf den richtigen INT-Build zu warten
// (Poll bis sha == erwarteter Commit). Enthält keine Geheimnisse.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    stage: process.env.NEXT_PUBLIC_STAGE ?? "dev",
  });
}
