# Changelog

All notable changes to GTD Manager are recorded here.

---

## [Unreleased]

_Nothing pending — all changes committed and deployed._

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
