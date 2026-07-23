import { vi } from "vitest";

// requestAnimationFrame wird capture-only gestubbt (jsdom-Default liefe erst nach ~16ms Timer):
// so lässt sich in Tests prüfen, dass ein Layout-abhängiger Effekt ERST im rAF-Callback läuft,
// nicht synchron beim State-Wechsel (Codify #188). Geteilt zwischen FokusListe.test.tsx und
// IdentityGate.test.tsx, die zuvor denselben Stub unabhängig pflegten (Review-Finding #194).
export function stubRequestAnimationFrame() {
  let callbacks: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  return {
    flush() {
      const pending = callbacks;
      callbacks = [];
      pending.forEach((callback) => callback(0));
    },
    pendingCount() {
      return callbacks.length;
    },
  };
}
