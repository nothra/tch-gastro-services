import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ThekeSetup } from "./ThekeSetup";

// Stehende Theke einrichten (spec-373 AK3). Nur Verwalter – die Seite gehört zur Verwaltung, auch
// wenn `ensureThekeAction` weiter `verwalter` und `veranstalter` erlaubt (Durchsetzung bleibt dort).
// Platz für QR/Link/Druck der Theke ist hier vorgesehen (#181).
export default async function ThekePage() {
  const session = await auth();
  if (!hasRole(session?.user?.roles, "verwalter")) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Kein Zugriff – nur Verwalter dürfen die Theke einrichten.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <PageHeader title="Theke" back={{ href: "/", label: "Startseite" }} />
      <ThekeSetup />
    </main>
  );
}
