# Focus Flow — Project Handoff

*Written 2026-08-02. This is the "sit down, here's everything" document — read this first, then use `CLAUDE.md` as the living reference for day-to-day details (file structure, DB schema, patterns). This doc explains how we got here and why; `CLAUDE.md` explains what's true right now.*

---

## 1. What This Is

Focus Flow is a personal **GTD (Getting Things Done)** productivity PWA — a single-page React app backed by Supabase. It's built for one primary user (`emailemsmith@gmail.com`) but is technically multi-user-capable via Supabase RLS scoped on `auth.uid()`.

It covers the full GTD loop: capture (quick-add tasks/projects/people), clarify (inbox → real status), organize (projects, areas, context tags, energy levels, priorities), a daily dashboard with a live agenda pulled from Google Calendar, and habit tracking. There is currently **no AI inside the app** — that was a deliberate, considered removal (see §4). The app is meant to be a clean, deterministic execution tool that an external AI agent will eventually drive from the outside.

- **Live app:** https://gtd-manager.pages.dev
- **Repo:** https://github.com/emsmithinmi/celerity-app
- **Supabase project:** `egxbhglczkslnskxorlf`
- **Hosting:** Cloudflare Pages (project name `celerity-app`; the `.pages.dev` URL is permanent and predates the app's rename)

---

## 2. The Story So Far (Timeline)

**2026-05-20 — First commit.** Files uploaded to the repo.

**2026-05-23 — Initial build.** Full scaffold in one shot: Vite + React 18 + Tailwind v4 + Supabase + React Router v6, magic-link auth via Resend SMTP, and all five core pages (Daily, Tasks, Projects, People, Habits, Reviews) with the full GTD status lifecycles already in place. PWA support and the GitHub Actions → Cloudflare Pages deploy pipeline were part of the initial scaffold, not bolted on later.

**2026-05-25 — Major UX redesign.** Modal-based detail views were replaced with full dedicated pages (`/tasks/:id`, `/projects/:id`, `/people/:id`) — this is the pattern that stuck permanently. Dashboard became a stat-card strip on the Daily page. Sidebar became collapsible.

**Late May – June 2026 — Feature buildout.** Rapid iteration: priority/energy/area systems became DB-driven and user-customizable (instead of hardcoded), context tags, duration tracking with subtask time rollups, drag-to-reorder everywhere, Google Calendar sync for scheduled tasks, multi-account Google support, and a habit system that evolved from hardcoded booleans to a fully dynamic `habits` table.

**Early-mid June 2026 — The AI era.** An entire in-app AI layer was built: a "Reflect" conversational review interview, an AI-generated Daily Brief, a "Stuck Helper," AI-generated code challenges, and a distinctive **"Tommy Chong, but a genius" personality** (informally "Shaggy-Hawking" at one early point) applied across every AI prompt. This was a serious, multi-session investment — review memory/summarization across sessions, gap-aware reviews, birthday awareness, time-of-day-aware prompts, the works.

**2026-06-19 — AI Layer removed.** All of it — Daily Brief, Reflect chat, Stuck Helper, code-challenge generation, the `ai-proxy` edge function, `src/lib/ai/` entirely. This was a direction change, not a bug fix: the decision was that Focus Flow stays a **pure, deterministic GTD tool**, and the "brain" (AI judgment/synthesis) moves to an **external agent** that will drive the app through a tool layer (MCP or REST) still to be built. DB columns and API primitives that the AI used to write to were deliberately *kept* as future write targets for that external agent — nothing was thrown away that the next phase needs.

**Late June 2026 — Deterministic replacements.** The Code Challenge feature came back re-added as a **non-AI, consumable question bank** (`code_challenges` table, drains as you complete, refilled via a Claude Code skill). The quote system similarly runs on a static curated pool with day-based seeding, no API calls.

**2026-06-22 through 2026-07-12 — Cleanup and simplification era.** A long stretch of polish: People lost its status lifecycle (became a flat contact list), every decorative icon in the app was stripped out (sidebar nav is now the *only* iconography — a deliberate minimalism choice), status pills and colors became fully theme-driven, a Cobalt2 theme was added alongside Catppuccin and GitHub Dark, and the Notes and Reviews systems — half-rebuilt during the AI era — were pulled back out entirely.

**2026-07-12 — Reviews and Notes removed for good; scheduling decoupled.** Same philosophy as the AI removal: Reviews (needs judgment/synthesis) and Notes (different mental model entirely) don't belong bolted onto a GTD execution tool — they're moving to dedicated systems/an external agent instead. Same day: "Scheduled" was removed as a task *status* — any task can now independently carry a `scheduled_date`/`scheduled_time` regardless of its GTD status, which was a real architectural correction (scheduling and lifecycle status are orthogonal concepts that had been conflated).

**2026-07-16 — Habits target real weekdays.** Habits moved from "N days a week" (a count) to an actual Sun–Sat weekday picker (`target_weekdays` smallint array), so a habit can mean "Mon/Wed/Fri" specifically instead of just "3 days, whichever ones."

**2026-07-19 — Most recent fix.** Settings drag-to-reorder (Energy Levels/Priorities/Areas/Context Tags) had a stale-state bug where the DB saved correctly but the UI visually snapped back to the old order — root-caused via a user-recorded Jam session, fixed by clearing the optimistic local list snapshot whenever the underlying context data changes.

**Where things stand today (per `CLAUDE.md`):** the single active, named "next direction" for the whole project is designing and building the **external agent tool layer** — an MCP server (or REST + MCP wrapper) exposing `lib/api/*` as callable tools so any MCP-speaking model (ChatGPT, a local model, Claude, whatever) can drive the app from outside. This has been the stated next phase since the AI removal in June and hasn't started yet.

---

## 3. Architecture Snapshot

- **Frontend:** React 18 + Vite, Tailwind CSS v4, React Router v6
- **Backend:** Supabase — Postgres, Auth, Row-Level Security, Edge Functions
- **Auth:** Google OAuth (primary, requests Calendar + Gmail scopes) + magic-link email fallback via Resend SMTP
- **Hosting:** Cloudflare Pages, deployed via GitHub Actions on every push to `main` (~32s build)
- **PWA:** `vite-plugin-pwa` / Workbox, installable, NetworkFirst caching for Supabase reads (was StaleWhileRevalidate — changed after it caused a stale-double-refresh bug)

**Data model** lives entirely in Supabase Postgres. Every table uses permissive RLS (`USING (true) WITH CHECK (true)` + `GRANT ALL TO authenticated`) — this is a single-real-user app with RLS present for future multi-user support, not currently enforcing per-user isolation beyond auth itself. Full table-by-table column reference is in `CLAUDE.md` under "Database Tables."

**Core entities:** `tasks`, `projects`, `people` are the three GTD object types, each with its own status lifecycle (except People, which is a flat list). `daily_notes` backs the Daily dashboard (one row per date). `habits` + `habit_history` power habit tracking. `energy_levels`, `priorities`, `areas`, `context_tags` are all **user-customizable via Settings**, not hardcoded — this was a deliberate early architectural choice (see the May/June buildout) so the taxonomy isn't baked into the code.

**React state:** four contexts (`EnergyLevels`, `Priorities`, `Areas`, `ContextTags`) mounted at the app root, each fetch-once-on-mount with a `reload()` escape hatch. No global state library — page-level data comes from hooks (`useTasks`, `useProjects`, etc.) that call `src/lib/api/*.js` functions directly against the Supabase client.

**Google integration:** two edge functions — `google-calendar` (fetches events from all connected accounts in parallel, merges/sorts) and `gmail-context` (same pattern for email). Multi-account support via `user_integrations` + a dedicated `google-connect` edge function for adding secondary accounts without disturbing the main session.

---

## 4. Key Decisions Worth Understanding (the "why" behind the current shape)

These aren't arbitrary — each one reflects a direction call that shaped everything downstream of it:

1. **AI moved outside the app entirely (2026-06-19).** Focus Flow stopped trying to be smart and became a clean, deterministic system of record instead. Anything requiring judgment or synthesis is explicitly *not* this app's job anymore.
2. **Reviews and Notes followed the same logic out the door (2026-07-12).** Reviews need synthesis (that's AI's job now); Notes need a different mental model than task/project execution (that's a separate tool's job). Neither was "not done yet" — both were built out fully during the AI era and then deliberately removed once the philosophy solidified.
3. **Scheduling is orthogonal to GTD status.** A task's `scheduled_date` used to be conflated with a `scheduled` status value. That was wrong — you can schedule a next-action, a queued item, anything — so it became an independent field any task can carry regardless of lifecycle stage.
4. **Taxonomy is data, not code.** Priorities, energy levels, areas, and context tags all live in DB tables editable from Settings, specifically so the user's vocabulary can evolve without a code change.
5. **Icons were a deliberate near-total removal.** Every decorative/identity icon outside the sidebar nav was stripped in a two-pass sweep — first replacing emoji with Lucide icons, then removing those too once it was clear the app reads cleaner as plain colored text/chips. Only *functional* icons (edit pencil, trash, drag handle, sidebar nav) survived.
6. **The next big thing is an MCP tool layer, not a new feature.** The DB columns and API functions the old AI layer used (`daily_notes.daily_brief`, `daily_notes.code_challenge`, every CRUD function in `lib/api/*`) were kept on purpose as the surface a future external agent will call into.

---

## 5. Current State — What's Live Right Now

See `CLAUDE.md`'s "Pages — Current State" section for the exhaustive per-page breakdown. Short version:

- **Dashboard** (`/daily`) — quote, quick capture, stat cards, Google Calendar agenda (Focus Flow + Work Hours calendars, toggleable), Tasks section, Projects section, Habits section (weekday-strip based), deterministic Code Challenge.
- **Tasks / Projects** — tabbed by GTD status, filterable, sortable (manual drag or auto modes, synced cross-device via `list_preferences`), bulk select actions.
- **People** — flat, no status lifecycle, search-based.
- **Habits / HabitPage** — weekday-targeted habits, streaks, timeframe-aware calendar heatmap.
- **Settings** — Appearance (3 themes: Catppuccin, GitHub Dark, Cobalt2), Energy Levels, Priorities, Areas, Context Tags, Google Accounts — all with drag-to-reorder.

**Not currently in the app at all:** AI of any kind, Reviews, Notes. All three are intentional absences with a stated future home, not gaps to quietly fill back in without checking the direction first.

---

## 6. Known Follow-ups / Where to Pick Up

From `CLAUDE.md`'s "Known Follow-ups" plus the natural next steps implied by the timeline:

1. **Build the external agent tool layer (the actual next priority).** Nothing has been built yet — this is a from-scratch design task. Wishlist so far: let an outside agent refresh/expand the quote pool, write Daily Briefs back into `daily_notes.daily_brief`, and (implied by the Reviews removal) eventually drive a rebuilt review flow. Decide MCP-server vs. REST+wrapper, and how auth/scoping works for an external caller hitting Supabase.
2. **Habits backfill note:** three existing habits (Meditation, 30 Min Eliptical Training, 50 Squats) were auto-backfilled to "every day" when `target_weekdays` replaced the old day-count field on 2026-07-16, since a count couldn't be mapped to specific days. Their real target days need re-picking in the Habits dashboard — cosmetic data cleanup, not a bug.
3. **Obsidian migration script** — mentioned as a future phase in `CLAUDE.md`, not started.
4. **Per-user RLS scoping** — currently `USING (true)` everywhere; only worth doing if this ever becomes genuinely multi-user.

---

## 7. Practical Notes for Whoever Picks This Up

- **Dev auto-login exists.** A dedicated Supabase account (`claude-dev@focusflow.dev`) plus `.env.local` credentials give instant live-preview access with no OAuth dance — see `CLAUDE.md`'s "Dev Preview Auto-Login" section.
- **Changelog discipline is a hard rule here**, not a suggestion: every commit gets a `CHANGELOG.md` entry first, under the current date, describing what changed *and why it matters to the user*. The changelog above is the actual project history — it's detailed enough that this handoff doc could largely be regenerated from it.
- **Cross-machine workflow:** this project is worked on from multiple computers. The rule is update `CHANGELOG.md` → commit → **push to origin**, every time, so the other machine always knows the true state. Don't leave finished work sitting local-only.
- **`CLAUDE.md` is the living reference** — file structure, full DB schema, React context tree, GTD lifecycles, key code patterns (e.g. `getDailyStats` dedup logic, the noon-local-time DST trick for day navigation, cascade delete order). This handoff doc won't repeat that; go there for anything structural.
- **Collaboration style note:** the project's `CLAUDE.md` specifies a particular relaxed, direct personality ("Stoner Genius") for the assistant working on this repo — that's a user preference on record, not a joke or leftover, if you're an AI reading this.

---

*If you're an AI agent picking this up cold: read `CLAUDE.md` in full before touching anything — it has the concrete file paths, schema, and patterns this document intentionally left out to stay readable. This doc is the map of how we got here; `CLAUDE.md` is the map of where things are.*
