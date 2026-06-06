# Changelog

All notable changes to Focus Flow are recorded here.

---

## 2026-06-06 (Session 14 cont. 2)

### Fixed
- **Consistent action button colors in Reviews** — "Did It" now uses red (danger) and "Next Action / Move to Next Action / Clear Blocker" uses green (success) throughout all task status groups in the Clarify section. Matches the color semantics used in TaskPage and TaskDetail. "Scrap it" downgraded from red to ghost since scrap ≠ done. "Queue it" aligned to secondary (neutral organizational move).

---

## 2026-06-06 (Session 14 cont.)

### Changed
- **Review sections renamed to GTD terms** — "What's on your mind?" → **Capture**, "What does each item mean?" → **Clarify**. The old Reflect section is now two separate sections.
- **Clarify section now has tabs** — filter inbox items by category: All | Tasks | Projects | People | Stalled | Overdue. Each tab shows a count badge. Tabs that have zero items are hidden.
- **New Reflect section (step 3)** — a dedicated tabbed list review showing all your active lists: Next Actions | Projects | Waiting | Scheduled | Someday. Click through to any item, scan your system, then hit "Done Reviewing" to unlock the next step.
- **AI Review is now its own section (step 4)** — the AI chat, plan generation, and suggestion cards are separated from the list review. Gated behind Reflect so you scan your system before the interview starts.

---

## 2026-06-06 (Session 14)

### Added
- **Trash can in all detail modals** — TaskDetail, ProjectDetail, and PersonDetail now all have a trash icon pinned to the bottom-right of the action bar, available at any stage. No more hunting for a Discard button that only appears in certain statuses. PersonDetail gets full delete support for the first time (was only on PersonPage before).
- **Fixed TaskPage trash only showing on inbox tasks** — TrashBtn was buried inside the inbox status branch; now pinned to the right of the What's Next bar for every status.
- **Did It button on all active task statuses** — "Did It" (quick permanent delete for tasks done too fast to track) was previously only on inbox. Now available on next_action, queued, waiting, scheduled, and someday — in both TaskDetail and TaskPage.
- **Icon-only clarify action buttons** — ClarifyTaskRow action buttons in the Review page now show Lucide icons instead of text labels. Cleaner, less visual noise. Tooltips still there for discoverability.
- **Conversational AI review interview** — the Reflect section's AI chat now makes a real AI call on every user turn instead of rigidly cycling through pre-scripted questions. It reacts to what you actually said, has personality, and organically weaves in remaining topics rather than ignoring your input.
- **Missed review banner** — the Reviews page now detects gaps in the past 7 days of daily reviews and shows an orange banner at the top if any were missed, listing the specific dates.
- **Morning review date fix** — when running a review via `?gate=today` (morning mode), the AI context now reads yesterday's habits and plans for today instead of incorrectly reading today's empty habit state and planning for tomorrow.
- **Review memory** — at the end of each review, the AI summarizes the conversation into a structured memory (themes, wins, struggles, commitments, people mentioned, energy level) stored in `reviews.summary`. On the next review, the last 20 summaries are pulled and injected into the AI context so it can notice patterns, follow up on things you said you'd do, and acknowledge progress over time. Works across question generation, the live interview, and the final plan.
- **Gap-aware review** — the review now finds your last completed review and covers everything since then, not just yesterday. If you skipped the weekend, the AI knows it was 3 days, pulls calendar events from the gap, detects weekend/holiday days, and opens with a natural question like "How was the weekend?" before getting into work. The header pill and opening greeting both show the full date range covered.

---

## 2026-06-05 (Session 13 — Reviews page redesign)

### Changed
- **Reviews page is now a single scrollable page** — replaced the 3-step wizard with stacked sections (Capture → Clarify → Reflect) all visible at once. No more "kicked back to the start" from step navigation. Completed items stay visible; you can scroll back up and add a capture mid-clarify without losing progress.
- **Sections are dependency-gated** — Clarify is locked (subdued, non-interactive) until Capture is marked done; Reflect locks until Clarify is done. Completion state persists to the DB so returning to the page restores where you left off.
- **AI interview starts automatically** when the Reflect section unlocks, no extra navigation needed. Fixed the stale-closure race condition from the old `setTimeout` + `aiConfigured` pattern; replaced with a `cancelled` flag and `aiConfiguredRef.current`.
- **Reset button in header** — one click wipes today's review content and restarts from scratch. Useful for testing without waiting until end of day.

---

## 2026-06-04 (Session 12 — bug fixes, UX polish, birthday awareness)

### Fixed
- **Daily Review resuming completed session** — clicking Daily Review after already completing it now resets to Step 1 (Capture) instead of dropping back into the finished Reflect conversation.

### Changed
- **Tasks and Projects pages default to smart tab** — both pages open on Inbox; if Inbox is empty, they auto-switch to Next Actions (Tasks) or In Progress (Projects) so you land on something useful.
- **All task and project titles are now clickable** — unified navigation across Daily page task/project lists, Agenda all-day items, and the Project detail task list. Everything goes to the detail page on click. Removed the inline task modal from the Project page task list in favor of full-page navigation.

### Added
- **Birthday awareness in AI review** — the reflect skill now queries your People for upcoming birthdays (7-day window). Birthdays within 2 days surface in top-of-mind; within 3 days get a reminder suggestion card. The interview questions can also reference them by name.

---

## 2026-06-04 (Session 11 continued — AI layer + agenda refresh)

### Added
- **Agenda refresh button** — small refresh icon next to the Agenda header. Spins while fetching, re-pulls calendar events for the current date without a full page reload.

---

## 2026-06-04 (Session 11 continued — AI layer)

### Added
- **Gmail integration in review** — new `gmail-context` Edge Function fetches your `@Action 🚨` and `@Waiting⌛` label threads (with age in days) plus recent unread email (last 48h). Both the Daily Review and Reflect flows receive this data and can suggest turning stale action items into tasks, flagging people to add, or noting emails worth acting on.
- **7-day calendar lookahead** — review AI now sees the full week ahead instead of just tomorrow. Suggests prep tasks for upcoming events, respects a packed calendar when building the agenda.
- **AI personality upgrade** — all three review prompts (question generator, plan builder, daily review) rewritten with a warmer, wittier voice. Referencing real email subjects, calendar events, and project names by name. Completion message updated to match.

---

## 2026-06-04 (Session 11 continued)

### Added
- **Morning gate** — Daily page now checks if yesterday's review was completed on load. If not, a blocking prompt appears before any daily content with a "Run Yesterday's Review" button. Skip link available for flexibility.
- **Review targets correct day** — Reviews triggered by the morning gate write to today's daily note instead of tomorrow's. Voluntary evening reviews continue to write to tomorrow. Works for both the Daily Review and Reflect flows.
- **Review state persists in DB** — Step position, conversation, questions, Q index, scratchpad, and scratchpad visibility are all saved to `reviews.content` on every change. Navigate away, come back on any device — it's exactly where you left it.
- **Inline clarify actions** — Inbox tasks and overdue tasks in the Clarify step now show the full What's Next button set inline. Actions that need extra info (Schedule → date picker, Waiting → blocker reason, Assign to Project → project picker) expand an inline prompt instead of a modal or disabling the button.

### Fixed
- **No future dates on Daily page** — Forward navigation is now disabled at today. The chevron grays out; no future browsing.

---

## 2026-06-04 (Session 11)

### Fixed
- **Quote mismatch after Reflect review** — the Reflect review now writes the chosen quote directly to tomorrow's daily note (same as the Daily Review skill). Previously the quote only appeared as a suggestion card and never made it to the page.
- **Future days show empty quote** — browsing forward to a future date no longer shows a fallback quote. Future daily pages leave the quote section blank until the review runs for that day.

---

## 2026-06-03 (Session 10)

### Added
- **Someday/Maybe for projects** — new status and tab on the Projects page (excluded from "All Active" so it doesn't inflate your workload view). Send any inbox project to Someday/Maybe with one click — no area, dates, or description required. From Someday/Maybe you can clarify in place and promote to Planning, or delete it.
- **Review staleness tracking** — `reviewed_at` timestamp stamped automatically each time you open a Someday/Maybe project. The row shows how many days since last review, highlighted amber at 30+ days.
- **AI daily review alerts** — the daily review AI now flags Someday/Maybe items not reviewed in 30+ days and nudges you to act or delete. Someday/Maybe is not a storage bin.

---

## 2026-06-03 (Session 9)

### Changed
- **Agenda — rolling 4-hour timeline** — the Agenda section now shows a live timeline from now to 4 hours ahead, always visible even with no events. Hour markers tick forward in real time. Calendar events appear as blocks at their correct position. Empty time reads "open time."

---

## 2026-06-03 (Session 8)

### Changed
- **AI personality** — Review interview and daily plan AI prompts now have a warmer, more conversational tone. Less corporate performance-review, more "colleague grabbing coffee after work." UI copy updated to match.

---

## 2026-06-03 (Session 7)

### Fixed
- **Daily Agenda** — was pulling from the static `calendar_events` table (all calendars); now calls the `google-calendar` edge function so only Focus Flow calendar events appear, consistent with the AI review.

---

## 2026-06-03 (Session 6)

### Changed
- **Tab order** — Tasks, Projects, and People pages now open to Inbox by default; "All Active" / "All" tab moved to the far right.
- **Daily page tabs** — Projects and Tasks sections on the Daily page now also show count badges, default to Inbox, and include the full status set (Projects gains an Inbox tab).

---

## 2026-06-03 (Session 5)

### Added
- **Tab counts** — Tasks, Projects, and People tab bars now show item counts as badges on every tab (hidden when zero).
- **PWA reload prompt** — a "New version available" toast appears at the bottom of the screen when a new service worker is ready, letting you update on demand instead of having to manually refresh.

---

## 2026-06-03 (Session 4 continued)

### Added
- **Google Calendar edge function** — new `supabase/functions/google-calendar` fetches live events from the Focus Flow calendar using stored OAuth tokens. Auto-refreshes access token if expired.
- **Live calendar in daily review** — `dailyReview.js` now calls the edge function instead of querying the static `calendar_events` table. Falls back gracefully if no Google integration exists.
- **Edge function secrets** — `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` stored in Supabase secrets.

## 2026-06-02 (Session 4)

### Added
- **Google Sign-In** — Login page now has a "Continue with Google" button alongside magic link. OAuth flow requests Calendar + Gmail scopes so Google APIs are available post-login.
- **`user_integrations` table** — stores Google OAuth access/refresh tokens per user. Auto-populated by AuthContext after any Google sign-in.
- **`user_settings` table** — per-user settings including `google_calendar_id` (pre-seeded with Focus Flow calendar ID) and `theme`. Replaces localStorage for cross-device persistence.
- **AuthContext token persistence** — after Google OAuth callback, provider tokens are automatically saved to `user_integrations` for use by edge functions.

## 2026-06-01 (Session 3)

### Fixed
- **UTC date bug (global sweep)** — `toISOString().split('T')[0]` returns UTC date, which was rolling to tomorrow for US timezones after ~8pm. Replaced with `toLocaleDateString('en-CA')` (YYYY-MM-DD local) across all 11 affected files: Daily, Reviews, Habits, HabitPage, TasksSection, TaskRow, ProjectRow, PersonDetail, daily.js, dailyReview.js, reflectReview.js.
- **Daily page showing tomorrow** — "Back to Today" button was always visible because `todayStr()` returned the UTC date. Now correctly uses local date.
- **Reviews date** — review session was loading/creating tomorrow's record instead of today's.
- **Generate Tomorrow's Plan silent fail** — "Review record missing" error was caused by a race condition in `ensureReview`: two rapid calls (React StrictMode double-invoke) both passed the existence check and raced to insert, the second threw a unique constraint violation, the error was swallowed, and `review` was left null. Fixed with: (1) retry-fetch on insert error in `ensureReview`, (2) unique constraint `(type, date)` added to `reviews` table replacing the plain index, (3) visible error state + Retry button in Reviews page instead of silent swallow.
- **Duplicate review row** — cleaned up existing duplicate `daily / 2026-06-02` row left by the race condition.

## 2026-06-01 (Session 2)

### Added
- **Focus Flow rebrand** — app renamed from Celerity to Focus Flow. FF icon added as favicon, PWA icon, and sidebar logo mark.
- **AI-picked daily quotes** — 400-quote curated pool (Stoicism 20%, Science 20%, Comedians 20%, Movies 15%, Software humor 15%, Motivational 10%). AI picks contextually from a weighted 30-candidate shortlist, avoiding last 30 days of repeats. Writes to `daily_notes.quote` for persistence.
- **Quote skip button** — hover the quote to reveal a skip button. Picks a random pool replacement and writes to DB instantly.
- **Sidebar pin/unpin** — pin locks sidebar open at 224px; unpin collapses to 56px icon strip and hovers out as an overlay with drop shadow. State persists to localStorage.
- **PencilBtn / TrashBtn** — centralized in `src/components/ui/IconBtn.jsx`, exported from the UI barrel. Eliminates copy-paste drift across pages.

### Changed
- **Full color theme system** — theme switching now re-themes the entire app. ~300 hardcoded hex values replaced with CSS custom properties across 45 files. 60+ tokens added covering all surfaces, text tones, accent palette, state banners, challenge badges, review cards, and button variants. GitHub Dark fully mapped.
- **Trash button** — moved to far right (ml-auto) on all What's Next action bars (Task, Project, Person).
- **Area field** — converted from `<input list>/<datalist>` to `<select>` in all 4 locations. Matches Priority and Energy Level visually. Fixes silent bug where `a.value` was used instead of `a.label`.
- **Themed select dropdowns** — all `<select>` elements get dark background and custom chevron via global CSS.
- **Daily section dividers** — removed horizontal lines between sections. Spacing handles the separation.
- **Daily notes** — individual card stack matching task notes style. Fixed save bug where second note could be silently dropped (re-fetching DB instead of using local state).
- **TopOfMind edit button** — replaced ✏️ emoji with standard PencilBtn component.
- **CLAUDE.md** — corrected areas table schema (`value, label, sort_order` — not `name`).

### Fixed
- **GTD inbox flow** — inbox tasks with a project assigned now offer "Queue it" instead of "Put Me in Coach". Correct GTD order: inbox → queue → next action.
- **Assign to Project** — hidden in What's Next when a project is already assigned (inbox and next_action status).
- **Sidebar avatar/pin overlap** — avatar only shows when sidebar is expanded; pin button appears on hover only, transparent at rest.

## 2026-06-01 (7)

### Changed
- **Code Challenge habit** hidden from the daily Habits section — still tracked on the Habits page and auto-marked when a challenge is submitted.

## 2026-06-01 (6)

### Fixed
- **Agenda showing wrong projects** — `end_date` and `start_date` filters were silently ignored in `getProjects`, causing all projects to appear. Now correctly filters to projects whose end date matches the viewed day.

---

## 2026-06-01 (5)

### Added
- **Google Calendar integration** — `calendar_events` table stores synced events. Agenda now shows real calendar data: all-day events at top, timed blocks (Morning Routine, Workday, Therapy, Guys Night, etc.) in chronological order below. Events synced via Claude Code MCP connection to Google Calendar.
- Tasks due that day and project deadlines appear as dimmed all-day items alongside calendar entries, as discussed.
- Daily Review AI now reads tomorrow's `calendar_events` as context; only real calendar times appear in the AI's agenda output — no more fabricated time blocks.

### Note
Calendar sync currently requires a manual Claude Code session to push new events to the DB. Automated daily sync via scheduled task is the next step.

---

## 2026-06-01 (4)

### Fixed
- **Agenda filtering** — tasks now only appear on their `due_date`; projects only appear on their `end_date` (start date removed). All-day items (tasks, project deadlines) render at the top of the card with an "all day" label. AI-generated timed blocks from the Daily Review render below them — only real calendar times are shown.

---

## 2026-06-01 (3)

### Fixed
- **Agenda not showing** — `AgendaSection` was ignoring `daily_notes.agenda` entirely; now renders AI-generated timed items from the stored agenda alongside live scheduled tasks and project dates.

### Added
- **`habit_code_challenge`** column on `daily_notes`; added to the Habits list (💻 Code Challenge). Submitting a challenge answer auto-marks it complete.

### Changed
- **Challenge section** is now collapsed by default — click to expand. Renamed from "Daily Challenge" to "Challenge". Quiet, always visible as a header row.
- **Daily Review AI** now fetches the most recent completed challenge, passes the prompt + user answer to the AI for critique (`ai_feedback`), and generates a new challenge that builds on the last. If no completed challenge exists, generates a fresh beginner one. New challenges always start with `completed: false`.

---

## 2026-06-01 (2)

### Changed
- **Comments → Notes** — all visible "Comments" labels and tab names renamed to "Notes" across TaskPage, ProjectPage, PersonPage, and their modal counterparts (TaskDetail, ProjectDetail, PersonDetail). Internal component and function names unchanged.

---

## 2026-06-01

### Added
- **Context tags on tasks** — `context text[]` column added to the `tasks` table. Tags appear as `@tag` chips in task list rows. Full tag management on the task detail page (`/tasks/:id`) in a dedicated Context Tags section, and in a Context tab on the task modal.
  - Dropdown combobox shows all tags used across your tasks as toggleable chips
  - Free-text input for creating new tags; saves immediately on the full page, with the form on the modal
- **Theme switcher** — Catppuccin Mocha (default) and GitHub Dark themes available in Settings → Appearance. Choice persists to `localStorage`.

### Changed
- **Sidebar layout** — user avatar and email moved to the top of the sidebar; "Celerity" label and Sign Out button moved to the bottom.

---

## 2026-05-30

### Added
- **Daily Review overhaul** — 3-step guided flow replacing the single-page form
  - Step 1: Capture (free-form notes)
  - Step 2: Clarify (AI-assisted triage)
  - Step 3: Reflect (synthesis and planning)
- **AI layer** — brand-agnostic AI client routing all calls through Supabase Edge Function proxy to avoid CORS
  - Supports Anthropic, OpenAI-compatible providers (Groq, Mistral, Gemini, Ollama, Custom)
  - Provider/model/API key stored in Supabase `user_metadata` (never in the bundle)
  - Daily Review skill: pulls active projects, tasks, last 30 notes, habit state; generates top_of_mind, agenda, code_challenge, quote, suggestions; writes to tomorrow's `daily_notes` and today's `reviews` row

### Fixed
- Supabase Edge Function CORS issue — all AI calls now proxied server-side

---

## 2026-05-29

### Added
- **Task subtask checklist** — JSONB `subtasks` field on tasks; pencil-edit and check-off saves immediately
- **Avatar images** — upload profile pictures for People records and for your own user account (stored in Supabase `avatars` bucket, URL saved in `user_metadata`)
- **Extended People profiles** — rich contact info: professional title, relationship, contact type, occupation, company, personal/work email+phone, birthday, home and work addresses, social media handles (dynamic list), notes, `is_stale` flag
- `people_contact_type_check` constraint dropped so new contact types can be added freely

### Changed
- App renamed from **GTD Manager** to **Celerity** across all config, UI, and deployment references

### Fixed
- Removed duplicate Notes field from task details
- Added comment delete on task, project, and person detail pages

---

## 2026-05-26

### Added
- **Day navigation on the Daily page** — ‹ › chevrons around the day name let you browse any past or future date; a "↩ Back to Today" pill appears when you're not on today; navigating to a day without a note creates one automatically
- **Settings page** (`/settings`) — manage Energy Levels, Priorities, and Areas directly in the app with no code changes or DB migrations needed
  - **Energy Levels**: add/edit/delete, full color picker, live badge preview
  - **Priorities**: add/edit/delete, badge color pickers, live preview; `tasks_priority_check` and `projects_priority_check` constraints dropped so new values can be added freely
  - **Areas**: simple name list with add/rename/delete; shown as autocomplete suggestions (`<datalist>`) in task and project forms — free-text still allowed
- Settings ⚙️ link added to sidebar above Sign out
- `EnergyLevelsContext`, `PrioritiesContext`, `AreasContext` — each fetches from the DB once at app load and shares data app-wide via React context
- Daily notes can now be **expanded** (Show more / Show less), **edited inline**, and **deleted** — pencil and trash icons on each note entry
- **Errand** energy level added (purple badge, 🛒)
- **Scrap it** button on Project pages — permanently deletes the project and all its tasks (cascade: junction tables → comments → tasks → project)
- `deletePerson()` with full cascade (task_people, project_people, people_comments)

### Changed
- **Stat cards on Daily page**:
  - Moved from above Top of Mind to directly below it
  - Relabelled: Projects in Progress · Next Actions · Due Today · Tasks Waiting · Stalled Projects
  - **Due Today** now includes: tasks with `due_date` on the viewed date, all scheduled tasks, urgent/STAT priority tasks (deduped, done excluded), and projects whose `end_date` falls on that day
  - Cards reflect the currently viewed date when navigating between days
- Stat chip numbers on **Tasks, Projects, and People** list pages changed to uniform white — removed per-status color coding
- `EnergyBadge` and `PriorityBadge` now read label, icon, and colors from the database instead of hardcoded objects
- Priority dropdowns in TaskPage, TaskDetail, ProjectPage, ProjectDetail now driven by `PrioritiesContext`
- Area fields upgraded from plain text inputs to `<datalist>` (type freely or pick from managed list)
- All "Edit" text buttons replaced with a pencil icon across Task, Project, Person, and Review pages
- Delete buttons standardised to solid red with a trash icon only — consistent across tasks, projects, and people
- "Actions" section renamed to **"What's Next?"** on Task, Project, and Person detail pages
- Daily page: horizontal padding added; New buttons and Review buttons centred
- Day-of-week text on Daily page: bold → normal weight (gold color and size unchanged)
- Daily quote now reflects the day being viewed (not always today's quote)
- `getDailyStats` accepts a date parameter; `refreshStats` in the hook uses the currently viewed date

### Fixed
- React hooks order violation on ProjectPage (`scrapping` useState was declared after early returns)

---

## 2026-05-25

### Added
- Auto-rotating **daily quote** under the date header — seeded by day-of-year, changes each day, no API calls (75 curated quotes)
- Inbox tab added to the task list on Project detail pages

### Changed
- Daily page: horizontal padding, centred New buttons bar, centred Review buttons bar
- Day-of-week text: bold → normal weight

### Fixed
- `createTask` silently dropping `project_id` — tasks created from a project now correctly linked
- `TaskPage` save: `description` missing from update payload; `duration` interval type mismatch corrected
- `try/catch/finally` added to all detail-page save handlers so loading state always resets on error

---

## 2026-05-25 — Major UX Redesign

### Changed
- Tasks, Projects, People: replaced modal-based detail views with full dedicated pages (`/tasks/:id`, `/projects/:id`, `/people/:id`)
- Dashboard replaced by stat-card strip on the Daily page
- Sidebar is now collapsible (icon-only mode)
- All list pages show a stat summary row and navigate on row click

---

## 2026-05-23 — Initial Build

### Added
- Project scaffold: Vite + React 18 + Tailwind CSS v4 + Supabase + React Router v6
- Magic link authentication with custom SMTP via Resend
- Core UI component library: Button, Modal, ConfirmDialog, StatusPill, PriorityBadge, EnergyBadge, DurationDisplay
- **Daily page** — date header, top-of-mind, agenda, habit toggles, notes log, quick capture modals
- **Tasks page** — full GTD lifecycle (Inbox → Next Action → Queued → Waiting → Someday → Done)
- **Projects page** — tabbed by status, task list, comments, linked people
- **People page** — contact lifecycle (Inbox → Active → Stale), linked tasks/projects, comments
- **Habits page** — calendar heatmap, streaks, percentage bars, time-frame selector
- **Reviews page** — Daily / Weekly / Monthly with autosave and suggestion cards
- PWA: service worker (Workbox generateSW), app manifest, installable on mobile
- GitHub Actions deploy: push to `main` → `npm run build` → Cloudflare Pages via Wrangler
- Supabase RLS on all tables (`USING (true)`, `GRANT ALL TO authenticated`)

---

## 2026-05-20

- Initial file upload to repository
