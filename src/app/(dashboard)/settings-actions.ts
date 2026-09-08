"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentCtx } from "@/server/auth/session";
import { updateBranding, setLogo, removeLogo } from "@/server/services/branding";
import { t } from "@/lib/i18n";
import type { SettingsState } from "./types";

// Manager-only org branding actions. The service re-checks the role.

const BrandingSchema = z.object({
  primaryLight: z.string().optional(),
  primaryDark: z.string().optional(),
  font: z.string().optional(),
});

export async function updateBrandingAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await getCurrentCtx();
  if (!ctx) return { error: t("en", "auth.invalid") };

  const parsed = BrandingSchema.safeParse({
    primaryLight: formData.get("primaryLight") || undefined,
    primaryDark: formData.get("primaryDark") || undefined,
    font: formData.get("font") || undefined,
  });
  if (!parsed.success) return { error: t(ctx.locale, "settings.error") };

  try {
    await updateBranding(ctx, parsed.data);
  } catch {
    return { error: t(ctx.locale, "settings.error") };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setLogoAction(input: {
  url: string;
  pathname: string;
}): Promise<{ ok: boolean }> {
  const ctx = await getCurrentCtx();
  if (!ctx) return { ok: false };
  try {
    await setLogo(ctx, input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function removeLogoAction(): Promise<void> {
  const ctx = await getCurrentCtx();
  if (!ctx) return;
  await removeLogo(ctx);
  revalidatePath("/", "layout");
}
