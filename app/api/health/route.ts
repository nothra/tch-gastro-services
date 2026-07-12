import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

// Healthcheck MIT DB-Read (anders als /api/version): prüft, dass die deployte App die DB
// erreicht UND das Schema stimmt. Der Read auf die roles-Spalte fängt genau die Schema-Drift
// (z. B. nicht angewandte Migration) ab, die ein reiner Versions-Endpunkt nicht sieht.
// Genutzt vom Deploy-Gate nach dem Promote und als FACTORY_HEALTHCHECK_URL (ADR-007/017).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ergebnis wird verworfen – keine Datenpreisgabe, nur "Query läuft durch?".
    await db.select({ roles: users.roles }).from(users).limit(1);
    return NextResponse.json({ status: "ok", stage: process.env.NEXT_PUBLIC_STAGE ?? "dev" });
  } catch (error) {
    // Server-seitig loggen (Vercel-Function-Logs) – der Client bekommt nur {status:"error"},
    // damit das Schema-/DB-Problem diagnostizierbar bleibt, ohne Details preiszugeben.
    console.error("health: DB-Read fehlgeschlagen", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
