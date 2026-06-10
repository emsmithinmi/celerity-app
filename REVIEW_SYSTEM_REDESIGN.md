# Review System Redesign — Session Notes (2026-06-09)

## What We Built

Replaced the old 4-step gated review flow (Capture → Clarify → Reflect → AI Review) with a clean two-step design.

---

## Step 1: Get Current (`src/pages/Reviews.jsx`)

The user processes their system before the AI sees it. No gating — leave when ready.

**Top section — Email Feed**
- Three tabs: Action | Waiting | New
- Pulls from `gmail-context` edge function
- Each email row shows: subject, sender, date
- ⭐ Star indicator on work emails (starred = auto-forwarded from work address via Gmail filter)
- Action buttons per row: Create Task | Create Project | Create Person
- Created items land in inbox for processing in the tabs below

**Middle section — Calendar Strip**
- Shows next 4 days of Google Calendar events
- Read-only, collapsible — just awareness before the AI chat

**Bottom section — Tabs: Tasks | Projects | People**
- Full list for each type (all active statuses, not just inbox)
- Inline action buttons on every row (same as the old Clarify section but expanded)
- Capture button at top of each tab
- Tasks: Did It, Next Action, Schedule, Route to Project, Someday, Scrap
- Projects: Start, Complete, Waiting, Stalled, Scrap
- People: Create follow-up task, link to person page
- **Fix:** Scheduled tasks no longer show a "Move to next action" button — that's a demotion, not a promotion

**"Ready for Review →" button** — creates a new review record in DB, advances to Step 2

---

## Step 2: Make a Plan (`src/pages/Reviews.jsx` → `MakePlanStep`)

Free-form AI chat. No pre-generated questions. No suggestion cards.

**Flow:**
1. Component mounts → calls `buildReflectContext()` to load full system context
2. AI generates a personalized opening message based on what it sees (`generateReviewOpening`)
3. User chats freely — ask it to mark things done, create tasks, archive emails, whatever
4. AI has full tool access inline: create_task, update_task, update_project, archive_email, calendar ops
5. User clicks **"Wrap it up"** → AI generates top_of_mind + summary → writes to `reviews` table → `completeReview()` → navigates to tomorrow's Daily page

**Key behavior:**
- AI does NOT auto-wrap-up mid-conversation (freeform mode — `ready: true` only fires if user explicitly says they're done)
- Actions happen in the chat, not on separate suggestion cards
- On complete: summary stored in `reviews.summary`, content in `reviews.content`

---

## Database Change

Dropped the unique constraint `reviews_type_date_unique` on `(type, date)`.

**Why:** Multiple reviews per day are now allowed. Run one Friday morning, run another Friday afternoon after things change — each one is a standalone session. Skipping days (weekends, vacations) no longer breaks anything.

---

## Daily Page Changes

- **Gate removed** — the "Yesterday's review isn't done" wall is gone entirely. Daily page always loads.
- **Brief source** — `DailyBrief` still reads from `daily_notes.daily_brief` for now. **Next step (not yet built):** read top_of_mind + summary from the most recent `reviews` record instead. This is the logical next thing to work on.

---

## Files Changed

| File | What changed |
|------|-------------|
| `src/pages/Reviews.jsx` | Complete rewrite — 1592 lines → ~750 lines |
| `src/pages/Daily.jsx` | Removed gate check (~40 lines deleted) |
| `src/lib/api/reviews.js` | Added `createReview()` (always creates new, no upsert) |
| `src/lib/ai/skills/reflectReview.js` | Added `generateReviewOpening(ctx)`, added `freeform` param to `generateConversationalResponse()` |
| `src/components/daily/QuickCaptureModals.jsx` | Added `initialValues` prop support for email → task/project/person prefill |
| `supabase/functions/gmail-context/index.ts` | Added `starred: boolean` to ThreadSummary (deployed) |

---

## What's Next (pick up here)

1. **Wire Daily page brief to reviews table** — `DailyBrief` component reads `note?.daily_brief` from `daily_notes`. Change it to fetch the most recent completed review and read `reviews.summary` or `reviews.content.plan` instead. `daily_notes` stays for habits, user notes, and code challenge only.

2. **Clean up `writeReflectResults`** — still writes top_of_mind/agenda/challenge/quote to `daily_notes` (legacy path). Once #1 is done, this write can be removed.

3. **Weekly/Monthly reviews** — currently show "coming soon." Needs design and implementation.

4. **Color theme system** — extend CSS variables beyond sidebar chrome to all page content, cards, modals, forms.
