import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { KontoMenue } from "./KontoMenue";

// jsdom kennt die Popover-API nicht (ADR-056 D1): hier wird nur die deklarative Verdrahtung
// geprüft. Öffnen, Escape, Klick außerhalb und Fokus-Rücksprung belegt e2e/header-startseite.spec.ts.

const signOutAction = vi.fn(async () => {});

function renderMenue(label = "verwalter@tch.de") {
  return render(<KontoMenue label={label} signOutAction={signOutAction} />);
}

function menue() {
  return document.getElementById("konto-menue") as HTMLElement;
}

// Ein geschlossenes Popover ist auch für jsdom verborgen – Rollen-Abfragen im Menü brauchen
// deshalb `hidden: true`.
function abmeldenKnopf() {
  return within(menue()).getByRole("button", { name: "Abmelden", hidden: true });
}

describe("KontoMenue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_nameTriggerKontoWithoutShowingEmail_when_rendered", () => {
    // AK1.2: der zugängliche Name hängt nicht an der (ggf. langen) E-Mail.
    renderMenue();

    const knopf = screen.getByRole("button", { name: "Konto" });

    expect(knopf).not.toHaveTextContent("verwalter@tch.de");
    expect(knopf).toHaveAttribute("type", "button");
  });

  it("should_keepTouchTargetOf44px_when_rendered", () => {
    renderMenue();

    expect(screen.getByRole("button", { name: "Konto" })).toHaveClass(
      "min-h-11",
      "min-w-11",
      "shrink-0",
    );
  });

  it("should_wireTriggerToPopover_when_rendered", () => {
    // AK1.3: Auslöser und Menü sind über popovertarget ↔ id/popover verbunden – Escape,
    // Light-Dismiss und Fokus-Rücksprung kommen damit von der Plattform.
    renderMenue();

    expect(screen.getByRole("button", { name: "Konto" })).toHaveAttribute(
      "popovertarget",
      "konto-menue",
    );
    expect(menue()).toHaveAttribute("popover", "auto");
  });

  it("should_showEmailAndSignOutInMenu_when_rendered", () => {
    renderMenue();

    expect(within(menue()).getByText("verwalter@tch.de")).toBeInTheDocument();
    expect(abmeldenKnopf()).toHaveAttribute("type", "submit");
  });

  it("should_callSignOutAction_when_abmeldenFormSubmitted", async () => {
    // AK1.4: „Abmelden" bleibt die bestehende Form-Action (signOutAction).
    renderMenue();
    const form = abmeldenKnopf().closest("form") as HTMLFormElement;

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(signOutAction).toHaveBeenCalledTimes(1);
  });

  it("should_showFallbackLabel_when_labelIsAngemeldet", () => {
    // Fehlerszenario „leere E-Mail": AppHeader liefert dann „Angemeldet" als Label.
    renderMenue("Angemeldet");

    expect(within(menue()).getByText("Angemeldet")).toBeInTheDocument();
  });
});
