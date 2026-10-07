import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Leerzustand } from "./Leerzustand";

describe("Leerzustand", () => {
  it("should_showTextAndAction_when_rendered", () => {
    render(<Leerzustand text="Noch keine Teilnehmer erfasst." aktion={<button>Anlegen</button>} />);

    expect(screen.getByText("Noch keine Teilnehmer erfasst.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toBeInTheDocument();
  });
});
