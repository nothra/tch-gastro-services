import { Button } from "@/app/components/ui/Button";
import { KATEGORIE_LABEL, type VerzehrKategorie } from "./kategorien";

// Segment-Umschalter der Einzelansicht (spec-370 AK2, ADR-054 D1): zeigt nur die übergebenen –
// also vorhandenen – Kategorien. Der aktive Eintrag ist gefüllt statt umrandet und trägt
// `aria-pressed`, damit er nicht allein über die Farbe erkennbar ist (AK2.1).
export function KategorieUmschalter({
  kategorien,
  aktiv,
  onWaehle,
}: {
  kategorien: readonly VerzehrKategorie[];
  aktiv: VerzehrKategorie | null;
  onWaehle: (kategorie: VerzehrKategorie) => void;
}) {
  if (kategorien.length === 0) return null;

  return (
    <div role="group" aria-label="Kategorie wählen" className="flex gap-2">
      {kategorien.map((kategorie) => {
        const istAktiv = kategorie === aktiv;
        return (
          <Button
            key={kategorie}
            size="sm"
            variant={istAktiv ? "primary" : "secondary"}
            aria-pressed={istAktiv}
            onClick={() => onWaehle(kategorie)}
            className="flex-1"
          >
            {KATEGORIE_LABEL[kategorie]}
          </Button>
        );
      })}
    </div>
  );
}
