import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/base-url", () => ({ absoluteUrl: vi.fn() }));
vi.mock("qrcode", () => ({ default: { toString: vi.fn() } }));

import { absoluteUrl } from "@/lib/base-url";
import QRCode from "qrcode";
import { ZugangTeilen } from "./ZugangTeilen";

const absoluteUrlMock = vi.mocked(absoluteUrl);
const toStringMock = vi.mocked(QRCode.toString);

beforeEach(() => {
  vi.resetAllMocks();
  absoluteUrlMock.mockResolvedValue("https://gastro.example.org/theke/tok-1");
  // qrcode.toString ist überladen; hier genügt der SVG-String-Rückgabewert.
  toStringMock.mockResolvedValue("<svg data-testid='qr'>QR</svg>" as never);
});

describe("ZugangTeilen", () => {
  it("should_buildThekeUrlFromToken", async () => {
    render(await ZugangTeilen({ token: "tok-1" }));

    expect(absoluteUrlMock).toHaveBeenCalledWith("/theke/tok-1");
  });

  it("should_showLinkToThekeRoute", async () => {
    render(await ZugangTeilen({ token: "tok-1" }));

    const link = screen.getByDisplayValue("https://gastro.example.org/theke/tok-1");
    expect(link).toBeInTheDocument();
  });

  it("should_renderQrForTheThekeUrl", async () => {
    render(await ZugangTeilen({ token: "tok-1" }));

    expect(toStringMock).toHaveBeenCalledWith(
      "https://gastro.example.org/theke/tok-1",
      expect.objectContaining({ type: "svg" }),
    );
    expect(screen.getByTestId("qr")).toBeInTheDocument();
  });
});
