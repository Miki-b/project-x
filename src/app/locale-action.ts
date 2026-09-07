"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCtx } from "@/server/auth/session";
import { setOwnLocale } from "@/server/services/users";
import type { Locale } from "@/types";

/**
 * Set the signed-in user's preferred language. Shared by the manager dashboard and the employee
 * portal (both carry the same session cookie). The choice is stored on the user, so it also
 * flows to their Mini App and bot messages. Revalidate the whole tree so the new language shows.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
  const ctx = await getCurrentCtx();
  if (!ctx) return;
  await setOwnLocale(ctx, locale === "am" ? "am" : "en");
  revalidatePath("/", "layout");
}
