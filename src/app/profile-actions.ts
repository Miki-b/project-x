"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentCtx } from "@/server/auth/session";
import { updateProfile, setOwnAvatar, removeOwnAvatar } from "@/server/services/users";
import { NotAuthorised } from "@/types";
import { t } from "@/lib/i18n";

/**
 * Profile self-service actions, shared by the manager dashboard and the employee portal (same
 * session cookie). Each resolves the actor from the session and edits only their own row.
 */

export type ProfileState = { error?: string; ok?: boolean };

const ProfileSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
});

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const ctx = await getCurrentCtx();
  if (!ctx) return { error: t("en", "auth.invalid") };

  const parsed = ProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: t(ctx.locale, "profile.error_name") };

  try {
    await updateProfile(ctx, parsed.data);
  } catch {
    return { error: t(ctx.locale, "profile.error_name") };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAvatarAction(input: {
  url: string;
  pathname: string;
}): Promise<{ ok: boolean }> {
  const ctx = await getCurrentCtx();
  if (!ctx) return { ok: false };
  try {
    await setOwnAvatar(ctx, input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof NotAuthorised) return { ok: false };
    throw err;
  }
}

export async function removeAvatarAction(): Promise<void> {
  const ctx = await getCurrentCtx();
  if (!ctx) return;
  await removeOwnAvatar(ctx);
  revalidatePath("/", "layout");
}
