import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("zeigt den Projekttitel als Überschrift", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /TCH Gastro Services/i })).toBeInTheDocument();
  });
});
