import type { Teilnehmer } from "@/db/schema";
import { Field, SelectField } from "@/app/components/ui/Field";

// Kanonische Quelle für Typ-Labels – auch von TeilnehmerRow genutzt.
export const TYP_LABEL: Record<Teilnehmer["typ"], string> = {
  person: "Person",
  familie: "Familie",
};

// Gemeinsame Eingabefelder für Anlegen und Bearbeiten (kein Copy-Paste zwischen den
// beiden Formularen). `mitglied` ist eine Checkbox: gesetzt → sendet "on", nicht gesetzt →
// Feld fehlt; die Server-Grenze (Zod) mappt das auf boolean. Seit #373 auf den Bausteinen
// (ADR-052), weil der Anlege-Dialog neue Oberfläche ist.
export function TeilnehmerFields({ teilnehmer }: { teilnehmer?: Teilnehmer }) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Anzeigename" name="name" required defaultValue={teilnehmer?.name ?? ""} />
      <SelectField label="Typ" name="typ" defaultValue={teilnehmer?.typ ?? "person"}>
        {(Object.entries(TYP_LABEL) as [Teilnehmer["typ"], string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="mitglied"
          defaultChecked={teilnehmer?.mitglied ?? false}
          className="h-5 w-5 accent-accent"
        />
        Mitglied
      </label>
    </div>
  );
}
