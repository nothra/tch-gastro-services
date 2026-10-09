import type { VeranstaltungZeile } from "@/db/schema";
import { ListenZeile } from "@/app/components/ui/ListenZeile";
import { verzehrHref } from "./personenbezug";
import { ZeilenMenue } from "./ZeilenMenue";

// Eine Teilnehmerzeile der Detailseite (spec-369 AK17/AK18, spec-403 AK4.3): der Name ist das
// Tipp-Ziel und führt in die Verzehr-Erfassung dieser Person (#308). Solange die Veranstaltung
// offen ist (`editable`), steht das Zeilenmenü („Entfernen" mit Bestätigung) als Zeilenaktion neben
// dem Link.
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
    <ListenZeile
      href={verzehrHref(veranstaltungId, zeile.id)}
      titel={zeile.anzeigename}
      aktion={
        editable && (
          <ZeilenMenue
            veranstaltungId={veranstaltungId}
            zeileId={zeile.id}
            name={zeile.anzeigename}
          />
        )
      }
    />
  );
}
