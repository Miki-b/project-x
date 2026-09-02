# Product

Working name: **TBD** (referred to as "the product" throughout)

A simple task and daily-work manager for Ethiopian companies. Employees work entirely inside Telegram. Managers work entirely inside a web dashboard.

---

## 1. The problem

Ethiopian business owners are asking for "something like Notion" to organise their teams. When they try Notion, it fails them — not because it lacks features, but because it has too many.

Notion is a blank canvas. Before a company can use it, someone has to design a system: decide on databases, properties, views, relations, and templates. That design work is the actual product, and most small Ethiopian companies have nobody to do it. The tool arrives empty and stays empty.

Secondary failures observed:

- Every employee needs an account, an app install, and a login they will forget
- The interface is English-only and dense
- Dates are Gregorian, while much of the business context runs on the Ethiopian calendar
- Poor connectivity makes a heavy SPA painful on cheap Android phones
- Payment in USD by card is a hard blocker for most SMEs

## 2. The insight

The opposite of a blank canvas is an opinionated default.

We do not let companies design a system. We give them one system, already set up, with a single way to work. The constraint is the product. A manager should be assigning real tasks within ten minutes of signing up, without configuring anything.

Second insight: **do not ask Ethiopian employees to install another app.** They are already on Telegram all day. The bot goes where the users are. This removes the single biggest cause of death for internal tools — the team never adopts it.

## 3. Target customer

**Generic core, specific first customer.**

The product is deliberately industry-neutral. Its core object — a task, assigned to a person, due at a time, with proof it was done — is the same for a construction firm, a trading company, an NGO, and a consultancy. We add zero industry-specific features in v1.

- **Company size:** 5–50 employees
- **Buyer:** the owner or general manager. They pay, they care, they feel the pain.
- **Daily user:** employees with a smartphone and Telegram, varying literacy with software
- **First customer:** one real company we have direct access to, used as a design partner. Feedback must come from daily use, not from opinions in meetings.

### Personas

**Selamawit — the owner/manager.** Runs a 20-person company. Tracks work in her head, on WhatsApp, and in a notebook. Repeats herself constantly. Wants to know at 5pm what actually got done today without calling six people.

**Abebe — the employee.** Field or office staff. Uses Telegram constantly, email almost never. Will not open a web app or remember a password. Will happily tap a button in a chat.

## 4. The core loop

The entire product is one loop. Everything else is later.

1. **Assign.** The manager creates tasks in the dashboard, or they generate automatically from recurring templates.
2. **Deliver.** The employee receives a Telegram message: what, by when, who assigned it.
3. **Act.** The employee taps a button — Started, Done, or Blocked — and can attach a photo or a note as proof.
4. **Nudge.** The bot reminds before the deadline and again at end of day if the task was never touched.
5. **Report.** The manager sees a live board, and receives an end-of-day summary in Telegram: done, slipped, blocked.

If this loop is reliable, the product is already more useful to an Ethiopian SME than Notion is.

## 5. Product principles

1. **Opinionated over flexible.** One way to work. No custom fields, no view builder, no workspace templates. Every configuration option we add is a decision we push onto a customer who does not want to make it.
2. **Telegram is the entire employee experience.** No employee web login, ever. If a feature requires employees to open a browser, the feature is wrong.
3. **The dashboard is the entire manager experience.** The manager's only Telegram contact is receiving summaries. We do not build a management interface inside the bot.
4. **A task is not done until someone says it is done.** Status changes come from a human, are timestamped, and are never silently overwritten.
5. **AI proposes, humans confirm.** AI output is always a draft the user approves. It never writes to the database directly.
6. **Ethiopian context is a feature, not a translation layer.** Amharic, Ethiopian calendar, Addis time, Telegram, birr. These are reasons to choose us over a global tool.
7. **Ship small, learn fast.** Rapid development. Launch an incomplete product to one real company rather than a complete product to nobody.

## 6. v1 scope

### In scope

**Manager (web dashboard)**
- Sign up, create organisation
- Invite employees via a single shareable Telegram link
- Create a task: title, description, assignee, due date/time
- Bulk-create tasks from typed text (AI) or a voice note (AI)
- Set up recurring tasks (daily, weekdays, weekly on chosen days, monthly on a date)
- Task board grouped by status, filterable by assignee and due date
- Task detail with the full update history and any attached proof
- Team list: add, disable, and change roles
- Daily summary delivered to the manager's Telegram

**Employee (Telegram bot)**
- Join via invite link, get linked to the org automatically
- Receive new task notifications
- `/today` — see today's tasks
- `/mytasks` — see everything open
- Tap to change status: Started, Done, Blocked
- Attach a photo, voice note, or text note as proof or as a blocker reason
- Receive deadline reminders and an end-of-day nudge for untouched tasks
- Switch language between Amharic and English

### Explicitly out of scope for v1

Projects, milestones, and gantt views. File storage beyond Telegram-hosted media. Permission levels beyond owner/manager/member. Time tracking and timesheets. Custom fields. Third-party integrations. A native mobile app. An employee web interface. Comments threads and @mentions. Task dependencies. Subtasks. Client or guest access. Payroll or attendance.

Anything on this list that a customer requests is recorded as feedback, not built.

## 7. AI in the product

AI has two jobs here: remove data entry, and write the summary. Nothing else.

### Shipping in v1

**Text to tasks.** The manager types or pastes a messy paragraph in Amharic or English — "Abebe should finish the Bole site report by Thursday, Sara follows up with the supplier tomorrow" — and gets back structured tasks with assignees and due dates, ready to confirm or edit. Data entry is the single biggest reason task tools die. This removes it.

**Voice note to tasks.** The manager sends a voice message in Telegram; it comes back as a confirmable task list. Ethiopians live on voice notes, and typing Amharic on a phone is slow and painful. This is the feature most likely to make someone tell another business owner about us, and it is one a global tool will never build for this market.

**End-of-day summary.** A short plain-language recap instead of a status table: who is on track, who is stuck, what slipped and by how much.

### Deliberately not building

An assistant chatbot that answers questions about your tasks. AI priority scoring. Sentiment analysis on updates. Predictive deadline estimation. Auto-assignment. These are demo features, not adoption features.

### Guardrails

AI never writes to the database. It returns a draft. A human confirms. If the AI provider is down, every core function still works — only the shortcut is missing.

## 8. Localisation and context

- **Languages:** English and Amharic, per user. Every user-facing string behind a translation key from screen one, even before Amharic ships.
- **Time:** stored in UTC, always displayed in `Africa/Addis_Ababa`. Ethiopia has no daylight saving, which makes this simple — but it must still be decided once, not per feature.
- **Calendar:** stored as Gregorian, optionally displayed as Ethiopian. Display-layer conversion only. Never store an Ethiopian date.
- **Connectivity:** the dashboard must be usable on a slow connection. The bot must tolerate delayed and out-of-order delivery.
- **Payments:** telebirr and CBE Birr, priced in ETB. Card payment is not a viable primary method for this market.

## 9. Onboarding

This is the hardest unsolved part of the product, and more important than any feature.

A manager signs up and then has to get 12 employees connected to a bot. If that takes more than one shared link, adoption dies in week one.

Target flow:

1. Manager signs up on the web, names the company
2. Dashboard shows one invite link, ready to paste into the company's existing Telegram group
3. Employee taps the link, Telegram opens the bot, they tap Start
4. Bot asks for their name once, then confirms they have joined the company
5. Manager sees them appear in the team list and can assign immediately

Success criterion: **a manager can go from signup to their team receiving real tasks in under fifteen minutes, with no support call.**

## 10. Pricing (working assumption)

Free for up to 5 users so a company can try it with a real team. Paid tiers priced per active employee per month in ETB, collected via telebirr. Annual prepayment discount, because Ethiopian SMEs often prefer one payment to twelve.

Pricing is a v1.5 concern. Do not build billing until at least one company asks how to pay.

## 11. Success metrics

Vanity metrics are signups and total tasks created. Ignore them. The metrics that matter:

- **Week-2 team retention:** percentage of onboarded companies where at least half the employees changed a task status in week two. This is the number that decides whether the product works.
- **Assignment habit:** managers who create tasks on 4+ days per week
- **Response rate:** percentage of assigned tasks that receive any status update from the assignee
- **Time to first task:** signup to first task delivered to a real employee
- **AI acceptance:** percentage of AI-drafted tasks confirmed without edits

## 12. Feedback loop

Launch to one company, then three, then ten. Do not open public signups until the loop holds without hand-holding.

- Weekly call with the design partner's manager for the first month
- Every disabled or ignored feature gets asked about directly
- Instrument the funnel: invite sent, bot started, first status update, second week active
- Keep a single feature request list. Nothing gets built from it until three separate companies ask for the same thing.

## 13. Roadmap after v1

Ordered by likely value, subject to what feedback actually says:

1. Amharic UI across the dashboard, not just the bot
2. Manager mobile experience (responsive dashboard before a native app)
3. Simple project grouping — tasks under a named project, no gantt
4. Attendance and daily check-in, which many Ethiopian SMEs will ask for
5. Weekly and monthly reporting for owners
6. telebirr billing
7. Multi-org support for consultants working across companies
8. Public API and webhooks

## 14. Non-goals

We are not building a Notion competitor, a project management suite, an ERP, or a general-purpose workspace. We are building the smallest reliable answer to "who is doing what today, and did they do it."
