# Deployment topology

How the app runs in production. The whole system runs on free tiers with **no always-on
server** — the web, the bot, and task-card delivery all live on Vercel; the database is Neon.

## Overview

| Piece | Where it runs | Notes |
|---|---|---|
| Dashboard + Mini App + `/api/*` routes | **Vercel** (Next.js) | `git push` to `main` auto-deploys |
| Telegram bot | **Vercel** webhook at `/api/telegram` | No separate process; Telegram POSTs updates |
| Task-card delivery | **Inline** in the Vercel web request | `sendTaskCardToAssignee` — no worker/queue |
| Database | **Neon** Postgres (`eu-west-2`) | Pooled + unpooled URLs |

There is intentionally **no worker deployed**. The `worker/` + `src/server/jobs/` code still
exists for a future scheduled processor (see [Reminders](#reminders--scheduled-jobs)), but
nothing runs it today.

## Public URL

**Use `https://project-x-blue-three.vercel.app`** everywhere (Mini App, webhook, BotFather).

> ⚠️ The Vercel-assigned `project-x-development-<team>.vercel.app` URL (what `vercel project ls`
> calls the "Production URL") is behind **Vercel Deployment Protection** — it 302-redirects to a
> Vercel SSO login, so Telegram cannot load it. Always use the `blue-three` alias, which is
> public.

## Delivery model (why there's no worker)

- **Manager creates a task** (dashboard) → the server action `createTaskAction`
  ([src/app/(dashboard)/actions.ts](../src/app/(dashboard)/actions.ts)) calls
  `sendTaskCardToAssignee` ([src/server/telegram/deliver.ts](../src/server/telegram/deliver.ts))
  right after the task is created. **Best-effort**: a send failure is logged and never fails
  task creation.
- **Employee taps Started / Done / Blocked** (bot) → the webhook handler
  ([src/server/telegram/handlers/callbacks.ts](../src/server/telegram/handlers/callbacks.ts))
  edits the existing card **in place**. No outbound send, no job.

`createTask`/`changeStatus` no longer enqueue `TASK_NOTIFICATION` jobs. The
`handleTaskNotification` handler is kept and delegates to `sendTaskCardToAssignee`, so a future
cron can reuse the same delivery path.

Trade-off: delivery is best-effort (no durable retry queue). Acceptable at this stage; add a
free Vercel cron sweep if guaranteed delivery is ever needed.

## Environment variables

`.env` (local, git-ignored) and Vercel Project Settings → Environment Variables must both carry
these. `.env.example` documents every variable.

| Variable | Web (Vercel) | Local worker/bot dev | Purpose |
|---|:---:|:---:|---|
| `DATABASE_URL` | ✅ | ✅ | App runtime (pooled Neon, `-pooler`) |
| `DIRECT_URL` | ✅ | ✅ | Prisma migrations (unpooled Neon). Not used at runtime; `prisma.config.ts` reads it tolerantly so builds without it still `generate` |
| `TELEGRAM_BOT_TOKEN` | ✅ | ✅ | Mini App `initData` verification + sending cards |
| `TELEGRAM_BOT_USERNAME` | ✅ | ✅ | Dashboard invite deep-link |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ | — | Verifies Telegram → `/api/telegram` calls |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | The public URL above; used for the "Open Tasks" Web App button |
| `ANTHROPIC_API_KEY` | — | ✅ (when AI parse is built) | `src/server/ai` only |

`SESSION_SECRET` in `.env.example` is currently unused. Vercel sets `NODE_ENV=production`
automatically — do not set it.

Set a Vercel env var from the CLI (repeat per environment: `production` `preview` `development`):

```bash
printf '%s' '<value>' | vercel env add <NAME> production
```

## Deploying

- **Normal:** `git push origin main` → Vercel auto-deploys (GitHub integration).
- **Manual:** `vercel --prod --yes` from the repo root builds and promotes the current code.

The production build runs `next build`; `postinstall` runs `prisma generate`. No migrations run
on deploy — the Neon DB is migrated separately (`npm run db:deploy`).

## Telegram webhook

The bot runs in webhook mode. Register it after any change to the public URL or secret
(placeholders come from `.env`):

```bash
# Register (also drops any queued long-poll updates)
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://project-x-blue-three.vercel.app/api/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d "drop_pending_updates=true"

# Inspect (check url / last_error_message / pending_update_count)
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

### Developing the bot locally

Telegram delivers to **either** the webhook **or** long-polling, never both. To run
`npm run bot:dev` (long-polling) locally, remove the webhook first, then restore it when done:

```bash
# Switch to local long-polling
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/deleteWebhook"
npm run bot:dev

# Switch back to production (re-run the setWebhook command above)
```

## BotFather

With a stable URL you can pin the Mini App: `/setmenubutton` → the bot → send
`https://project-x-blue-three.vercel.app` → label it (e.g. "Tasks"). Employees then get a
persistent button that opens the Mini App.

## Reminders & scheduled jobs

`TASK_REMINDER`, `END_OF_DAY_NUDGE`, `DAILY_SUMMARY`, `RECURRING_GENERATE`, `AI_PARSE` are still
stubs. `createTask` enqueues `TASK_REMINDER` rows when a due date is set, but **nothing processes
them yet**. When these are built, add a **Vercel Cron** hitting a new route (e.g.
`/api/cron/tick`) that runs one `tick()` from [src/server/jobs/runner.ts](../src/server/jobs/runner.ts):

- Vercel Hobby cron granularity is ~daily, which suits nudges/summaries.
- For near-real-time needs, either upgrade the Vercel plan or reintroduce an always-on worker
  (the removed `Dockerfile.worker` + `fly.toml` are in git history).
