# Celerity — Project Context

## What This Is
Celerity — a personal GTD (Getting Things Done) productivity PWA built with React + Vite + Supabase.
Single user app (emailemsmith@gmail.com). No multi-tenancy needed — RLS policies use `USING (true)`.

## Stack
- **Frontend:** React 18, Vite, Tailwind CSS v4 (`@tailwindcss/vite`)
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Auth:** Magic link email (no passwords)
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
| `tasks` | id, title, status, priority, due_date, project_id, area, energy_level, waiting_for, archived_at, subtasks (jsonb `[{id,text,done}]`) |
| `projects` | id, title, slug, status, priority, area, start_date, end_date, is_highlight, archived_at |
| `people` | id, first_name, last_name, preferred_name, professional_title, relationship, contact_type, occupation, company, email_personal, email_work, phone_personal, phone_work, birthday, address_street, address_city, address_state, address_zip, address_work_street, address_work_city, address_work_state, address_work_zip, social_media (jsonb `[{platform,handle}]`), notes, is_stale, status, avatar_url (text) |
| `daily_notes` | id, date, top_of_mind[], agenda jsonb, notes jsonb, habit_morning_meds, habit_evening_meds, habit_journal, habit_meditation, habit_breathwork, habit_stretching, habit_health_tracking, code_challenge jsonb, quote text, quote_author text |
| `reviews` | id, type, date, status, content jsonb, suggestions jsonb, insights jsonb, summary text, updated_at |
| `energy_levels` | id, value, label, icon, bg_color, text_color, sort_order |
| `priorities` | id, value, label, bg_color, text_color, sort_order |
| `areas` | id, name, sort_order |
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
Three reference-data contexts are mounted at the App root level (outside BrowserRouter):
```jsx
<AuthProvider>
  <EnergyLevelsProvider>
    <PrioritiesProvider>
      <AreasProvider>
        <BrowserRouter>…</BrowserRouter>
      </AreasProvider>
    </PrioritiesProvider>
  </EnergyLevelsProvider>
</AuthProvider>
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
- **Daily** — date nav (← → chevrons + "↩ Back to Today" pill), daily quote, quick capture bar, top-of-mind, stat cards (5 metrics), agenda, projects section, tasks section, notes log, habit toggles, daily challenge, review buttons
- **Tasks** — tabbed by status, stat summary row, capture modal, click row → `/tasks/:id`
- **TaskPage** — full detail: title, status, priority (from context), energy level (from context), area (datalist), due date, duration, waiting-for, description, subtask checklist (pencil-edit, check-off saves immediately), comments, linked people, archive/delete
- **Projects** — tabbed by status, capture modal, click row → `/projects/:id`
- **ProjectPage** — full detail: all fields, task list by status (incl. Inbox tab), comments, linked people, Scrap It (hard delete with cascade)
- **People** — tabbed by status, click row → `/people/:id`
- **PersonPage** — avatar circle (72px, click-to-upload) above Identity fields; grouped sections: Identity (title, name, relationship, contact type, occupation, company), Contact Details (personal/work email+phone, birthday), Addresses (home + work structured), Social Media (dynamic platform+handle list), Notes; tasks, projects, comments, What's Next actions
- **Habits** — calendar heatmap, streaks, % bars, time-frame selector
- **Reviews** — Daily/Weekly/Monthly, autosave, suggestion cards, complete button. Daily Review has "Generate with AI" button that runs the daily review skill.
- **Settings** — Energy Levels (full color picker + icon + badge preview), Priorities (color pickers + badge preview), Areas (name list); all DB-driven with add/edit/delete. AI Assistant section: provider dropdown (Anthropic/OpenAI/Gemini/Groq/Mistral/Ollama/Custom), base URL, model, API key, Save + Test Connection.

## AI Layer — Current State
- **Architecture:** brand-agnostic. All calls route through `supabase/functions/ai-proxy` Edge Function to avoid CORS. Client sends `{ provider, apiKey, model, messages }` to the proxy.
- **Config storage:** provider, model, baseUrl, apiKey stored in Supabase `auth.users.raw_user_meta_data`. Never in source bundle.
- **Providers supported:** Anthropic (x-api-key header), all OpenAI-compatible (Bearer token).
- **Daily Review skill** (`src/lib/ai/skills/dailyReview.js`):
  - Pulls: all active projects, active tasks, last 30 daily notes (memory), inbox count, habit state, user's typed review notes
  - Generates: top_of_mind[], agenda[], code_challenge, quote, suggestions[]
  - Writes to: tomorrow's `daily_notes` row (top_of_mind, agenda, code_challenge), today's `reviews` row (suggestions)
- **Edge Function:** `supabase/functions/ai-proxy/index.ts` — deployed to Supabase, handles CORS, proxies to provider.
- **Supabase schema fixes applied this session:** added `content`, `status`, `updated_at` to `reviews`; added `archived_at`, `waiting_for` to `tasks`; added `archived_at` to `projects`.

## Next Session — Review Workflow
Focus: improve the Daily Review workflow end-to-end.
- Review UX when review is already marked complete (currently collapses content)
- Make AI suggestions actionable — accept a suggestion should optionally write to DB (e.g. create the suggested task, update the project)
- Weekly and Monthly review AI skills
- Consider: should the AI Generate button be on the Daily page itself, not just in Reviews?

## Project Rename — Completed (2026-05-29)
The project was officially renamed to **Celerity App**. All references updated:
- Local folder: `C:\Claudes Laptop Folder\Code\Celerity-app`
- GitHub repo: `https://github.com/emsmithinmi/celerity-app`
- Cloudflare Pages project: `celerity-app`
- Live URL remains `https://gtd-manager.pages.dev` (Cloudflare `.pages.dev` subdomains are permanent and tied to the original project name — not worth recreating the project just for the URL)

## Future Phases
- Google Calendar integration
- Obsidian migration script
- Per-user RLS scoping (if ever multi-user)
