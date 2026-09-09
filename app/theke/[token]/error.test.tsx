import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThekeError from "./error";

// Reproduziert #331: eine Proxy-Antwort außerhalb des Server-Action-Protokolls (429-Klartext bei
// erschöpftem Schreib-Budget, ADR-048 D5) und ein Offline-Fehler (FS-1) werfen während des Renderns
// weiter (`useThenable` in react-dom-client) – ohne Boundary läuft das bis in Next' Default-
// `GlobalError` und zeigt „Application error: a client-side exception has occurred" (AK-1).

describe("ThekeError", () => {
  it("should_showOwnFriendlyText_when_arbitraryErrorThrown", () => {
    const error = Object.assign(new Error("secret internal detail"), { digest: "abc123digest" });

    render(<ThekeError error={error} reset={vi.fn()} />);

    // AK-3: weder error.message noch error.digest dürfen in der Ausgabe erscheinen.
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    expect(screen.queryByText(/abc123digest/)).not.toBeInTheDocument();
  });

  it("should_callReset_when_retryButtonClicked", () => {
    const reset = vi.fn();
    render(<ThekeError error={new Error("x")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: /erneut versuchen/i }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("should_renderIndependentlyOfPageProps_when_errorHasNoDigest", () => {
    // FS-5: die Boundary muss auch ohne digest rendern (kein Server-only-Zugriff, keine Props der
    // Theken-Seite).
    render(<ThekeError error={new Error("offline")} reset={vi.fn()} />);

    expect(screen.getByRole("button", { name: /erneut versuchen/i })).toBeInTheDocument();
  });
});
