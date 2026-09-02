# Architecture

Technical reference for the product described in `product.md`. This document is authoritative for schema, layering, and conventions. If code and this document disagree, one of them is a bug.

---

## 1. Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript (strict) | One language across bot and web; shared types and business logic |
| Web + API | Next.js (App Router) | Dashboard and API in one deployable |
| Telegram bot | grammY | Best-in-class Telegram framework, first-class TS types |
| Database | PostgreSQL on Neon | Free to start, serverless, branch-per-environment |
| ORM | Prisma 7 (driver adapters) | Migration tooling, type generation, client extensions for tenant scoping. No Rust engine — runs through `@prisma/adapter-pg` (see §13) |
| Jobs | `jobs` table + polling worker | No Redis, no extra infrastructure, survives restarts |
| Auth | Session cookie (Auth.js or Lucia) | Manager-only; employees never authenticate |
| AI | Anthropic API | Task parsing, transcription handoff, summary writing |
| Styling | Tailwind | Speed |
| Deploy | Single VPS with Coolify, or Vercel + separate worker host | See §13 |

**Rejected on purpose:** microservices, Kafka, Redis, GraphQL, event sourcing frameworks, a native mobile app, a separate backend repo. At the target scale (see §14) they add cost and no capability.

## 2. System shape

```
Employees (Telegram)          Managers (Web dashboard)
        │                              │
        ▼                              ▼
  Bot handlers                    API routes
  (grammY webhook)             (Next.js server)
        │                              │
        └──────────────┬───────────────┘
                       ▼
              Core service layer
        (all business logic, org-scoped)
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
   Postgres        AI module       Job runner
  (7 tables)    (parse, summarise)  (reminders, summaries)
                                          │
                       └──────────────────┘
                    jobs send back out via Telegram
```

**The load-bearing rule:** both the bot and the dashboard call the same service functions. No business logic lives inside a Telegram handler or a React component. Adding a mobile app, a WhatsApp bot, or a customer API later means writing a new adapter, not a new product.

## 3. Repository layout

```
/prisma
  schema.prisma
  migrations/              committed, never edited after apply
  seed.ts
/src
  /app                     Next.js routes (dashboard + API)
    /(dashboard)
    /api
      /telegram/route.ts   webhook entry point
  /server
    /services              CORE. All business logic lives here.
      tasks.ts
      users.ts
      invites.ts
      templates.ts
      summaries.ts
    /db
      client.ts            basePrisma + orgDb() extension
      repositories/        thin query helpers, org-scoped
    /jobs
      runner.ts            poll loop
      handlers/            one file per JobType
      enqueue.ts
    /ai
      index.ts             public surface — re-exports the typed functions
      client.ts            constructs the Anthropic client (SDK import lives here)
      parseTasks.ts
      transcribe.ts
      summarise.ts
      prompts/
    /telegram
      bot.ts               grammY instance
      handlers/            commands and callbacks — thin
      keyboards.ts
      messages/            i18n message builders
  /lib
    time.ts                UTC ↔ Africa/Addis_Ababa
    ethiopian-calendar.ts  display conversion only
    i18n/
      en.json
      am.json
  /types
/worker
  index.ts                 job runner process entry (poll loop only)
```

The **worker** process runs the job runner poll loop only. The Telegram bot runs as a **webhook in production** (the `/api/telegram` route inside the `web` process) and via **long polling in development** (`npm run bot:dev`); it is not part of the worker.

**Dependency direction:** `app` and `telegram` may import from `server/services`. `server/services` must never import from `app` or `telegram`. Nothing outside `server/ai/**` imports the AI SDK. Nothing outside `server/db` constructs a Prisma client.

## 4. Data model

Seven tables. All application tables except `organizations` carry `orgId`.

### 4.1 Enums

```
Role        OWNER | MANAGER | MEMBER
UserStatus  INVITED | ACTIVE | DISABLED
TaskStatus  PENDING | IN_PROGRESS | DONE | BLOCKED | CANCELLED
TaskSource  MANUAL | AI_TEXT | AI_VOICE | RECURRING
UpdateType  ASSIGNMENT | STATUS_CHANGE | COMMENT | PROOF | REMINDER_SENT
JobType     TASK_REMINDER | END_OF_DAY_NUDGE | DAILY_SUMMARY | RECURRING_GENERATE | AI_PARSE
JobStatus   PENDING | RUNNING | DONE | FAILED | CANCELLED
```

### 4.2 `organizations`

The tenant root. Everything cascades from here.

| Field | Type | Notes |
|---|---|---|
| id | cuid PK | |
| name | String | Company name |
| timezone | String | Default `Africa/Addis_Ababa` |
| locale | String | Default `en`; org-level default for new users |
| plan | String | Default `free`; plain string until billing exists |
| createdAt / updatedAt | DateTime | |

### 4.3 `users`

Employees and managers. Employees never have a password — Telegram identity is their identity.

| Field | Type | Notes |
|---|---|---|
| id | cuid PK | |
| orgId | FK → organizations | Cascade delete |
| name | String | Captured once at bot start |
| phone | String? | Optional, used for identification |
| telegramUserId | BigInt? | Null until the invite link is used |
| telegramChatId | BigInt? | Private chat id for outbound messages |
| telegramLinkedAt | DateTime? | |
| role | Role | Default `MEMBER` |
| status | UserStatus | Default `INVITED` |

**Constraints:** `@@unique([orgId, telegramUserId])`, `@@unique([orgId, phone])`, `@@index([orgId, status])`, `@@index([telegramUserId])`.

**Why per-org uniqueness, not global:** a consultant or accountant may eventually work with two companies. Global uniqueness forces a painful migration the day that happens. For v1 the bot resolves `telegramUserId` to a single row and proceeds; when a second row appears, add an org switcher rather than a schema change.

Users are **never deleted**. They are set to `DISABLED` so their task history survives.

### 4.4 `invites`

| Field | Type | Notes |
|---|---|---|
| id | cuid PK | |
| orgId | FK → organizations | Cascade |
| token | String @unique | Goes into the Telegram deep link |
| name / phone | String? | Optional pre-fill |
| role | Role | Default `MEMBER` |
| expiresAt | DateTime | |
| usedById | FK → users, unique, nullable | SetNull on user delete |
| usedAt | DateTime? | |

For v1, one org-wide reusable invite link is the primary path. Per-person invites exist in the schema so targeted invites work later without a migration.

### 4.5 `tasks`

The core object.

| Field | Type | Notes |
|---|---|---|
| id | cuid PK | |
| orgId | FK → organizations | Cascade |
| title | String | |
| description | String? | |
| assigneeId | FK → users | `Restrict` — cannot delete a user with tasks |
| createdById | FK → users | `Restrict` |
| dueAt | DateTime? | UTC |
| status | TaskStatus | Default `PENDING` |
| source | TaskSource | Default `MANUAL` — tracks AI acceptance |
| templateId | FK → recurring_templates? | SetNull |
| completedAt | DateTime? | Set only on transition to `DONE` |

**Indexes:** `[orgId, assigneeId, status]` (employee task list), `[orgId, status, dueAt]` (manager board), `[orgId, dueAt]` (reminder sweeps), `[templateId, createdAt]` (recurrence dedupe).

`source` is not decoration. It is how we measure whether the AI features are actually being used or quietly abandoned.

### 4.6 `task_updates`

Append-only history. Never updated, never deleted.

| Field | Type | Notes |
|---|---|---|
| id | cuid PK | |
| orgId | FK → organizations | Cascade |
| taskId | FK → tasks | Cascade |
| actorId | FK → users? | SetNull; null means system-generated |
| type | UpdateType | |
| fromStatus / toStatus | TaskStatus? | Set for `STATUS_CHANGE` |
| note | String? | Comment or blocker reason |
| telegramFileId | String? | Telegram-hosted media reference |
| mediaType | String? | `photo`, `voice`, `document` |

**Indexes:** `[taskId, createdAt]`, `[orgId, createdAt]`.

**Media is not stored by us in v1.** We keep Telegram's `file_id` and fetch through the Bot API on demand. No S3, no bandwidth cost, no storage bill. The tradeoff is that media is only retrievable while the bot token is valid — acceptable for v1, revisit if customers need exports.

### 4.7 `recurring_templates`

| Field | Type | Notes |
|---|---|---|
| id | cuid PK | |
| orgId | FK → organizations | Cascade |
| title / description | String | |
| assigneeId | FK → users | `Restrict` — matches `tasks.assigneeId`; a user with templates cannot be orphaned |
| rule | String | RRULE-like subset: `FREQ=DAILY`, `FREQ=WEEKLY;BYDAY=MO,WE`, `FREQ=MONTHLY;BYMONTHDAY=5` |
| timeOfDay | String | `HH:mm` in org timezone, default `09:00` |
| active | Boolean | Default true |
| lastGeneratedOn | Date? | Guards against duplicate generation |

**Index:** `[orgId, active]`.

`lastGeneratedOn` is the idempotency key for recurrence. The generator only creates tasks for a date strictly after this value, so a double-running worker cannot produce duplicate tasks.

### 4.8 `jobs`

Every outbound side effect goes through this table.

| Field | Type | Notes |
|---|---|---|
| id | cuid PK | |
| orgId | FK → organizations | Cascade |
| type | JobType | |
| payload | Json | Default `{}` |
| runAt | DateTime | Earliest execution time |
| status | JobStatus | Default `PENDING` |
| attempts / maxRetries | Int | Default 0 / 5 |
| lockedAt | DateTime? | Worker lease; stale locks are reclaimed |
| lastError | String? | |
| dedupeKey | String? @unique | e.g. `reminder:{taskId}:{runAtISO}` |

**Indexes:** `[status, runAt]` (the poll query), `[orgId, type, status]`.

`dedupeKey` is what stops an employee getting the same reminder twice when a retry overlaps a fresh enqueue.

### 4.9 Relationship summary

```
Organization 1─* User
Organization 1─* Invite
Organization 1─* Task
Organization 1─* TaskUpdate
Organization 1─* RecurringTemplate
Organization 1─* Job

User 1─* Task            (as assignee, Restrict)
User 1─* Task            (as creator, Restrict)
User 1─* TaskUpdate      (as actor, SetNull)
User 1─* RecurringTemplate (as assignee, Restrict)
User 1─1 Invite          (as the user who consumed it, SetNull)

Task 1─* TaskUpdate      (Cascade)
RecurringTemplate 1─* Task (SetNull)
```

**Delete semantics rationale:** cascade from the org so removing a tenant is one statement. Restrict on task assignee and creator so history can never be orphaned by an accidental user delete. SetNull where the reference is informational rather than structural.

## 5. Database rules

These are non-negotiable.

1. **Every application table carries `orgId`.** From the first migration, not retrofitted. Retrofitting multi-tenancy is the single most expensive mistake available here.
2. **No feature code touches `basePrisma`.** Feature code calls `orgDb(session.orgId)`, which returns a Prisma client extension that injects `orgId` into every `where`, `create`, `createMany`, and `upsert`. Forgetting to scope a query becomes something you must do deliberately.
3. **`$queryRaw` bypasses the extension.** Any raw SQL adds the org filter by hand. Prefer not to write raw SQL at all.
4. **`task_updates` is append-only.** No `UPDATE`, no `DELETE`. Status lives on `tasks` for fast reads; the trail lives here for audit, proof, and later analytics.
5. **Timestamps are stored in UTC.** Conversion to `Africa/Addis_Ababa` happens at the display and scheduling boundary only. Ethiopia has no DST, but the rule is still applied uniformly.
6. **Dates are stored Gregorian.** Ethiopian calendar is a rendering concern. Never persist an Ethiopian date.
7. **Users are disabled, not deleted.**
8. **Money, when it exists, is stored as integer minor units in ETB.** Never a float.
9. **Enums live in Prisma, not as free strings.** Adding a value is a migration, which is the point.

## 6. Migration policy

```bash
npx prisma migrate dev --name descriptive_name   # development only
git add prisma/migrations                         # always committed
npx prisma migrate deploy                         # staging and production
```

- Never edit a migration that has been applied anywhere, including a teammate's machine.
- Never run `prisma db push` once the first migration exists.
- Destructive changes take two deploys: add the new column and backfill in one, drop the old column in a later one.
- Every migration is reviewed as SQL before merge, not just as a schema diff.
- Neon branches per environment; production migrations run in CI via `migrate deploy`, never from a laptop.

### Neon connection strings

```
DATABASE_URL="postgresql://...-pooler.neon.tech/db?sslmode=require"   # pooled, app (@prisma/adapter-pg)
DIRECT_URL="postgresql://...neon.tech/db?sslmode=require"             # unpooled, migrations (prisma.config.ts)
```

**Prisma 7 config.** Connection URLs no longer live in `schema.prisma`. The datasource block declares only `provider`; the CLI reads `datasource.url` from `prisma.config.ts`, which we set to the unpooled `DIRECT_URL` (Prisma cannot migrate through a pooler). The application runtime connects separately through `@prisma/adapter-pg` against the pooled `DATABASE_URL` (see `src/server/db/client.ts`). Prisma 7 dropped `datasource.directUrl`, so this pooled/unpooled split is expressed across the two places rather than one datasource block. The generated client is emitted to `src/generated/prisma` (git-ignored, regenerated on install via the `postinstall` script).

If `migrate dev` complains about a shadow database, create a second empty Neon database and set `shadowDatabaseUrl` in `prisma.config.ts`.

## 7. Service layer conventions

Every service function takes an explicit actor context:

```ts
type Ctx = { orgId: string; actorId: string; role: Role; locale: "en" | "am" };
```

- Services are pure of transport concerns. No `Request`, no `Response`, no grammY `Context`.
- Authorisation happens in the service, not the route. A route that forgets the check must still fail.
- Any status change writes both the `tasks` row and a `task_updates` row **inside one transaction**.
- Any outbound notification is enqueued as a job in the same transaction. Never sent inline.
- Functions return domain objects or throw typed domain errors. No HTTP status codes below the route layer.

### Task state machine

```
PENDING ──▶ IN_PROGRESS ──▶ DONE
   │             │
   ├────▶ BLOCKED ◀────┘
   │             │
   └──▶ CANCELLED ◀─────────┘   (manager only)
```

- `BLOCKED` requires a reason note. Enforced in the service, not the UI.
- `DONE` sets `completedAt`. Reopening clears it and writes a new update row.
- Only `OWNER` and `MANAGER` may `CANCEL` or reassign. Members may only move their own tasks.

## 8. Job runner

A polling worker, not a queue server.

```
every 30s:
  claim:   UPDATE jobs SET status='RUNNING', lockedAt=now()
           WHERE id IN (SELECT id FROM jobs
                        WHERE status='PENDING' AND runAt <= now()
                        ORDER BY runAt LIMIT 20
                        FOR UPDATE SKIP LOCKED)
           RETURNING *
  execute: dispatch by type
  finish:  status='DONE'
  fail:    attempts++, exponential backoff on runAt,
           status='FAILED' when attempts >= maxRetries
  reclaim: any RUNNING job with lockedAt older than 5 minutes → PENDING
```

`FOR UPDATE SKIP LOCKED` is what makes it safe to run more than one worker later without changing anything.

**Handler signature.** Raw SQL is confined to the claim/reclaim queries. For each claimed job the runner builds `orgDb(job.orgId)` and dispatches to a handler typed as:

```ts
type JobHandler<T> = (db: OrgDb, payload: T, job: JobMeta) => Promise<void>;
```

Handlers receive an already org-scoped client and never construct or reach an unscoped one. `JobMeta` is the job row minus its `payload`; the payload is passed separately and validated before use.

### Job types

| Type | Enqueued when | Does |
|---|---|---|
| `TASK_REMINDER` | Task created or `dueAt` changed | Sends a Telegram reminder before the deadline |
| `END_OF_DAY_NUDGE` | Daily sweep | Messages assignees with untouched tasks |
| `DAILY_SUMMARY` | Daily sweep per org | Sends the manager an AI-written recap |
| `RECURRING_GENERATE` | Daily sweep per org | Materialises tasks from active templates |
| `AI_PARSE` | Voice note received | Transcribes and parses, then replies with a draft |

Daily sweeps are scheduled in each org's own timezone, not server local time.

**All Telegram sends go through jobs.** The Bot API will be slow or unavailable sometimes, and a failed send must retry rather than disappear.

## 9. Telegram bot

Handlers are thin. They parse input, call a service, and render a message. No business logic, no direct database access.

### Commands

| Command | Behaviour |
|---|---|
| `/start <invite_token>` | Consumes the invite, links `telegramUserId`, asks for a name once |
| `/today` | Tasks due today for this user |
| `/mytasks` | All open tasks |
| `/language` | Toggle Amharic / English |
| `/help` | Short usage text |

### Task message

A task arrives as a message with inline keyboard buttons: **Started**, **Done**, **Blocked**. Tapping fires a callback query carrying `taskId` and the target status. Tapping **Blocked** puts the user into a short reply state asking for a reason. Any photo or voice note sent while a task is in focus is attached as a `PROOF` update.

### Bot rules

- Every callback is verified against the acting user's org before it does anything. A crafted `taskId` from another org must fail.
- Callback handlers are idempotent — Telegram redelivers.
- Edit the existing message on status change rather than sending a new one, so the chat does not fill with duplicates.
- All strings come from `i18n`. No hardcoded text in handlers.
- Webhook mode in production, long polling only in local development.

## 10. AI module

Only `src/server/ai/**` imports the AI SDK (the client is constructed in `server/ai/client.ts`; `index.ts` is the public surface). Everything else calls typed functions.

```ts
parseTasksFromText(input: string, ctx: Ctx): Promise<TaskDraft[]>
parseTasksFromVoice(fileId: string, ctx: Ctx): Promise<TaskDraft[]>
writeDailySummary(data: SummaryInput, ctx: Ctx): Promise<string>
```

Rules:

1. **AI never writes to the database.** It returns `TaskDraft[]`. A human confirms, and the confirmation path is the same code as manual creation.
2. **Structured output only.** Prompts demand JSON with no prose or fences. Every response is schema-validated (Zod) before use. A validation failure is a clean error, not a crash.
3. **Assignee resolution is ours, not the model's.** The model returns a name string; our code matches it against org members and asks the user when ambiguous. The model never sees or invents user IDs.
4. **Relative dates resolve in the org's timezone**, with today's date passed explicitly into the prompt.
5. **Graceful degradation.** If the AI provider is down, task creation, assignment, and reporting all still work. Only the shortcut disappears.
6. **Cost and latency are bounded.** Voice notes over a set length are rejected with a helpful message. Every call has a timeout and a single retry.
7. **Prompts are versioned files**, not inline strings, so output changes are reviewable in git.

## 11. Auth and permissions

- Managers authenticate with email plus a session cookie. Employees never authenticate — Telegram identity is the credential.
- Session carries `userId`, `orgId`, `role`. `orgId` comes from the session only, never from a request parameter or body.
- Roles: `OWNER` (billing, delete org, all manager rights), `MANAGER` (create, assign, cancel, view all), `MEMBER` (see and update own tasks only).
- Rate limit the webhook endpoint and validate Telegram's secret token header on every request.
- Invite tokens are random, expiring, and revocable.

## 12. Conventions

- TypeScript `strict: true`. No `any` in service code.
- Zod validates every external input: form submissions, API bodies, webhook payloads, AI responses.
- `BigInt` does not survive `JSON.stringify`. Convert `telegramUserId` and `telegramChatId` to strings at every API boundary.
- IDs are cuid, generated by Prisma.
- Errors are typed domain errors (`TaskNotFound`, `NotAuthorised`, `InvalidTransition`) mapped to HTTP or Telegram messages at the edge.
- Structured logging with `orgId` and `jobId` on every line. Never log message content or personal data.
- Tests: unit tests on the service layer and state machine, one integration test that runs the full loop against a Neon branch. Skip UI tests in v1.

## 13. Deployment

**Recommended for v1:** one small VPS (Hetzner or similar, ~$5/month) running the Next.js app, the bot, and the job runner under Coolify, with Postgres on Neon.

Why not Vercel alone: the job runner must wake roughly every minute, and hobby-tier cron fires once a day. A VPS also gives a fixed IP, which matters when telebirr integration arrives.

Two processes:

- `web` — Next.js, serves the dashboard and the Telegram webhook route
- `worker` — job runner poll loop

Both share the same codebase and the same service layer.

### Database driver adapter

Prisma 7 has no Rust engine and requires a driver adapter. We use **`@prisma/adapter-pg`** (node-postgres) against the **pooled** `DATABASE_URL`. Rationale: both `web` and `worker` are long-lived processes on a VPS, and we need **interactive transactions** — the status-change transaction (§7) and the job claim query with `FOR UPDATE SKIP LOCKED` (§8). The Neon serverless HTTP driver (`@prisma/adapter-neon` over HTTP) does **not** support interactive transactions, so it is the wrong fit here. `pg` also manages its own connection pool, which suits persistent processes. Migrations use the unpooled `DIRECT_URL` via `prisma.config.ts`. Moving to a serverless runtime later (which would favour the Neon adapter) must be a **deliberate** decision made against these transaction requirements, not a default.

### Environment

```
DATABASE_URL           pooled Neon connection
DIRECT_URL             unpooled Neon connection, migrations only
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
ANTHROPIC_API_KEY
SESSION_SECRET
APP_URL
NODE_ENV
```

Environments: local, staging (Neon branch), production. Migrations run in CI on deploy, never manually.

## 14. Scaling

Honest sizing: 100 companies × 20 employees is 2,000 users and roughly 20,000 tasks a month. A single Postgres instance handles that for years without tuning.

**"Scalable" here means clean boundaries and no cross-tenant leaks — not distributed systems.** Resist microservices, message brokers, and caching layers. They would spend the rapid-development budget on problems that do not exist.

The path when growth actually demands it, in order:

1. Run more than one worker — already safe thanks to `SKIP LOCKED`
2. Add read indexes based on real slow queries, not guesses
3. Move the bot to its own process, then its own host
4. Partition or archive `task_updates` by date once it passes tens of millions of rows
5. Introduce Redis only when a measured cache miss rate justifies it
6. Consider Postgres row-level security as a second layer behind the `orgDb` extension

The architecture above supports every one of these without a rewrite, which is the actual definition of scalable at this stage.
