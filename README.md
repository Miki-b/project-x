# Task Manager (working name)

A simple task and daily-work manager for Ethiopian companies. Employees work entirely
inside Telegram; managers work entirely inside a web dashboard. See `docs/product.md`,
`docs/architecture.md`, and `docs/quick_reference.md` — those documents are authoritative.

> This repository is **scaffolding only**. Every architectural boundary is in place and
> the project builds, type-checks, lints, and tests — but no features are implemented.
> Service, handler, job, and AI functions are typed stubs that `throw "not implemented"`.

## Stack

TypeScript (strict, ESM) · Next.js App Router · grammY · Prisma 7 (driver adapters,
`@prisma/adapter-pg`) · PostgreSQL on Neon · Tailwind · Zod · a `jobs` table + polling
worker · Anthropic API.

## Prerequisites

- Node.js 22+ and npm 11+
- A [Neon](https://neon.tech) PostgreSQL project (free tier is fine)
- A Telegram bot token from [@BotFather](https://t.me/BotFather) (only needed to run the bot)

## Local setup

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npx prisma generate       # generate the typed client
npm run db:migrate        # create the schema on your Neon branch (needs DATABASE_URL + DIRECT_URL)
npm run db:seed           # optional: one org, an owner, two members, four tasks
npm run dev               # web dashboard at http://localhost:3000
```

### Getting the two Neon connection strings

Prisma needs **two** connections (docs/architecture.md §6). In the Neon dashboard, open
your database's **Connection Details**:

- **`DATABASE_URL`** — the **pooled** string. The host contains `-pooler`. Used by the app
  at runtime.
- **`DIRECT_URL`** — the **unpooled** (direct) string. Same host **without** `-pooler`.
  Used by Prisma Migrate only — **Prisma cannot migrate through Neon's pooler.**

Both end with `?sslmode=require`. Put them in `.env` (git-ignored). If `migrate dev`
complains it cannot create a shadow database, create a second empty Neon database and set
`SHADOW_DATABASE_URL` (see `.env.example`).

## Running web + worker together

Two processes share the same codebase and service layer (docs/architecture.md §13):

```bash
npm run dev       # 1) web: Next.js dashboard + Telegram webhook route
npm run worker    # 2) worker: job-runner poll loop (reminders, summaries, recurrence)
```

The bot runs in **webhook mode in production** (the `/api/telegram` route inside the web
process) and via **long polling in development**:

```bash
npm run bot:dev   # local only: bot via long polling
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`node --test` via tsx) |
| `npm run worker` | Job-runner poll loop (tsx) |
| `npm run bot:dev` | Bot via long polling (tsx) |
| `npm run db:migrate` | `prisma migrate dev` (development) |
| `npm run db:deploy` | `prisma migrate deploy` (staging/production, CI) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed sample data |

## Migration rules (docs/architecture.md §6)

- `npx prisma migrate dev --name <descriptive_name>` in **development only**.
- **Commit `prisma/migrations/` always.** Migrations are reviewed as SQL before merge.
- **Never edit a migration that has been applied anywhere** (including a teammate's machine).
- **Never run `prisma db push` once the first migration exists.**
- Destructive changes take two deploys: add + backfill first, drop the old column later.
- Production migrations run in CI via `prisma migrate deploy`, never from a laptop.

### Neon branch policy

- The **default/production branch** (`main`) is sacred: it only ever receives
  `prisma migrate deploy`. **Never run `prisma migrate dev` or `prisma db push` against
  it.**
- All schema iteration happens on a **Neon `dev` branch**. Local `.env`
  (`DATABASE_URL` pooled + `DIRECT_URL` unpooled) points at the `dev` branch, never at
  `main`.
- Rapid schema exploration uses `prisma db push` against the `dev` branch (no migration
  files). Once the schema is settled, reset the `dev` branch, run
  `prisma migrate dev --name <name>` **once** to author the migration, then apply it to
  `main` with `migrate deploy`.

## Architecture guardrails (enforced by convention + review)

- `app/` and `telegram/` may import from `server/services`; services never import from
  `app/` or `telegram/`.
- Only `server/db/` constructs a Prisma client. Feature code calls `orgDb(ctx.orgId)`,
  never `basePrisma` — the extension injects `orgId` into every query.
- Only `server/ai/` imports the AI SDK.
- Every application table carries `orgId`. `task_updates` is append-only.
- Store timestamps in UTC (display in `Africa/Addis_Ababa`); store Gregorian dates
  (display Ethiopian). Convert `BigInt` Telegram IDs to strings at every boundary
  (`src/lib/serialize.ts`).
- Every outbound side effect (Telegram send, AI call) is enqueued as a job.

## Resolved dependency versions

Built and verified against the following (resolved from the lockfile on 2026-09-02):

| Package | Version |
|---|---|
| next | 16.3.4 |
| react / react-dom | 19.2.8 |
| typescript | 5.9.3 |
| prisma / @prisma/client | 7.10.0 |
| @prisma/adapter-pg | 7.10.0 |
| pg | 8.x |
| grammy | 1.46.0 |
| zod | 4.5.4 |
| @anthropic-ai/sdk | 0.123.0 |
| luxon | 3.7.2 |
| tailwindcss / @tailwindcss/postcss | 4.3.3 |
| eslint | 9.39.5 |
| eslint-config-next | 16.3.4 |
| prettier | 3.9.6 |
| tsx | 4.23.13 |
| dotenv | 17.4.2 |
| Node.js | 22.17.0 |

Notes on version policy (checked against the live registry, not memory):

- **Prisma** is on the latest **7.x stable** (`7.10.0`). Prisma 7 removes the Rust engine
  and requires a driver adapter — we use `@prisma/adapter-pg` against the pooled
  `DATABASE_URL` (see architecture §13 for the rationale vs. `@prisma/adapter-neon`). The
  generator is `prisma-client` with a mandatory `output`; the client is generated to
  `src/generated/prisma` (git-ignored, regenerated via the `postinstall` script) and
  imported from `@/generated/prisma/client`. Connection URLs live in `prisma.config.ts`,
  not the schema. The project is ESM (`"type": "module"`). (The `prisma` CLI's `latest`
  dist-tag is `8.0.0-rc.12`, an RC, which was avoided.)
- **Next.js** current stable is `16.3.4` (App Router, Turbopack) — a major jump from the
  15.x era the docs implicitly assume. React is `19.x`, Tailwind is `4.x`, Zod is `4.x`,
  and ESLint is `9.x`. These are the coherent toolchain versions `create-next-app` pins.
- TypeScript's registry `latest` is now the `7.x` native compiler; we use the
  `create-next-app`-pinned `5.x` for toolchain interoperability.
