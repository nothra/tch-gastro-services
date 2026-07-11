import { describe, it, expect, vi, beforeEach } from "vitest";
import { signOut } from "@/auth";
import { signOutAction } from "./session";

// signOut ist die einzige externe Abhängigkeit der Action → gemockt.
vi.mock("@/auth", () => ({ signOut: vi.fn() }));

describe("signOutAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_signOutAndRedirectToLogin_when_called", async () => {
    await signOutAction();
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});
