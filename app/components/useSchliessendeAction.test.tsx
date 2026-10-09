import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/app/components/ui/meldung", () => ({ meldeErfolg: vi.fn() }));

import { meldeErfolg } from "@/app/components/ui/meldung";
import {
  useSchliessendeAction,
  type AktionsOptionen,
  type FormAction,
} from "./useSchliessendeAction";

type State = { ok?: boolean; error?: string; betrag?: number };

const meldeErfolgMock = vi.mocked(meldeErfolg);

function Formular({
  action,
  optionen,
}: {
  action: FormAction<State>;
  optionen?: AktionsOptionen<State>;
}) {
  const [state, formAction] = useSchliessendeAction(action, optionen);
  return (
    <form action={formAction}>
      <button type="submit">Absenden</button>
      {state?.error && <p role="alert">{state.error}</p>}
    </form>
  );
}

async function absenden() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Absenden" }));
  });
}

beforeEach(() => vi.resetAllMocks());

describe("useSchliessendeAction – Erfolgsmeldung (spec-372 AK12/AK16, ADR-058 D2)", () => {
  it("should_reportFixedText_when_actionSucceeds", async () => {
    render(
      <Formular action={async () => ({ ok: true })} optionen={{ erfolgsMeldung: "Gespeichert" }} />,
    );

    await absenden();

    expect(meldeErfolgMock).toHaveBeenCalledTimes(1);
    expect(meldeErfolgMock).toHaveBeenCalledWith("Gespeichert");
  });

  it("should_reportTextFromResult_when_meldungIsFunction", async () => {
    // Kassieren nennt Betrag und Spende aus dem Ergebnis der Action (AK17).
    render(
      <Formular
        action={async () => ({ ok: true, betrag: 1250 })}
        optionen={{ erfolgsMeldung: (ergebnis) => `Kassiert: ${ergebnis.betrag}` }}
      />,
    );

    await absenden();

    expect(meldeErfolgMock).toHaveBeenCalledWith("Kassiert: 1250");
  });

  it("should_notReport_when_actionRejects", async () => {
    // AK16: eine Ablehnung bleibt am Ort, kein Erfolgs-Toast.
    const onErfolg = vi.fn();
    render(
      <Formular
        action={async () => ({ error: "Auslage nicht gefunden." })}
        optionen={{ erfolgsMeldung: "Auslage gelöscht", onErfolg }}
      />,
    );

    await absenden();

    expect(meldeErfolgMock).not.toHaveBeenCalled();
    expect(onErfolg).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Auslage nicht gefunden.");
  });

  it("should_callOnErfolgWithoutReporting_when_noMeldungGiven", async () => {
    const onErfolg = vi.fn();
    render(<Formular action={async () => ({ ok: true })} optionen={{ onErfolg }} />);

    await absenden();

    expect(onErfolg).toHaveBeenCalledTimes(1);
    expect(meldeErfolgMock).not.toHaveBeenCalled();
  });

  it("should_reportLaufEnde_when_actionFinished", async () => {
    const onLaeuftChange = vi.fn();
    render(<Formular action={async () => ({ error: "x" })} optionen={{ onLaeuftChange }} />);

    await absenden();

    expect(onLaeuftChange).toHaveBeenCalledWith(false);
  });
});
