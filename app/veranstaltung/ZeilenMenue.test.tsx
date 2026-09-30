import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("./actions", () => ({ removeZeileAction: vi.fn() }));

import { removeZeileAction } from "./actions";
import { ZeilenMenue } from "./ZeilenMenue";

const removeZeileActionMock = vi.mocked(removeZeileAction);

function renderMenue() {
  render(
    <>
      <ZeilenMenue veranstaltungId="v-1" zeileId="z-1" name="Anna Beispiel" />
      <p>Außerhalb</p>
    </>,
  );
}

function trigger() {
  return screen.getByRole("button", { name: "Aktionen für Anna Beispiel" });
}

function dialog() {
  return document.querySelector("dialog")!;
}

function menueOeffnenUndEntfernenWaehlen() {
  fireEvent.click(trigger());
  fireEvent.click(screen.getByRole("menuitem", { name: "Entfernen" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  removeZeileActionMock.mockResolvedValue({ ok: true });
});

describe("ZeilenMenue (spec-369 AK18/AK19/AK20, ADR-053 D2)", () => {
  it("should_labelTriggerWithNameAndMeetTouchSize_when_rendered", () => {
    renderMenue();

    // AK18: sprechendes aria-label mit Personennamen, Touch-Fläche ≥ 44 × 44 px.
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveClass("min-h-11", "min-w-11");
  });

  it("should_offerEntfernen_when_menuOpened", () => {
    renderMenue();

    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Entfernen" })).toHaveFocus();
  });

  it("should_closeMenuAndFocusTrigger_when_escapePressedInMenu", () => {
    renderMenue();
    fireEvent.click(trigger());

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("should_closeMenu_when_pointerDownOutside", () => {
    renderMenue();
    fireEvent.click(trigger());

    fireEvent.pointerDown(screen.getByText("Außerhalb"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should_keepMenuOpen_when_pointerDownInsideMenu", () => {
    renderMenue();
    fireEvent.click(trigger());

    fireEvent.pointerDown(screen.getByRole("menuitem", { name: "Entfernen" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("should_toggleMenuClosed_when_triggerClickedAgain", () => {
    renderMenue();
    fireEvent.click(trigger());

    fireEvent.click(trigger());

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should_openConfirmationNamingPerson_when_entfernenChosen", () => {
    renderMenue();

    menueOeffnenUndEntfernenWaehlen();

    // AK19: Bestätigung nennt den Namen, „Entfernen" in Variante danger, das Menü ist zu.
    const bestaetigung = screen.getByRole("dialog", { name: "Teilnehmer entfernen?" });
    expect(bestaetigung).toHaveAccessibleDescription(/Anna Beispiel/);
    expect(screen.getByRole("button", { name: "Entfernen" })).toHaveClass("bg-danger");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(removeZeileActionMock).not.toHaveBeenCalled();
  });

  it("should_notRemoveAndReturnFocus_when_confirmationCancelled", () => {
    renderMenue();
    menueOeffnenUndEntfernenWaehlen();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(removeZeileActionMock).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it("should_notRemove_when_confirmationEscaped", () => {
    renderMenue();
    menueOeffnenUndEntfernenWaehlen();

    fireEvent(dialog(), new Event("cancel", { cancelable: true }));

    expect(dialog()).not.toHaveAttribute("open");
    expect(removeZeileActionMock).not.toHaveBeenCalled();
  });

  it("should_submitZeileBoundToVeranstaltungAndClose_when_confirmed", async () => {
    renderMenue();
    menueOeffnenUndEntfernenWaehlen();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    });

    const formData = removeZeileActionMock.mock.calls[0][1];
    expect(formData.get("veranstaltungId")).toBe("v-1");
    expect(formData.get("zeileId")).toBe("z-1");
    expect(dialog()).not.toHaveAttribute("open");
  });

  it("should_keepDialogOpenAndShowError_when_serverRejects", async () => {
    // AK20: die Zeile bleibt, der Dialog zeigt die Meldung der Action.
    removeZeileActionMock.mockResolvedValue({
      error: "Die Veranstaltung ist abgeschlossen und schreibgeschützt.",
    });
    renderMenue();
    menueOeffnenUndEntfernenWaehlen();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    });

    expect(dialog()).toHaveAttribute("open");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die Veranstaltung ist abgeschlossen und schreibgeschützt.",
    );
  });

  it("should_notShowOldError_when_confirmationReopened", async () => {
    // Ein erneutes Öffnen ist ein neuer Versuch – die Ablehnung von vorhin gehört nicht dazu.
    removeZeileActionMock.mockResolvedValue({ error: "Abgelehnt." });
    renderMenue();
    menueOeffnenUndEntfernenWaehlen();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));

    menueOeffnenUndEntfernenWaehlen();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
