import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasRole } from "@/lib/authz";
import type { Kasse } from "@/db/schema";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import {
  berichtModell,
  berichtModellGetraenke,
  type BerichtModell,
} from "@/app/veranstaltung/berichtModell";
import { berichtXlsx, berichtXlsxGetraenke } from "@/app/veranstaltung/berichtXlsx";
import { berichtPdf, berichtPdfGetraenke } from "@/app/veranstaltung/berichtPdf";
import {
  berichtDateiname,
  type BerichtFormat,
  type BerichtUmfang,
} from "@/app/veranstaltung/berichtDateiname";

// Abschlussbericht-Download (F9, #185, ADR-036 D1–D4). GET-Route-Handler mit `?format=xlsx|pdf`
// und – seit #324 (ADR-046 D1) – `?umfang=voll|getraenke` (beides Whitelist, fail-closed).
// Node-Runtime, weil exceljs/pdfmake Node-APIs brauchen (ADR-036 D2).
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

// Fail-closed Whitelist wie `parseFormat`, mit einem Unterschied (ADR-046 D1): ein FEHLENDER
// Parameter ist erlaubt und bedeutet `voll` – so liefern bestehende Links ohne `umfang`
// unverändert den vollständigen Bericht. Ein unbekannter Wert → null → 400 (spec-324 AC13).
function parseUmfang(value: string | null): BerichtUmfang | null {
  if (value === null) return "voll";
  return value === "voll" || value === "getraenke" ? value : null;
}

// Format × Umfang → passender Renderer (ADR-046 D3/D5). Das volle Modell wird immer gebaut; die
// Getränke-Sicht entsteht erst hier als reine Projektion darüber – dadurch stimmen die
// Getränke-Werte beider Berichte per Konstruktion (spec-324 AC7).
function rendere(
  format: BerichtFormat,
  umfang: BerichtUmfang,
  modell: BerichtModell,
): Promise<Buffer> {
  if (umfang === "getraenke") {
    const getraenke = berichtModellGetraenke(modell);
    return format === "xlsx" ? berichtXlsxGetraenke(getraenke) : berichtPdfGetraenke(getraenke);
  }
  return format === "xlsx" ? berichtXlsx(modell) : berichtPdf(modell);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Reihenfolge (ADR-046 D5, erweitert ADR-036 D4): Rolle → Format → Umfang →
  // getVeranstaltung (404) → Status (409) → Render.
  const session = await auth();
  if (!hasRole(session?.user?.roles, "veranstalter")) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const parameter = new URL(request.url).searchParams;
  const format = parseFormat(parameter.get("format"));
  if (!format) {
    return NextResponse.json({ error: "Unbekanntes Format." }, { status: 400 });
  }

  const umfang = parseUmfang(parameter.get("umfang"));
  if (!umfang) {
    return NextResponse.json({ error: "Unbekannter Umfang." }, { status: 400 });
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

  const buffer = await rendere(format, umfang, modell);
  const filename = berichtDateiname(veranstaltung.datum, veranstaltung.bezeichnung, format, umfang);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
