"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/server/services/auth";
import { setSessionCookie, signOut } from "@/server/auth/session";
import { NotAuthorised } from "@/types";
import { t } from "@/lib/i18n";
import type { LoginState } from "./types";

// Minimal manager login so the dashboard is reachable (docs/architecture.md §11).
// The session mechanism (auth service + cookie adapter) already exists; this only wires it.

const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: t("en", "auth.invalid") };

  try {
    const { token, session } = await login(parsed.data.email, parsed.data.password);
    await setSessionCookie(token, session.expiresAt);
  } catch (error) {
    if (error instanceof NotAuthorised) return { error: t("en", "auth.invalid") };
    throw error;
  }
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
