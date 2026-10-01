import Link from "next/link";
import type { VeranstaltungZeile } from "@/db/schema";
import { verzehrHref } from "./personenbezug";
import { ZeilenMenue } from "./ZeilenMenue";

// Eine Teilnehmerzeile der Detailseite (spec-369 AK17/AK18): der Name ist das Tipp-Ziel und führt
// in die Verzehr-Erfassung dieser Person (#308). Solange die Veranstaltung offen ist
// (`editable`), bietet das Zeilenmenü „Entfernen" mit Bestätigung an.
export function ZeileRow({
  zeile,
  veranstaltungId,
  editable,
}: {
  zeile: VeranstaltungZeile;
  veranstaltungId: string;
  editable: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-line-subtle bg-surface pr-1 pl-3">
      {/* `min-w-0` + `break-words`: ein sehr langer Name bricht um, statt das Menü aus dem Bild
          zu schieben (FS6). */}
      <Link
        href={verzehrHref(veranstaltungId, zeile.id)}
        className="min-h-11 min-w-0 flex-1 py-3 font-medium break-words text-foreground hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        {zeile.anzeigename}
      </Link>
      {editable && (
        <ZeilenMenue
          veranstaltungId={veranstaltungId}
          zeileId={zeile.id}
          name={zeile.anzeigename}
        />
      )}
    </li>
  );
}
