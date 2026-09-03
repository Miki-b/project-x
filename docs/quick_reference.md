# Quick reference

Short form of `product.md` and `architecture.md`. Read this first. Open the full documents when you need detail or rationale.

---

## What it is

A simple task and daily-work manager for Ethiopian companies (5–50 people).
**Employees use Telegram only. Managers use the web dashboard only.**

Notion fails here because it is a blank canvas — companies must design a system before using one. We ship one opinionated system, already set up.

## Core loop

Assign (dashboard) → deliver (Telegram) → employee taps Started/Done/Blocked with optional photo proof → bot nudges → manager gets an end-of-day summary.

## Stack

TypeScript · Next.js (App Router) · grammY · Prisma 7 (driver adapters, `@prisma/adapter-pg`) · PostgreSQL on Neon · `jobs` table + polling worker · Anthropic API · Tailwind · VPS + Coolify

## Hard rules

1. `orgId` on every application table, from the first migration.
2. Feature code calls `orgDb(session.orgId)`, never `basePrisma`. `$queryRaw` bypasses the scoping — filter by hand.
3. `task_updates` is append-only. No update, no delete.
4. Store UTC; display `Africa/Addis_Ababa`. Store Gregorian; display Ethiopian calendar.
5. Every outbound side effect (Telegram send, AI call) is enqueued as a job, never sent inline.
6. AI returns drafts. A human confirms. AI never writes to the database.
7. Bot and dashboard both call the same service layer. No business logic in handlers or components.
8. Users are disabled, never deleted.
9. All user-facing strings go through i18n keys, even before Amharic ships.
10. Never edit an applied migration. Never `db push` after the first migration.

## Data model

Eight tables. All except `organizations` carry `orgId`.

| Table | Purpose | Key fields |
|---|---|---|
| `organizations` | Tenant root | name, timezone, locale, plan |
| `users` | Employees + managers | orgId, name, telegramUserId, telegramChatId, role, status, email, passwordHash, lastLoginAt |
| `invites` | Join links | orgId, token, role, expiresAt, usedById |
| `tasks` | Core object | orgId, title, assigneeId, createdById, dueAt, status, source, templateId, completedAt |
| `task_updates` | Append-only history | orgId, taskId, actorId, type, from/toStatus, note, telegramFileId |
| `recurring_templates` | Repeat rules | orgId, title, assigneeId, rule, timeOfDay, active, lastGeneratedOn |
| `jobs` | Side-effect queue | orgId, type, payload, runAt, status, attempts, lockedAt, dedupeKey |
| `sessions` | Manager web sessions | id (=SHA-256 of cookie token), orgId, userId, expiresAt |

### Enums

```
Role        OWNER | MANAGER | MEMBER
UserStatus  INVITED | ACTIVE | DISABLED
TaskStatus  PENDING | IN_PROGRESS | DONE | BLOCKED | CANCELLED
TaskSource  MANUAL | AI_TEXT | AI_VOICE | RECURRING
UpdateType  ASSIGNMENT | STATUS_CHANGE | COMMENT | PROOF | REMINDER_SENT
JobType     TASK_REMINDER | END_OF_DAY_NUDGE | DAILY_SUMMARY | RECURRING_GENERATE | AI_PARSE
JobStatus   PENDING | RUNNING | DONE | FAILED | CANCELLED
```

### Constraints worth remembering

- `users`: unique `[orgId, telegramUserId]` and `[orgId, phone]` — **per-org, not global**, so one person can serve two companies later. But `users.email` is **globally unique** (manager login has no org context).
- `sessions.id` is the **SHA-256 hash of the cookie token** (raw token only in the httpOnly cookie); sessions cascade from both org and user.
- `tasks.assigneeId` and `tasks.createdById` are `Restrict` — history cannot be orphaned.
- `task_updates`, `tasks`, `jobs`, `invites`, `templates` all cascade from `organizations`.
- `jobs.dedupeKey` is unique — prevents duplicate reminders.
- `recurring_templates.lastGeneratedOn` is the recurrence idempotency guard.

### Indexes

```
users               [orgId, status], [telegramUserId]
tasks               [orgId, assigneeId, status], [orgId, status, dueAt], [orgId, dueAt], [templateId, createdAt]
task_updates        [taskId, createdAt], [orgId, createdAt]
recurring_templates [orgId, active]
jobs                [status, runAt], [orgId, type, status]
```

## Task state machine

```
PENDING → IN_PROGRESS → DONE
   ↓          ↓
 BLOCKED ←────┘        CANCELLED (manager only)
```

- `BLOCKED` requires a reason note, enforced in the service.
- `DONE` sets `completedAt`; reopening clears it.
- Status change writes `tasks` + `task_updates` + enqueues notifications in **one transaction**.
- Members may only move their own tasks.

## Layering

```
app/ + telegram/  →  server/services/  →  server/db/, server/ai/, server/jobs/
```

Services never import from `app` or `telegram`. Only `server/ai/**` imports the AI SDK (client in `server/ai/client.ts`). Only `server/db` constructs a Prisma client. Services take `Ctx = { orgId, actorId, role, locale }` and know nothing about HTTP or grammY.

## Job runner

Polls every 30s. Claims with `FOR UPDATE SKIP LOCKED` (safe for multiple workers). Exponential backoff, `maxRetries` 5, stale `RUNNING` locks older than 5 minutes are reclaimed. Daily sweeps run in each org's timezone.

## Bot surface

`/start <token>` · `/today` · `/mytasks` · `/language` · `/help`
Task messages carry inline buttons: Started · Done · Blocked.
Handlers are thin. Callbacks are idempotent and org-verified. Edit the existing message on status change instead of sending a new one.

## AI surface

```ts
parseTasksFromText(input, ctx): Promise<TaskDraft[]>
parseTasksFromVoice(fileId, ctx): Promise<TaskDraft[]>
writeDailySummary(data, ctx): Promise<string>
```

JSON-only prompts, Zod-validated. The model returns assignee **names**; our code resolves them to users. Relative dates resolve in org timezone with today's date passed in. If AI is down, everything core still works.

## v1 scope

**In:** signup, one invite link, create/assign tasks, AI text and voice to tasks, recurring tasks, board with filters, task history with proof, team management, daily summary, Amharic/English in the bot.

**Out:** projects, gantt, file storage, custom fields, time tracking, integrations, native app, employee web login, subtasks, dependencies, comment threads, permission levels beyond owner/manager/member.

Requested out-of-scope features are recorded as feedback. Nothing is built until three separate companies ask for the same thing.

## Gotchas

- `BigInt` breaks `JSON.stringify` — convert Telegram IDs to strings at every boundary.
- Prisma cannot migrate through Neon's pooler — `DIRECT_URL` (set in `prisma.config.ts`) is required. App runtime uses `@prisma/adapter-pg` against the pooled `DATABASE_URL`.
- Prisma 7 generates the client to `src/generated/prisma` (git-ignored, regenerated on install); import from `@/generated/prisma/client`.
- Vercel hobby cron fires once daily, so the worker needs its own host.
- Media is stored as Telegram `file_id`, not on our infrastructure.
- Never trust `orgId` from a request body or parameter. Session only.

## Success metric that matters

**Week-2 team retention:** the share of onboarded companies where at least half the employees changed a task status in week two. Signups and total task counts are vanity.

## Scale posture

2,000 users and ~20k tasks/month runs on one Postgres instance for years. Scalable here means clean boundaries and no cross-tenant leaks. No microservices, no Kafka, no Redis until measurements demand them.
