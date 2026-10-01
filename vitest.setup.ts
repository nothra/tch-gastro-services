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

// jsdom kennt `<dialog>`, implementiert aber weder `showModal()` noch `close()` (ADR-053 D1).
// Der Stub bildet nur das für die Bausteine relevante Verhalten nach: `open` setzen bzw.
// entfernen und beim Schließen – wie der Browser – das `close`-Event feuern. Escape lösen Tests
// über ein `cancel`-Event aus, das der Browser vor dem Schließen sendet.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// Ohne `globals: true` registriert Testing Library sein Auto-Cleanup nicht selbst →
// DOM würde zwischen Tests leaken. Manuell aufräumen hält Tests isoliert.
afterEach(() => cleanup());
