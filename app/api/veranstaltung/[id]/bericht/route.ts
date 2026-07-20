import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse } from "@/db/schema";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { berichtModell } from "@/app/veranstaltung/berichtModell";
import { berichtXlsx } from "@/app/veranstaltung/berichtXlsx";
import { berichtPdf } from "@/app/veranstaltung/berichtPdf";
import { berichtDateiname, type BerichtFormat } from "@/app/veranstaltung/berichtDateiname";

// Abschlussbericht-Download (F9, #185, ADR-036 D1–D4). GET-Route-Handler mit `?format=xlsx|pdf`
// (Whitelist, fail-closed). Node-Runtime, weil exceljs/pdfmake Node-APIs brauchen (ADR-036 D2).
// Die Route liegt bewusst UNTER dem `proxy.ts`-Matcher (authentifiziert, KEINE Ausnahme wie
// api/health) – Codify #63. Zusätzlich wird die Rolle serverseitig hier geprüft (ADR-036 D3).
export const runtime = "nodejs";

const CONTENT_TYPE: Record<BerichtFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

// Fail-closed Whitelist: nur `xlsx`/`pdf`; alles andere (auch fehlend) → null → 400.
function parseFormat(value: string | null): BerichtFormat | null {
  return value === "xlsx" || value === "pdf" ? value : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Reihenfolge (ADR-036 D4): Rolle → Format → getVeranstaltung (404) → Status (409) → Render.
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const format = parseFormat(new URL(request.url).searchParams.get("format"));
  if (!format) {
    return NextResponse.json({ error: "Unbekanntes Format." }, { status: 400 });
  }

  const veranstaltung = await getVeranstaltung(id);
  if (!veranstaltung) {
    return NextResponse.json({ error: "Veranstaltung nicht gefunden." }, { status: 404 });
  }
  if (veranstaltung.status !== "abgeschlossen") {
    return NextResponse.json(
      { error: "Bericht nur für abgeschlossene Veranstaltungen." },
      { status: 409 },
    );
  }

  const [zeilen, positionen, auslagen] = await Promise.all([
    listZeilen(id),
    listPositionen(id),
    listAuslagen(id),
  ]);

  const modell = berichtModell({
    veranstaltung: {
      bezeichnung: veranstaltung.bezeichnung,
      datum: veranstaltung.datum,
      kasse: veranstaltung.kasse as Kasse,
      status: veranstaltung.status,
    },
    zeilen: zeilen.map((zeile) => ({
      id: zeile.id,
      anzeigename: zeile.anzeigename,
      erhaltenCents: zeile.erhaltenCents,
    })),
    positionen: positionen.map((position) => ({
      zeileId: position.zeileId,
      name: position.name,
      size: position.size,
      menge: position.menge,
      priceCents: position.priceCents,
      category: position.category,
    })),
    auslagen: auslagen.map((auslage) => ({
      anzeigename: auslage.anzeigename,
      kategorie: auslage.kategorie,
      betragCents: auslage.betragCents,
      status: auslage.status,
    })),
  });

  const buffer = format === "xlsx" ? await berichtXlsx(modell) : await berichtPdf(modell);
  const filename = berichtDateiname(veranstaltung.datum, veranstaltung.bezeichnung, format);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
