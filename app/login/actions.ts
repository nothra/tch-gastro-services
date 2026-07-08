"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

// Server-Action für das Login-Formular. Bei Erfolg wirft signIn einen Redirect
// (muss durchgereicht werden); bei falschen Daten kommt eine AuthError zurück.
export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Ungültige E-Mail oder Passwort.";
    }
    throw error;
  }
}
