"use client";

import { KASSEN } from "@/db/schema";
import { useSchliessendeAction } from "@/app/components/useSchliessendeAction";
import { ensureThekeAction } from "@/app/veranstaltung/actions";
import { KASSE_LABEL } from "@/app/veranstaltung/labels";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { SelectField } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";

// Richtet die stehende Theken-Selbstbedienung je Kasse ein (ADR-023 D3). Idempotent: ein
// erneutes Einrichten derselben Kasse legt nicht doppelt an, sondern meldet Erfolg. Seit #373 auf
// `/verwaltung/theke`; die Action bleibt in der Veranstaltungs-Schicht unverändert. Den Erfolg
// meldet ein Toast (spec-372 AK12/AK17).
export function ThekeSetup() {
  const [state, formAction, pending] = useSchliessendeAction(ensureThekeAction, {
    erfolgsMeldung: "Theke angelegt",
  });
  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Je Kasse genau eine dauerhaft offene Theke – ein erneutes Einrichten legt nicht doppelt
          an.
        </p>
        <SelectField label="Kasse" name="kasse" defaultValue={KASSEN[0]}>
          {KASSEN.map((kasse) => (
            <option key={kasse} value={kasse}>
              {KASSE_LABEL[kasse]}
            </option>
          ))}
        </SelectField>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Einrichten …" : "Einrichten"}
        </Button>
        <Notice kind="fehler">{state?.error}</Notice>
      </form>
    </Card>
  );
}
