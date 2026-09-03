import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Veranstaltung } from "@/db/schema";

// Die Renderer werden gemockt – der Handler-Unit-Test prüft Auth/Status/Format/Header, nicht die
// Binär-Erzeugung (die verantworten die Renderer-Smoke-Tests + das reine Modell). So läuft dieser
// Test ohne exceljs/pdfmake.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/veranstaltung", () => ({ getVeranstaltung: vi.fn(), listZeilen: vi.fn() }));
vi.mock("@/db/verzehr", () => ({ listPositionen: vi.fn() }));
vi.mock("@/db/auslage", () => ({ listAuslagen: vi.fn() }));
vi.mock("@/app/veranstaltung/berichtXlsx", () => ({
  berichtXlsx: vi.fn(async () => Buffer.from("xlsx-bytes")),
  berichtXlsxGetraenke: vi.fn(async () => Buffer.from("xlsx-getraenke-bytes")),
}));
vi.mock("@/app/veranstaltung/berichtPdf", () => ({
  berichtPdf: vi.fn(async () => Buffer.from("pdf-bytes")),
  berichtPdfGetraenke: vi.fn(async () => Buffer.from("pdf-getraenke-bytes")),
}));

import { auth } from "@/auth";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { berichtXlsx, berichtXlsxGetraenke } from "@/app/veranstaltung/berichtXlsx";
import { berichtPdf, berichtPdfGetraenke } from "@/app/veranstaltung/berichtPdf";
import { GET } from "./route";

const authMock = vi.mocked(auth);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const listZeilenMock = vi.mocked(listZeilen);
const listPositionenMock = vi.mocked(listPositionen);
const listAuslagenMock = vi.mocked(listAuslagen);
const berichtXlsxMock = vi.mocked(berichtXlsx);
const berichtPdfMock = vi.mocked(berichtPdf);
const berichtXlsxGetraenkeMock = vi.mocked(berichtXlsxGetraenke);
const berichtPdfGetraenkeMock = vi.mocked(berichtPdfGetraenke);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

const abgeschlossen: Veranstaltung = {
  id: "v-1",
  typ: "veranstaltung",
  bezeichnung: "Montagsrunde Juli",
  datum: new Date("2026-07-14"),
  kasse: "montagsrunde",
  status: "abgeschlossen",
  token: "abc123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// `umfang` bleibt weg, wenn nichts übergeben wird – so prüfen die Bestands-Tests weiterhin den
// Aufruf OHNE den neuen Parameter (Default `voll`, ADR-046 D1).
function request(format: string | null, umfang?: string) {
  const query = [
    format === null ? null : `format=${format}`,
    umfang === undefined ? null : `umfang=${umfang}`,
  ].filter(Boolean);
  const suffix = query.length === 0 ? "" : `?${query.join("&")}`;
  return new Request(`http://localhost/api/veranstaltung/v-1/bericht${suffix}`);
}

function params(id: string) {
  return Promise.resolve({ id });
}

function callGET(format: string | null, umfang?: string) {
  return GET(request(format, umfang), { params: params("v-1") });
}

beforeEach(() => {
  vi.resetAllMocks();
  listZeilenMock.mockResolvedValue([]);
  listPositionenMock.mockResolvedValue([]);
  listAuslagenMock.mockResolvedValue([]);
  berichtXlsxMock.mockResolvedValue(Buffer.from("xlsx-bytes"));
  berichtPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
  berichtXlsxGetraenkeMock.mockResolvedValue(Buffer.from("xlsx-getraenke-bytes"));
  berichtPdfGetraenkeMock.mockResolvedValue(Buffer.from("pdf-getraenke-bytes"));
});

describe("GET /api/veranstaltung/[id]/bericht", () => {
  it("should_return403_when_userIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    const res = await callGET("xlsx");

    expect(res.status).toBe(403);
    // Fail-closed: der DB-Zugriff wird gar nicht erst ausgeführt.
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
  });

  it("should_return400_when_formatUnknown", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));

    const res = await callGET("csv");

    expect(res.status).toBe(400);
  });

  it("should_return400_when_formatMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));

    const res = await callGET(null);

    expect(res.status).toBe(400);
  });

  it("should_return404_when_veranstaltungMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(undefined);

    const res = await callGET("xlsx");

    expect(res.status).toBe(404);
  });

  it("should_return409_when_veranstaltungOffen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue({ ...abgeschlossen, status: "offen" });

    const res = await callGET("xlsx");

    expect(res.status).toBe(409);
    // Kein Bericht offener Veranstaltungen – der Renderer wird nicht aufgerufen.
    expect(berichtXlsxMock).not.toHaveBeenCalled();
  });

  it("should_return200XlsxWithAttachment_when_veranstalterAndAbgeschlossen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);

    const res = await callGET("xlsx");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="abschlussbericht-2026-07-14-montagsrunde-juli.xlsx"',
    );
    expect(berichtXlsxMock).toHaveBeenCalledOnce();
    expect(berichtPdfMock).not.toHaveBeenCalled();
  });

  it("should_return200PdfWithAttachment_when_formatPdf", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);

    const res = await callGET("pdf");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="abschlussbericht-2026-07-14-montagsrunde-juli.pdf"',
    );
    expect(berichtPdfMock).toHaveBeenCalledOnce();
    expect(berichtXlsxMock).not.toHaveBeenCalled();
  });

  it("should_mapDbRowsIntoBerichtModell_when_zeilenPositionenAndAuslagenPresent", async () => {
    // Deckt die inline-Mapping-Zeilen (DB-Zeilenform → `berichtModell`-Input) ab: ein
    // Feldname-Tippfehler hier würde von keinem der reinen `berichtModell`-Tests erkannt, weil
    // die dort direkt mit dem korrekten Input-Shape aufgerufen wird.
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);
    listZeilenMock.mockResolvedValue([
      {
        id: "z-1",
        veranstaltungId: "v-1",
        teilnehmerId: "t-1",
        anzeigename: "Anna",
        erhaltenCents: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    listPositionenMock.mockResolvedValue([
      {
        zeileId: "z-1",
        catalogItemId: "c-1",
        menge: 2,
        name: "Bier",
        size: "0,5l",
        priceCents: 250,
        category: "getraenk",
        active: true,
      },
    ]);
    listAuslagenMock.mockResolvedValue([
      {
        id: "a-1",
        teilnehmerId: "t-1",
        anzeigename: "Anna",
        kategorie: "getraenke",
        betragCents: 300,
        zweck: null,
        status: "erstattet",
      },
    ]);

    await callGET("xlsx");

    const modell = berichtXlsxMock.mock.calls[0][0];
    expect(modell.teilnehmer).toHaveLength(1);
    expect(modell.teilnehmer[0].anzeigename).toBe("Anna");
    expect(modell.teilnehmer[0].positionen).toEqual([
      {
        name: "Bier",
        size: "0,5l",
        category: "getraenk",
        menge: 2,
        einzelpreisCents: 250,
        zeilenbetragCents: 500,
      },
    ]);
    expect(modell.auslagen).toEqual([
      { anzeigename: "Anna", kategorie: "Getränke", betragCents: 300, status: "erstattet" },
    ]);
  });
});

// ── Umfang „nur Getränke" (#324, spec-324, ADR-046 D1/D5) ─────────────────────────────────────

describe("GET /api/veranstaltung/[id]/bericht – Umfang (#324)", () => {
  async function bytes(res: Response): Promise<string> {
    return Buffer.from(await res.arrayBuffer()).toString();
  }

  it("should_return400_when_umfangUnknown", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));

    // AC13: Whitelist, fail-closed – ein unbekannter Umfang liefert keinen Bericht.
    const res = await callGET("xlsx", "essen");

    expect(res.status).toBe(400);
    // Die Prüfung liegt vor dem DB-Zugriff (ADR-046 D5).
    expect(getVeranstaltungMock).not.toHaveBeenCalled();
    expect(berichtXlsxGetraenkeMock).not.toHaveBeenCalled();
    expect(berichtXlsxMock).not.toHaveBeenCalled();
  });

  it("should_renderFullReport_when_umfangMissing", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);

    // Default `voll`: bestehende Links ohne `umfang` liefern unverändert den vollen Bericht.
    const res = await callGET("xlsx");

    expect(await bytes(res)).toBe("xlsx-bytes");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="abschlussbericht-2026-07-14-montagsrunde-juli.xlsx"',
    );
    expect(berichtXlsxGetraenkeMock).not.toHaveBeenCalled();
  });

  it("should_renderFullReport_when_umfangVoll", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);

    const res = await callGET("xlsx", "voll");

    expect(await bytes(res)).toBe("xlsx-bytes");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="abschlussbericht-2026-07-14-montagsrunde-juli.xlsx"',
    );
    expect(berichtXlsxGetraenkeMock).not.toHaveBeenCalled();
  });

  it("should_returnGetraenkeXlsx_when_umfangGetraenke", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);

    const res = await callGET("xlsx", "getraenke");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    // AC9: das Dateinamen-Segment macht den eingeschränkten Umfang erkennbar.
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="abschlussbericht-getraenke-2026-07-14-montagsrunde-juli.xlsx"',
    );
    expect(await bytes(res)).toBe("xlsx-getraenke-bytes");
    expect(berichtXlsxMock).not.toHaveBeenCalled();
  });

  it("should_returnGetraenkePdf_when_umfangGetraenke", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);

    const res = await callGET("pdf", "getraenke");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="abschlussbericht-getraenke-2026-07-14-montagsrunde-juli.pdf"',
    );
    expect(await bytes(res)).toBe("pdf-getraenke-bytes");
    expect(berichtPdfMock).not.toHaveBeenCalled();
  });

  it("should_return403_when_umfangGetraenkeAndUserIsNotVeranstalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    // AC10: die Variante liegt hinter denselben Gates wie der vollständige Bericht.
    const res = await callGET("xlsx", "getraenke");

    expect(res.status).toBe(403);
    expect(berichtXlsxGetraenkeMock).not.toHaveBeenCalled();
  });

  it("should_return409_when_umfangGetraenkeAndVeranstaltungOffen", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue({ ...abgeschlossen, status: "offen" });

    const res = await callGET("xlsx", "getraenke");

    expect(res.status).toBe(409);
    expect(berichtXlsxGetraenkeMock).not.toHaveBeenCalled();
  });

  it("should_passProjectedGetraenkeModell_when_umfangGetraenke", async () => {
    // Belegt die Verdrahtung Modell → Projektion → Getränke-Renderer: der Renderer bekommt die
    // reduzierte Sicht, nicht das volle Modell (Anna trinkt Bier und isst Schnitzel).
    authMock.mockResolvedValue(session(["veranstalter"]));
    getVeranstaltungMock.mockResolvedValue(abgeschlossen);
    listZeilenMock.mockResolvedValue([
      {
        id: "z-1",
        veranstaltungId: "v-1",
        teilnehmerId: "t-1",
        anzeigename: "Anna",
        erhaltenCents: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    listPositionenMock.mockResolvedValue([
      {
        zeileId: "z-1",
        catalogItemId: "c-1",
        menge: 2,
        name: "Bier",
        size: "0,5l",
        priceCents: 250,
        category: "getraenk",
        active: true,
      },
      {
        zeileId: "z-1",
        catalogItemId: "c-2",
        menge: 1,
        name: "Schnitzel",
        size: "",
        priceCents: 800,
        category: "essen",
        active: true,
      },
    ]);
    listAuslagenMock.mockResolvedValue([
      {
        id: "a-1",
        teilnehmerId: "t-1",
        anzeigename: "Anna",
        kategorie: "essen",
        betragCents: 300,
        zweck: null,
        status: "erstattet",
      },
    ]);

    await callGET("xlsx", "getraenke");

    const modell = berichtXlsxGetraenkeMock.mock.calls[0][0];
    expect(modell.teilnehmer).toHaveLength(1);
    expect(modell.teilnehmer[0].positionen.map((position) => position.name)).toEqual(["Bier"]);
    expect(modell.getraenkeGesamtCents).toBe(500);
    // Die Essen-Auslage fällt weg, die Ergebnis-Summe bleibt bei 0.
    expect(modell.auslagen).toEqual([]);
    expect(modell.auslagenerstattungGetraenkeCents).toBe(0);
  });
});
