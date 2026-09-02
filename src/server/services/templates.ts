import type { RecurringTemplate } from "@prisma/client";
import type { Ctx } from "@/types";

/**
 * Recurring-template service (docs/architecture.md §4.7). Materialisation into tasks
 * happens in the RECURRING_GENERATE job, guarded by `lastGeneratedOn`.
 */

export type TemplateInput = {
  title: string;
  description: string;
  assigneeId: string;
  rule: string; // RRULE-like subset (see schema)
  timeOfDay?: string; // HH:mm in org timezone
};

export async function createTemplate(
  _ctx: Ctx,
  _input: TemplateInput,
): Promise<RecurringTemplate> {
  throw new Error("not implemented");
}

export async function listActiveTemplates(_ctx: Ctx): Promise<RecurringTemplate[]> {
  throw new Error("not implemented");
}

export async function setTemplateActive(
  _ctx: Ctx,
  _templateId: string,
  _active: boolean,
): Promise<RecurringTemplate> {
  throw new Error("not implemented");
}
