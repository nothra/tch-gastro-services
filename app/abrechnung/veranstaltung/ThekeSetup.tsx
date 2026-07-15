"use client";

import { useActionState } from "react";
import { KASSEN } from "@/db/schema";
import { ensureThekeAction } from "./actions";
import { KASSE_LABEL } from "./labels";

const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

// Richtet die stehende Theken-Selbstbedienung je Kasse ein (ADR-023 D3). Idempotent: ein
// erneutes Einrichten derselben Kasse legt nicht doppelt an, sondern meldet Erfolg.
export function ThekeSetup() {
  const [state, formAction, pending] = useActionState(ensureThekeAction, undefined);
  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-semibold">Stehende Theke einrichten</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Je Kasse genau eine dauerhaft offene Theke – ein erneutes Einrichten legt nicht doppelt an.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Kasse
          <select name="kasse" defaultValue={KASSEN[0]} className={inputClass}>
            {KASSEN.map((kasse) => (
              <option key={kasse} value={kasse}>
                {KASSE_LABEL[kasse]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          {pending ? "Einrichten …" : "Einrichten"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">Theke eingerichtet.</p>}
      </div>
    </form>
  );
}
