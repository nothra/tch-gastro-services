"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          TCH Gastro – Anmelden
        </h1>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="E-Mail"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Passwort"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Anmelden …" : "Anmelden"}
        </button>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      </form>
    </main>
  );
}
