"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@/generated/prisma/client";
import { getMiniAppCtx } from "@/server/auth/session";
import { changeStatus, attachProof } from "@/server/services/tasks";
import { NotAuthorised } from "@/types";

// Mini App actions. Each resolves the MEMBER Ctx from the session (role forced to MEMBER),
// calls the service (which enforces authorisation), and revalidates the affected pages.

async function requireCtx() {
  const ctx = await getMiniAppCtx();
  if (!ctx) throw new NotAuthorised();
  return ctx;
}

export async function changeStatusAction(taskId: string, to: TaskStatus): Promise<void> {
  const ctx = await requireCtx();
  await changeStatus(ctx, taskId, to);
  revalidatePath(`/miniapp/tasks/${taskId}`);
  revalidatePath("/miniapp");
}

export async function blockAction(taskId: string, reason: string): Promise<void> {
  const ctx = await requireCtx();
  await changeStatus(ctx, taskId, "BLOCKED", reason);
  revalidatePath(`/miniapp/tasks/${taskId}`);
  revalidatePath("/miniapp");
}

export async function attachNoteAction(taskId: string, note: string): Promise<void> {
  const ctx = await requireCtx();
  await attachProof(ctx, taskId, { note });
  revalidatePath(`/miniapp/tasks/${taskId}`);
}
