import type { Teilnehmer } from "@/db/schema";
import { Field, SelectField } from "@/app/components/ui/Field";
import { TEILNEHMER_NAME_MAX } from "./schema";

// Kanonische Quelle für Typ-Labels – auch von TeilnehmerRow genutzt.
export const TYP_LABEL: Record<Teilnehmer["typ"], string> = {
  person: "Person",
  familie: "Familie",
};

interface TeilnehmerFieldsProps {
  /** Bearbeiten: die gespeicherten Werte als Vorbelegung. */
  teilnehmer?: Teilnehmer;
  /** Anlegen: Vorbelegung des Namens, z. B. der Suchtext aus der Auswahl (spec-404 AK3.3). */
  namensVorschlag?: string;
  /** Ablehnung der Action am Namensfeld (spec-404 AK4.4). */
  nameFehler?: string;
  /** Das Namensfeld bekommt beim Erscheinen den Fokus (Schrittwechsel im Dialog, spec-404). */
  nameFokussieren?: boolean;
}

// Gemeinsame Eingabefelder für Anlegen und Bearbeiten in der Verwaltung und für „Teilnehmer
// anlegen" aus der Veranstaltung (spec-404 AK6) – kein Nachbau je Formular. `mitglied` ist eine
// Checkbox: gesetzt → sendet "on", nicht gesetzt → Feld fehlt; die Server-Grenze (Zod) mappt das
// auf boolean. Seit #373 auf den Bausteinen (ADR-052).
export function TeilnehmerFields({
  teilnehmer,
  namensVorschlag,
  nameFehler,
  nameFokussieren = false,
}: TeilnehmerFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Name"
        name="name"
        required
        maxLength={TEILNEHMER_NAME_MAX}
        defaultValue={teilnehmer?.name ?? namensVorschlag ?? ""}
        error={nameFehler}
        autoFocus={nameFokussieren}
      />
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
