"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { login } from "@/server/services/auth";
import { createTask } from "@/server/services/tasks";
import { sendTaskCardToAssignee } from "@/server/telegram/deliver";
import { setSessionCookie, signOut, getCurrentCtx } from "@/server/auth/session";
import { NotAuthorised } from "@/types";
import { logger } from "@/lib/logger";
import { t } from "@/lib/i18n";
import type { LoginState, TaskFormState } from "./types";

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

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().min(1),
  dueAt: z.string().optional(),
});

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const ctx = await getCurrentCtx();
  if (!ctx) return { error: t("en", "auth.invalid") };

  const parsed = CreateTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    assigneeId: formData.get("assigneeId"),
    dueAt: formData.get("dueAt") || undefined,
  });
  if (!parsed.success) return { error: t(ctx.locale, "dashboard.task_error_required") };

  const { title, description, assigneeId, dueAt } = parsed.data;

  let taskId: string;
  try {
    const task = await createTask(ctx, {
      title,
      description,
      assigneeId,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    });
    taskId = task.id;
  } catch (err) {
    if (err instanceof NotAuthorised) return { error: t(ctx.locale, "dashboard.task_error_required") };
    throw err;
  }

  // Deliver the assignee's Telegram card inline (there is no always-on worker). Best-effort:
  // a delivery failure must not fail task creation — the task is created and shows on the
  // board regardless, and the failure is logged for follow-up.
  try {
    await sendTaskCardToAssignee(ctx.orgId, taskId, true);
  } catch (err) {
    logger.error("inline task card delivery failed", {
      taskId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  redirect("/");
}
