import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/session";
import { visibleNavItems } from "@/lib/navigation";
import { AppNav } from "./AppNav";

// Rollenbewusste Kopfzeile – nur für angemeldete Nutzer. Die Rollen-Filterung läuft hier
// serverseitig (auth() → Session); der Client-Teil (AppNav) bekommt nur die bereits
// gefilterten Einträge (ADR-031). Für Besucher (kein Session) rendert die Komponente
// nichts, damit die /login-Seite sauber bleibt.
export async function AppHeader() {
  const session = await auth();
  if (!session?.user) return null;

  const label = session.user.email ?? "Angemeldet";
  const items = visibleNavItems(session.user.roles);

  return <AppNav items={items} label={label} signOutAction={signOutAction} />;
}
