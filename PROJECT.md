# Focus Flow — Definitive Project Document

**Status:** Active personal application
**Last verified:** 2026-08-15
**Canonical repository:** `emsmithinmi/celerity-app`
**Primary branch:** `main`
**Current verified commit:** recorded by the current `main` history; verify the live ref before release work.

This document is the vendor-neutral project reference for Focus Flow. It is intended to be useful to any maintainer or agent—Claude, Codex, Hermes, a local model, or a human—without depending on a particular assistant's memory, personality, or tool protocol.

Tool-specific instruction files may describe how a particular agent operates. They must not silently change the product direction, security expectations, or architectural decisions documented here.

## 1. Product description

Focus Flow is a personal Getting Things Done (GTD) productivity PWA. It is a deterministic system of record for capturing, clarifying, organizing, scheduling, and executing tasks, projects, and people-related follow-up.

The app is intentionally not an AI assistant. Judgment-heavy work such as reviews, synthesis, coaching, and knowledge management belongs outside the application and may eventually be performed by an external agent through a controlled tool layer.

Live application: <https://gtd-manager.pages.dev>

GitHub repository: <https://github.com/emsmithinmi/celerity-app>

Supabase project: `egxbhglczkslnskxorlf`

Cloudflare Pages project: `celerity-app`

## 2. Product boundaries

### In scope

- Capture and manage tasks, projects, and people.
- GTD status lifecycles, clarification, priorities, energy levels, areas, and context tags.
- Due dates, deadlines, and independent calendar scheduling.
- Task subtasks, durations, notes/comments, linked people, and project relationships.
- Daily dashboard with statistics, quotes, Google Calendar agenda, habits, and deterministic code challenges.
- Dynamic habit definitions, weekday targets, completion history, streaks, and heatmaps.
- User-configurable taxonomy and list ordering.
- Google OAuth, Calendar integration, Gmail context, and connected secondary Google accounts.

### Explicitly out of scope unless the product direction is deliberately revisited

- In-app AI, chat, coaching, or automatic judgment.
- In-app Daily/Weekly/Monthly Reviews.
- A general-purpose Notes or knowledge-management system.
- Quietly restoring removed Reviews, Notes, or AI components because a feature seems convenient.
- Treating the current permissive RLS as acceptable for a real multi-user product.

## 3. Current implementation

### Technology

| Area | Current implementation |
|---|---|
| UI | React 19 with JavaScript/JSX |
| Build | Vite 8 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 plus CSS theme variables |
| Backend | Supabase Postgres, Auth, Storage, and Edge Functions |
| Icons | Lucide React |
| PWA | `vite-plugin-pwa` / Workbox |
| Hosting | Cloudflare Pages |
| CI/CD | GitHub Actions on pushes to `main` |
| External APIs | Google OAuth, Calendar API, Gmail API |
| Tests | No automated test suite currently exists |

### Frontend structure

- `src/pages/` contains route-level screens.
- `src/components/` contains layout, dashboard, entity, and shared UI components.
- `src/hooks/` contains collection and cross-screen state helpers.
- `src/contexts/` contains auth, theme, and reference-data providers.
- `src/lib/api/` is the intended persistence boundary for Supabase CRUD operations.
- `src/lib/` also contains shared constants, quote logic, event helpers, and Google actions.
- `supabase/functions/` contains authenticated server-side Google integration functions.

### Routes

| Route | Purpose |
|---|---|
| `/login` | Google OAuth, magic link, and password entry |
| `/reset-password` | Password recovery |
| `/auth/callback` | Primary Supabase OAuth callback |
| `/auth/google-callback` | Secondary Google account callback |
| `/daily` | Main dashboard |
| `/tasks`, `/tasks/:id` | Task list and detail |
| `/projects`, `/projects/:id` | Project list and detail |
| `/people`, `/people/:id` | People list and detail |
| `/habits`, `/habits/:habit` | Habit list and detail |
| `/settings` | Theme, taxonomy, account, and Google settings |

### Main capabilities

- Dashboard: quote, quick capture, statistics, live agenda, tasks, projects, habits, and code challenge.
- Tasks and projects: status tabs, filtering, sorting, manual drag ordering, bulk selection, full detail pages, and archive/delete flows.
- People: flat searchable contact list with rich profiles, avatars, linked tasks/projects, and notes.
- Habits: per-habit weekday targets, completion history, streaks, timeframe statistics, and monthly heatmap.
- Settings: Catppuccin, GitHub Dark, and Cobalt2 themes; editable energy levels, priorities, areas, and context tags.
- Quotes: curated static pool, daily persistence, skip, recent-quote deduplication, and per-user blocklist.
- Challenges: consumable basic-Python challenge bank; completion deletes a challenge and marks the habit for the day.

## 4. Domain model and invariants

### Status lifecycles

- Tasks: `inbox` → `next_action` → `queued` → `waiting` → `someday` → `done`.
- Projects: `inbox` → `planning` → `in_progress` → `waiting` → `stalled` → `completed`.
- People have no status lifecycle; People is a flat contact list.
- `archived_at` is used for archiving where supported.

### Scheduling

Scheduling is independent of lifecycle status. A task may have `scheduled_date` and `scheduled_time` regardless of whether it is a next action, queued item, waiting item, or another valid status. Scheduling must not be reintroduced as a task status.

`due_date` and `deadline` are separate concepts from scheduling. Calendar synchronization uses the Focus Flow Google Calendar and stores `gcal_event_id` on the task.

### Data-driven taxonomy

Priorities, energy levels, areas, and context tags are data managed through Settings. Do not hardcode their values or colors into page components. Components should consume the corresponding contexts and maps.

### Habits

Habit definitions live in `habits`. Completion records live in `habit_history`, keyed by date and habit key. The legacy habit boolean columns on `daily_notes` are not the source of truth for dynamic habits.

### Date handling

Use local calendar dates, not UTC date extraction, for user-facing day logic. The Daily page uses the noon-local-time technique when constructing a date from a `YYYY-MM-DD` string to avoid daylight-saving shifts.

### Destructive operations

Entity deletion must preserve the established cascade order: junction tables → comments/notes → children → parent. Confirm the exact target and inspect related records before changing destructive flows.

## 5. Data and integrations

Core tables include `tasks`, `projects`, `people`, `daily_notes`, `habits`, `habit_history`, `energy_levels`, `priorities`, `areas`, `context_tags`, `list_preferences`, `code_challenges`, comments tables, relationship tables, `calendar_events`, `user_integrations`, and `user_settings`.

The complete column-level reference remains in `CLAUDE.md` and should be reconciled into this document when schema work changes. Database schema history is currently incomplete in the repository; live Supabase state must be checked before database changes.

Edge Functions:

- `google-connect`: secondary Google OAuth URL, code exchange, and token storage.
- `google-calendar`: reads events from connected accounts and refreshes expired access tokens.
- `google-actions`: creates, updates, and deletes Focus Flow calendar events for scheduled tasks.
- `gmail-context`: reads relevant Gmail context from connected accounts.

The Dashboard Agenda currently fetches the Focus Flow and Work Hours calendars. Calendar lists are live external state and should be re-derived from Google when changing this integration rather than relying only on old documentation.

## 6. Security and operational truth

Focus Flow is currently safe to treat as a personal single-user application, not as a production multi-user system.

The known security risks are material:

- Many tables use permissive `USING (true)` / `WITH CHECK (true)` RLS policies.
- Several personal-data tables do not have ownership columns.
- Some live operations may be possible without the intended tenant isolation.
- OAuth callback protections and integration assumptions require hardening.
- Private responses and integration data need careful cache-control review.

Do not advertise or enable multi-user use until ownership modeling, policies, grants, OAuth protections, and two-account isolation have been verified against the live Supabase project.

Never place passwords, API keys, OAuth tokens, Wi-Fi credentials, or QR contents in this document, Git, logs, or chat.

## 7. Local development and validation

Install dependencies with `npm install` and start the local app with `npm run dev`. Environment values belong in the ignored `.env.local`; use the repository’s existing variable names and never commit credentials.

Available checks:

```text
npm run build
npm run lint
```

The build is the current CI gate. Lint is currently known to report errors, and there is no test script. Any maintenance change should at minimum run the build; changes to affected behavior should also run lint and receive a targeted browser check when a preview is available.

## 8. Maintenance rules for every agent

1. Read this document and the relevant code before making changes.
2. Preserve existing user data and unrelated working-tree changes.
3. Treat `CLAUDE.md`, `AGENTS.md`, and the handoff document as historical or tool-specific context; reconcile contradictions against the code and this document.
4. Do not reintroduce AI, Reviews, or general Notes without an explicit product decision.
5. Keep persistence logic in `src/lib/api/` when practical.
6. Update `CHANGELOG.md` before every commit.
7. For finished work, commit and push to `origin/main` so the other development machine can see the same state.
8. Before committing, inspect the staged file list and verify that no secrets or unrelated user files are included.
9. Report what was changed, what was verified, what remains uncertain, and whether anything was committed or pushed.

## 9. Roadmap and known follow-ups

### Priority 0 — External agent tool layer

Design and build a provider-neutral MCP server, or a REST API with an MCP wrapper, that exposes carefully scoped Focus Flow operations to external agents. The first design must settle:

- Authentication and caller identity.
- User/tenant scoping.
- Read/write permissions by tool.
- Validation, idempotency, and destructive-operation confirmation.
- Error contracts and auditability.
- Local-only versus remotely reachable deployment.
- Whether the tool layer calls Supabase directly or goes through a controlled application boundary.

Initial capability candidates are reading and writing daily data, writing Daily Brief content, refreshing the quote pool, and supporting future external review workflows. The tool layer must not bypass RLS or expose service-role credentials to an agent.

### Priority 1 — Security foundation

- Model ownership for personal-data tables.
- Add and verify owner-scoped RLS policies.
- Remove unnecessary anonymous grants.
- Add two-account isolation tests before claiming multi-user support.
- Review OAuth CSRF/state handling and cache headers for private responses.

### Priority 1 — Quality foundation

- Establish a test runner and tests for API functions, status transitions, date handling, scheduling, quote deduplication, habits, and destructive cascades.
- Reduce or triage the current lint backlog.
- Make CI run the meaningful quality gates, not only the build.
- Add a durable database migration/history workflow.

### Priority 2 — Maintenance and product improvements

- Reconcile `PROJECT.md`, `CLAUDE.md`, `AGENTS.md`, and the maintainer handbook so stale facts have one canonical home.
- Backfill the real weekday targets for existing habits whose old count-based targets were converted to “every day.”
- Improve error handling and transactional behavior around multi-step writes.
- Reduce oversized page components and duplicated integration logic.
- Build the future Obsidian migration path separately from Focus Flow’s GTD execution model.

## 10. Decision log

- Focus Flow replaced the former Celerity/GTD Manager branding; the live URL remains `gtd-manager.pages.dev` because the Cloudflare Pages address is tied to the original project.
- In-app AI was removed on 2026-06-19. The application remains deterministic; external agents are the future judgment layer.
- Reviews and general Notes were removed on 2026-07-12 rather than left as incomplete features.
- The `scheduled` task status was removed on 2026-07-12 because lifecycle and calendar scheduling are orthogonal.
- Habits moved from a weekly count to explicit Sunday–Saturday target weekdays on 2026-07-16.
- Priorities, energy levels, areas, and context tags are editable data rather than fixed code constants.
- Decorative iconography was intentionally minimized; functional controls and navigation icons remain.

## 11. Source-of-truth hierarchy

When documents disagree, use this order:

1. Current code and live behavior, verified safely.
2. This `PROJECT.md` for product direction and cross-agent project context.
3. `CHANGELOG.md` for historical implementation decisions.
4. `CLAUDE.md`, `AGENTS.md`, `docs/MAINTAINER_HANDBOOK.md`, and `HANDOFF.md` for supporting detail, history, and tool-specific workflow.

When a change makes this document inaccurate, update it as part of the same change so the next agent inherits the real state rather than another fossil record.
