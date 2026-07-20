import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 22+ stellt ein experimentelles `localStorage`-Global bereit, das den jsdom-Storage
// verdeckt und ohne `--localstorage-file` beim Zugriff `undefined` liefert (statt eines
// Storage-Objekts). Für Storage-basierte Component-Tests (F7 IdentityGate, #54) reicht ein
// deterministischer In-Memory-Storage; er wird nur gesetzt, wenn kein funktionierender
// `localStorage` vorhanden ist, damit ein echter jsdom-Storage nicht überschrieben wird.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  };
}

if (typeof window !== "undefined" && !window.localStorage) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
}

// Ohne `globals: true` registriert Testing Library sein Auto-Cleanup nicht selbst →
// DOM würde zwischen Tests leaken. Manuell aufräumen hält Tests isoliert.
afterEach(() => cleanup());
