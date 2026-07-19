import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VeranstaltungZeile } from "@/db/schema";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ removeZeileAction: vi.fn() }));

import { ZeileRow } from "./ZeileRow";

const aZeile: VeranstaltungZeile = {
  id: "z-1",
  veranstaltungId: "v-1",
  teilnehmerId: "t-1",
  anzeigename: "Erika Mustermann",
  erhaltenCents: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("ZeileRow", () => {
  it("should_showAnzeigename_when_rendered", () => {
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable={false} />);

    expect(screen.getByText("Erika Mustermann")).toBeInTheDocument();
  });

  it("should_showEntfernenButton_when_editable", () => {
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable={true} />);

    expect(screen.getByRole("button", { name: "Entfernen" })).toBeInTheDocument();
  });

  it("should_notShowEntfernenButton_when_notEditable", () => {
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable={false} />);

    expect(screen.queryByRole("button", { name: "Entfernen" })).not.toBeInTheDocument();
  });

  it("should_includeHiddenIds_when_editable", () => {
    render(<ZeileRow zeile={aZeile} veranstaltungId="v-1" editable={true} />);

    expect(screen.getByDisplayValue("v-1")).toHaveAttribute("name", "veranstaltungId");
    expect(screen.getByDisplayValue("z-1")).toHaveAttribute("name", "zeileId");
  });
});
