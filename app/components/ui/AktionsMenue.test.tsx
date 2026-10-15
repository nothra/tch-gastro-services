import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AktionsMenue, MenueEintrag } from "./AktionsMenue";

// Verhaltensvertrag aus `ZeilenMenue` übernommen (ADR-061 D1): Auslöser, Popup, Escape,
// Außenklick, Fokus auf den ersten Eintrag und zurück zum Auslöser.

function renderMenue({
  onBearbeiten = vi.fn(),
  ausloeserRef,
}: {
  onBearbeiten?: () => void;
  ausloeserRef?: React.RefObject<HTMLButtonElement | null>;
} = {}) {
  render(
    <>
      <AktionsMenue label="Aktionen für Anna" ausloeserRef={ausloeserRef}>
        {({ schliessen }) => (
          <>
            <MenueEintrag
              onClick={() => {
                schliessen();
                onBearbeiten();
              }}
            >
              Bearbeiten
            </MenueEintrag>
            <MenueEintrag gefahr onClick={schliessen}>
              Löschen
            </MenueEintrag>
          </>
        )}
      </AktionsMenue>
      <p>Außerhalb</p>
    </>,
  );
}

function ausloeser() {
  return screen.getByRole("button", { name: "Aktionen für Anna" });
}

describe("AktionsMenue (ADR-061 D1)", () => {
  it("should_labelTriggerAndMeetTouchSize_when_rendered", () => {
    renderMenue();

    expect(ausloeser()).toHaveAttribute("aria-haspopup", "menu");
    expect(ausloeser()).toHaveAttribute("aria-expanded", "false");
    expect(ausloeser()).toHaveAttribute("type", "button");
    expect(ausloeser()).toHaveClass("min-h-11", "min-w-11");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should_openMenuAndFocusFirstEntry_when_triggerClicked", () => {
    renderMenue();

    fireEvent.click(ausloeser());

    expect(ausloeser()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Aktionen für Anna" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Bearbeiten" })).toHaveFocus();
  });

  it("should_closeMenuAndFocusTrigger_when_escapePressedInMenu", () => {
    renderMenue();
    fireEvent.click(ausloeser());

    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Bearbeiten" }), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(ausloeser()).toHaveFocus();
  });

  it("should_keepMenuOpen_when_otherKeyPressedInMenu", () => {
    renderMenue();
    fireEvent.click(ausloeser());

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("should_closeMenu_when_pointerDownOutside", () => {
    renderMenue();
    fireEvent.click(ausloeser());

    fireEvent.pointerDown(screen.getByText("Außerhalb"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should_keepMenuOpen_when_pointerDownInsideMenu", () => {
    renderMenue();
    fireEvent.click(ausloeser());

    fireEvent.pointerDown(screen.getByRole("menuitem", { name: "Löschen" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("should_toggleMenuClosed_when_triggerClickedAgain", () => {
    renderMenue();
    fireEvent.click(ausloeser());

    fireEvent.click(ausloeser());

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should_closeMenuFocusTriggerAndRunEntry_when_entryChosenWithSchliessen", () => {
    const onBearbeiten = vi.fn();
    renderMenue({ onBearbeiten });
    fireEvent.click(ausloeser());

    fireEvent.click(screen.getByRole("menuitem", { name: "Bearbeiten" }));

    expect(onBearbeiten).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(ausloeser()).toHaveFocus();
  });

  it("should_attachGivenRefToTrigger_when_ausloeserRefPassed", () => {
    // Der Konsument braucht den Auslöser als Fokus-Rückgabe einer Bestätigung (ADR-061 D3).
    const ausloeserRef = createRef<HTMLButtonElement>();
    renderMenue({ ausloeserRef });

    expect(ausloeserRef.current).toBe(ausloeser());
  });
});

describe("MenueEintrag (ADR-061 D1)", () => {
  it("should_renderMenuitemButtonWithTouchSize_when_rendered", () => {
    renderMenue();
    fireEvent.click(ausloeser());

    const eintrag = screen.getByRole("menuitem", { name: "Bearbeiten" });
    expect(eintrag.tagName).toBe("BUTTON");
    expect(eintrag).toHaveAttribute("type", "button");
    expect(eintrag).toHaveClass("min-h-11", "text-foreground");
  });

  it("should_useDangerTone_when_gefahr", () => {
    renderMenue();
    fireEvent.click(ausloeser());

    expect(screen.getByRole("menuitem", { name: "Löschen" })).toHaveClass("text-danger");
    expect(screen.getByRole("menuitem", { name: "Löschen" })).not.toHaveClass("text-foreground");
  });

  it("should_submitEnclosingForm_when_typeSubmit", () => {
    // Die Erstatten-Aktion ist ein Formular im Popup (ADR-061 D3).
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <AktionsMenue label="Aktionen für Anna">
        {() => (
          <form onSubmit={onSubmit}>
            <MenueEintrag type="submit" disabled={false}>
              Als erstattet markieren
            </MenueEintrag>
          </form>
        )}
      </AktionsMenue>,
    );
    fireEvent.click(ausloeser());

    fireEvent.click(screen.getByRole("menuitem", { name: "Als erstattet markieren" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("should_beDisabled_when_disabledPassed", () => {
    render(
      <AktionsMenue label="Aktionen für Anna">
        {() => <MenueEintrag disabled>Läuft …</MenueEintrag>}
      </AktionsMenue>,
    );
    fireEvent.click(ausloeser());

    expect(screen.getByRole("menuitem", { name: "Läuft …" })).toBeDisabled();
  });
});
