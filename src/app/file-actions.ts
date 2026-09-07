"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCtx } from "@/server/auth/session";
import {
  registerAttachment,
  deleteAttachment,
  type RegisterAttachmentInput,
} from "@/server/services/attachments";
import { NotAuthorised } from "@/types";

/**
 * File actions shared by every surface (manager dashboard, employee portal, Mini App). The
 * session cookie is the same everywhere, so getCurrentCtx resolves the actor for all of them.
 */

/** Persist a just-uploaded blob as an attachment. Returns ok:false on any auth/validation error. */
export async function registerAttachmentAction(
  input: RegisterAttachmentInput,
): Promise<{ ok: boolean }> {
  const ctx = await getCurrentCtx();
  if (!ctx) return { ok: false };
  try {
    await registerAttachment(ctx, input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof NotAuthorised) return { ok: false };
    throw err;
  }
}

export async function deleteAttachmentAction(formData: FormData): Promise<void> {
  const ctx = await getCurrentCtx();
  if (!ctx) return;
  const id = String(formData.get("attachmentId") || "");
  if (!id) return;
  await deleteAttachment(ctx, id);
  revalidatePath("/", "layout");
}
