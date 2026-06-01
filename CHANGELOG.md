# Changelog

All notable changes to Celerity are recorded here.

---

## [Unreleased]

_Nothing pending — all changes committed and deployed._

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
