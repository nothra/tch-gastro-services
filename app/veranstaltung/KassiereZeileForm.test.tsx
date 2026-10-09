import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { VeranstaltungFormState } from "./actions";

// useActionState steuert Fehler/Pending direkt (Codify #49, analog AuslageForm).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { useActionState } from "react";
import { meldeErfolg } from "@/app/components/ui/meldung";
import { KassiereZeileForm } from "./KassiereZeileForm";

const useActionStateMock = vi.mocked(useActionState);
const meldeErfolgMock = vi.mocked(meldeErfolg);
const noopDispatch = vi.fn();
const noopAction = vi.fn(async () => ({ ok: true }) as VeranstaltungFormState);

// Der an useActionState übergebene Wrapper (Codify #49) – hier direkt ausgeführt.
function wrappedAction() {
  return useActionStateMock.mock.calls[0][0] as (
    prev: VeranstaltungFormState | undefined,
    fd: FormData,
  ) => Promise<VeranstaltungFormState>;
}

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

// Verzehr-Gesamt 5,50 € – Grundlage aller Spenden-Erwartungen unten.
const VERZEHR_CENTS = 550;

function renderForm(props: { initialErhalten?: string; autoFocusErhalten?: boolean } = {}) {
  render(
    <KassiereZeileForm
      action={noopAction}
      zeileId="z-1"
      initialErhalten={props.initialErhalten ?? ""}
      verzehrGesamtCents={VERZEHR_CENTS}
      autoFocusErhalten={props.autoFocusErhalten}
    />,
  );
}

function erhaltenFeld() {
  return screen.getByLabelText(/Erhalten/i);
}

function tippe(wert: string) {
  fireEvent.change(erhaltenFeld(), { target: { value: wert } });
}

function liveSpende() {
  return screen.getByTestId("spende-live");
}

beforeEach(() => {
  vi.resetAllMocks();
  withState(undefined);
});

describe("KassiereZeileForm", () => {
  it("should_prefillErhalten_when_initialGiven", () => {
    renderForm({ initialErhalten: "12,50" });

    expect(erhaltenFeld()).toHaveValue("12,50");
  });

  it("should_renderEmptyErhalten_when_notYetCollected", () => {
    renderForm();

    expect(erhaltenFeld()).toHaveValue("");
  });

  it("should_includeHiddenZeileId_when_rendered", () => {
    render(
      <KassiereZeileForm
        action={noopAction}
        zeileId="z-42"
        initialErhalten=""
        verzehrGesamtCents={VERZEHR_CENTS}
      />,
    );

    expect(screen.getByDisplayValue("z-42")).toHaveAttribute("name", "zeileId");
  });

  it("should_focusErhalten_when_autoFocusErhaltenSet", () => {
    // #308 AK3: nach personenbezogenem Wechsel lässt sich der Betrag ohne weiteren Tap eintippen.
    renderForm({ autoFocusErhalten: true });

    expect(erhaltenFeld()).toHaveFocus();
  });

  it("should_notFocusErhalten_when_autoFocusErhaltenOmitted", () => {
    // Ohne Personenbezug bleibt der Fokus, wo er ist – sonst würde jede Zeile ihn an sich ziehen.
    renderForm();

    expect(erhaltenFeld()).not.toHaveFocus();
  });

  it("should_disableButtonWithPendingText_when_pending", () => {
    withState(undefined, true);
    renderForm();

    expect(screen.getByRole("button", { name: /Speichern …/ })).toBeDisabled();
  });

  it("should_meetTouchSize_when_rendered", () => {
    // spec-371 AK11: Feld und „Kassieren" mindestens 44 × 44 px (min-h-11 = 2,75 rem = 44 px).
    renderForm();

    expect(erhaltenFeld()).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "Kassieren" })).toHaveClass("min-h-11");
  });

  describe("Spende live (spec-371 AK8/AK9/FS3, ADR-055 D1)", () => {
    it("should_showSpendeImmediately_when_amountTyped", () => {
      renderForm();

      tippe("7");

      expect(liveSpende()).toHaveTextContent("1,50 €");
      expect(noopDispatch).not.toHaveBeenCalled();
    });

    it("should_showSpendeFromPrefill_when_alreadyCollected", () => {
      renderForm({ initialErhalten: "7,00" });

      expect(liveSpende()).toHaveTextContent("1,50 €");
    });

    it("should_acceptCommaAndDotDecimals_when_typing", () => {
      renderForm();

      tippe("6,20");
      expect(liveSpende()).toHaveTextContent("0,70 €");

      tippe(" 6.30 ");
      expect(liveSpende()).toHaveTextContent("0,80 €");
    });

    it("should_showZeroSpende_when_amountBelowVerzehr", () => {
      renderForm();

      tippe("3");

      expect(liveSpende()).toHaveTextContent("0,00 €");
    });

    it("should_showZeroSpende_when_fieldEmpty", () => {
      renderForm({ initialErhalten: "9,00" });

      tippe("");

      expect(liveSpende()).toHaveTextContent("0,00 €");
    });

    it("should_showZeroSpendeWithoutError_when_amountUnreadable", () => {
      renderForm();

      for (const unlesbar of ["abc", "-5", "7,555", "7,"]) {
        tippe(unlesbar);
        expect(liveSpende()).toHaveTextContent("0,00 €");
      }
      // Abgelehnt wird nur serverseitig beim Absenden (FS3) – die Vorschau meldet keinen Fehler.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should_useTabularNums_when_showingSpende", () => {
      renderForm();

      expect(liveSpende()).toHaveClass("tabular-nums");
    });
  });

  // Seit spec-372 (AK12/AK17, ADR-058 D2) als Toast – der Inhalt aus spec-371 bleibt.
  describe("Rückmeldung (spec-371 AK12/AK13, ADR-055 D2)", () => {
    async function kassiereMit(ergebnis: VeranstaltungFormState) {
      noopAction.mockResolvedValue(ergebnis);
      renderForm();
      await wrappedAction()(undefined, new FormData());
    }

    it("should_reportAmountAndSpende_when_kassiertWithOverpayment", async () => {
      await kassiereMit({ ok: true, erhaltenCents: 700 });

      expect(meldeErfolgMock).toHaveBeenCalledWith("7,00 € erhalten, davon 1,50 € Spende");
    });

    it("should_reportAmountOnly_when_kassiertWithoutSpende", async () => {
      await kassiereMit({ ok: true, erhaltenCents: 550 });

      expect(meldeErfolgMock).toHaveBeenCalledWith("5,50 € erhalten");
    });

    it("should_reportBetragEntfernt_when_amountCleared", async () => {
      await kassiereMit({ ok: true, erhaltenCents: null });

      expect(meldeErfolgMock).toHaveBeenCalledWith("Betrag entfernt");
    });

    it("should_notReport_when_rejected", async () => {
      await kassiereMit({ error: "Betrag ist zu hoch." });

      expect(meldeErfolgMock).not.toHaveBeenCalled();
    });

    it("should_notShowInlineSuccessMessage_when_kassiert", () => {
      // AK17: keine zweite Meldung neben dem Toast.
      withState({ ok: true, erhaltenCents: 550 });
      renderForm({ initialErhalten: "5,50" });

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByText(/erhalten$/)).not.toBeInTheDocument();
    });

    it("should_showServerErrorAsAlert_when_rejected", () => {
      withState({
        error: "Bitte einen gültigen Betrag mit höchstens 2 Nachkommastellen eingeben.",
      });
      renderForm();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Bitte einen gültigen Betrag mit höchstens 2 Nachkommastellen eingeben.",
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("should_showNoNotice_when_notYetSubmitted", () => {
      renderForm();

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
