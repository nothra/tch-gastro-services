"use client";

// Error-Boundary der öffentlichen Theken-Route (#331). Fängt zwei Fehlerklassen, die sonst bis in
// Next' Default-`GlobalError` durchlaufen und die komplette Ansicht hinter „Application error: a
// client-side exception has occurred" verschwinden lassen: eine Proxy-Antwort außerhalb des
// Server-Action-Protokolls (429-Klartext bei erschöpftem Schreib-Budget, ADR-048 D5) und einen
// Netz-/Offline-Fehler während einer Action (FS-1) – `useThenable` wirft in beiden Fällen während
// des Renderns weiter. Fester, eigener Text: weder `error.message` noch `error.digest` erscheinen
// (AK-3, Auftraggeber-Entscheidung) – keine 429-Spezifika, da dieselbe Fläche auch den
// Offline-Fall trägt (FS-1).
export default function ThekeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Da ist etwas schiefgelaufen
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Bitte versuche es gleich noch einmal.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
      >
        Erneut versuchen
      </button>
    </main>
  );
}
