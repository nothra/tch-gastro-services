import { buttonClasses } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import type { BerichtFormat, BerichtUmfang } from "../berichtDateiname";

// Abschlussbericht einer abgeschlossenen Veranstaltung (spec-324 AK14, spec-369 AK6). Aus der
// Detailseite ausgelagert, damit diese reine Komposition bleibt (ADR-053 D6).

const DOWNLOAD_KLASSE = buttonClasses({ variant: "secondary", size: "sm" });

// Der vollständige Bericht behält seinen bestehenden Link OHNE `umfang` – die Route setzt für
// einen fehlenden Parameter den Default `voll` (ADR-046 D1), und spec-324 AC14 verlangt die
// Gruppe „Vollständig" unverändert.
function berichtHref(veranstaltungId: string, format: BerichtFormat, umfang: BerichtUmfang) {
  const query = umfang === "voll" ? `format=${format}` : `format=${format}&umfang=${umfang}`;
  return `/api/veranstaltung/${veranstaltungId}/bericht?${query}`;
}

export function Abschlussbericht({ veranstaltungId }: { veranstaltungId: string }) {
  return (
    <Card>
      <section aria-labelledby="abschlussbericht" className="flex flex-col gap-3">
        <h2 id="abschlussbericht">Abschlussbericht</h2>
        <BerichtGruppe veranstaltungId={veranstaltungId} titel="Vollständig" umfang="voll" />
        <BerichtGruppe veranstaltungId={veranstaltungId} titel="Nur Getränke" umfang="getraenke" />
      </section>
    </Card>
  );
}

// Eine Umfangs-Gruppe (spec-324 AC14): Überschrift + beide Formate desselben Umfangs. Die
// Link-Beschriftungen sind in beiden Gruppen gleich – die Zuordnung tragen die Überschrift und das
// `role="group"`/`aria-labelledby`-Paar, damit sie auch vorgelesen wird.
function BerichtGruppe({
  veranstaltungId,
  titel,
  umfang,
}: {
  veranstaltungId: string;
  titel: string;
  umfang: BerichtUmfang;
}) {
  const ueberschriftId = `bericht-${umfang}`;
  return (
    <div role="group" aria-labelledby={ueberschriftId} className="flex flex-col gap-2">
      <h3 id={ueberschriftId} className="text-sm font-medium text-muted">
        {titel}
      </h3>
      <div className="flex flex-wrap gap-2">
        <a href={berichtHref(veranstaltungId, "xlsx", umfang)} className={DOWNLOAD_KLASSE}>
          Excel (.xlsx) herunterladen
        </a>
        <a href={berichtHref(veranstaltungId, "pdf", umfang)} className={DOWNLOAD_KLASSE}>
          PDF herunterladen
        </a>
      </div>
    </div>
  );
}
