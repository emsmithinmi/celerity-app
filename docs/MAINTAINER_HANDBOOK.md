# Celerity App Maintainer Handbook and Assessment

**Repository:** `emsmithinmi/celerity-app`
**Reviewed branch:** `main`
**Reviewed commit:** `dd14658` (`2026-07-16`, “habits target specific weekdays instead of a day count”)
**Review date:** 2026-07-17
**Application name in code:** Focus Flow
**Live site documented by the repository:** `https://gtd-manager.pages.dev`
**Deployment target in CI:** Cloudflare Pages project `celerity-app`

## Executive assessment

Celerity is a useful, actively developed personal productivity application with a sensible high-level shape: React pages and components call a small API layer, Supabase provides auth and persistence, and Edge Functions isolate Google credentials and third-party API calls. The code is generally readable at the function level, naming is descriptive, the dependency set is restrained, and the internal `CLAUDE.md` and `CHANGELOG.md` contain a great deal of valuable product history.

It is not yet safe to treat as a production multi-user application. The live Supabase project is effectively single-tenant even though the login screen permits additional users. Most personal-data tables lack `user_id`, and their RLS policies allow every authenticated user to read and mutate every row. Supabase's live security advisor reports 27 always-true policies. Several tables can also be modified without signing in. This is the first issue to address.

The code builds, but the quality gate is not healthy: ESLint reports 75 errors and 4 warnings in 35 files, there are no automated tests, and CI runs only the build. One lint error is a definite runtime defect in the auth callback. The code remains understandable, but large page components, swallowed errors, non-transactional multi-step writes, missing database migrations, and duplicated integration logic will make changes progressively riskier.

### Practical rating

| Area | Rating | Assessment |
|---|---:|---|
| Product/domain clarity | 8/10 | The intended GTD behavior is well documented and reflected in names and screen organization. |
| Architecture | 6/10 | The frontend/API/Edge Function split is sound, but data ownership and integration boundaries need redesign. |
| Code readability | 6/10 | Local functions are readable; very large pages and repeated patterns reduce whole-system clarity. |
| Consistency | 5/10 | There are reusable UI/API patterns, but error handling, state loading, styling, and naming vary. |
| Testability | 1/10 | No tests, no test script, and many operations are coupled directly to Supabase. |
| Security | 2/10 | Live RLS isolation is unsafe, OAuth CSRF protection is missing, and private REST responses are cached. |
| Operational readiness | 4/10 | Build and deploy exist, but schema history, environment templates, lint/test gates, and rollback guidance do not. |

**Overall:** a solid personal prototype with a clear product idea, but high maintenance and security risk until the P0/P1 backlog below is completed.

## What the application does

Focus Flow is a GTD-style personal productivity manager. Its current features include:

- A daily dashboard with a rolling Google Calendar agenda, daily quote, quick capture, task/project statistics, habits, and a code challenge.
- Task lifecycle management, scheduling, deadlines, priorities, energy, areas, context tags, people links, comments/notes, subtasks, completion, archiving, and highlights.
- Project lifecycle management with linked tasks and people.
- A lightweight people/relationship database with contact information and avatars.
- Configurable priorities, energy levels, areas, context tags, and list ordering.
- Google sign-in plus separately connected Google accounts for calendar and Gmail context.
- PWA installation and offline asset support.

Reviews, general notes, and the former in-app AI layer were intentionally removed. The repository describes them as future external-agent capabilities rather than current application features.

## Technology and runtime inventory

| Concern | Implementation |
|---|---|
| Frontend | React 19, React Router 7, JavaScript/JSX |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 utilities, global CSS variables, component inline styles |
| Icons | Lucide React |
| Backend | Supabase Postgres, Auth, Storage, RLS, Edge Functions |
| Third-party APIs | Google OAuth, Calendar API, Gmail API |
| PWA | `vite-plugin-pwa` / Workbox |
| Hosting | Cloudflare Pages |
| CI/CD | GitHub Actions on pushes to `main` |
| Package management | npm with committed `package-lock.json` |
| Tests | None |

Repository size at review time:

- 96 frontend source files and approximately 13,871 lines under `src/`.
- 4 Edge Functions and approximately 878 lines under `supabase/functions/`.
- Largest files: `Settings.jsx` (1,061 lines), `TaskPage.jsx` (782), `PersonPage.jsx` (751), `ProjectDetail.jsx` (508), `ProjectPage.jsx` (487), and `HabitPage.jsx` (466).

## Architecture

```text
Browser / installed PWA
  |
  +-- React routes and pages
  |     |
  |     +-- shared components and contexts
  |     +-- hooks for loading page collections
  |     +-- src/lib/api/* for Supabase CRUD
  |
  +-- Supabase Data API using the user's session and RLS
  |     +-- Postgres tables
  |     +-- Auth
  |     +-- avatars Storage bucket
  |
  +-- authenticated Supabase Edge Functions
        +-- validate the caller's Supabase JWT
        +-- use service role only after validation
        +-- load that user's Google tokens
        +-- call Google Calendar or Gmail
```

### Frontend layers

- `src/pages/` owns route-level screens and much of their form/state orchestration.
- `src/components/` contains daily-dashboard sections, layout, task/project/people components, and shared UI elements.
- `src/hooks/` wraps collection loading and some cross-screen refresh behavior.
- `src/lib/api/` is the primary CRUD boundary. This is the right place for persistence operations, although some pages still call Supabase directly.
- `src/contexts/` loads auth, theme, and reference data such as priorities and areas.
- `src/lib/eventBus.js` broadcasts task/project changes so dashboard statistics and lists can reload.

### Routes

| Route | Screen | Access |
|---|---|---|
| `/login` | Magic-link and Google sign-in | Public |
| `/reset-password` | Password reset | Public |
| `/auth/callback` | Supabase OAuth callback | Public |
| `/auth/google-callback` | Additional Google account callback | Public route, but API exchange requires a session |
| `/daily` | Main dashboard | Authenticated |
| `/tasks` and `/tasks/:id` | Task list and detail | Authenticated |
| `/projects` and `/projects/:id` | Project list and detail | Authenticated |
| `/people` and `/people/:id` | People list and detail | Authenticated |
| `/habits` and `/habits/:habit` | Habits list and detail | Authenticated |
| `/settings` | User and reference-data settings | Authenticated |

### Edge Functions

| Function | Purpose | Important behavior |
|---|---|---|
| `google-connect` | Builds an OAuth URL, exchanges the code, and stores Google tokens | Manual OAuth implementation; uses service role after caller validation |
| `google-calendar` | Reads events from connected calendars | Queries all integrations for the caller and refreshes expired access tokens |
| `google-actions` | Creates/updates/deletes calendar events and supports Gmail actions | Currently assumes exactly one Google integration |
| `gmail-context` | Reads labeled and recent unread Gmail threads | Queries all integrations and merges results |

## Live database snapshot

The linked Supabase project is `egxbhglczkslnskxorlf` (“Project Management App”). The review inspected metadata, policies, grants, and Supabase advisors without changing data.

Twenty public tables were present:

| Group | Tables |
|---|---|
| Core GTD data | `tasks`, `projects`, `people`, `daily_notes` |
| Relationships/comments | `task_people`, `project_people`, `task_comments`, `project_comments`, `people_comments` |
| Habits | `habits`, `habit_history` |
| Reference/configuration | `areas`, `priorities`, `energy_levels`, `context_tags`, `list_preferences`, `code_challenges` |
| Calendar/integrations | `calendar_events`, `user_integrations`, `user_settings` |

Important ownership facts:

- `tasks`, `projects`, `people`, `daily_notes`, all relationship/comment tables, `list_preferences`, and `calendar_events` do not have a `user_id` column.
- `daily_notes.date`, `projects.slug`, habit keys, and several reference values are globally unique rather than unique per user.
- `habits` and `habit_history` have nullable `user_id` columns, but their policies do not use them. `createHabit()` also does not populate `user_id`, and `getHabits()` does not filter by it.
- Only `user_integrations` and `user_settings` currently have owner-scoped policies using `auth.uid() = user_id`.

This schema is structurally single-tenant. Making policies stricter alone is not enough; ownership columns, backfill, foreign-key-aware policies, and per-user unique constraints are required.

## Authentication and Google integration

### Supabase auth

- `AuthContext` initializes the stored session and subscribes to auth changes.
- `ProtectedRoute` prevents unauthenticated access to application pages.
- Login supports email magic links, email/password sign-in, password reset, and Google OAuth. Passwords are managed by Supabase Auth and are never stored in the repository.
- The Google login requests broad Calendar and Gmail scopes and writes provider tokens to `user_integrations` from the browser.
- A development-only password sign-in is enabled when `VITE_DEV_EMAIL` and `VITE_DEV_PASSWORD` exist.

### Additional Google accounts

- Settings or the Agenda asks `google-connect` for a Google authorization URL.
- The selected account label is stored in `sessionStorage`.
- Google redirects to `/auth/google-callback` with a code.
- The browser sends the code to `google-connect`, which exchanges it using the server-side client secret and stores tokens using the Supabase service role.

The manual flow lacks a `state` nonce and validation. It also asks only for read-only Gmail and Calendar scopes even though `google-actions` performs writes.

## Local development

### Prerequisites

- Node.js 20 (CI currently selects the latest Node 20 release).
- npm.
- Access to the linked or a separate Supabase project.
- Google OAuth credentials and configured redirect URIs if testing integrations.

### Required frontend environment variables

Copy `.env.example` to `.env.local` in the repository root, then fill in the
local Supabase publishable/anon key:

```dotenv
VITE_SUPABASE_URL=https://egxbhglczkslnskxorlf.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-legacy-anon-key>
```

Optional development auto-login variables:

```dotenv
VITE_DEV_EMAIL=<dedicated-dev-user>
VITE_DEV_PASSWORD=<dedicated-dev-password>
```

Do not use a personal password for the development auto-login. Vite exposes every `VITE_` variable to browser code, so these credentials are visible to anyone who can load a development build.

### Edge Function secrets

The functions expect:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Supabase provides its standard project variables in the hosted runtime; Google credentials must be configured as function secrets. Service-role and Google client secrets must never be added to Vite variables or committed files.

### Commands

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run preview
```

There is currently no test command. There is also no `.env.example`, `supabase/config.toml`, or `supabase/migrations/` directory, so a fresh backend cannot be reproduced from the repository.

## Deployment

`.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch:

1. Check out the repository.
2. Set up Node 20.
3. Run `npm ci`.
4. Run `npm run build` with the frontend Supabase secrets.
5. Deploy `dist` to Cloudflare Pages using Wrangler.

GitHub secrets required by the workflow:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`

Current gaps:

- Lint is not run, which is why definite errors can deploy.
- There are no tests to run.
- Edge Function deployment and database migration are not part of the pipeline.
- The workflow actions are version-tagged rather than pinned to commit SHAs.
- There is no documented rollback procedure.

## What is done well

- Domain names and lifecycle concepts are clear and consistent enough to navigate quickly.
- CRUD operations are mostly centralized in `src/lib/api/` instead of being scattered through every component.
- Shared UI components cover common controls and visual language.
- Independent data fetches are often parallelized with `Promise.all`.
- The Google Calendar reader correctly fetches multiple integrations in parallel and scopes service-role queries to the authenticated user.
- The dependency set is small for the feature surface, and the lockfile is committed.
- The production build succeeds with a reasonable initial bundle (approximately 329 KB JavaScript, 97 KB gzip).
- `CHANGELOG.md` provides detailed decision history, and `CLAUDE.md` captures many operational facts.
- Secrets were not found committed in the reviewed source.

## Findings and prioritized repair backlog

### P0 — fix before adding users or sharing access

#### SEC-01: Live RLS policies expose all personal data to every authenticated user

**Status:** Confirmed in the live database.
**Impact:** Any person who can authenticate can read, alter, or delete all tasks, projects, people/contact details, daily notes, comments, links, habits, and history. The login screen allows arbitrary email magic-link or Google sign-in, so authentication is not equivalent to authorization.
**Evidence:** 27 live policies use `USING (true)` / `WITH CHECK (true)`. Core tables do not have `user_id`. The repository explicitly says the dev account sees the same data.
**Repair:** Decide whether the product is truly single-user or multi-user.

- If single-user, restrict sign-in to an explicit allowlist and remove claims that it is multi-user.
- If multi-user, add non-null ownership to every personal-data root, backfill it, propagate ownership through relationship policies, change unique constraints to include the owner, then create separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies using `(select auth.uid()) = user_id` with `WITH CHECK` on writes.
- Apply this through reviewed migrations and verify with two test accounts before reopening access.

#### SEC-02: Several tables are anonymously writable

**Status:** Confirmed in live grants and policies.
**Impact:** `code_challenges`, `context_tags`, and `list_preferences` grant anonymous roles full table privileges and have public always-true policies. An unauthenticated client with the public key can read, insert, update, or delete their contents. Other tables also have unnecessarily broad anonymous grants even where RLS presently blocks row access.
**Repair:** Revoke write privileges from `anon`, replace public `ALL` policies with the minimum intended operation, and treat shared configuration as authenticated-admin-managed or read-only.

### P1 — fix before the next feature cycle

#### BUG-01: The Supabase auth callback calls an undefined function

**Status:** Fixed in the current frontend branch; the callback now relies on the Supabase session listener and existing-session check without unreachable code.
**Location:** `src/pages/AuthCallback.jsx:52`
**Impact:** The effect executes `handleCallback()` after a `return` statement, even though no such function exists. ESLint reports both `no-undef` and unreachable code. Depending on callback timing, users can see an error or fail to navigate cleanly. The thrown error also prevents React from registering the effect cleanup.
**Remaining work:** Handle `getSession()` errors explicitly and add callback tests for success, denial, existing session, and timeout.

#### SEC-03: Additional-account OAuth has no CSRF `state` protection

**Status:** Confirmed.
**Locations:** `supabase/functions/google-connect/index.ts:52-66`, `src/pages/GoogleCallback.jsx:14-35`
**Impact:** The authorization URL has no unpredictable `state`, and the callback exchanges any received code without comparing it to an initiated browser session. This leaves the account-link flow vulnerable to OAuth login/account-linking CSRF. The label stored in `sessionStorage` is not a CSRF control.
**Repair:** Generate a cryptographically random, short-lived state value on the server, bind it to the authenticated Supabase user and redirect URI, validate and consume it during code exchange, and allowlist redirect URIs.

#### BUG-02: Connected-account scopes do not permit the writes implemented by `google-actions`

**Status:** Confirmed scope mismatch.
**Locations:** `supabase/functions/google-connect/index.ts:17-21`, `supabase/functions/google-actions/index.ts:57-132`
**Impact:** `google-connect` requests `gmail.readonly` and `calendar.readonly`, but `google-actions` archives/trashes Gmail threads and creates, updates, and deletes Calendar events. Tokens created or refreshed through the dedicated connection flow lack the required write authority.
**Repair:** Define feature-specific scopes centrally. Request `calendar.events` (or the narrowest owned-event scope that fits) and `gmail.modify` only when those actions are enabled. Use incremental authorization and surface insufficient-scope errors explicitly.

#### BUG-03: Calendar event creation mishandles all-day and cross-midnight events

**Status:** Confirmed against code and the Google event model.
**Locations:** `src/lib/api/googleActions.js:60-84`, `supabase/functions/google-actions/index.ts:79-87`
**Impact:** An all-day event sends the same start and end date, but Google treats `end` as exclusive; a one-day event must end on the following date. Timed tasks that cross midnight wrap the clock to the next day without incrementing the date, producing an end before the start.
**Repair:** Build date-time ranges with real date arithmetic in the user's time zone. For all-day tasks, add one calendar day to `end.date`. Add tests for all-day, DST transitions, midnight crossing, and durations over 24 hours.

#### BUG-04: `google-actions` fails when a user has multiple Google integrations

**Status:** Confirmed latent bug; the live project currently has one integration row.
**Location:** `supabase/functions/google-actions/index.ts:166-171`
**Impact:** The product supports multiple Google accounts, but the write function filters only by user and provider and then calls `.maybeSingle()`. More than one row causes a multiple-row error; the error is ignored and the function reports `no_integration`.
**Repair:** Include an integration/account identifier in every action or define a deterministic account label. Check the query error and use `.single()` only after filtering to a unique key.

#### SEC-04: The PWA caches authenticated Supabase REST responses across sessions

**Status:** Frontend mitigation applied: authenticated Supabase REST responses are no longer runtime-cached, and the legacy cache is purged on startup/sign-out.
**Location:** `vite.config.js:47-60`
**Impact:** Workbox stores up to 50 Supabase REST responses for five minutes under one cache name. Responses can contain tasks, people, notes, or other private data. Cache entries are not partitioned by user or cleared on sign-out, so another account on the same browser could receive the previous user's cached response during a timeout/offline fallback. Sensitive data also persists in Cache Storage after logout.
**Remaining work:** Verify the deployed service worker has replaced older versions and confirm private Cache Storage is empty after an upgrade and sign-out.

#### SEC-05: Vite 8.0.12/8.0.14 is affected by a high-severity development-server path disclosure advisory

**Status:** The committed lockfile is updated to patched dependency versions and `npm audit --omit=dev` reports zero vulnerabilities. The current local `node_modules` tree could not be replaced because Windows held a native Vite binding open during `npm ci`.
**Impact:** The installed Vite range is affected by a Windows `server.fs.deny` bypass; another Vite/launch-editor issue can disclose an NTLMv2 hash through UNC handling. These primarily affect development servers, especially when exposed to a network. A low-severity Babel source-map arbitrary-file-read advisory is also present.
**Remaining work:** Complete a clean `npm ci` after the locked local process/file handle is released, rerun the build, and avoid exposing the Vite development server to untrusted networks.

#### SEC-06: Supabase security advisor hardening

**Status:** Database-side items complete. The live security advisor now reports only the Auth setting for leaked-password protection.
**Repair completed:** The internal `public.rls_auto_enable()` function is no longer callable through the Data API, and explicit `search_path` values are set on the three existing trigger/helper functions. The multi-user migration also replaced the broad personal-data policies with owner-scoped policies and removed anonymous table privileges.
**Remaining work:** Enable leaked-password protection in the Supabase Auth project settings. This is a dashboard/project configuration change, not a repository migration.

#### BUG-05: Reference-data providers can load before authentication and never recover

**Status:** Fixed in the current frontend branch; reference providers now mount inside the authenticated application shell.
**Locations:** `src/App.jsx:28-60` and the four reference contexts
**Impact:** Energy, priority, area, and context providers mount outside `ProtectedRoute` and query immediately. On a fresh OAuth callback or logged-out visit, some queries run as `anon`, fail, set loading false, and do not automatically retry after sign-in because the providers stay mounted. Lists and badges may remain empty until a full reload.
**Remaining work:** Add an automated auth/provider regression test and verify the deployed app after the next release.

### P2 — maintenance and data-integrity work

#### QUAL-01: Lint is failing broadly and CI does not enforce it

**Status:** 75 errors and 4 warnings in 35 of 96 checked files.
**Main categories:** 31 synchronous state updates in effects, 25 unused variables, 11 mixed component/helper exports affecting Fast Refresh, hook dependency/memo issues, impure `Date.now()` calls during render, and the definite auth callback error.
**Repair:** Fix definite correctness errors first, then agree on React 19 lint conventions and handle the rest in small, behavior-preserving batches. Add `npm run lint` before build in CI.

#### QUAL-02: There are no automated tests

**Impact:** Auth callbacks, status cascades, calendar time conversion, multi-account behavior, habit updates, and destructive workflows can regress without detection.
**Repair sequence:**

1. Add unit tests for pure date/duration/status helpers.
2. Add component tests for auth callbacks and critical forms.
3. Add API-layer tests with a Supabase client test double.
4. Add a small end-to-end smoke suite for login, create/edit/complete task, and Google-connect failure states.
5. Add a two-user RLS integration suite before claiming multi-user support.

#### DATA-01: Multi-step writes and deletes are not transactional

**Locations:** project duplication/deletion, person deletion, task completion/waiting cascades
**Impact:** Several operations make sequential client requests. Some intermediate delete results are ignored. A network or policy failure can leave a partially duplicated project, a partially deleted person, or a task/project status mismatch.
**Repair:** Move integrity-sensitive operations into database functions with explicit transactions and authorization checks, or use foreign-key cascades where the ownership model permits. Always inspect every error.

#### BUG-06: New projects can collide on the globally unique slug

**Location:** `src/lib/api/projects.js:58-64`
**Impact:** Creating two projects with the same or equivalently normalized title produces the same slug and fails. In a future multi-user design, identical titles across users also collide.
**Repair:** Use a generated suffix or a stable ID-based slug and scope uniqueness to the owner.

#### BUG-07: Session events can overwrite a stored Google refresh token with `null`

**Location:** `src/contexts/AuthContext.jsx`
**Impact:** `saveGoogleTokens()` upserts `refresh_token: null` whenever a provider access token exists but a refresh token is absent. Providers commonly omit a refresh token outside the initial consent exchange, so a valid stored token may be erased. Errors are ignored.
**Status:** Fixed in the current frontend branch: refresh tokens are only included when a new non-empty value is present, and persistence failures are logged.

#### BUG-08: Daily and Google failures are deliberately hidden

**Locations:** `src/pages/Daily.jsx:20-41,85,96-103,167-172` and several `catch(() => {})` calls
**Impact:** Calendar outages, expired scopes, bad Edge Function deployments, and habit-loading errors render as empty data. Maintainers and users cannot distinguish “nothing scheduled” from “integration failed.”
**Repair:** Adopt a consistent error-result shape, show non-blocking section-level error states, and log structured errors with operation and correlation context.

#### DATA-02: Check-then-insert patterns are race-prone

**Locations:** daily-note creation and habit-history updates
**Impact:** Two tabs can both observe no row and then race on a unique key, causing one request to fail. Habit JSON read-modify-write can also lose concurrent updates.
**Repair:** Use owner-scoped unique constraints plus atomic upsert/RPC operations.

## Consistency and maintainability assessment

### Patterns to retain

- Keep domain persistence behind `src/lib/api/`.
- Keep route pages focused on composition and interaction state.
- Keep shared visual controls under `src/components/ui/`.
- Continue parallelizing independent reads.
- Continue recording intentional product decisions in a changelog.

### Patterns to standardize

1. **Errors:** API functions should throw typed/structured errors; pages should display section-level or page-level errors. Do not silently convert failures to empty data.
2. **Loading:** Use one authenticated query strategy rather than a mixture of contexts, page effects, hooks, and direct calls.
3. **Mutations:** Every mutation should check its result, emit one consistent invalidation signal, and be transactional when it spans tables.
4. **Ownership:** Every personal row must have an explicit owner. Shared lookup data should be clearly separated from user-owned configuration.
5. **Dates:** Centralize local-date, UTC, interval, and Google Calendar conversion helpers and test DST/midnight behavior.
6. **Google accounts:** Pass an explicit integration ID or label; never infer a single row where the model permits many.
7. **Components:** Split pages above roughly 300–400 lines into domain sections/hooks. Avoid defining duplicate form logic and styling patterns.
8. **Styling:** Prefer shared classes/components and CSS variables over repeated inline hover/focus mutations.
9. **Frontend types:** Consider TypeScript or, at minimum, JSDoc domain types at API boundaries. Edge Functions are typed, but the larger frontend is not.
10. **Naming:** Finish the Celerity/Focus Flow/gtd-manager rename or document the three names explicitly. `package.json` still says `focus-flow`, the live URL says `gtd-manager`, and the repository/deploy target says `celerity-app`.

## Recommended target structure

No immediate rewrite is needed. Incrementally move toward:

```text
src/
  app/                 # providers, router, authenticated shell
  features/
    auth/
    tasks/
    projects/
    people/
    habits/
    daily/
    google/
  components/ui/       # generic visual primitives only
  lib/
    supabase/
    dates/
    errors/
    events/
supabase/
  config.toml
  migrations/
  functions/
    _shared/           # auth, CORS, token refresh, JSON responses
    google-connect/
    google-calendar/
    google-actions/
    gmail-context/
tests/
  unit/
  integration/
  e2e/
```

The important change is clearer ownership, not folder movement for its own sake.

## Maintenance runbook

### Before changing code

1. Pull `main` and record the starting commit.
2. Read the relevant API module, route/page, and recent changelog entries together.
3. Check whether the change affects schema, RLS, OAuth scopes, cached data, or Google account selection.
4. Reproduce the current behavior and record a minimal test case.

### Before merging

1. Run `npm ci` from a clean checkout when dependencies changed.
2. Run lint, unit/integration tests, production build, and `npm audit`.
3. For schema changes, review the migration, apply it to a non-production project, run Supabase security and performance advisors, and test with two users.
4. For OAuth changes, test success, denial, state mismatch, expired code, revoked token, insufficient scope, and multiple accounts.
5. For PWA changes, test a fresh install, update, logout, offline mode, and cache clearing.
6. Update the real README and changelog.

### After deploying

1. Smoke-test login and auth callback.
2. Create, edit, schedule, complete, and delete a disposable task.
3. Confirm Calendar read and write behavior with the intended account.
4. Check Edge Function and browser logs for new errors.
5. Confirm no Supabase advisor regressions.

## Documentation work needed

The current `README.md` is the default Vite template and does not explain the product. Replace it with a concise entry point containing:

- Product purpose and screenshots.
- Stack and architecture summary.
- Local setup and `.env.example` reference.
- Commands and quality gates.
- Backend/migration setup.
- Deployment overview.
- Links to this maintainer handbook and the changelog.

Keep `CLAUDE.md` as an internal agent/developer context document if it remains useful, but remove personal email addresses, machine-specific details, and personality instructions from the canonical engineering handbook. Product history, operational instructions, and conversational preferences should not be mixed in one file.

## Recommended execution order

### Phase 1: Contain immediate risk

1. Restrict who can authenticate until tenant isolation is fixed.
2. Remove anonymous writes.
3. Fix `AuthCallback.jsx` and add lint to CI.
4. Upgrade vulnerable dependencies.
5. Disable private REST runtime caching.
6. Revoke exposed privileged-function execution and address the security advisor.

### Phase 2: Establish ownership and reproducibility

1. Add migrations/config to source control.
2. Design and migrate owner columns and owner-scoped unique constraints.
3. Replace permissive policies and verify them with two users.
4. Add an `.env.example` and replace the template README.
5. Add critical unit, integration, and RLS tests.

### Phase 3: Stabilize integrations and code structure

1. Add OAuth state, redirect allowlisting, and correct incremental scopes.
2. Make Google account selection explicit.
3. Fix calendar date arithmetic.
4. Consolidate Edge Function auth/CORS/token logic under `_shared`.
5. Refactor the largest route components and standardize error handling.

## Verification performed during this review

| Check | Result |
|---|---|
| Repository checkout | Clean `main` at `dd14658` |
| `npm ci` | Passed; 431 packages installed |
| Production build | Passed; Vite generated PWA assets |
| ESLint | Failed: 75 errors, 4 warnings |
| Automated tests | None exist |
| `npm audit` | 1 high, 1 low vulnerability |
| Secret-pattern scan | No committed service-role, Google client secret, private key, or obvious credential found |
| Supabase tables/policies/grants | Inspected live, read-only |
| Supabase security advisor | 34 warnings, including 27 always-true RLS policies |
| Supabase performance advisor | 43 notices: 3 unindexed foreign keys, 2 auth init-plan policies, 2 unused indexes, 36 duplicate permissive policies |

## Known unknowns

- No full end-to-end run was performed against the live UI because no user credentials were used.
- Edge Functions were reviewed statically but not redeployed or invoked with live Google accounts.
- Cloudflare settings, Supabase Auth provider restrictions, Google Cloud redirect configuration, logs, backups, and secret rotation policy are outside the repository and were not changed.
- The live database has no migration history in this repository, so the exact sequence that produced its present schema cannot be reconstructed.
- The intended long-term tenancy model needs an explicit product decision. The code and docs currently say “multiple users,” while the schema and dedicated dev account behavior say “one shared dataset.”

## External references used for security validation

- Supabase: securing Edge Functions and authenticated user calls — `https://supabase.com/docs/guides/functions/auth`
- Supabase: permissive RLS policy advisor — `https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy`
- Supabase: product security — `https://supabase.com/docs/guides/security/product-security`
- Google: OAuth 2.0 web server flow and `state` validation — `https://developers.google.com/identity/protocols/oauth2/web-server`
- Google: Calendar authorization scopes — `https://developers.google.com/workspace/calendar/api/auth`
- Google: Calendar event resource; event end is exclusive — `https://developers.google.com/workspace/calendar/api/v3/reference/events`

---

This document is a review artifact, not a claim that the current production system was modified. No repository, database, GitHub, Cloudflare, Supabase, or Google state was changed during the assessment.
