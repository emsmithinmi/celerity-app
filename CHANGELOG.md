# Changelog

All notable changes to Focus Flow are recorded here.

---

## 2026-06-22

### Changed
- **TaskPage "What's Next?" actions are full-width outlined buttons** — the plain text list is back to real buttons: tall, wide, stacked vertically, all uniform. Uses the new `outline` Button variant (transparent bg, accent-colored border + text, fills on hover). Theme-aware automatically: GitHub Dark gets accent blue, Cobalt2 gets the signature gold/yellow, Catppuccin gets its lavender. Duplicate and Discard stay as small muted text below. Completed-state actions (Add to Highlights, Archive, Duplicate, Permanently Delete) got the same button treatment.
- **Button: new `outline` variant** — transparent background, `--accent` border and text, fills to `--accent` bg with `--app-bg` text on hover. Supports `hoverText` in the variant map (new) so hover can swap text color too.

---

### Changed
- **TaskPage "What's Next?" section is now a centered text list, not buttons** — the lifecycle action grid (Did It / Schedule / Queue / Waiting / Reschedule / Assign to Project / Clear Blocker, etc.) was replaced with a single unified centered vertical list of six plain-text click targets for any active task, in order: **Add to Next**, **Mark Done**, **Schedule**, **Add to Project Queue**, **Set to Waiting**, **Add to Someday/Maybe**. Same handlers behind the scenes (Add to Next goes through `handleClarifyRoute` if the task is still in inbox and unclarified; Add to Project Queue opens the RouteModal when no project is assigned). Header is centered too. Beneath the list, a small muted row keeps **Duplicate** and **Discard** (red) accessible. Completed-state actions (Add to Highlights / Archive / Duplicate / Permanently Delete) got the same centered-text treatment for consistency.
- **"Next Action(s)" → "Next" everywhere** — status pill on every task, the Tasks-page status tab, the Daily page Tasks tab, the Project page task-list tab, and the Daily stat card all just say "Next" now. Stalled-project prose updated to match ("Move a task to Next to un-stall this project.").
- **Every identity / decorative icon stripped — sidebar nav is the only icon left in the app.** The earlier sweep of this same day swapped every emoji for a Lucide icon (Star highlights, AlertCircle deadlines, Folder area chips, status pill icons, habit row icons, energy badge icons, ChallengeSection chevrons, Reviews HardHat, Login MailOpen, TaskCompletionModal Archive/Star/Clock, etc.). On second pass the user wanted those gone too — Lucide icons everywhere outside the sidebar are now removed. Status pills are plain colored chips with just the label ("Next Action", "Inbox", "Done", etc.); energy badges show just "Deep Focus" / "Admin" / "Physical" with their colors; habit rows show only the habit name; task & project rows show just title + project/area text + due/deadline date + duration; TaskPage action buttons are label-only ("Schedule", "Archive", "Duplicate", "Permanently Delete"); TaskCompletionModal options are plain "Archive" / "Highlight"; ChallengeSection toggles to plain "Hide answer" / "Reveal answer"; Reviews under-construction is text-only; Login magic-link success is text-only. Functional icon buttons (Pencil edit, Trash delete, drag handle, Refresh, Modal close ×, Camera upload, +Plus add, Pin/PinOff sidebar) are KEPT — those are utility, not decoration. The `icon` field was removed from `TASK_STATUSES` and `HABITS` in `constants.js`. The `LucideIcon` lookup component was deleted (no longer used). The Settings → Energy Levels / Areas "Icon" input fields are removed; their badge-color editor still works, and the badge previews render with just label + colors. The `energy_levels.icon` DB values were cleared to `''` and `areas.icon` to `NULL`. The sidebar navigation icons (Sun / FolderKanban / Zap / Users / Target / NotebookText / Settings / LogOut) stay since they're the actual nav affordance when the sidebar is collapsed.

### Fixed
- **"Reconnect Google" on the Daily Agenda now actually reconnects the calendar** — the reconnect button was calling `supabase.auth.signInWithOAuth` (the app *login* flow), which only refreshes the Supabase auth session and never touches the `user_integrations` table that the calendar actually reads tokens from. So clicking Reconnect re-logged-you-in but left the dead refresh token in place — the calendar stayed disconnected. It now goes through the dedicated `google-connect` flow (`getGoogleConnectUrl` → `/auth/google-callback`), re-authorizing the `personal` account so a fresh refresh token gets upserted onto the existing row (`onConflict user_id,provider,email`). Also fixes the redirect mismatch (it was pointing at `/auth/callback` instead of `/auth/google-callback`). Diagnosed from the "Calendar connection not working" Jam, which showed `google-calendar` returning `{error:"refresh_failed", auth_required}` even after reconnect attempts.

### Changed
- **Context Tags are now first-class like Areas and Priorities** — new `context_tags` table (id, value, label, bg_color, text_color, sort_order) with CRUD in Settings → Context Tags mirroring the Areas section exactly: add, rename, recolor, delete. `ContextTagsContext` exposes them app-wide. The task tag picker on the TaskPage is now a dropdown from this list (no more free-text typing) — to use a new tag, add it in Settings first. Existing tag colors stored in the old `user_settings.tag_colors` jsonb were migrated forward (just `@Lawncare` in your case), and any tag values floating on tasks but not previously colored were carried over too. The old `tag_colors` jsonb field + the `getAllContextTags()` / `tagColors.js` helpers are gone.
- **Drag-to-reorder on all four Settings lists** — Energy Levels, Priorities, Areas, and Context Tags rows all have a real `⠿` drag handle now. Dragging a row writes new `sort_order` values for the whole list back to the DB, so the new order shows up everywhere across the app (dropdowns, badges, etc.). Replaces the old up/down arrow buttons on Priorities. Optimistic — the order updates in the UI instantly while writes finish in the background. Shared `useSortableList` hook handles the math.

### Fixed
- **Daily Agenda silently showing zero calendar events when Google auth was revoked** — the `google-calendar` edge function was catching token-refresh failures and returning `{events: []}` with no error signal, so the Agenda just looked empty (with no way to tell whether the calendar was empty or the integration was broken). The function now returns `{events, integrations: [...], auth_required}` with a per-integration status (`error`, `auth_required`), and the Daily page surfaces a yellow **"Google calendar disconnected — Reconnect Google"** banner above the Agenda timeline when a refresh fails. Clicking Reconnect kicks off the full Google OAuth flow with `prompt=consent` + offline access so a fresh refresh token gets written. Root cause for the user hitting this today: the refresh token in `user_integrations` had been revoked (last successful refresh 2026-06-15), which the old code swallowed silently.

### Added
- **Cobalt2 theme** — Wes Bos's iconic Cobalt2 (the VS Code theme) is now a third option in Settings → Appearance, alongside Catppuccin and GitHub Dark. Deep cobalt navy app background (#193549), signature electric yellow (#FFC600) for accents and active sidebar items, lime green (#3AD900) for Next Action / success states, hot pink (#FF628C) for Waiting / danger, neon cyan (#80FCFF) for Scheduled, and that warm orange (#FF9D00) for highlights. Looks straight out of Wes's editor.

### Changed
- **Theme system now reaches status pills** — Inbox / Next Action / Queued / Scheduled / Waiting / Someday / Done pills (and the project + people equivalents) were the last spot using hardcoded brand hex values from `constants.js`. They now reference new `--status-*` CSS variables in `index.css`, with parallel Catppuccin (default) and GitHub Dark palettes. Switching themes in Settings → Appearance now shifts the pills too: Catppuccin keeps the original saturated Google-style colors, GitHub Dark uses GitHub's actual badge tones (`#2ea043` green, `#e3b341` yellow, `#1f6feb` blue, etc.). The "Done" pill also lost its harsh pure-black background in favor of a theme-appropriate subtle dark surface. Dead `PRIORITIES` constant (long replaced by the user-customizable `priorities` table) was removed at the same time.

### Added
- **Per-list Sort dropdown on every task list — synced across devices** — the Tasks page (per status tab), the Daily page's Next Actions tab, and each Project's task list (per tab) now have a small **Sort: ▾** dropdown sitting on the right side of the tabs row. Modes: **Manual** (the existing drag-to-reorder), **Newest / Oldest** (by created_at), **Longest / Shortest first** (by duration; no-duration tasks sink), **Due soonest** (undated last), **Priority high → low**, **Alphabetical A → Z**, **Energy high → low**, and **Area A → Z**. The picked sort mode + the manual order are persisted to the new `list_preferences` table (keyed by `list_key`), so your sort follows you between laptop and desktop. Manual drag is disabled while an auto sort is active — switch back to Manual to rearrange. Replaces the prior localStorage-only manual-order system; the old `useListOrder` hook is gone.
- **Code Challenge is back (deterministic, no AI)** — the Daily page's Challenge section now serves one small **basic-Python refresher** at a time from a consumable bank of 25 (the new `code_challenges` table). Read the prompt, solve it in your editor, then **Mark Complete** (deletes it from the bank — one and done — and ticks the 💻 habit) or **Skip** (swaps in another, leaves it in the bank). A collapsible **Reveal answer** under each prompt shows a reference solution to compare against. Today's challenge is pinned to the day so it's stable across reloads.
- **`/refresh-challenges` skill** — when the bank runs dry, this skill generates 25 fresh basic-Python challenges and loads them into the bank via Supabase. New `src/lib/api/challenges.js` powers the bank (pick / count / delete).
- **Daily habits show the week as check-offs (Sun→Saturday)** — each habit row on the Daily page now shows seven small day-cells for the current week instead of a percentage bar. Today's cell is highlighted, future days are disabled, and any day-cell is clickable so you can back-fill a missed day right from Daily.
- **Back-fill missed habit days on the Habits page** — habit day-markers are now clickable to check/uncheck a past day: the per-habit **month calendar** (click any day) and the **last-7-day dots** on the Habits list cards (quick fix without drilling in). Clicking a day that had no entry yet creates that day's record automatically. New `setHabitForDate(date, key, value)` API helper powers all of these.
- **Subtask time rolls up into the task's Duration** — when a task's subtasks carry time estimates, the Duration field now shows the **remaining** (unchecked) time, summed from those subtasks. Check a step off and the Duration drops by that step's estimate; the read-out updates live on the task page. Tasks with no subtask estimates keep their manually-set Duration.
- **Drag handles on reorderable rows** — movable list rows now show a small grip handle (⠿). Grab the handle to drag; click anywhere else on the row still opens it. No more "is this a click or a drag?" guesswork.
- **Drag-to-reorder expanded everywhere** — the per-list custom ordering that was only on the Daily page's Next Actions now works on **all task lists**: every status tab on the Tasks page, the task list inside each Project, and the **subtasks list** within a task. Task-list order persists per list to localStorage (per-device, no DB writes, no effect on status/priority), matching the existing Daily behavior. Subtask order is saved to the task itself, so it sticks across devices. Reorder is off while multi-selecting, searching, or on the mixed "All Active" tab.

### Changed
- Refactored the Daily Next Actions drag logic into a shared `useListOrder` hook + `DragHandle` component, reused across all the lists above.
- **Daily habits: dropped the left checkbox** — each habit row now shows only the Sun→Sat week strip (today's cell already toggles today), removing the duplicate single checkbox.
- **Duration field goes read-only when subtasks drive it** — on a task whose subtasks carry estimates, the edit modal now shows the derived remaining time as a read-only value with a "Driven by subtasks" note, instead of an editable input that would just get overwritten on the next checkoff.

### Removed
- **Dead code:** deleted `TaskDetail.jsx` and `PersonDetail.jsx` — orphaned legacy edit components (the live detail UIs are the full `/tasks/:id` and `/people/:id` pages). `PersonDetail` was imported nowhere, and it was the only thing that pulled in `TaskDetail`.

---

## 2026-06-21

### Changed
- **Daily page** — Tasks section now appears above Projects section.
- **Daily page** — Notes section moved up to sit directly under the Agenda (above Tasks).

### Added
- **Next Actions drag-to-reorder** — tasks on the Next Actions tab (Daily page) can be dragged into any order. Order persists to localStorage; no DB writes, no effect on task status or priority.

### Fixed
- **Divider lines restored between Next Actions tasks** — the drag wrapper had swallowed each row's bottom border; the divider now sits on the wrapper so Next Actions matches the other tabs.
- **Stale data / double-refresh fixed** — the PWA service worker was caching Supabase reads with StaleWhileRevalidate for 5 min, so a saved change only appeared after refreshing twice. Switched to NetworkFirst (5s timeout): reads always hit the network when online, falling back to cache only offline. Changes now show on the next read. (Takes effect after the next deploy + service-worker update.)

---

## 2026-06-19

### Removed
- **All in-app AI** — Daily Brief generator, Reflect Review chat (opening, conversation, plan, tool use), Refresh Challenge, "I'm Stuck" helper, AI Settings panel, ai-proxy Edge Function, and the entire `src/lib/ai/` tree. The app is now a pure deterministic GTD tool; the brain moves outside.
- **Daily Brief section on the Daily page** — the whole block (greeting, Top of Mind list, Words for the Day) was AI-generated content. Component deleted; weather widget that lived inside it went with it. `daily_brief` and `top_of_mind` DB columns kept as future agent write targets.
- **Daily Review button** on the Daily page and all review-chat surfaces.
- **AI Refresh / Generate Brief / "↺ different one"** buttons.

### Changed
- **Reviews page** is an "Under construction" shell — Daily / Weekly / Monthly tabs preserved for repurposing once the new flow is designed.
- **Daily page** flow is now: date → quote → quick capture → stats → agenda → projects → tasks → notes → habits → challenge. No brief, no AI buttons.
- **Quote system** now picks a fresh quote every Daily-page load and on skip, excluding anything shown in the last 30 days. New **"never"** hover-button on the quote permanently blocks it (stored on the user record, syncs across devices).
- **TaskPage sections unified** — People, Context Tags, Subtasks, and Notes all use the same pattern: input row + Add button at the top of the pane, existing items below. People replaced its modal picker with an inline typeahead dropdown; Context Tags dropped the "Your tags" reusable chip strip (datalist autocomplete still surfaces existing tags); Subtasks gained an always-on quick-add row (pencil edit still available for tweaking existing steps); Notes flipped — input at top instead of bottom.
- **Same pattern brought to ProjectPage, PersonPage, and Daily Notes** — Project Notes and Person Notes flip form-to-top. Person Linked Tasks now uses an inline typeahead dropdown (modal picker gone). Person Social Media gets an always-on "Platform | @handle | Add" input row with auto-save — entries below as remove-able rows; the section is no longer gated behind the page's global edit mode. Daily Notes wraps in a pane and puts the input at the top.
- **Subtasks fully inline** — pencil/Save/Cancel edit mode removed; existing rows have always-editable text (commits on blur), DurationInput (commits on blur), and ×-remove. The "always-on quick-add at top" row keeps text + duration + Add. No more "did I save?" moments.
- **Task & Project Details edit moved into a modal** — read view is always on, pencil opens a Modal with the full edit form and Cancel/Save in the footer. Modal blocks the page (ESC or backdrop click cancels) so you can't accidentally navigate away while editing. Solves the recurring "forgot to hit Save" problem.
- **Projects on Daily** — project end_date label changed from "Due" to "Ends" and parses with T00:00:00 so the displayed date doesn't shift in non-UTC timezones.

### Kept on purpose
- DB columns (`daily_notes.daily_brief`, `daily_notes.code_challenge`, `reviews.content/summary/suggestions`, `user_metadata` AI config) — these become write targets for the upcoming external agent.
- API primitives (`updateDailyBrief`, `getResumableReview`, etc.) in `src/lib/api/*` — staying put so the future MCP/tool layer can wrap them.

### Next direction
The replacement is an external agent (Hermes on desktop, or any MCP-speaking model) that drives the app from outside via a tool layer to be added. Agent capability wishlist starting to grow — first entries: refresh/expand the quote pool, generate daily briefs, run reviews.

---

## 2026-06-12

### Added
- **Duplicate in batch select** — "⧉ Duplicate" action in the Tasks bulk bar, plus full select mode on the Projects page (move to status, duplicate, archive, delete). Duplicating a project full-clones it: every task comes along (statuses preserved), people links copied, fresh slug; highlight/archive/review history reset, and a completed project clones back into Planning.
- **Progress bars** — slim time-weighted bars on task rows (when subtasks exist) and project rows; fuller bars with done/total, %, and time on the task subtask header and the project Tasks section.
- **Subtask durations** — each subtask can carry an hh:mm estimate (edit via the checklist pencil). Read view shows per-step times plus "Total estimated" as a guide for setting the task duration; progress is weighted by time when estimates exist (unestimated steps count as the average of estimated ones), falling back to plain counting otherwise.
- **Project work-remaining** — project pages show "~H:MM of work left · H:MM total estimated" from the tasks' durations.
- **Area on task rows** — tasks without a project now show their Area (📂) under the title, where project tasks show 📁.

### Changed
- `getProjects` now nests `tasks(id, status, duration)` so project lists can render progress without extra queries.

---

## 2026-06-10 (session close)

### Removed
- Stale `TASKS.md` at repo root — belonged to another project, committed by accident.

### Notes
- Blank-screen report right after the evening deploy was the PWA service-worker version swap, not a code bug — refresh resolved it. Production verified healthy on Daily + Reviews.

---

## 2026-06-10 (evening — Jam fixes)

### Fixed
- **"Something went sideways" mid-review chat** — the AI sometimes answers in plain prose instead of the JSON envelope (especially after tool use); the parser crashed on it and showed an error even though the response was fine. Parser now falls back: try JSON → extract embedded JSON → use the prose as the message. Same hardening on the opening message.
- **Leaving a review lost the session** — Reviews landing screen now detects today's draft review with a conversation in progress and offers "Resume the review you started at H:MM". Resuming restores the full conversation and rebuilds AI context without generating a new opening.
- **"open →" links inside a review** (tasks/projects/people in Step 1) now open in a new tab so the review keeps running.
- **Dev-only: chat stuck on "thinking…"** — React StrictMode's simulated remount left `mountedRef` permanently false, so async results were discarded. Ref now resets on mount.

---

## 2026-06-10 (continued again) — "Current Picture" review system

### Changed
- **Reviews are no longer end-of-day rituals.** A "daily" review is daily in cadence, not timing — run it morning, mid-day, evening, multiple times. The latest completed review is always "the current picture," live the moment it wraps.
- **All review AI prompts are time-of-day aware** — new `nowContext()` injects the actual date/time (morning/afternoon/evening) into the opening, conversation, questions, and plan prompts. A 7 AM review says "start the day strong," not "get some sleep."
- **Plans are timeless facts** — plan content uses explicit dates ("Thursday June 11"), never "today"/"tomorrow"; agenda items carry a `date` field. Morning review plans the rest of today; evening sets up tomorrow.
- **Daily Brief is generated at read time** — no brief is created at wrap-up. The Daily page lazily generates it on view (today only) and caches it in `daily_notes.daily_brief` with a `generated_at` stamp. Regenerates when: missing, from a previous day, or superseded by a newer review. The greeting always matches the moment it's actually read. Past dates keep their archived briefs.
- **Brief generator knows the plan** — `generateDailyBrief` receives the latest review and how long ago it was locked in.
- Challenge + quote land on today's note if today's slots are empty (morning review), else tomorrow's (evening review).
- Review calendar context now starts from today (a morning review needs today's remaining events).
- Done screen now points at today's Daily page ("Go to Daily") instead of tomorrow.

### Added
- `reviews.completed_at` column (migration) + `getLatestCompletedReview()` — precise "latest wins" ordering.

### Removed
- `target_date` concept and `getReviewForTargetDate()` (added earlier today, superseded by the current-picture model).

---

## 2026-06-10 (continued)

### Changed
- **Review wrap-up is now the source of truth for the Daily Brief** — `writeReflectResults` stores `{ conversation, plan, target_date, brief }` in `reviews.content` instead of writing top_of_mind/agenda/daily_brief to tomorrow's `daily_notes`. Only code challenge + quote still go to `daily_notes`.
- **Daily page reads the brief from the review** — new `getReviewForTargetDate(date)` API finds the latest completed daily review that planned the selected date and renders its `content.brief`. The Refresh button still writes `daily_notes.daily_brief`, which takes priority (mid-day refresh).
- `generateDailyBrief` accepts an `extraTopOfMind` array so the review plan's top-of-mind items feed the brief generated at wrap-up.

### Removed
- Deleted `src/lib/ai/skills/dailyReview.js` — legacy daily review skill, no longer imported anywhere (replaced by the two-step Reflect flow + dailyBrief skill).

---

## 2026-06-10

### Added
- **ResetPassword page** — `/reset-password` route handles Supabase PASSWORD_RECOVERY flow. Shows password + confirm fields, validates, calls `updateUser`, redirects to `/daily` on success.
- **Dev auto-login** — `supabase.js` calls `signInWithPassword` on startup (dev mode only) using `VITE_DEV_EMAIL` / `VITE_DEV_PASSWORD` from `.env.local`. No more pasting JWT tokens each session.

### Fixed
- `supabase.js` was referencing `supabase` before the `createClient` export — caused a blank screen on fresh server start. Moved export above the dev sign-in block.
- `Login.jsx` now watches for session changes and redirects to `/daily` when a session appears — so auto-login lands correctly instead of staying stuck on the login page.
- `AuthContext.jsx` — added `PASSWORD_RECOVERY` event handler that redirects to `/reset-password`.

### Changed
- **Reviews page** — "Start Review" landing screen added. Email feed, calendar strip, and all data hooks only fire after the user explicitly clicks "Start Review", ensuring fresh data on every review instead of showing stale data from the previous session load.
---

## 2026-06-09 (continued again)

### Changed
- **Reviews page — full redesign (Step 1 + Step 2):**
  - Step 1 "Get Current": email feed (New/Action/Waiting tabs with work-email star indicator), upcoming calendar strip, and full Projects/Tasks/People tabs with inline actions and capture buttons. No linear gating — leave when ready.
  - Step 2 "Make a Plan": free-form AI chat. Actions happen inline during conversation. "Wrap it up" generates the plan, writes summary to DB, navigates to tomorrow.
  - Multiple reviews per day now allowed (removed unique constraint on reviews table).
  - Capture modals now accept `initialValues` so email-to-task/project/person pre-fills the title.
  - Scheduled tasks no longer show a "Move to next action" button (it's a demotion, not a promotion).
- **gmail-context edge function**: now returns `starred: boolean` on each thread (starred = work email forwarded from work address).
- **reflectReview.js**: added `generateReviewOpening()` for personalized chat opening; `generateConversationalResponse()` now accepts `freeform` flag that prevents premature wrap-up.

---

## 2026-06-09 (continued)

### Changed
- **Daily page gate removed** — The "Yesterday's review isn't done" wall is gone. Daily page always loads regardless of review status. Skipping days, weekends, vacations — system doesn't care.

---

## 2026-06-09

### Added
- **Inbox stat card** — New first card in the Daily stat row shows total inbox items across tasks, projects, and people combined.
- **Weather widget** — Live temperature and conditions (Open-Meteo, no API key) shown inline in the Daily Brief header. Uses browser geolocation; silently skipped if denied.
- **Invalidation bus** — Mutations (create/update/delete) now emit events that cause hooks to refetch automatically. No more manual refresh after making changes within the same tab.

### Changed
- **Daily Brief** — Removed the Remember and To Do sections (redundant with the Daily page). Brief now shows greeting, Top of Mind bullets, and Words for the Day.
- **Agenda deduplication** — Scheduled tasks are no longer shown as all-day items since they already appear as Focus Flow calendar events.

### Fixed
- **AI Review interview no longer calls project end dates "deadlines"** — Added explicit rule to the interview system prompt: project end_date is a timeframe ("runs through"), not a hard deadline. Tasks have due dates; projects have timeframes.

---

## 2026-06-08 (dev session seeder)

### Added
- **Dev auto-login** — `VITE_DEV_SESSION` in `.env.local` seeds a Supabase session into localStorage before the client initializes, so the preview bypasses the OAuth screen and lands directly in the app. Only active in dev mode; no production impact.

---

## 2026-06-08 (review planning date alignment)

### Fixed
- **AI Review context now respects the "Planning for" date picker** — `buildReflectContext` accepts `targetDate` and uses it as the planning date, so the AI prompt's "PLANNING FOR" label matches where the plan actually gets written. Previously the badge could say "Planning Mon, Jun 8" while the picker said Jun 9.
- **Removed "Projects In Progress" reference card** from the AI Review section — redundant with the Reflect step.
- **Renamed "Plan goes to" → "Planning for"** in the review header.

---

## 2026-06-08 (review date fix)

### Fixed
- **Reviews — "Plan goes to" date picker** — Added explicit date selector in the review header so the user controls which daily note the AI plan writes to. Defaults to tomorrow; switch to today for morning reviews. Eliminates the review-date vs plan-destination confusion. Reset also resets the picker back to tomorrow.

---

## 2026-06-08 (session close)

### Changed
- **AI personality** — Upgraded to full Cheech & Chong / Up in Smoke energy across all AI prompts. Tommy Chong meets Feynman: unhurried, "hey man I think we're parked" clarity, organic slang, real warmth.
- **CLAUDE.md** — Updated with complete session state: new UI components, AI layer details, multi-account Google status, future phases, personality spec.

---

## 2026-06-08 (style continuity pass)

### Added
- **`EmptyState` component** — Centralized `src/components/ui/EmptyState.jsx` used for all empty list states. Replaces three different ad-hoc patterns across Tasks, Projects, and TasksSection.
- **CSS overlay variables** — `--modal-overlay` and `--avatar-overlay` added to both themes so overlay opacity is theme-controlled, not hardcoded rgba.
- **`warning` Button variant** — Added to `Button.jsx` so Reviews' `ActionBtn` can use the shared variant system.

### Changed
- **Tab bars unified** — All tab bars (Tasks, Projects, People, Reviews Clarify, Reviews Reflect) now use the same pattern: `var(--border)` active background, `var(--text-primary)` active text, `var(--text-secondary)` / `var(--pane-bg)` count badge. Removed per-tab color system from Reflect section.
- **Icon buttons standardized** — `IconBtn.jsx` (`PencilBtn` / `TrashBtn`) standardized to 28×28px across the app. Daily nav buttons and Settings rows now all match. `TrashBtn` changed to muted-by-default with danger hover (matches Settings inline style), replacing the always-red solid style.
- **Settings.jsx** — Replaced 6 inline icon button definitions with `PencilBtn` / `TrashBtn` from `IconBtn`. Page title changed from `text-2xl font-bold` to `text-xl font-semibold` to match all other pages.
- **TasksSection** — Removed local duplicate `TaskRow` component; now uses the canonical `TaskRow` from `components/tasks/TaskRow`. Imports `EmptyState` for consistent empty state display.
- **Modal / AvatarCircle** — Replaced hardcoded `rgba(0,0,0,0.6)` and `rgba(0,0,0,0.55)` with CSS variables.
- **Search inputs** — Added `onFocus`/`onBlur` accent border handlers to Tasks and Projects search boxes (matching behavior already in modals).
- **Daily challenge prompt** — Added explicit "NEVER a reflective or journaling prompt" guard; expanded topic list to include javascript, algorithms, data_structures, bash, general_cs.

---

## 2026-06-08

### Added
- **Multi-account Google integration** — Connect a second Google account (e.g. .edu work email) alongside the primary sign-in account. Settings → Google Accounts shows all connected accounts with an "Add Google Account" button that runs a full OAuth flow without touching the main session.
- **google-connect edge function** — New Supabase edge function handles the secondary OAuth flow: generates the Google auth URL, exchanges the code for tokens, fetches the account email, and upserts into `user_integrations`.
- **`/auth/google-callback` route** — New callback page handles the Google redirect, sends the code to the edge function, and redirects back to Settings on success.

### Changed
- **`user_integrations` schema** — Added `email` (text) and `label` (text, default `'personal'`) columns. Unique constraint changed from `(user_id, provider)` to `(user_id, provider, email)` to support multiple accounts per provider.
- **`google-calendar` edge function** — Now fetches all connected Google accounts in parallel. Personal account pulls from the Focus Flow calendar; additional accounts pull from their primary calendar. Events are merged and sorted by start time.
- **`gmail-context` edge function** — Now fetches @Action/@Waiting threads and recent unread from all connected accounts in parallel. Results are merged, deduplicated by thread ID, and sorted.

## 2026-06-07

### Added
- **Area icon picker** — Areas now have an emoji icon field alongside their bg/text colors in Settings. Icon shows in the badge wherever areas are displayed.
- **Priority reorder** — ↑/↓ buttons on every priority row in Settings swap sort_order with the adjacent item. First/last items have the respective button disabled.
- **People avatar color + icon** — Each person can have a custom avatar background color and emoji icon, set in the Identity section of their page. Shows in PersonRow list and the avatar on the page. DB: `people.icon text`, `people.color text`.
- **Duplicate task** — ⧉ Duplicate button in What's Next (active tasks) and alongside the delete action (completed tasks). Copies title, description, priority, energy level, area, context tags, project, and subtasks; resets to inbox with "(copy)" appended to the title. Navigates to the new task immediately.
- **Bulk edit tasks** — ☑ Select button in the Tasks header activates selection mode. Click rows to select/deselect (checkmark replaces status dot, row highlights). Bulk action bar at the bottom: "Move to…" status dropdown + Move button, Archive, and Delete. Confirm dialog on bulk delete.

### Changed
- **Sidebar order** — Projects now appears above Tasks in the sidebar nav.
- **Contact Types** — Replaced role-based types (colleague, client, mentor, vendor) with category-based: Work, Family, Social, Services, Other. Relationship field is still the free-text place for specifics like "Wife" or "Colleague".
- **Habit label** — "Evening Meds" renamed to "Last Night's Meds".
- **Refresh buttons** — All refresh actions now show the ↺ icon only (no text). DailyBrief refresh button and Stuck Helper "Refresh suggestions" both converted to icon-only buttons matching AgendaSection and TasksSection style.
- **People tab default** — On load, automatically opens the first non-empty tab in order: Inbox → Stale → Active, instead of always opening Inbox.

---

## 2026-06-07

### Added
- **Calendar sync for scheduled tasks** — scheduling a task now automatically creates an event on the Focus Flow Google Calendar. Rescheduling updates the existing event. Moving a scheduled task to any other status (Next Action, Queued, Waiting, Someday, Done, Delete) removes it from the calendar. All-day events when no time is set; timed events use the scheduled time + task duration as the end time (defaults to 1 hour). Silent no-op when no Google integration is connected. New `tasks.gcal_event_id` column stores the Google event ID for update/delete lifecycle.

### Changed
- **`google-actions` edge function** — `create_calendar_event` now returns the new event ID in `{ ok: true, event_id }` so the client can store it for future updates.

---

## 2026-06-07

### Added
- **Schedule Task** — new 📅 Schedule button in What's Next for all non-done statuses. Pops a modal to pick date (required) + time (optional). For inbox tasks, the modal also collects the full clarification fields (priority, energy level, area, duration, description) so the task moves straight to Scheduled without a separate clarify step. Scheduled tasks get a 📅 Reschedule button too. DB column `tasks.scheduled_time` (text, HH:MM) stores the time component separately from `due_date`.

---

## 2026-06-07

### Added
- **Area colors** — Areas now have bg/text color pickers in Settings, same pattern as Energy Levels and Priorities. Live preview badge while editing. DB migration adds `bg_color` and `text_color` columns with sensible defaults.
- **Context tag colors** — New "Context Tags" section in Settings lets you set custom bg/text colors per tag. Colors stored in `user_settings.tag_colors` JSONB. Tags display their custom colors on the task page. Reset button to go back to theme default.

### Changed
- **Button danger variant** — replaced hardcoded `#ffffff` text color with `var(--danger-text, #ffffff)` so themes can override it.
- **AreasContext** — now exposes `areaMap` keyed by value for quick lookups.
- **ContextTag component** — accepts optional `bgColor`/`textColor` props; `ContextTagList` accepts a `tagColors` map.

### Added
- **People ↔ Tasks linking UI** — Tasks now have a People section with an "+ Add Person" button that opens a searchable picker (already-linked people shown as greyed out, × to unlink). People pages now always show a Tasks section with a "+ Link Task" button and the same picker pattern. Both pickers include "+ Add New" at the bottom to navigate to the create flow.
- **AI interview tools expanded** — added `update_task` (link to project, change status/due date) and `delete_task`. The AI can now convert a task into a project by combining `create_project` + `delete_task` in a single turn. New project lands in inbox as normal.
- **AI tool use in the interview** — the AI can now actually create tasks, projects, and people mid-conversation when you ask it to. No more meta-tasks about doing things. Uses Anthropic native tool use via the `ai-proxy` edge function. Created items appear as green confirmation pills in the chat.

### Changed
- **`ai-proxy` edge function** — extended to accept a `tools` array and return full `content` + `stop_reason` for tool use responses. Backward compatible — callers without tools still get `{ text }` as before.
- **`createTask` API** — now accepts and passes through extra fields (e.g. `due_date`) via spread.

---

## 2026-06-07

### Fixed
- **"Did It" button removed from Next Action status** — when a task is in Next Action, "All Done" is the right CTA; "Did It" (permanent delete) no longer appears alongside it, eliminating the accidental-delete risk.
- **AI inbox rule tightened** — the plan generator now has explicit, numbered criteria for when `next_action` is earned. Default is always inbox; all three conditions (task confirmed, next physical action confirmed, project/standalone confirmed) must be met to use `next_action`.

### Changed
- **Interview AI personality overhaul** — both the opening questions prompt and the conversational turn handler rewritten for genuine emotional presence. The AI now actually celebrates wins, meets hard moments with real warmth, and brings the full flower-power-genius energy rather than just sprinkling in hippie phrases.

---

## 2026-06-07

### Changed
- **Habit streaks now track the current week (Sun–Sat)** instead of a rolling 7-day window. The mini progress bars on the Daily page reset each Sunday and show how many days of the current week you've completed a habit out of 7. Mid-week, an uncompleted habit will correctly show a lower percentage rather than inflating based on only the days recorded so far.

---

## 2026-06-07

### Added
- **Project completion bar** — progress bar on every project with tasks, showing tasks done / total, percentage, total estimated time, and time remaining (only when tasks have durations set). Bar color shifts from yellow → accent → green as you close in on 100%.
- **Duration input simplified to hh:mm** — removed the seconds field from task duration input; display everywhere now shows `h:mm` format. Existing data unaffected.
- **Challenge refresh** — "↺ different one" button in the Challenge section header lets you swap out today's challenge for a fresh AI-generated one when you're just not feeling it. Only appears before you submit. Hits the AI, writes the new challenge to today's note, and reloads.
- **AI inbox rule** — tasks created by the AI interview are now always routed to inbox unless the AI explicitly asked for and confirmed all necessary details during the conversation. Enforced in the prompt; `next_action` is still achievable when earned.

---

## 2026-06-06 (Session 14 cont. 9)

### Changed
- **AI personality overhaul — "Tommy Chong, but a genius"** — replaced the Shaggy-Hawking concept across all four AI skill prompts (Daily Brief, Daily Review, Reflect Interview, Stuck Helper). New voice: laid-back, groovy, warm, unhurried — but brilliant underneath. Natural sixties/seventies speech ("like," "man," "far out," "right on") used organically, never forced.
- **Removed "zoinks"** — Scooby-Doo-isms dropped entirely. Hippie idioms now drive the personality instead.
- **Added colorful idioms** — "monkey on your back," "name the gorilla in the room," "what's been sitting heavy" baked into interview prompts as preferred alternatives to corporate language.
- **Pop culture reference pool** — all AI prompts now carry a reference list (Star Wars OT, Matrix, Back to the Future, Pulp Fiction, Jurassic Park, Top Gun, Goonies, Fight Club, MCU, A-Team, Miami Vice, Star Trek) with instruction to use them when the moment earns it.
- **Super positive, super capable** — baked into the brief prompt as the baseline energy. No hedging, no hand-wringing.
- **Portable personality prompt** — standalone `.md` file created (`tommy-chong-genius-personality.md`) with full system prompt + one-liner for dropping this personality into any AI tool.

---

## 2026-06-06 (Session 14 cont. 8)

### Added
- **Daily Brief** replaces Top of Mind on the Daily page. AI-generated section with four subsections: 🧠 Top of Mind (your manual items + AI additions), 📌 Remember (waiting-on, birthdays, things in limbo), ✅ To Do (3-5 highest-leverage actions by name), and Words for the Day (a line of wit/wisdom that's genuinely yours).
- **✨ Refresh button** on the Daily Brief — generates a fresh brief on demand, time-of-day aware (morning vs afternoon vs evening). Mid-day refresh acknowledges where you are in the day.
- **Auto-generated on Daily Review** — when `writeReflectResults` runs, it fires off a brief generation for tomorrow non-blocking alongside everything else.
- **New AI personality: Shaggy-Hawking** — Stephen Hawking's analytical brain living in Shaggy from Scooby-Doo's body. Synthesizes life data at genius level, delivers it with goofy enthusiasm and a quick joke. Always positive. Genuinely excited to help.
- **Daily Brief DB column** — `daily_brief jsonb` added to `daily_notes`.
- **Top of Mind still editable** — pencil icon on the brief header opens an inline editor for your manual items, which feed into the AI brief on next refresh.

---

## 2026-06-06 (Session 14 cont. 7)

### Fixed
- **Stalled project bug** — projects were staying in "Stalled" status even after tasks were promoted to Next Action. Root cause: `checkProjectStalled` was only called after task completion, never when tasks moved *to* next_action. Fixed in two places:
  - `moveToNextAction` in `tasks.js` now auto-promotes a stalled parent project back to `in_progress` — no extra call needed anywhere.
  - `checkProjectStalled` in `projects.js` now also counts `scheduled` tasks as "active" (previously only `next_action` + `waiting`).

---

## 2026-06-06 (Session 14 cont. 6)

### Added
- **"I'm Stuck" button** on the Daily page — click to get 3-5 easy wins from your next actions. If AI is configured, it picks the best starters based on context; otherwise falls back to sorting by duration and energy level. Panel is dismissible and has a "Refresh suggestions" link.
- **Deadline field on tasks** — separate from Due Date. Deadline = absolute last day, user should be actively working toward it. Due Date = specific day the task happens, no movement expected before it. Both fields are editable on TaskPage. Deadline renders in red (🔴) on task rows and detail view.
- **Deadline shown in AI interview context** — reflectReview now includes `DEADLINE` tags on tasks and a semantic explanation so the AI asks the right kind of questions ("how's progress?" for deadlines vs "are you prepared?" for due dates).

### Changed
- **Stat cards expanded to 7, in 2 rows** (was 5 in 1 row):
  - Row 1: Projects (all active), Tasks (all active), In Progress, Next Actions
  - Row 2: Tasks Waiting, Stalled Projects, Due Today
- **"Due Today" now counts only `due_date = today` or `status = scheduled`** — removed the priority-based override (urgent/stat tasks were being counted even when not due today).
- **DB migration** — added `deadline date` column to tasks.

---

## 2026-06-06 (Session 14 cont. 5)

### Added
- **Auto-delete housekeeping** — when the AI generates tomorrow's plan (`writeReflectResults`), it now silently deletes any `done` tasks whose `completed_at` is older than 30 days. Fire-and-forget, non-blocking. Archived and highlighted tasks are untouched.

---

## 2026-06-06 (Session 14 cont. 4)

### Added
- **Task Completion Flow** — clicking any "Done/Did It/Complete" button now opens a completion modal instead of instantly acting. The modal has:
  - Optional completion note (saved to task comments)
  - **Archive** checkbox — sets status to `archived`, kept as a permanent record, never auto-deleted
  - **Highlight** checkbox — marks as a notable win with an optional "why" note; expands inline when checked
  - Auto-delete warning — shown when neither box is checked, noting the task will be deleted in 30 days
- **What's Next for done/archived tasks** — TaskPage now shows three actions for completed tasks: ⭐ Add to Highlights, 📁 Archive (done → archived), 🗑 Permanently Delete
- **`completeTaskWithOptions()`** — new API function handling the full completion flow (comment, archive, highlight) in one call
- **`archiveTask()` / `permanentDeleteTask()`** — new API helpers for post-completion actions
- **DB migration** — added `completed_at timestamptz` to tasks (backfilled from `updated_at` for existing done tasks); dropped stale status check constraint to allow `archived` status
- **Reviews Clarify section** — "Did It" buttons in ClarifyTaskRow now open the completion modal instead of immediately marking done

---

## 2026-06-06 (Session 14 cont. 3)

### Changed
- **AI Review — removed Next Actions reference card** — already visible in the Reflect step; no need to show it again in the AI interview.
- **AI interview no longer mentions habits** — habit data stripped from the interview prompt entirely. Habits are optional and shouldn't come up unless you bring them up.
- **Habit detail page — timeframe selector overhauled** — replaced "7 days / 30 days / 90 days / 1 year" with **Today / This Week / This Month / This Year**. Weeks start on Sunday. "Today" shows ✓ or ✗ instead of a percentage.

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
