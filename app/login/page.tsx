"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <form action={formAction} className="flex flex-col gap-4">
          <h1>TCH Gastro – Anmelden</h1>
          <Field
            label="E-Mail"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="E-Mail"
          />
          <Field
            label="Passwort"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Passwort"
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Anmelden …" : "Anmelden"}
          </Button>
          <Notice kind="fehler">{errorMessage}</Notice>
        </form>
      </Card>
    </main>
  );
}
