# Telegram bot flows

The complete message inventory and behaviour for the employee Telegram bot (docs/architecture.md §9, docs/product.md §4). **This document is copy-and-behaviour only — no code yet.** The i18n keys defined here are the contract; they will be added to `src/lib/i18n/en.json` and `am.json` when the bot is implemented.

## How to read this

- Every user-facing string has an **i18n key**. Copy is shown in **English** and **Amharic (አማርኛ)**. `{{param}}` marks a runtime value.
- **Buttons** are Telegram inline-keyboard buttons. Their labels are i18n keys too.
- `[label]` in a message block is a button; lines above it are the message text.
- A **task card** is the single message that represents one task. When status changes we **edit that same message** — we never send a new one (docs/architecture.md §9).

## Design rules (non-negotiable)

1. **A task card fits a small screen with no scrolling** — at most 4 short text lines plus one row of buttons.
2. **Status change edits the existing card.** The card always reflects the current status; the chat never fills with duplicates.
3. **Every string is an i18n key.** No hardcoded text in handlers.
4. **Plain language, no jargon.** Written for someone who has never used a task tracker. "Blocked" is phrased to the employee as "I'm stuck".
5. **Amharic and English are equal.** A user picks a language once (`/language`); every message respects it.
6. **`{{due}}` formatting** is produced by `lib/time.ts` (Addis time) with an optional Ethiopian-calendar date from `lib/ethiopian-calendar.ts`, e.g. `today 5:00 PM` or `Thu 25 · 5:00 PM`. It is always a pre-formatted string here.

---

## 1. Conversation state (per user)

The bot keeps a tiny per-user state. Precedence is top-down: an earlier state wins over later handling.

| State | Set when | Cleared when |
|---|---|---|
| `awaiting_name` | A new user consumes an invite and has no name yet | They send their name (asked **once**; resumes if abandoned) |
| `awaiting_blocker_reason:{taskId}` | User taps **⛔ Blocked** on a task | They reply with a reason, or tap **✖️ Cancel** |
| `idle` | Default | — |

Separately, the bot tracks a **focused task** (not a blocking state): the task a user is currently acting on, used to attach proof. Focus = the task the incoming message **replies to**; if the message is not a reply, the task the user most recently tapped a button on within the last 15 minutes.

Message-handling precedence for an incoming non-command message:
`awaiting_name` → `awaiting_blocker_reason` → proof attachment (if a task is focused) → fallback hint.

---

## 2. Shared vocabulary

### Status labels (`task.status.*`) — shown inside cards

| Key | English | Amharic |
|---|---|---|
| `task.status.PENDING` | Not started | አልተጀመረም |
| `task.status.IN_PROGRESS` | In progress | በሂደት ላይ |
| `task.status.DONE` | Done | ተጠናቋል |
| `task.status.BLOCKED` | Stuck | ተስተጓጉሏል |
| `task.status.CANCELLED` | Cancelled | ተሰርዟል |

### Button labels (`task.button.*`, `bot.button.*`)

| Key | English | Amharic | Meaning to the employee |
|---|---|---|---|
| `task.button.started` | ▶️ Started | ▶️ ጀመርኩ | "I've started this" |
| `task.button.done` | ✅ Done | ✅ ጨረስኩ | "I've finished this" |
| `task.button.blocked` | ⛔ I'm stuck | ⛔ ተቸግሬያለሁ | "Something is stopping me" |
| `task.button.reopen` | ↩️ Reopen | ↩️ እንደገና ክፈት | "Actually, not done yet" |
| `bot.button.cancel` | ✖️ Cancel | ✖️ ተወው | Cancel the current step |
| `bot.button.lang_en` | 🇬🇧 English | 🇬🇧 English | Pick English |
| `bot.button.lang_am` | 🇪🇹 አማርኛ | 🇪🇹 አማርኛ | Pick Amharic |

### Callback toasts (`bot.toast.*`) — the small pop-up after tapping a button

| Key | English | Amharic |
|---|---|---|
| `bot.toast.started` | Marked as started ✓ | ተጀምሯል ✓ |
| `bot.toast.done` | Marked as done ✓ | ተጠናቋል ✓ |
| `bot.toast.reopened` | Reopened ✓ | እንደገና ተከፍቷል ✓ |
| `bot.toast.blocked` | Tell me what's stopping you | ምን እንዳገዳዎት ንገሩኝ |
| `bot.toast.cancelled` | Cancelled | ተሰርዟል |

---

## 3. The task card

The single message that represents a task. Layout (≤ 4 text lines + one button row):

```
{{title}}
🗓 {{due}}
👤 {{manager}}
▸ {{status}}
```

Keys used to build it:

| Key | English | Amharic |
|---|---|---|
| `task.card.title` | {{title}} | {{title}} |
| `task.card.due` | 🗓 {{due}} | 🗓 {{due}} |
| `task.card.no_due` | 🗓 No date set | 🗓 ቀን አልተቀመጠም |
| `task.card.from` | 👤 {{manager}} | 👤 {{manager}} |
| `task.card.status` | ▸ {{status}} | ▸ {{status}} |
| `task.card.new_badge` | 🆕 New task | 🆕 አዲስ ተግባር |
| `task.card.blocked_reason` | ⛔ Stuck: {{reason}} | ⛔ ተስተጓጉሏል፦ {{reason}} |
| `task.card.done_at` | ✅ Done {{when}} | ✅ ተጠናቋል {{when}} |

A **new** task card prepends `task.card.new_badge` above the title. Reminder/nudge cards prepend their own header (§ flow f).

### Buttons per status (what the card shows)

| Status | Button row |
|---|---|
| Not started (`PENDING`) | `[▶️ Started] [✅ Done] [⛔ I'm stuck]` |
| In progress (`IN_PROGRESS`) | `[✅ Done] [⛔ I'm stuck]` |
| Stuck (`BLOCKED`) | `[▶️ Started] [✅ Done]` |
| Done (`DONE`) | `[↩️ Reopen]` |
| Cancelled (`CANCELLED`) | *(no buttons — manager-only action)* |
| Awaiting reason (transient) | `[✖️ Cancel]` |

### Edit-in-place example

Before (Not started):
```
🆕 Deliver the Bole site report
🗓 today 5:00 PM
👤 Selamawit
▸ Not started
[▶️ Started] [✅ Done] [⛔ I'm stuck]
```
After the user taps **▶️ Started** — the *same* message becomes:
```
Deliver the Bole site report
🗓 today 5:00 PM
👤 Selamawit
▸ In progress
[✅ Done] [⛔ I'm stuck]
```

---

## 4. Message inventory (non-card messages)

| Key | English | Amharic |
|---|---|---|
| `bot.start.welcome_ask_name` | 👋 Welcome to {{company}}! What should we call you? Please type your name. | 👋 ወደ {{company}} እንኳን ደህና መጡ! ማን ብለን እንጥራዎት? እባክዎ ስምዎን ይጻፉ። |
| `bot.start.joined` | ✅ Thanks, {{name}}! You've joined {{company}}. Your tasks will arrive here. | ✅ አመሰግናለሁ {{name}}! {{company}} ተቀላቅለዋል። ተግባሮችዎ እዚህ ይመጣሉ። |
| `bot.start.already_joined` | You're already set up, {{name}}. Type /today to see today's tasks. | አስቀድመው ተመዝግበዋል {{name}}። የዛሬ ተግባሮችን ለማየት /today ይጻፉ። |
| `bot.blocked.ask_reason` | What's stopping you? Reply with a short note. | ምን አገዳዎት? በአጭሩ ይጻፉ። |
| `bot.blocked.saved` | Got it — noted, and your manager can see it. | ተቀብያለሁ — መዝግቤዋለሁ፣ ሥራ አስኪያጅዎም ማየት ይችላሉ። |
| `bot.proof.attached` | 📎 Added to "{{title}}". | 📎 ወደ "{{title}}" ተያይዟል። |
| `bot.proof.no_task` | Reply to a task message to attach a photo, voice note, or text to it. | ፎቶ፣ የድምፅ መልእክት ወይም ጽሑፍ ለማያያዝ ወደ ተግባሩ መልእክት ምላሽ ይስጡ። |
| `bot.proof.ask_reason_instead` | Thanks — I saved that. Now please type what's stopping you. | አመሰግናለሁ — አስቀምጫለሁ። አሁን ምን እንዳገዳዎት ይጻፉ። |
| `bot.today.header` | 📅 Today — {{count}} task(s) | 📅 ዛሬ — {{count}} ተግባር |
| `bot.today.none` | You have no tasks due today. 🎉 | ዛሬ የሚጠበቅ ተግባር የለዎትም። 🎉 |
| `bot.mytasks.header` | 🗂 Your open tasks — {{count}} | 🗂 ክፍት ተግባሮችዎ — {{count}} |
| `bot.mytasks.none` | You have no open tasks right now. | አሁን ክፍት ተግባር የለዎትም። |
| `bot.language.prompt` | Choose your language: | ቋንቋዎን ይምረጡ፦ |
| `bot.language.changed` | ✅ Language set to English. | ✅ ቋንቋ ወደ አማርኛ ተቀይሯል። |
| `bot.help` | *(see flow e)* | *(see flow e)* |
| `bot.hint.use_buttons` | To update a task, tap its buttons. Type /help to see what I can do. | ተግባር ለማዘመን በተግባሩ ላይ ያሉትን አዝራሮች ይንኩ። ማድረግ የምችለውን ለማየት /help ይጻፉ። |
| `bot.reminder.due` | ⏰ Reminder — due {{due}} | ⏰ አስታዋሽ — እስከ {{due}} |
| `bot.nudge.eod` | 🌙 Before you finish today — this one hasn't been started: | 🌙 ዛሬ ከመጨረስዎ በፊት — ይህ አልተጀመረም፦ |
| `bot.summary.header` | 🌇 {{company}} — {{date}} | 🌇 {{company}} — {{date}} |
| `bot.summary.fallback` | 🌇 {{company}} — {{date}}\n✅ Done: {{done}}\n⏳ Past due: {{slipped}}\n⛔ Stuck: {{blocked}} | 🌇 {{company}} — {{date}}\n✅ ተጠናቋል፦ {{done}}\n⏳ ጊዜው አልፎ፦ {{slipped}}\n⛔ ተስተጓጉሏል፦ {{blocked}} |
| `bot.summary.none` | No activity to report today. | ዛሬ የሚነገር እንቅስቃሴ የለም። |

### Error messages (`bot.error.*`)

| Key | English | Amharic |
|---|---|---|
| `bot.error.invite_invalid` | This invite link isn't valid. Please ask your manager for a new one. | ይህ የመጋበዣ ማስፈንጠሪያ ትክክል አይደለም። እባክዎ ከሥራ አስኪያጅዎ አዲስ ይጠይቁ። |
| `bot.error.invite_expired` | This invite link has expired. Please ask your manager for a new one. | ይህ የመጋበዣ ማስፈንጠሪያ ጊዜው አልፎበታል። እባክዎ ከሥራ አስኪያጅዎ አዲስ ይጠይቁ። |
| `bot.error.no_token` | To join, tap the invite link your manager shared in your group. | ለመቀላቀል፣ ሥራ አስኪያጅዎ በቡድኑ ያጋሩትን የመጋበዣ ማስፈንጠሪያ ይንኩ። |
| `bot.error.unknown_user` | I don't know you yet. Tap your company's invite link to join. | እስካሁን አላውቅዎትም። ለመቀላቀል የኩባንያዎን የመጋበዣ ማስፈንጠሪያ ይንኩ። |
| `bot.error.task_unavailable` | This task isn't available to you. | ይህ ተግባር ለእርስዎ አይገኝም። |
| `bot.error.task_gone` | This task no longer exists. | ይህ ተግባር ከእንግዲህ የለም። |
| `bot.error.generic` | Something went wrong. Please try again in a moment. | የሆነ ችግር ተፈጥሯል። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ። |

---

## 5. Flows

### a. Join via invite link → name captured once → confirmation

```
Manager pastes ONE reusable invite link into the company Telegram group.
Employee taps it → Telegram opens the bot → Telegram sends /start <token>.
```

| Step | Bot does | Message / buttons |
|---|---|---|
| 1 | Validate token. If OK and this Telegram user is **new** to the org: create/link the user (status ACTIVE), set state `awaiting_name`. | `bot.start.welcome_ask_name` (with `{{company}}`) |
| 2 | User types their name (plain text). Save it, clear `awaiting_name`. | `bot.start.joined` (with `{{name}}`, `{{company}}`) |

**Name is asked exactly once.** After step 2 the name is stored; any later `/start <token>` returns `bot.start.already_joined`. If the user abandons at step 1 (never sends a name), the next message they send resumes the name capture — they are still in `awaiting_name`.

Error branches at step 1:

| Situation | Response |
|---|---|
| Token not found / malformed | `bot.error.invite_invalid` |
| Token past `expiresAt` | `bot.error.invite_expired` |
| `/start` with **no** token | `bot.error.no_token` |
| This Telegram user is already an ACTIVE member of the org | `bot.start.already_joined` |

### b. New task notification → Started / Done / Blocked

1. A task is assigned (dashboard, AI-confirmed, or recurring). The bot sends the **new task card** (§3) to the assignee, status **Not started**, buttons `[▶️ Started] [✅ Done] [⛔ I'm stuck]`.
2. The user taps a button → the bot **edits the same card** and shows a toast:

| Tap | Toast | Card becomes | New buttons |
|---|---|---|---|
| ▶️ Started | `bot.toast.started` | `▸ In progress` | `[✅ Done] [⛔ I'm stuck]` |
| ✅ Done | `bot.toast.done` | `✅ Done {{when}}` (via `task.card.done_at`) | `[↩️ Reopen]` |
| ⛔ I'm stuck | `bot.toast.blocked` | *(enters flow c)* | `[✖️ Cancel]` |
| ↩️ Reopen (from Done) | `bot.toast.reopened` | `▸ In progress` | `[✅ Done] [⛔ I'm stuck]` |

Every tap is **idempotent** (Telegram redelivers): a repeated tap re-renders the same state, never double-writes. Allowed transitions follow the state machine (docs/architecture.md §7); a tap that isn't allowed just re-renders current state with no change.

### c. Blocked → reason prompt → reason captured → confirmation

1. User taps **⛔ I'm stuck**. The status is **not** changed yet (a blocker requires a reason, §7). The bot edits the card to append the prompt line and show a Cancel button, and sets state `awaiting_blocker_reason:{taskId}`.
   ```
   Deliver the Bole site report
   🗓 today 5:00 PM
   👤 Selamawit
   ▸ In progress
   ⛔ What's stopping you? Reply below.      ← bot.blocked.ask_reason
   [✖️ Cancel]
   ```
2. User replies with a short text note → the bot records the transition to **Stuck** with the reason (writes `tasks` + a `task_updates` row in one transaction), clears the state, edits the card:
   ```
   Deliver the Bole site report
   🗓 today 5:00 PM
   👤 Selamawit
   ▸ Stuck
   ⛔ Stuck: waiting for the printer      ← task.card.blocked_reason
   [▶️ Started] [✅ Done]
   ```
   and sends `bot.blocked.saved`.
3. If the user taps **✖️ Cancel** → revert the card to its previous status/buttons, clear the state, toast `bot.toast.cancelled`.

Edge: if the user sends a **photo/voice** (not text) while `awaiting_blocker_reason`, the media is saved as **proof** on that task and the bot re-asks with `bot.proof.ask_reason_instead` (state stays until a text reason arrives).

### d. Photo / voice / text sent while a task is in focus → proof attached

- **Focus rule:** the message is a reply to a task card → that task; otherwise the task the user last tapped within 15 minutes.
- Any photo, voice note, or text (that isn't a command and isn't consumed by a higher-precedence state) is stored as a **PROOF** `task_updates` row (we keep Telegram's `file_id`, we don't store the media, §4.6). Confirm with `bot.proof.attached`.
- No task in focus → `bot.proof.no_task`.
- A linked user sends stray text with nothing in focus and no reply → `bot.hint.use_buttons`.

### e. Commands

**/today** — tasks due today for this user.
- Has tasks: send `bot.today.header` `{{count}}`, then one task card per task (each fully actionable).
- None: `bot.today.none`.

**/mytasks** — all open tasks (Not started, In progress, Stuck).
- Has tasks: `bot.mytasks.header` `{{count}}`, then one card per task.
- None: `bot.mytasks.none`.

**/language** — toggle language.
```
Choose your language:                    ← bot.language.prompt
[🇬🇧 English] [🇪🇹 አማርኛ]
```
On tap: save the user's locale, reply `bot.language.changed` **in the newly chosen language**.

**/help** — `bot.help`:

English:
```
I help you keep track of your work.
• /today — see today's tasks
• /mytasks — see everything you have open
• /language — switch English / አማርኛ
On any task, tap ▶️ Started, ✅ Done, or ⛔ I'm stuck.
Reply to a task with a photo or note to attach proof.
```
Amharic:
```
ስራዎን እንዲከታተሉ እረዳዎታለሁ።
• /today — የዛሬ ተግባሮችን ይመልከቱ
• /mytasks — ክፍት ያሉትን ሁሉ ይመልከቱ
• /language — በእንግሊዝኛ / አማርኛ ይቀያይሩ
በማንኛውም ተግባር ላይ ▶️ ጀመርኩ፣ ✅ ጨረስኩ ወይም ⛔ ተቸግሬያለሁ ይንኩ።
ማስረጃ ለማያያዝ ለተግባሩ በፎቶ ወይም በማስታወሻ ምላሽ ይስጡ።
```

### f. Deadline reminder & end-of-day nudge

Both are delivered by the job runner (docs/architecture.md §8) as **new** cards (a reminder is a new event). Tapping a button on a reminder edits **that** message; the DB is the source of truth, so multiple cards for one task each stay correct.

**Deadline reminder** (`TASK_REMINDER`) — a task card prefixed with `bot.reminder.due`:
```
⏰ Reminder — due today 5:00 PM
Deliver the Bole site report
▸ Not started
[▶️ Started] [✅ Done] [⛔ I'm stuck]
```

**End-of-day nudge** (`END_OF_DAY_NUDGE`) — sent to assignees with untouched (still Not started) tasks; one card per task prefixed with `bot.nudge.eod`:
```
🌙 Before you finish today — this one hasn't been started:
Deliver the Bole site report
🗓 today 5:00 PM
[▶️ Started] [✅ Done] [⛔ I'm stuck]
```

### g. Manager's end-of-day summary

Delivered to the **manager's** Telegram (the manager's only bot contact, docs/product.md §5). `DAILY_SUMMARY` job, scheduled in the org's timezone.

- Normal: `bot.summary.header` (`{{company}}`, `{{date}}`) followed by the **AI-written** recap body (prose, not an i18n string — it's generated per §10). No buttons.
- **AI unavailable (graceful degradation, §10 rule 5):** send the i18n `bot.summary.fallback` with counts instead:
  ```
  🌇 Acme Trading PLC — Mon, 2 Sep
  ✅ Done: 7
  ⏳ Past due: 2
  ⛔ Stuck: 1
  ```
- Nothing happened today: `bot.summary.none`.

---

## 6. Error paths (all cases)

| Case | Where | Behaviour |
|---|---|---|
| Invalid invite token | `/start <token>` | `bot.error.invite_invalid`; no account change. |
| Expired invite | `/start <token>` | `bot.error.invite_expired`. |
| `/start` with no token | `/start` | `bot.error.no_token`. |
| Already-joined user re-taps link | `/start <token>` | `bot.start.already_joined`; name is **not** asked again. |
| Unknown user messages the bot | any message, not linked | `bot.error.unknown_user`. Never reveal anything about other orgs. |
| Callback for a task in **another org** | button tap | Verify the task's `orgId` against the acting user's org (§9). Mismatch → toast + message `bot.error.task_unavailable`. Do not edit or reveal the task. |
| Callback for a **deleted/missing** task | button tap | `bot.error.task_gone`; remove the buttons from that message so it can't be tapped again. |
| Callback is a stale/duplicate tap | button tap | Idempotent: re-render current status, no second write, benign toast. |
| Wrong input type for a step | e.g. photo while `awaiting_name` | Keep the state; re-ask (`bot.start.welcome_ask_name` / `bot.blocked.ask_reason`). Media during `awaiting_blocker_reason` is saved as proof then re-asked (`bot.proof.ask_reason_instead`). |
| **Telegram send failure** | any outbound send | Not user-facing. All sends go through the `jobs` queue (§8): the job fails, backs off exponentially, and retries (maxRetries 5). Logged with `orgId`/`jobId`, never the message content (§12). After the final failure the job is `FAILED` and the delivery problem is surfaced on the **dashboard** (e.g. "couldn't reach {employee}") — the bot does not message the employee, because it can't reach them. |
| Unexpected handler error | anywhere | Caught by the bot's global handler; user sees `bot.error.generic`; full error logged server-side. |

---

## 7. Notes for implementation (later)

- Handlers stay thin: parse → call a service → render (§9). All copy comes from `messages/` builders over these keys; nothing hardcoded.
- `{{due}}` / `{{when}}` / `{{date}}` are pre-formatted by `lib/time.ts` (+ optional Ethiopian date) before they reach a message builder.
- Card rendering reads the **current** task status from the DB at send time, so reminders/nudges are always accurate even if an older card exists.
- Open questions to resolve before coding: (1) should **Done** offer `↩️ Reopen` indefinitely or only for a short window? (2) group `/mytasks` cards by status with a header per group, or a flat list? (3) exact focus window (15 min assumed) for proof attachment.
