import QRCode from "qrcode";
import { absoluteUrl } from "@/lib/base-url";

// „Zugang teilen" auf der Veranstaltungs-Detailseite (F7, #54, ADR-034 D5/D6): zeigt dem
// Veranstalter den login-freien Selbstbedienungs-Link zu `theke/[token]` als kopierbaren Text
// und als QR-Code. Der QR wird server-seitig als SVG-String erzeugt (`qrcode`) und inline
// gerendert – null Client-Bundle, druckbar. `qrcode` wird bewusst nur hier (server-seitig)
// importiert, nie im Client. Wird nur für offene Veranstaltungen eingebunden (Aufrufstelle).
export async function ZugangTeilen({ token }: { token: string }) {
  const url = await absoluteUrl(`/theke/${token}`);
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1 });

  return (
    <section className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">Zugang teilen</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Teilnehmer öffnen diesen Link (oder scannen den QR-Code) und erfassen ihren Verzehr
          selbst – ohne Anmeldung.
        </p>
      </div>

      <input
        type="text"
        readOnly
        value={url}
        aria-label="Selbstbedienungs-Link"
        className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div
        className="h-48 w-48 [&>svg]:h-full [&>svg]:w-full"
        aria-label="QR-Code zum Selbstbedienungs-Link"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </section>
  );
}
