import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { VeranstaltungFormState } from "../actions";

vi.mock("../actions", () => ({ setStatusAction: vi.fn() }));

import { setStatusAction } from "../actions";
import { AbschlussAktion } from "./AbschlussAktion";

const setStatusActionMock = vi.mocked(setStatusAction);

function dialog() {
  return document.querySelector("dialog")!;
}

function bestaetigungsDialog() {
  return screen.getByRole("dialog");
}

function abschliessenAusloeser() {
  return screen.getByRole("button", { name: "Veranstaltung abschließen" });
}

function wiederOeffnenAusloeser() {
  return screen.getByRole("button", { name: "Wieder öffnen" });
}

async function bestaetigen(name: string) {
  await act(async () => {
    fireEvent.click(within(bestaetigungsDialog()).getByRole("button", { name }));
  });
}

// Offen gehaltene Actions werden nach jedem Test aufgelöst – auch wenn eine Assertion vorher
// scheitert. Sonst hält React 19 den Scope offen und spätere Tests würden grün oder rot aus dem
// falschen Grund (Lesson #370, `lessons/testing.md`).
let offeneAntworten: Array<(state: VeranstaltungFormState) => void> = [];

beforeEach(() => {
  vi.resetAllMocks();
  setStatusActionMock.mockResolvedValue({ ok: true });
});

afterEach(async () => {
  await act(async () => offeneAntworten.forEach((antworten) => antworten({ ok: true })));
  offeneAntworten = [];
});

describe("AbschlussAktion – Abschließen (spec-371 AK18–AK21, ADR-055 D3)", () => {
  it("should_offerAbschliessenOnly_when_statusOffen", () => {
    render(<AbschlussAktion id="v-1" status="offen" />);

    expect(abschliessenAusloeser()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wieder öffnen" })).not.toBeInTheDocument();
  });

  it("should_meetTouchSize_when_rendered", () => {
    render(<AbschlussAktion id="v-1" status="offen" />);

    expect(abschliessenAusloeser()).toHaveClass("min-h-11");
  });

  it("should_openConfirmationWithoutCallingAction_when_triggerClicked", () => {
    render(<AbschlussAktion id="v-1" status="offen" />);

    fireEvent.click(abschliessenAusloeser());

    expect(dialog()).toHaveAttribute("open");
    expect(bestaetigungsDialog()).toHaveAccessibleName("Veranstaltung abschließen?");
    expect(setStatusActionMock).not.toHaveBeenCalled();
  });

  it("should_leaveEverythingUnchanged_when_cancelled", () => {
    render(<AbschlussAktion id="v-1" status="offen" />);
    fireEvent.click(abschliessenAusloeser());

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(setStatusActionMock).not.toHaveBeenCalled();
    expect(abschliessenAusloeser()).toHaveFocus();
  });

  it("should_leaveEverythingUnchanged_when_escaped", () => {
    render(<AbschlussAktion id="v-1" status="offen" />);
    fireEvent.click(abschliessenAusloeser());

    fireEvent(dialog(), new Event("cancel", { cancelable: true }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(setStatusActionMock).not.toHaveBeenCalled();
  });

  it("should_submitAbgeschlossenAndClose_when_confirmed", async () => {
    render(<AbschlussAktion id="v-1" status="offen" />);
    fireEvent.click(abschliessenAusloeser());

    await bestaetigen("Abschließen");

    const formData = setStatusActionMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("v-1");
    expect(formData.get("status")).toBe("abgeschlossen");
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("should_nameCountAndAmount_when_zeilenStillOffen", () => {
    // AK20: Anzahl und offener Betrag als Hinweis – entscheiden wird der Server (FS1).
    render(
      <AbschlussAktion id="v-1" status="offen" offeneZeilen={2} offenerBetragCents={1250} />,
    );

    fireEvent.click(abschliessenAusloeser());

    expect(bestaetigungsDialog()).toHaveAccessibleDescription(
      /2 Zeilen noch offen, zusammen 12,50 €/,
    );
  });

  it("should_useSingular_when_exactlyOneZeileOffen", () => {
    render(<AbschlussAktion id="v-1" status="offen" offeneZeilen={1} offenerBetragCents={250} />);

    fireEvent.click(abschliessenAusloeser());

    expect(bestaetigungsDialog()).toHaveAccessibleDescription(
      /1 Zeile noch offen, zusammen 2,50 €/,
    );
  });

  it("should_omitOffenHint_when_noZeileOffen", () => {
    // AK21: ohne offene Zeile kein Offen-Hinweis – der Rest der Beschreibung bleibt.
    render(<AbschlussAktion id="v-1" status="offen" offeneZeilen={0} offenerBetragCents={0} />);

    fireEvent.click(abschliessenAusloeser());

    expect(bestaetigungsDialog()).toHaveAccessibleDescription(/schreibgeschützt/);
    expect(bestaetigungsDialog()).not.toHaveAccessibleDescription(/offen/);
  });

  it("should_keepDialogOpenAndShowServerRejection_when_zeilenOffen", async () => {
    // AK20/FS1: die Ablehnung des Servers (ADR-033 D3) erscheint im Dialog.
    setStatusActionMock.mockResolvedValue({
      error: "Abschluss nicht möglich: 1 Zeile(n) noch offen.",
    });
    render(<AbschlussAktion id="v-1" status="offen" />);
    fireEvent.click(abschliessenAusloeser());

    await bestaetigen("Abschließen");

    expect(dialog()).toHaveAttribute("open");
    expect(within(bestaetigungsDialog()).getByRole("alert")).toHaveTextContent(
      "Abschluss nicht möglich: 1 Zeile(n) noch offen.",
    );
  });

  it("should_showAlreadyClosedMessage_when_serverReportsDoubleCall", async () => {
    // FS2: kein stiller Erfolg bei Doppel-Aufruf.
    setStatusActionMock.mockResolvedValue({ error: "Veranstaltung ist bereits abgeschlossen." });
    render(<AbschlussAktion id="v-1" status="offen" />);
    fireEvent.click(abschliessenAusloeser());

    await bestaetigen("Abschließen");

    expect(within(bestaetigungsDialog()).getByRole("alert")).toHaveTextContent(
      "Veranstaltung ist bereits abgeschlossen.",
    );
  });

  it("should_notShowOldRejection_when_dialogReopened", async () => {
    setStatusActionMock.mockResolvedValue({ error: "Abgelehnt." });
    render(<AbschlussAktion id="v-1" status="offen" />);
    fireEvent.click(abschliessenAusloeser());
    await bestaetigen("Abschließen");
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    fireEvent.click(abschliessenAusloeser());

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("should_lockButtons_when_actionRunning", async () => {
    // ADR-055 D3/ADR-053 D1: während der Action ist der Dialog gesperrt, damit eine Ablehnung
    // nicht ungesehen bleibt.
    setStatusActionMock.mockImplementation(
      () => new Promise<VeranstaltungFormState>((resolve) => offeneAntworten.push(resolve)),
    );
    render(<AbschlussAktion id="v-1" status="offen" />);
    fireEvent.click(abschliessenAusloeser());

    await bestaetigen("Abschließen");

    // Vorbedingung: die Action läuft wirklich noch (sonst prüfte der Test den Ruhezustand).
    expect(offeneAntworten).toHaveLength(1);
    expect(
      within(bestaetigungsDialog()).getByRole("button", { name: "Abschließen …" }),
    ).toBeDisabled();
    expect(within(bestaetigungsDialog()).getByRole("button", { name: "Abbrechen" })).toBeDisabled();
  });
});

describe("AbschlussAktion – Wieder öffnen (spec-371 AK22)", () => {
  it("should_offerWiederOeffnenOnly_when_statusAbgeschlossen", () => {
    render(<AbschlussAktion id="v-1" status="abgeschlossen" />);

    expect(wiederOeffnenAusloeser()).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Veranstaltung abschließen" }),
    ).not.toBeInTheDocument();
  });

  it("should_openConfirmationWithoutCallingAction_when_triggerClicked", () => {
    render(<AbschlussAktion id="v-1" status="abgeschlossen" />);

    fireEvent.click(wiederOeffnenAusloeser());

    expect(bestaetigungsDialog()).toHaveAccessibleName("Veranstaltung wieder öffnen?");
    expect(bestaetigungsDialog()).toHaveAccessibleDescription(/protokolliert/);
    expect(setStatusActionMock).not.toHaveBeenCalled();
  });

  it("should_submitOffenAndClose_when_confirmed", async () => {
    render(<AbschlussAktion id="v-1" status="abgeschlossen" />);
    fireEvent.click(wiederOeffnenAusloeser());

    await bestaetigen("Wieder öffnen");

    const formData = setStatusActionMock.mock.calls[0][1];
    expect(formData.get("id")).toBe("v-1");
    expect(formData.get("status")).toBe("offen");
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("should_showAlreadyOpenMessage_when_serverReportsDoubleCall", async () => {
    setStatusActionMock.mockResolvedValue({ error: "Veranstaltung ist bereits offen." });
    render(<AbschlussAktion id="v-1" status="abgeschlossen" />);
    fireEvent.click(wiederOeffnenAusloeser());

    await bestaetigen("Wieder öffnen");

    expect(dialog()).toHaveAttribute("open");
    expect(within(bestaetigungsDialog()).getByRole("alert")).toHaveTextContent(
      "Veranstaltung ist bereits offen.",
    );
  });
});
