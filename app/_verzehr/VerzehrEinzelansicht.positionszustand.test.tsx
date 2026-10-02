import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import { VerzehrEinzelansicht } from "./VerzehrEinzelansicht";
import { stubRequestAnimationFrame } from "./raf-stub";
import type { VerzehrFormAction } from "./types";
import type { VerzehrArtikel, VerzehrZeile } from "./verzehr-props";

// Fehler- und Pending-Zustand einer Position gehören der Person, bei der getippt wurde (spec-370
// FS1/AK4.4). Anders als VerzehrEinzelansicht.test.tsx läuft hier das echte MengeControl samt
// useActionState – nur so ist sichtbar, ob dessen Zustand beim Personenwechsel mitwandert.

const zeilen: VerzehrZeile[] = [
  { id: "z1", anzeigename: "Anna" },
  { id: "z2", anzeigename: "Bernd" },
];
const pils: VerzehrArtikel = {
  id: "c-pils",
  name: "Pils",
  size: "0,5 l",
  priceCents: 300,
  category: "getraenk",
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  stubRequestAnimationFrame();
});

function renderAnsicht(action: VerzehrFormAction) {
  render(
    <VerzehrEinzelansicht
      zeilen={zeilen}
      artikel={[pils]}
      positionen={[]}
      action={action}
      editable
      initialeZeileId="z1"
    />,
  );
}

function chip(name: string) {
  return within(screen.getByRole("group", { name: "Teilnehmer auswählen" })).getByRole("button", {
    name: new RegExp(`^${name}`),
  });
}

async function tippePlus() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Menge erhöhen" }));
  });
}

describe("VerzehrEinzelansicht – Positionszustand je Person (spec-370 FS1/AK4.4)", () => {
  it("should_notShowErrorAtOtherPerson_when_errorOccurredBeforeSwitch", async () => {
    const action: VerzehrFormAction = vi.fn(async () => ({ error: "Zu viele Eingaben." }));
    renderAnsicht(action);
    await tippePlus();
    expect(screen.getByRole("alert")).toHaveTextContent("Zu viele Eingaben.");

    fireEvent.click(chip("Bernd"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_notShowErrorAtPreviousPerson_when_errorOccurredAfterSwitch", async () => {
    // Spiegel-Richtung (Lesson #211): Fehler bei Bernd darf beim Rückweg nicht bei Anna stehen.
    const action: VerzehrFormAction = vi.fn(async () => ({ error: "Zu viele Eingaben." }));
    renderAnsicht(action);
    fireEvent.click(chip("Bernd"));
    await tippePlus();
    expect(screen.getByRole("alert")).toHaveTextContent("Zu viele Eingaben.");

    fireEvent.click(chip("Anna"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_keepOtherPersonsButtonsEnabled_when_actionStillPendingAfterSwitch", async () => {
    // Nie auflösendes Promise hält Annas Aktion offen (Lesson #369).
    const action: VerzehrFormAction = vi.fn(() => new Promise<never>(() => {}));
    renderAnsicht(action);
    await tippePlus();
    expect(screen.getByRole("button", { name: "Menge erhöhen" })).toBeDisabled();

    fireEvent.click(chip("Bernd"));

    expect(screen.getByRole("button", { name: "Menge erhöhen" })).toBeEnabled();
  });
});
