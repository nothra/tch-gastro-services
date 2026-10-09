import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "react-hot-toast";
import { Toaster } from "./Toaster";
import { meldeErfolg } from "./meldung";

// Der einzige Test, der den echten Toaster samt Bibliothek montiert (ADR-058 Implementierungs-
// Hinweise); alle Konsumenten mocken `meldung.ts`. Der Store der Bibliothek ist modulweit –
// jeder Test räumt ihn deshalb selbst ab, sonst sähe der nächste die Toasts des vorigen.

// jsdom kennt `matchMedia` nicht; die Bibliothek fragt darüber `prefers-reduced-motion` ab.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  act(() => toast.remove());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Toaster + meldeErfolg (spec-372 AK12–AK15, ADR-058 D1)", () => {
  it("should_showMessageAsStatus_when_meldeErfolgCalled", () => {
    render(<Toaster />);

    act(() => meldeErfolg("Auslage gelöscht"));

    expect(screen.getByRole("status")).toHaveTextContent("Auslage gelöscht");
  });

  it("should_announcePolitely_when_shown", () => {
    // AK14: der Toast nimmt nichts vorweg – höflich angesagt, nicht unterbrechend.
    render(<Toaster />);

    act(() => meldeErfolg("Gespeichert"));

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("should_keepCloseButtonOutsideLiveRegion_when_shown", () => {
    // Läge die Schaltfläche in der Live-Region, würde ihr Name mit angesagt.
    render(<Toaster />);

    act(() => meldeErfolg("Gespeichert"));

    const schliessen = screen.getByRole("button", { name: "Meldung schließen" });
    expect(screen.getByRole("status")).not.toContainElement(schliessen);
  });

  it("should_useSuccessTokensLikeNotice_when_shown", () => {
    // Optik aus derselben Stil-Tabelle wie `Notice` (ADR-058 D1, ADR-052).
    render(<Toaster />);

    act(() => meldeErfolg("Gespeichert"));

    const karte = screen.getByRole("status").parentElement!;
    expect(karte).toHaveClass("border-success", "bg-success-subtle", "text-success");
  });

  it("should_removeToast_when_closeButtonClicked", () => {
    // AK14: „×" schließt den Toast sofort.
    render(<Toaster />);
    act(() => meldeErfolg("Gespeichert"));

    fireEvent.click(screen.getByRole("button", { name: "Meldung schließen" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_disappearAfterFiveSeconds_when_untouched", () => {
    // Q2: 5 s Standzeit – nicht kürzer, damit ein Screenreader ihn ansagen kann (AK14).
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => meldeErfolg("Gespeichert"));

    act(() => vi.advanceTimersByTime(4_999));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_showBothMessages_when_twoSuccessesInQuickSuccession", () => {
    // AK15: keine Meldung geht verloren.
    render(<Toaster />);

    act(() => {
      meldeErfolg("Teilnehmer entfernt");
      meldeErfolg("Gespeichert");
    });

    const meldungen = screen.getAllByRole("status").map((status) => status.textContent);
    expect(meldungen).toEqual(expect.arrayContaining(["Teilnehmer entfernt", "Gespeichert"]));
  });
});

describe("Toaster bei offenem modalem Dialog (spec-372 FS6)", () => {
  // Ein modaler `<dialog>` macht alles außerhalb inert: ein Toast im `<body>` wäre verdeckt,
  // nicht anklickbar und für Screenreader stumm – etwa nach „Änderungen speichern" im Dialog
  // „Einstellungen", der nach dem Erfolg offen bleibt (ADR-056 D3).

  it("should_renderToastInsideDialog_when_modalDialogIsOpen", () => {
    render(
      <>
        <dialog open aria-label="Einstellungen" />
        <Toaster />
      </>,
    );

    act(() => meldeErfolg("Gespeichert"));

    expect(screen.getByRole("dialog", { name: "Einstellungen" })).toContainElement(
      screen.getByRole("status"),
    );
  });

  it("should_moveToastBackOutOfDialog_when_dialogCloses", async () => {
    render(
      <>
        <dialog open aria-label="Einstellungen" />
        <Toaster />
      </>,
    );
    const dialog = screen.getByRole("dialog", { name: "Einstellungen" });
    act(() => meldeErfolg("Gespeichert"));

    // Der Beobachter meldet die Attribut-Änderung asynchron (MutationObserver).
    await act(async () => dialog.removeAttribute("open"));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Gespeichert");
    expect(dialog).not.toContainElement(status);
  });

  it("should_moveToastIntoDialog_when_dialogOpensAfterToast", async () => {
    render(
      <>
        <dialog aria-label="Einstellungen" data-testid="dialog" />
        <Toaster />
      </>,
    );
    act(() => meldeErfolg("Gespeichert"));
    const dialog = screen.getByTestId("dialog");

    await act(async () => dialog.setAttribute("open", ""));

    expect(dialog).toContainElement(screen.getByRole("status"));
  });

  it("should_keepToastOutOfClosedDialog_when_noDialogIsOpen", () => {
    render(
      <>
        <dialog aria-label="Einstellungen" data-testid="dialog" />
        <Toaster />
      </>,
    );

    act(() => meldeErfolg("Gespeichert"));

    expect(screen.getByTestId("dialog")).not.toContainElement(screen.getByRole("status"));
  });
});
