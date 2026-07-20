import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IdentityGate, type IdentityZeile } from "./IdentityGate";

const TOKEN = "tok-1";
const STORAGE_KEY = `tch:sb:name:${TOKEN}`;

const zeilen: IdentityZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];

function renderGate(overrides: Partial<Parameters<typeof IdentityGate>[0]> = {}) {
  return render(
    <IdentityGate token={TOKEN} zeilen={zeilen} editable {...overrides}>
      <div data-testid="erfassung">Erfassung</div>
    </IdentityGate>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("IdentityGate", () => {
  it("should_showPicker_when_noStoredName", () => {
    renderGate();

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anna" })).toBeInTheDocument();
    expect(screen.queryByTestId("erfassung")).not.toBeInTheDocument();
  });

  it("should_showErfassung_when_storedNameValid", () => {
    window.localStorage.setItem(STORAGE_KEY, "Anna");

    renderGate();

    expect(screen.getByTestId("erfassung")).toBeInTheDocument();
    expect(screen.getByText(/Erfassung als/)).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
  });

  it("should_showPicker_when_storedNameStale", () => {
    // Gemerkter Name steht nicht (mehr) in der Liste → Stale-Fallback auf den Picker.
    window.localStorage.setItem(STORAGE_KEY, "Cäcilia");

    renderGate();

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.queryByTestId("erfassung")).not.toBeInTheDocument();
  });

  it("should_storeNameAndShowErfassung_when_pickName", () => {
    renderGate();

    fireEvent.click(screen.getByRole("button", { name: "Bernd" }));

    expect(screen.getByTestId("erfassung")).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("Bernd");
    expect(screen.getByText("Bernd")).toBeInTheDocument();
  });

  it("should_clearAndShowPicker_when_personWechseln", () => {
    window.localStorage.setItem(STORAGE_KEY, "Anna");

    renderGate();
    expect(screen.getByTestId("erfassung")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Person wechseln" }));

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.queryByTestId("erfassung")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("should_renderChildrenWithoutGate_when_notEditable", () => {
    // Read-only (abgeschlossen): kein Gate, auch ohne gemerkten Namen direkt die children.
    renderGate({ editable: false });

    expect(screen.getByTestId("erfassung")).toBeInTheDocument();
    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByText("Person wechseln")).not.toBeInTheDocument();
  });

  it("should_showHint_when_noZeilen", () => {
    renderGate({ zeilen: [] });

    expect(screen.getByText(/bitte an den Veranstalter wenden/)).toBeInTheDocument();
    expect(screen.queryByTestId("erfassung")).not.toBeInTheDocument();
  });
});
