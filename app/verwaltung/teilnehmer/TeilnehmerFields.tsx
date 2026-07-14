import type { Teilnehmer } from "@/db/schema";

// Kanonische Quelle für Typ-Labels – auch von TeilnehmerRow genutzt.
export const TYP_LABEL: Record<Teilnehmer["typ"], string> = {
  person: "Person",
  familie: "Familie",
};

const inputClass =
  "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Gemeinsame Eingabefelder für Anlegen und Bearbeiten (kein Copy-Paste zwischen den
// beiden Formularen). `mitglied` ist eine Checkbox: gesetzt → sendet "on", nicht gesetzt →
// Feld fehlt; die Server-Grenze (Zod) mappt das auf boolean.
export function TeilnehmerFields({ teilnehmer }: { teilnehmer?: Teilnehmer }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Anzeigename
        <input name="name" required defaultValue={teilnehmer?.name ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Typ
        <select name="typ" defaultValue={teilnehmer?.typ ?? "person"} className={inputClass}>
          {(Object.entries(TYP_LABEL) as [Teilnehmer["typ"], string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 py-2 text-sm">
        <input
          type="checkbox"
          name="mitglied"
          defaultChecked={teilnehmer?.mitglied ?? false}
          className="h-4 w-4"
        />
        Mitglied
      </label>
    </div>
  );
}
