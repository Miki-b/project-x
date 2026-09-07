import { del } from "@vercel/blob";
import type { Attachment, Prisma } from "@/generated/prisma/client";
import type { Ctx } from "@/types";
import { NotAuthorised } from "@/types";
import { orgDb } from "@/server/db/client";

/**
 * Attachment service (docs/architecture.md §4.12). Files live in Vercel Blob; we store only the
 * URL + metadata. Authorisation rules:
 *   - Project files: uploaded by managers; viewable by managers and project members.
 *   - Task files:    uploaded by the assignee or a manager; viewable by both.
 *   - Delete:        the uploader or any manager.
 * The upload itself is authorised in /api/upload before a token is minted; registerAttachment
 * re-checks here (never trust the client) and only accepts URLs from our own blob store.
 */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

// Accept only our Vercel Blob host (private stores omit the `.public.` segment).
const BLOB_URL_RE = /^https:\/\/[a-z0-9-]+\.(public\.)?blob\.vercel-storage\.com\//;

export type UploadTarget = { kind: "project" | "task"; id: string };

export type AttachmentWithUploader = Prisma.AttachmentGetPayload<{
  include: { uploadedBy: { select: { name: true } } };
}>;

function isManager(ctx: Ctx): boolean {
  return ctx.role === "OWNER" || ctx.role === "MANAGER";
}

/** Throw unless the actor may UPLOAD to this target (and it exists in their org). */
export async function assertCanUpload(ctx: Ctx, target: UploadTarget): Promise<void> {
  const db = orgDb(ctx.orgId);
  if (target.kind === "project") {
    const project = await db.project.findFirst({ where: { id: target.id } });
    if (!project) throw new NotAuthorised();
    if (!isManager(ctx)) throw new NotAuthorised(); // only managers add project files
    return;
  }
  const task = await db.task.findFirst({ where: { id: target.id } });
  if (!task) throw new NotAuthorised();
  if (!isManager(ctx) && task.assigneeId !== ctx.actorId) throw new NotAuthorised();
}

/** Throw unless the actor may VIEW this target's files. */
async function assertCanView(ctx: Ctx, target: UploadTarget): Promise<void> {
  const db = orgDb(ctx.orgId);
  if (target.kind === "project") {
    if (isManager(ctx)) return;
    const membership = await db.projectMember.findFirst({
      where: { projectId: target.id, userId: ctx.actorId },
    });
    if (!membership) throw new NotAuthorised();
    return;
  }
  const task = await db.task.findFirst({ where: { id: target.id } });
  if (!task) throw new NotAuthorised();
  if (!isManager(ctx) && task.assigneeId !== ctx.actorId) throw new NotAuthorised();
}

export type RegisterAttachmentInput = UploadTarget & {
  url: string;
  pathname: string;
  name: string;
  contentType: string;
  size: number;
};

/** Persist an uploaded blob as an attachment after re-checking every constraint. */
export async function registerAttachment(
  ctx: Ctx,
  input: RegisterAttachmentInput,
): Promise<Attachment> {
  await assertCanUpload(ctx, { kind: input.kind, id: input.id });
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > MAX_ATTACHMENT_BYTES) {
    throw new NotAuthorised("File too large");
  }
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
    throw new NotAuthorised("File type not allowed");
  }
  if (!BLOB_URL_RE.test(input.url)) throw new NotAuthorised("Invalid file URL");

  return orgDb(ctx.orgId).attachment.create({
    data: {
      orgId: ctx.orgId,
      projectId: input.kind === "project" ? input.id : null,
      taskId: input.kind === "task" ? input.id : null,
      uploadedById: ctx.actorId,
      url: input.url,
      pathname: input.pathname,
      name: input.name.trim().slice(0, 200) || "file",
      contentType: input.contentType,
      size: input.size,
    },
  });
}

export async function listProjectAttachments(
  ctx: Ctx,
  projectId: string,
): Promise<AttachmentWithUploader[]> {
  await assertCanView(ctx, { kind: "project", id: projectId });
  return orgDb(ctx.orgId).attachment.findMany({
    where: { projectId },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listTaskAttachments(
  ctx: Ctx,
  taskId: string,
): Promise<AttachmentWithUploader[]> {
  await assertCanView(ctx, { kind: "task", id: taskId });
  return orgDb(ctx.orgId).attachment.findMany({
    where: { taskId },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Load an attachment the actor is allowed to view, or null. Used by the authenticated file
 * proxy (/api/files/[id]) — the blob store is private, so bytes are only ever served after
 * this check passes.
 */
export async function getViewableAttachment(
  ctx: Ctx,
  attachmentId: string,
): Promise<Attachment | null> {
  const att = await orgDb(ctx.orgId).attachment.findFirst({ where: { id: attachmentId } });
  if (!att) return null;
  try {
    if (att.projectId) await assertCanView(ctx, { kind: "project", id: att.projectId });
    else if (att.taskId) await assertCanView(ctx, { kind: "task", id: att.taskId });
    else return null;
  } catch {
    return null;
  }
  return att;
}

/** Delete an attachment (uploader or manager). Removes the blob best-effort, then the row. */
export async function deleteAttachment(ctx: Ctx, attachmentId: string): Promise<void> {
  const db = orgDb(ctx.orgId);
  const att = await db.attachment.findFirst({ where: { id: attachmentId } });
  if (!att) throw new NotAuthorised();
  if (!isManager(ctx) && att.uploadedById !== ctx.actorId) throw new NotAuthorised();
  // Best-effort object removal; the row is deleted regardless so the UI never dangles.
  try {
    await del(att.url);
  } catch {
    /* ignore blob errors — the DB row is the source of truth for the UI */
  }
  await db.attachment.delete({ where: { id: att.id } });
}
