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
}));
vi.mock("@/app/veranstaltung/berichtPdf", () => ({
  berichtPdf: vi.fn(async () => Buffer.from("pdf-bytes")),
}));

import { auth } from "@/auth";
import { getVeranstaltung, listZeilen } from "@/db/veranstaltung";
import { listPositionen } from "@/db/verzehr";
import { listAuslagen } from "@/db/auslage";
import { berichtXlsx } from "@/app/veranstaltung/berichtXlsx";
import { berichtPdf } from "@/app/veranstaltung/berichtPdf";
import { GET } from "./route";

const authMock = vi.mocked(auth);
const getVeranstaltungMock = vi.mocked(getVeranstaltung);
const listZeilenMock = vi.mocked(listZeilen);
const listPositionenMock = vi.mocked(listPositionen);
const listAuslagenMock = vi.mocked(listAuslagen);
const berichtXlsxMock = vi.mocked(berichtXlsx);
const berichtPdfMock = vi.mocked(berichtPdf);

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

function request(format: string | null) {
  const query = format === null ? "" : `?format=${format}`;
  return new Request(`http://localhost/api/veranstaltung/v-1/bericht${query}`);
}

function params(id: string) {
  return Promise.resolve({ id });
}

function callGET(format: string | null) {
  return GET(request(format), { params: params("v-1") });
}

beforeEach(() => {
  vi.resetAllMocks();
  listZeilenMock.mockResolvedValue([]);
  listPositionenMock.mockResolvedValue([]);
  listAuslagenMock.mockResolvedValue([]);
  berichtXlsxMock.mockResolvedValue(Buffer.from("xlsx-bytes"));
  berichtPdfMock.mockResolvedValue(Buffer.from("pdf-bytes"));
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
});
