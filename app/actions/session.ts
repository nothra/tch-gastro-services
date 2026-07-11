"use server";

import { signOut } from "@/auth";

// Beendet die Sitzung und leitet zur Anmeldung – geschützte Seiten sind danach
// wieder gesperrt (spec-48: Abmelden).
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
