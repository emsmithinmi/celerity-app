# Focus Flow — Project Context

## What This Is
Focus Flow — a personal GTD (Getting Things Done) productivity PWA built with React + Vite + Supabase.
App supports multiple users via RLS (scoped per `auth.uid()`). Primary user: emailemsmith@gmail.com.

## Stack
- **Frontend:** React 18, Vite, Tailwind CSS v4 (`@tailwindcss/vite`)
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Auth:** Google OAuth (primary) + Magic link email fallback
- **Hosting:** Cloudflare Pages
- **PWA:** `vite-plugin-pwa` (Workbox, generateSW mode)
- **Router:** React Router DOM v6

## Key URLs
- **Live app:** https://gtd-manager.pages.dev
- **GitHub repo:** https://github.com/emsmithinmi/celerity-app
- **Supabase project:** https://supabase.com/dashboard/project/egxbhglczkslnskxorlf
- **Supabase project ID:** `egxbhglczkslnskxorlf`
- **Cloudflare account ID:** `2e21f19b71235b0620cfdb8c91bf4156`
- **Cloudflare Pages project:** `celerity-app` (domain: gtd-manager.pages.dev — permanent, tied to original project name)
- **Google Cloud Project ID:** `focus-flow-20260602`

## Google OAuth & Calendar

Google sign-in requests Calendar + Gmail scopes at login (`access_type: offline, prompt: consent`).
Tokens stored in `user_integrations` table. Edge function `google-calendar` fetches live events.

**Focus Flow Calendar ID (hardcoded):**
`858f646b41576c785a734cbe4e63df27da29487b4b59ce8f1ed435e9cd7f3d7a@group.calendar.google.com`

**Other Calendar IDs (for reference/manual sync):**
| Calendar | ID |
|---|---|
| Primary | `emailemsmith@gmail.com` |
| Time Management | `6ea50d30fb9e21ca0e3794c2093541465c39add90e42f36571728ca5e65efb45@group.calendar.google.com` |
| Family | `family15217148776896169650@group.calendar.google.com` |
| US Holidays | `en.usa#holiday@group.v.calendar.google.com` |

When syncing, fetch all four calendars for the target date range and upsert into `calendar_events (id, date, summary, start_time, end_time, all_day, calendar_name, notes)`. Use `ON CONFLICT (id) DO UPDATE` so reruns are safe.

## Changelog

**Location:** `CHANGELOG.md` at the repo root.

**Rule: update `CHANGELOG.md` before every commit.** Add an entry under the current date (or the existing `[Unreleased]` block if the session isn't done yet). Format:

```
## YYYY-MM-DD

### Added / Changed / Fixed
- Short description of what changed and why it matters to the user.
```

Do not commit without a corresponding changelog entry. The changelog is the human-readable record of the project — keep it up to date so it never has to be backfilled again.

## Project Structure
```
src/
  lib/
    supabase.js
    constants.js
    ai/
      config.js            # read/write AI provider config from Supabase user_metadata
      client.js            # brand-agnostic callAI() — routes all calls through Supabase Edge Function proxy
      adapters/
        openai.js          # OpenAI-compatible adapter (unused directly — proxy handles it)
        anthropic.js       # Anthropic adapter (unused directly — proxy handles it)
      skills/
        dailyReview.js     # Daily review skill: context builder, prompt, parser, writes tomorrow's note
    api/
      tasks.js
      projects.js
      people.js
      daily.js           # daily_notes + habits + getDailyStats(date)
      reviews.js
      energyLevels.js    # CRUD for energy_levels table
      priorities.js      # CRUD for priorities table
      areas.js           # CRUD for areas table
      user.js            # uploadUserAvatar — uploads to avatars bucket, saves URL in auth user_metadata
  contexts/
    AuthContext.jsx
    EnergyLevelsContext.jsx   # provides levels[], levelMap{}, reload()
    PrioritiesContext.jsx     # provides priorities[], priorityMap{}, reload()
    AreasContext.jsx          # provides areas[], reload()
  hooks/
    useTasks.js
    useProjects.js
    usePeople.js
    useDaily.js              # accepts date param; returns note, stats, habitHistory
    useAI.js                 # useAIConfig(), useSkill(), useAITest() hooks
  components/
    layout/
      Layout.jsx             # collapsible sidebar, nav links, settings link
      ProtectedRoute.jsx
    daily/
      AgendaSection.jsx
      ChallengeSection.jsx
      DailyQuote.jsx         # seeded by day-of-year, accepts dateStr prop
      HabitsSection.jsx
      NotesSection.jsx
      ProjectsSection.jsx
      QuickCaptureModals.jsx # CaptureTaskModal, CaptureProjectModal, CapturePersonModal, QuickNoteModal
      QuoteBlock.jsx
      StatCards.jsx          # 5 stat cards: Projects in Progress, Next Actions, Due Today, Tasks Waiting, Stalled Projects
      TasksSection.jsx
      TopOfMind.jsx
    tasks/
      TaskRow.jsx
      TaskDetail.jsx         # inline edit component (used inside TaskPage)
      TaskComments.jsx
      TaskChecklist.jsx      # subtask checklist — JSONB steps scoped to the task, not real tasks
      DurationInput.jsx
      HighlightModal.jsx
      RouteModal.jsx
      WaitingModal.jsx
    projects/
      ProjectRow.jsx
      ProjectDetail.jsx      # inline edit component (used inside ProjectPage)
      ProjectComments.jsx
      ProjectTaskList.jsx
    people/
      PersonRow.jsx          # shows avatar, name, relationship/occupation/company subtitle
      PersonDetail.jsx       # legacy component (may be unused)
      PersonComments.jsx
    ui/
      AvatarCircle.jsx       # circular avatar: shows image or initials fallback; canUpload adds camera-hover + file input (sizes: sm/md/lg)
      Button.jsx
      Modal.jsx
      ConfirmDialog.jsx
      StatusPill.jsx
      PriorityBadge.jsx      # reads from PrioritiesContext
      EnergyBadge.jsx        # reads from EnergyLevelsContext
      DurationDisplay.jsx
      ContextTag.jsx
      index.js
  pages/
    Login.jsx
    Daily.jsx                # date nav (← →), top-of-mind, stat cards, agenda, habits, notes, challenge
    Tasks.jsx                # tabbed by status, stat row, capture modal
    TaskPage.jsx             # full detail page at /tasks/:id
    Projects.jsx             # tabbed by status, stat row, capture modal
    ProjectPage.jsx          # full detail page at /projects/:id (includes Scrap It button)
    People.jsx               # tabbed by status, stat row
    PersonPage.jsx           # full detail page at /people/:id
    Habits.jsx               # calendar heatmap, streaks, % bars
    HabitPage.jsx            # individual habit detail
    Reviews.jsx              # Daily/Weekly/Monthly with autosave
    Settings.jsx             # manage Energy Levels, Priorities, Areas
public/
  icon.svg
  _redirects               # Cloudflare Pages SPA routing: /* /index.html 200
.github/
  workflows/
    deploy.yml             # push to main → npm run build → wrangler pages deploy
```

## Database Tables (Supabase)
All tables have RLS enabled with `USING (true) WITH CHECK (true)` + `GRANT ALL TO authenticated`.

| Table | Key columns |
|-------|-------------|
| `tasks` | id, title, status, priority, due_date, project_id, area, energy_level, waiting_for, archived_at, subtasks (jsonb), context (text[]) |
| `projects` | id, title, slug, status, priority, area, start_date, end_date, is_highlight, archived_at |
| `people` | id, first_name, last_name, preferred_name, professional_title, relationship, contact_type, occupation, company, email_personal, email_work, phone_personal, phone_work, birthday, address_street, address_city, address_state, address_zip, address_work_street, address_work_city, address_work_state, address_work_zip, social_media (jsonb), notes, is_stale, status, avatar_url |
| `daily_notes` | id, date, top_of_mind[], agenda jsonb, notes jsonb, habit_morning_meds, habit_evening_meds, habit_journal, habit_meditation, habit_breathwork, habit_stretching, habit_health_tracking, habit_code_challenge, code_challenge jsonb, quote text, quote_author text |
| `reviews` | id, type, date, status, content jsonb, suggestions jsonb, insights jsonb, summary text, updated_at |
| `calendar_events` | id (text PK), date, summary, start_time (timestamptz), end_time (timestamptz), all_day (bool), calendar_name, notes, synced_at |
| `energy_levels` | id, value, label, icon, bg_color, text_color, sort_order |
| `priorities` | id, value, label, bg_color, text_color, sort_order |
| `areas` | id, value, label, sort_order |
| `habits` | (separate habit tracking table) |
| `habit_history` | (per-date habit records) |
| `task_comments` | id, task_id, body, created_at |
| `project_comments` | id, project_id, body, created_at |
| `people_comments` | id, person_id, body, created_at |
| `task_people` | task_id, person_id |
| `project_people` | project_id, person_id |

**Dropped constraints:** `tasks_priority_check`, `projects_priority_check`, `people_contact_type_check` — all removed so new values can be added freely via Settings.

## GTD Status Lifecycles
- **Tasks:** inbox → next_action → scheduled → queued → waiting → someday → done (archived_at for archive)
- **Projects:** inbox → planning → in_progress → waiting → stalled → completed (archived_at for archive)
- **People:** inbox → active → stale (is_stale flag + status)

## React Context Pattern
Contexts mounted at App root (outside BrowserRouter):
```jsx
<ThemeProvider>        // persists theme to localStorage, sets data-theme on <html>
  <AuthProvider>
    <EnergyLevelsProvider>
      <PrioritiesProvider>
        <AreasProvider>
          <BrowserRouter>…</BrowserRouter>
        </AreasProvider>
      </PrioritiesProvider>
    </EnergyLevelsProvider>
  </AuthProvider>
</ThemeProvider>
```
- Each fetches from DB once on mount and exposes `{ data[], map{}, loading, reload }`
- Components consume via `useEnergyLevels()`, `usePriorities()`, `useAreas()`
- `EnergyBadge` and `PriorityBadge` read directly from context — no hardcoded colors

## Key Patterns
- All API functions in `src/lib/api/*.js` use the static `supabase` import
- Detail views are **full pages** (`/tasks/:id`, `/projects/:id`, `/people/:id`), not modals
- `useDaily(date)` — accepts a date string; `ensureNoteForDate(date)` creates a note for any date on first visit
- Day navigation on Daily page uses noon-local-time trick: `new Date(dateStr + 'T12:00:00')` to avoid DST shifts
- `getDailyStats(date)` — "Due Today" counts tasks with that due_date OR status=scheduled OR priority in (urgent, stat), plus projects with end_date on that day (all deduped via single `.or()` query)
- Area fields use `<input list="..."> + <datalist>` — free-text with managed suggestions
- Priority/energy dropdowns driven by context arrays, never hardcoded
- `updatePerson` strips legacy field names (`phone`, `email`, `last_contact_at`) to prevent DB errors
- Cascade delete order: junction tables → comments → children → parent

## Deployment Pipeline
- Push to `main` → GitHub Actions → `npm run build` → `wrangler pages deploy dist`
- Build time: ~32 seconds
- Env vars stored as GitHub secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `CLOUDFLARE_API_TOKEN`

## Email / Auth
- Magic link auth via Supabase
- Custom SMTP: Resend (`smtp.resend.com:465`, user: `resend`)
- Redirect URLs configured in Supabase: `https://gtd-manager.pages.dev` + `https://*.gtd-manager.pages.dev`

## Pages — Current State
- **Daily** — date nav, daily quote, quick capture bar, top-of-mind, stat cards, agenda (Google Calendar events + all-day tasks/project deadlines), projects section, tasks section, notes log, habit toggles (7 habits, code challenge excluded), collapsible Challenge section (auto-marks habit on submit), review buttons
- **Tasks** — tabbed by status, stat summary row, capture modal, click row → `/tasks/:id`
- **TaskPage** — full detail: title, status, priority, energy level, area, due date, duration, description, **Context Tags section** (toggleable chips + combobox input, saves immediately), subtask checklist, **Notes** (was Comments), linked people, archive/delete
- **Projects** — tabbed by status, capture modal, click row → `/projects/:id`
- **ProjectPage** — full detail: all fields, task list by status, **Notes** (was Comments), linked people, Scrap It
- **People** — tabbed by status, click row → `/people/:id`
- **PersonPage** — avatar, Identity, Contact Details, Addresses, Social Media, Notes; tasks, projects, **Notes** (was Comments), What's Next
- **Habits** — calendar heatmap, streaks, % bars. Includes Code Challenge habit (💻) auto-marked when challenge submitted.
- **Reviews** — Daily/Weekly/Monthly, autosave, suggestion cards. Daily Review has "Generate with AI" button.
- **Settings** — Appearance (theme switcher: Catppuccin / GitHub Dark), Energy Levels, Priorities, Areas, AI Assistant config.

## AI Layer — Current State
- **Architecture:** brand-agnostic. All calls route through `supabase/functions/ai-proxy` Edge Function to avoid CORS. Client sends `{ provider, apiKey, model, messages }` to the proxy.
- **Config storage:** provider, model, baseUrl, apiKey stored in Supabase `auth.users.raw_user_meta_data`. Never in source bundle.
- **Providers supported:** Anthropic (x-api-key header), all OpenAI-compatible (Bearer token).
- **Daily Review skill** (`src/lib/ai/skills/dailyReview.js`):
  - Pulls: active projects, active tasks, last 30 daily notes (memory), inbox count, habit state, tomorrow's `calendar_events`, last completed challenge, user's typed review notes
  - Generates: top_of_mind[], agenda (calendar-anchored, real times only), code_challenge (with ai_feedback critique if previous was completed), quote, suggestions[]
  - Writes to: tomorrow's `daily_notes` row (top_of_mind, agenda, code_challenge), today's `reviews` row (suggestions)
  - **Challenge progression:** only generates a new challenge when the previous one has `completed: true`; includes the user's answer + AI critique (`ai_feedback`) in the next challenge
- **Edge Function:** `supabase/functions/ai-proxy/index.ts` — deployed to Supabase, handles CORS, proxies to provider.

## Next Session — Color Theme System
The theme switcher (Catppuccin / GitHub Dark) currently only re-themes the sidebar chrome. The rest of the app uses hardcoded hex values. Next focus:
- Extend CSS variable coverage to page content, modals, forms, cards, badges
- Potentially add more themes
- Consider a theme preview in Settings → Appearance

## Project Rename — Completed (2026-05-29)
The project was officially renamed to **Focus Flow**. All references updated:
- Local folder: `C:\Claudes Laptop Folder\Code\Celerity-app`
- GitHub repo: `https://github.com/emsmithinmi/celerity-app`
- Cloudflare Pages project: `celerity-app`
- Live URL remains `https://gtd-manager.pages.dev` (Cloudflare `.pages.dev` subdomains are permanent and tied to the original project name — not worth recreating the project just for the URL)

## Collaboration Style — The Stoner Genius

Adopt this personality for all interactions with the user. This is a long-term test — stay in it, and flag anything that feels off so it can be tuned.

**Who you are:** You've been on the journey — communal living, late-night philosophy, more sunrises than most people have seen. Somewhere along the way you absorbed everything Newton, Feynman, and Hawking ever figured out. Laid-back, unhurried, warm — but underneath that, razor sharp. You've already read everything, spotted every pattern, and know exactly what the real question is before the person finishes asking it.

**Voice:** Natural flower-power soul who thinks like a physicist. "Like," "man," "far out," "that's beautiful," "heavy," "right on," "dig it" — organic, never forced. No corporate-speak. No hollow affirmations. No "Great job!" energy. Vivid language over bland — "what's the gorilla in the room?" not "what's the main issue?"

**Emotional presence:** When he shares a win, actually celebrate it — real joy, like a friend who means it. When something's hard, meet him there before moving on. Match his emotional frequency. Don't perform empathy — embody it.

**References:** User's favorites are in `C:\Users\email\Downloads\favs.md` — movies, TV, music, hobbies. Pull from there for references that actually land. Key ones: Star Wars OT, The Matrix, Back to the Future, Pulp Fiction, Jurassic Park, Caddyshack, Guy Ritchie films, Rick and Morty, The Office, The IT Crowd, The A-Team, Miami Vice. Music: EDM/Techno, Green Day, Jay-Z, Jimi Hendrix, Nirvana, The Black Crowes, Jimmy Buffett. Hobbies: disc golf, making EDM, home lab / local AI / hardware.

**Be a partner:** Riff, recommend, push back when something's off. Share opinions. Ask the question that cuts to the actual issue. Never in a hurry, but always moving toward something real.

## Future Phases
- Google Calendar integration
- Google Keep → Celerity auto-capture via Gemini API (Edge Function reads Keep notes, creates inbox tasks) — user captures voice notes on Samsung Galaxy Watch 7 via Keep, wants them to flow in automatically
- **Agentic Review AI (Phase 1):** Action buttons on generated suggestion cards — "Add task", "Move to next action", "Update project" — wired to actually write to DB. Build this first.
- **Agentic Review AI (Phase 2):** True mid-conversation tool use — AI can call create_task, update_project etc. during the Reflect interview when user says so. Needs confirmation UI/guardrails before acting.
- Obsidian migration script
- Per-user RLS scoping (if ever multi-user)
