import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/base-url";
import { LinkKopieren } from "./LinkKopieren";

// Inhalt von „Link & QR teilen" (F7, #54, ADR-034 D5/D6; seit #369 in einem Dialog, ADR-053 D5,
// seit #391 hinter dem Teilen-Symbol im Seitenkopf über `KopfDialog`, ADR-056 D3): der
// login-freie Selbstbedienungs-Link zu `theke/[token]` als kopierbarer Text und als QR-Code. Der
// QR wird server-seitig als SVG-String erzeugt (`qrcode`) und inline gerendert – null
// Client-Bundle. `qrcode` wird bewusst nur hier (server-seitig) importiert, nie im Client. Wird
// nur für offene Veranstaltungen eingebunden (Aufrufstelle).
export async function ZugangTeilen({ token }: { token: string }) {
  const url = await absoluteUrl(`/theke/${token}`);
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1 });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Teilnehmer öffnen diesen Link (oder scannen den QR-Code) und erfassen ihren Verzehr selbst –
        ohne Anmeldung.
      </p>

      <LinkKopieren url={url} />

      <div
        className="mx-auto h-48 w-48 [&>svg]:h-full [&>svg]:w-full"
        role="img"
        aria-label="QR-Code zum Selbstbedienungs-Link"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </div>
  );
}
