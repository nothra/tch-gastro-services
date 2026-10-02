import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import { VerzehrEinzelansicht } from "./VerzehrEinzelansicht";
import { stubRequestAnimationFrame } from "./raf-stub";
import type { VerzehrActionState, VerzehrFormAction } from "./types";
import type { VerzehrArtikel } from "./artikel-anzeige";
import type { VerzehrZeile } from "./verzehr-props";

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

// React 19 bündelt laufende Async-Actions in einem modulweiten Scope: eine nie aufgelöste Aktion
// hielte ihn über das Testende hinaus offen, und spätere Tests dieser Datei sähen ihre
// Action-Ergebnisse nie committet – „kein Fehler sichtbar" wäre dann grün aus dem falschen Grund.
// Darum löst jeder Test seine offenen Aktionen am Ende auf.
const offeneAntworten: Array<(zustand: VerzehrActionState) => void> = [];

afterEach(async () => {
  await act(async () => offeneAntworten.splice(0).forEach((antworte) => antworte({})));
});

function offeneAktion() {
  const action: VerzehrFormAction = vi.fn(
    () => new Promise<VerzehrActionState>((resolve) => offeneAntworten.push(resolve)),
  );
  return {
    action,
    antworte: (zustand: VerzehrActionState) =>
      act(async () => offeneAntworten.splice(0).forEach((antworte) => antworte(zustand))),
  };
}

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

  it("should_notShowErrorAtFirstPerson_when_errorOccurredAtSecondPerson", async () => {
    // Gegenrichtung zum Test davor: Fehler bei der zweiten Person, Wechsel zur ersten.
    const action: VerzehrFormAction = vi.fn(async () => ({ error: "Zu viele Eingaben." }));
    renderAnsicht(action);
    fireEvent.click(chip("Bernd"));
    await tippePlus();
    expect(screen.getByRole("alert")).toHaveTextContent("Zu viele Eingaben.");

    fireEvent.click(chip("Anna"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_keepOtherPersonsButtonsEnabled_when_actionStillPendingAfterSwitch", async () => {
    // Offenes Promise hält Annas Aktion bis zum Testende offen (Lesson #369).
    const { action } = offeneAktion();
    renderAnsicht(action);
    await tippePlus();
    expect(screen.getByRole("button", { name: "Menge erhöhen" })).toBeDisabled();

    fireEvent.click(chip("Bernd"));

    expect(screen.getByRole("button", { name: "Menge erhöhen" })).toBeEnabled();
  });

  // Bewusste Grenze (ADR-054 D2): der Zustand gilt, solange die Person angezeigt wird. Die beiden
  // folgenden Tests belegen den Rückweg A → B → A, damit eine Änderung der Grenze auffällt.
  it("should_enableButtonsAgain_when_returningToPersonWithPendingAction", async () => {
    const { action } = offeneAktion();
    renderAnsicht(action);
    await tippePlus();
    expect(screen.getByRole("button", { name: "Menge erhöhen" })).toBeDisabled();
    fireEvent.click(chip("Bernd"));

    fireEvent.click(chip("Anna"));

    expect(screen.getByRole("button", { name: "Menge erhöhen" })).toBeEnabled();
  });

  it("should_dropError_when_itArrivesAfterSwitchingAway", async () => {
    const { action, antworte } = offeneAktion();
    renderAnsicht(action);
    await tippePlus();
    fireEvent.click(chip("Bernd"));

    await antworte({ error: "Zu viele Eingaben." });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(chip("Anna"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
