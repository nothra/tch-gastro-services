import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LinkKopieren } from "./LinkKopieren";

const URL = "https://gastro.example.org/theke/tok-1";

function clipboardMit(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
}

async function kopieren() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Link kopieren" }));
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("LinkKopieren (spec-369 AK22, ADR-053 D5)", () => {
  it("should_showLinkAsReadOnlyField_when_rendered", () => {
    render(<LinkKopieren url={URL} />);

    const feld = screen.getByRole("textbox", { name: "Selbstbedienungs-Link" });
    expect(feld).toHaveValue(URL);
    expect(feld).toHaveAttribute("readonly");
  });

  it("should_writeUrlToClipboardAndConfirm_when_kopierenTapped", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboardMit(writeText);
    render(<LinkKopieren url={URL} />);

    await kopieren();

    expect(writeText).toHaveBeenCalledWith(URL);
    expect(screen.getByRole("status")).toHaveTextContent("Link kopiert.");
  });

  it("should_selectFieldAndExplain_when_clipboardRejects", async () => {
    // Rückfall: das markierte Nur-Lese-Feld bleibt zum manuellen Kopieren (ADR-053 D5).
    clipboardMit(vi.fn().mockRejectedValue(new Error("NotAllowedError")));
    render(<LinkKopieren url={URL} />);
    const feld = screen.getByRole("textbox", { name: "Selbstbedienungs-Link" }) as HTMLInputElement;

    await kopieren();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Kopieren nicht möglich – der Link ist markiert und kann manuell kopiert werden.",
    );
    expect(feld).toHaveFocus();
    expect(feld.selectionStart).toBe(0);
    expect(feld.selectionEnd).toBe(URL.length);
  });

  it("should_fallBackToSelection_when_clipboardApiMissing", async () => {
    // Ohne sicheren Kontext (http im LAN) fehlt `navigator.clipboard` ganz.
    render(<LinkKopieren url={URL} />);

    await kopieren();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Selbstbedienungs-Link" })).toHaveFocus();
  });
});
