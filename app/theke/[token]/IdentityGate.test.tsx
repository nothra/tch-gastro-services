import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IdentityGate } from "./IdentityGate";
import type { VerzehrArtikel, VerzehrZeile } from "@/app/_verzehr/VerzehrErfassung";

// MengeControl ist eine Client-Komponente (useActionState); durch ein Stub ersetzt, das die
// editable-Prop spiegelt – so lässt sich prüfen, ob die Erfassungs-Controls hinter dem Namens-Gate
// stehen (read-only) oder freigeschaltet sind, ohne die Action-Mechanik zu testen.
vi.mock("@/app/_verzehr/MengeControl", () => ({
  MengeControl: ({ menge, editable }: { menge: number; editable: boolean }) => (
    <span data-testid="menge" data-editable={String(editable)}>
      {menge}
    </span>
  ),
}));

const TOKEN = "tok-1";
const STORAGE_KEY = `tch:sb:name:${TOKEN}`;

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];

const artikel: VerzehrArtikel[] = [
  { id: "c1", name: "Cola", size: "0,5l", priceCents: 250, category: "getraenk" },
];

function renderGate(overrides: Partial<Parameters<typeof IdentityGate>[0]> = {}) {
  return render(
    <IdentityGate
      token={TOKEN}
      zeilen={zeilen}
      artikel={artikel}
      positionen={[]}
      action={vi.fn()}
      editable
      {...overrides}
    />,
  );
}

function expectAllMengeEditable(editable: boolean) {
  const controls = screen.getAllByTestId("menge");
  expect(controls.length).toBeGreaterThan(0);
  controls.forEach((control) => expect(control).toHaveAttribute("data-editable", String(editable)));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("IdentityGate", () => {
  it("should_showPickerAndReadOnlyList_when_noStoredName", () => {
    // AC B (Spec-Bullet 1): Beim Öffnen sind Teilnehmerliste UND laufende Summen bereits sichtbar –
    // vor der Namenswahl. Die Erfassungs-Controls bleiben hinter dem Gate (read-only).
    renderGate();

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anna" })).toBeInTheDocument();
    expect(screen.getAllByText(/Cola/)).toHaveLength(zeilen.length);
    expectAllMengeEditable(false);
  });

  it("should_enableErfassung_when_storedNameValid", () => {
    window.localStorage.setItem(STORAGE_KEY, "Anna");

    renderGate();

    expect(screen.getByText(/Erfassung als/)).toBeInTheDocument();
    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expectAllMengeEditable(true);
  });

  it("should_showPickerAndReadOnlyList_when_storedNameStale", () => {
    // Gemerkter Name steht nicht (mehr) in der Liste → Stale-Fallback auf den Picker,
    // Liste + Summen bleiben read-only sichtbar.
    window.localStorage.setItem(STORAGE_KEY, "Cäcilia");

    renderGate();

    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expect(screen.getAllByText(/Cola/)).toHaveLength(zeilen.length);
    expectAllMengeEditable(false);
  });

  it("should_storeNameAndEnableErfassung_when_pickName", () => {
    renderGate();

    fireEvent.click(screen.getByRole("button", { name: "Bernd" }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("Bernd");
    expect(screen.getByText(/Erfassung als/)).toBeInTheDocument();
    expectAllMengeEditable(true);
  });

  it("should_clearNameAndShowReadOnlyPicker_when_personWechseln", () => {
    window.localStorage.setItem(STORAGE_KEY, "Anna");

    renderGate();
    expectAllMengeEditable(true);

    fireEvent.click(screen.getByRole("button", { name: "Person wechseln" }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByText("Wer bist du?")).toBeInTheDocument();
    expectAllMengeEditable(false);
  });

  it("should_renderReadOnlyWithoutPicker_when_notEditable", () => {
    // Read-only (abgeschlossen): kein Gate, keine Namenswahl – nur Liste + Summen.
    renderGate({ editable: false });

    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByText("Person wechseln")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Cola/)).toHaveLength(zeilen.length);
    expectAllMengeEditable(false);
  });

  it("should_showHint_when_noZeilen", () => {
    renderGate({ zeilen: [] });

    expect(screen.getByText(/bitte an den Veranstalter wenden/)).toBeInTheDocument();
    expect(screen.queryByText("Wer bist du?")).not.toBeInTheDocument();
    expect(screen.queryByTestId("menge")).not.toBeInTheDocument();
  });
});
