import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ohne `globals: true` registriert Testing Library sein Auto-Cleanup nicht selbst →
// DOM würde zwischen Tests leaken. Manuell aufräumen hält Tests isoliert.
afterEach(() => cleanup());
