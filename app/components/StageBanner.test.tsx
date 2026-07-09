import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageBanner } from "./StageBanner";

// Ohne NEXT_PUBLIC_STAGE fällt die Stage auf "dev" → Banner muss sichtbar sein.
describe("StageBanner", () => {
  it("zeigt in DEV ein Nicht-Produktions-Banner", () => {
    render(<StageBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/DEV/i);
    expect(banner).toHaveTextContent(/keine Produktionsumgebung/i);
  });
});
