# Changelog

All notable changes to GTD Manager are recorded here.

---

## [Unreleased] — 2026-05-26

### Added
- **Settings page** (`/settings`) with full Energy Levels manager — add, edit, delete, and re-color energy levels without touching code or running migrations
- **EnergyLevelsContext** — energy levels fetched from the database once at app load and shared across the whole app via React context
- Settings ⚙️ link in sidebar (above Sign out)

### Changed
- `EnergyBadge` now reads label, icon, and colors from the database instead of a hardcoded lookup object
- Task energy level dropdowns (TaskPage, TaskDetail) now driven by the same database-backed context

---

## 2026-05-26

### Added
- Daily notes can now be expanded (Show more / Show less), edited inline, and deleted — pencil and trash icons appear on each note entry
- **Errand** energy level added to tasks (purple badge, 🛒 icon)
- **Scrap it** button on Project pages — permanently deletes the project and all of its tasks (with cascade: junction tables → comments → tasks → project)
- `deletePerson()` API function with full cascade (task_people, project_people, people_comments)

### Changed
- All "Edit" text buttons replaced with a pencil icon (✏) across Task, Project, Person, and Review pages
- Delete buttons standardised to a solid red background with a trash icon only — consistent across tasks, projects, and people
- "Actions" section renamed to **"What's Next?"** on Task, Project, and Person detail pages

### Fixed
- React hooks order violation on ProjectPage (useState for `scrapping` was declared after early returns — moved to main hooks block)

---

## 2026-05-25

### Added
- Auto-rotating **daily quote** displayed under the date header on the Daily page — seeded by day-of-year so it changes each day without any API calls (75 curated quotes)
- Inbox tab added to the task list on Project detail pages

### Changed
- Daily page: added horizontal padding, centred the New buttons bar, centred the Review buttons bar
- Day-of-week text on Daily page changed from bold to normal weight (keeps gold colour and size)

### Fixed
- `createTask` was silently dropping `project_id` — fixed so tasks created from a project are correctly linked
- `TaskPage` save: `description` column was missing from the update payload; `duration` interval type mismatch corrected
- Added `try/catch/finally` to all detail-page save handlers so loading state always resets even on error

---

## 2026-05-25 — Major UX Redesign

### Changed
- **Tasks, Projects, People** pages: replaced modal-based detail views with full dedicated pages (`/tasks/:id`, `/projects/:id`, `/people/:id`)
- Dashboard replaced by a stat-card strip on the Daily page
- Sidebar is now collapsible (icon-only mode)
- All list pages show a stat summary row and navigate on row click instead of opening a modal

---

## 2026-05-23 — Initial Build

### Added
- Project scaffold: Vite + React 18 + Tailwind CSS v4 + Supabase + React Router v6
- Magic link authentication with Supabase Auth and custom SMTP via Resend
- Core UI component library: Button, Modal, ConfirmDialog, StatusPill, PriorityBadge, EnergyBadge, DurationDisplay
- **Daily page** — date header, top-of-mind, agenda, habit toggles, notes log, quick capture modals
- **Tasks page** — tabbed by status (Inbox → Next Action → Queued → Waiting → Someday → Done), capture modal, full GTD lifecycle actions
- **Projects page** — tabbed by status, capture modal, task list per project, comments, linked people
- **People page** — contact lifecycle (Inbox → Active → Stale), stale banner, linked tasks/projects, comments
- **Habits page** — calendar heatmap, streaks, percentage bars, time-frame selector
- **Reviews page** — Daily / Weekly / Monthly structured review with autosave and suggestion cards
- PWA support: service worker (Workbox generateSW), app manifest, installable on mobile
- GitHub Actions deploy pipeline: push to `main` → `npm run build` → Cloudflare Pages via Wrangler
- Supabase RLS policies on all tables (`USING (true)`, `GRANT ALL TO authenticated`)

---

## 2026-05-20

- Initial file upload to repository
