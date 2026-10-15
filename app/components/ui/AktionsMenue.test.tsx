import { describe, it, expect, vi } from "vitest";
import { createRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("should_startWithoutPreviousEntryState_when_reopened", () => {
    // JSDoc `children`: die Einträge mounten erst beim Öffnen – eine Ablehnung im Popup
    // (hier: Zustand eines Eintrags) steht beim nächsten Öffnen nicht mehr da.
    function EintragMitZustand() {
      const [gewaehlt, setGewaehlt] = useState(false);
      return (
        <MenueEintrag onClick={() => setGewaehlt(true)}>
          {gewaehlt ? "Abgelehnt" : "Erstatten"}
        </MenueEintrag>
      );
    }
    render(<AktionsMenue label="Aktionen für Anna">{() => <EintragMitZustand />}</AktionsMenue>);
    fireEvent.click(ausloeser());
    fireEvent.click(screen.getByRole("menuitem", { name: "Erstatten" }));
    expect(screen.getByRole("menuitem", { name: "Abgelehnt" })).toBeInTheDocument();

    fireEvent.click(ausloeser());
    fireEvent.click(ausloeser());

    expect(screen.getByRole("menuitem", { name: "Erstatten" })).toBeInTheDocument();
  });

  it("should_attachGivenRefToTrigger_when_ausloeserRefPassed", () => {
    // Der Konsument braucht den Auslöser als Fokus-Rückgabe einer Bestätigung (ADR-061 D3).
    const ausloeserRef = createRef<HTMLButtonElement>();
    renderMenue({ ausloeserRef });

    expect(ausloeserRef.current).toBe(ausloeser());
  });
});

// Ein Eintrag, der einen Lauf meldet – wie das Erstatten-Formular über `meldeLauf` (Lesson #369:
// der Sperr-Vertrag gehört in den Baustein, nicht in den Konsumenten).
function renderMitLauf() {
  let laufMelden: ((laeuft: boolean) => void) | undefined;
  render(
    <>
      <AktionsMenue label="Aktionen für Anna">
        {({ meldeLauf }) => {
          laufMelden = meldeLauf;
          return (
            <MenueEintrag onClick={() => meldeLauf(true)}>Als erstattet markieren</MenueEintrag>
          );
        }}
      </AktionsMenue>
      <p>Außerhalb</p>
    </>,
  );
  fireEvent.click(ausloeser());
  fireEvent.click(screen.getByRole("menuitem", { name: "Als erstattet markieren" }));
  return { laufBeenden: () => act(() => laufMelden?.(false)) };
}

describe("AktionsMenue – Sperre während eines Laufs (spec-406 AK3.4, FS2)", () => {
  it("should_keepMenuOpen_when_pointerDownOutsideWhileRunning", () => {
    renderMitLauf();

    fireEvent.pointerDown(screen.getByText("Außerhalb"));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("should_keepMenuOpen_when_escapePressedWhileRunning", () => {
    renderMitLauf();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("should_keepMenuOpen_when_triggerClickedWhileRunning", () => {
    renderMitLauf();

    fireEvent.click(ausloeser());

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(ausloeser()).toHaveAttribute("aria-expanded", "true");
  });

  it("should_closeAgain_when_runEnded", () => {
    const { laufBeenden } = renderMitLauf();

    laufBeenden();
    fireEvent.pointerDown(screen.getByText("Außerhalb"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should_closeOnEscapeWithFocusOutsideMenu_when_runEnded", () => {
    // Ein während des Laufs deaktivierter Eintrag verliert den Fokus – Escape greift trotzdem.
    const { laufBeenden } = renderMitLauf();
    laufBeenden();
    (document.activeElement as HTMLElement | null)?.blur();

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(ausloeser()).toHaveFocus();
  });

  it("should_startUnlocked_when_reopenedAfterSchliessenDuringRun", () => {
    let steuerung: { schliessen: () => void; meldeLauf: (laeuft: boolean) => void } | undefined;
    render(
      <>
        <AktionsMenue label="Aktionen für Anna">
          {(s) => {
            steuerung = s;
            return <MenueEintrag>Eintrag</MenueEintrag>;
          }}
        </AktionsMenue>
        <p>Außerhalb</p>
      </>,
    );
    fireEvent.click(ausloeser());
    act(() => steuerung?.meldeLauf(true));
    // Erfolg: der Konsument schließt, bevor die Action ihr Ende meldet.
    act(() => steuerung?.schliessen());

    fireEvent.click(ausloeser());
    fireEvent.pointerDown(screen.getByText("Außerhalb"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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
