# **Celerity**

### **Project Brief & Technical Specification**

*Version 1.0 — May 2026*

---

## **Overview**

Celerity is a personal GTD (Getting Things Done) productivity web application built as a Progressive Web App (PWA), replacing an Obsidian-based system. The app manages Tasks, Projects, People, and Daily Notes with a fully custom UI, real-time database sync, and a planned AI review layer.

This project serves dual purpose: a daily-use personal productivity tool and a portfolio piece demonstrating full-stack web development skills.

---

## **Goals**

- Replace the current Obsidian/Dataview/Templater GTD system with a stable, maintainable web application  
- Preserve the established visual design system (status pills, priority badges, color palette)  
- Enable access from any device (desktop, phone, tablet) via PWA  
- Build a foundation for future AI-assisted review and processing features  
- Demonstrate full-stack capability: React frontend, Supabase backend, PWA deployment

---

## **Tech Stack**

| Layer | Technology | Rationale |
| :---- | :---- | :---- |
| Frontend | React \+ Vite | Fast builds, modern DX, large ecosystem |
| Styling | Tailwind CSS | Responsive design baked in, utility-first |
| Database | Supabase (PostgreSQL) | Relational, real-time, auth included, self-hostable |
| Auth | Supabase Auth | Magic link — no password needed for personal app |
| Hosting | Cloudflare Pages | Unlimited requests/bandwidth, no pausing, zero cost |
| PWA | Vite PWA Plugin | Service worker, installable, offline-capable |
| Version Control | GitHub | GitHub Education — Copilot included |
| IDE | VS Code or WebStorm | JetBrains free via GitHub Education |

### **Future / Planned**

| Layer | Technology |
| :---- | :---- |
| AI Layer | Claude API (Anthropic) |
| Vector Search | Supabase pgvector extension |
| Self-hosting | Home server (hardware TBD) \+ self-hosted Supabase |
| Secrets Management | Doppler (free via GitHub Education) |
| Error Tracking | Sentry (free via GitHub Education) |

---

## **Architecture**

Cloudflare Pages (React PWA)

        ↕  Supabase JS Client (real-time)

Supabase Cloud (PostgreSQL \+ Auth \+ Realtime)

        ↕  (future migration)

Home Server (self-hosted Supabase)

The React frontend communicates directly with Supabase via the Supabase JS client SDK — no custom backend server required at this stage. Row Level Security (RLS) on Supabase handles data protection at the database level.

---

## **Data Model**

### **tasks**

id            uuid          PK

title         text          NOT NULL

status        text          inbox | next\_action | queued | scheduled | waiting | someday | done

priority      text          stat | urgent | eod | routine

area          text          nullable

due\_date      date          nullable

project\_id    uuid          FK → projects.id, nullable

notes         text          nullable

context       text\[\]        array of context tags

subtasks      jsonb         array of {id, text, done} — local checklist steps, not tracked as real tasks

created\_at    timestamptz   default now()

updated\_at    timestamptz   default now()

### **projects**

id            uuid          PK

title         text          NOT NULL

slug          text          UNIQUE

status        text          inbox | planning | in\_progress | waiting | completed

priority      text          stat | urgent | eod | routine

area          text          nullable

start\_date    date          nullable

end\_date      date          nullable

description   text          nullable

waiting\_for   text          nullable

created\_at    timestamptz   default now()

updated\_at    timestamptz   default now()

### **people**

id                uuid    PK

first\_name        text    NOT NULL

last\_name         text    NOT NULL

preferred\_name    text    nullable

professional\_title text   nullable

relationship      text    nullable

contact\_type      text    Personal | Work | Services

occupation        text    nullable

company           text    nullable

email\_personal    text    nullable

email\_work        text    nullable

phone\_personal    text    nullable

phone\_work        text    nullable

address\_street    text    nullable

address\_city      text    nullable

address\_state     text    nullable

address\_zip       text    nullable

birthday          date    nullable

avatar\_url        text    nullable

created\_at        timestamptz

updated\_at        timestamptz

### **daily\_notes**

id              uuid    PK

date            date    UNIQUE NOT NULL

top\_of\_mind     text\[\]  array of bullet strings

agenda          jsonb   \[{time, title, calendar, duration, location}\]

notes           text    nullable

habit\_morning\_meds    boolean default false

habit\_evening\_meds    boolean default false

habit\_journal         boolean default false

habit\_meditation      boolean default false

habit\_breathwork      boolean default false

habit\_stretching      boolean default false

quote           text    nullable

quote\_author    text    nullable

code\_challenge  jsonb   nullable

created\_at      timestamptz

updated\_at      timestamptz

### **Junction Tables**

task\_people     (task\_id uuid FK, person\_id uuid FK)

project\_people  (project\_id uuid FK, person\_id uuid FK)

people\_comments (id uuid PK, person\_id uuid FK, body text, created\_at timestamptz)

---

## **Design System**

### **Status Colors — Tasks**

| Status | Background | Text | Border | Icon |
| :---- | :---- | :---- | :---- | :---- |
| Inbox | `#FBBC05` | `#000000` | `#D4990A` | 📥 |
| Next Action | `#0F9D58` | `#000000` | `#0B7A42` | ⚡ |
| Queued | `#1967D2` | `#FFFFFF` | `#1256B0` | 🗂 |
| Scheduled | `#ADE8F4` | `#000000` | `#378ADD` | 📅 |
| Waiting | `#DB4437` | `#000000` | `#B03228` | ⏳ |
| Someday/Maybe | `#FFFFFF` | `#000000` | `#BBBBBB` | 🔮 |
| Done | `#000000` | `#FFFFFF` | `#333333` | ✓ |

### **Status Colors — Projects**

| Status | Background | Text | Border |
| :---- | :---- | :---- | :---- |
| Inbox | `#FBBC05` | `#000000` | — |
| Planning | `#FFFFFF` | `#000000` | `#BBBBBB` |
| In Progress | `#1967D2` | `#FFFFFF` | `#1256B0` |
| Waiting | `#DB4437` | `#FFFFFF` | `#B03228` |
| Completed | `#000000` | `#FFFFFF` | `#333333` |

### **Priority Colors**

| Priority | Background | Text |
| :---- | :---- | :---- |
| STAT | `#DB4437` | white |
| Urgent | `#E8710A` | white |
| EOD | `#FBBC05` | black |
| Routine | `#F1EFE8` | `#5F5E5A` |

### **Global UI Colors (Dark Theme)**

| Element | Value |
| :---- | :---- |
| App background | `#1e1e2e` |
| Pane background | `#181825` |
| Border | `#313244` |
| Primary text | `#cdd6f4` |
| Secondary text | `#6c7086` |
| Link | `#89b4fa` |
| Context tags | white bg, `#1967D2` text |
| Flag/Highlight | `#673ab7` purple |

### **Button Labels (Finalized)**

| Action | Label |
| :---- | :---- |
| Set In Progress | Let's Get Started |
| Someday/Maybe | This is for Another Day |
| Move to Next Actions | Put Me in Coach |
| Place in Queue | Ready to Queue Up |
| Schedule | Let's Get This on the Schedule |
| Waiting | There is a Holdup |
| Mark Done | All Done |
| Discard (inbox/planning only) | Scrap This |
| Convert to Project | This Should Be Its Own Project |

---

## **Application Structure**

src/

├── components/

│   ├── ui/              \# Reusable: StatusPill, PriorityBadge, Button, Modal

│   ├── tasks/           \# TaskCard, TaskDetail, TaskList, TaskForm, TaskChecklist

│   ├── projects/        \# ProjectCard, ProjectDetail, ProjectList, ProjectForm

│   ├── people/          \# PersonCard, PersonDetail, PeopleList, PersonForm

│   └── daily/           \# DailyNote, StatCards, HabitToggles, QuoteBlock

├── pages/

│   ├── Dashboard.jsx

│   ├── Tasks.jsx

│   ├── Projects.jsx

│   ├── People.jsx

│   └── Daily.jsx

├── hooks/

│   ├── useTasks.js

│   ├── useProjects.js

│   ├── usePeople.js

│   └── useDaily.js

├── lib/

│   ├── supabase.js      \# Supabase client init

│   └── constants.js     \# Status/priority definitions, colors

└── App.jsx

---

## **Build Phases**

### **Phase 1 — Foundation**

- [ ] Supabase project setup (schema, RLS policies, auth)  
- [ ] Vite \+ React project scaffold  
- [ ] Tailwind CSS configuration with design system tokens  
- [ ] Supabase client configuration  
- [ ] Cloudflare Pages deployment pipeline (GitHub → auto-deploy)  
- [ ] PWA manifest \+ service worker (Vite PWA plugin)  
- [ ] Basic routing (React Router)  
- [ ] Auth flow (magic link login)

### **Phase 2 — Core UI Components**

- [ ] StatusPill component (all task \+ project statuses)  
- [ ] PriorityBadge component  
- [ ] ContextTag component  
- [ ] Button variants  
- [ ] Modal/drawer component  
- [ ] Layout shell (sidebar nav, main content area)  
- [ ] Responsive nav (desktop sidebar → mobile bottom tabs)

### **Phase 3 — Tasks**

- [ ] Task list view (filterable by status, priority, area)  
- [ ] Task detail view (all fields, ECAM-style stat tiles)  
- [ ] Task create form  
- [ ] Status transition buttons (with correct labels)  
- [ ] Link task to project  
- [ ] Link task to people

### **Phase 4 — Projects**

- [ ] Project list view  
- [ ] Project detail view (task subsections by status)  
- [ ] Project create/edit form  
- [ ] Status transitions with blocking rules (no Complete if open tasks exist)  
- [ ] Rollup counts (tasks by status)

### **Phase 5 — People**

- [ ] People list view  
- [ ] Person detail view (contact groups, linked tasks/projects)  
- [ ] Person create/edit form  
- [ ] Comments system

### **Phase 6 — Daily Notes**

- [ ] Daily note view (stat cards, quote, Top of Mind, habits)  
- [ ] Auto-create today's note  
- [ ] Habit toggles (writes to Supabase in real-time)  
- [ ] Stat cards (live queries: In Progress, Next Actions, Waiting, Due Today, Stalled)

### **Phase 7 — Polish & PWA**

- [ ] Offline support (service worker caching strategy)  
- [ ] Mobile UX pass (touch targets, bottom nav, capture flow)  
- [ ] Dark mode (default, matches design system)  
- [ ] Keyboard shortcuts  
- [ ] Loading states \+ error handling

### **Phase 8 — AI Layer (Future)**

- [ ] Daily note processing (Claude API extracts tasks, insights)  
- [ ] Weekly review skill  
- [ ] Monthly review skill  
- [ ] pgvector embeddings for semantic search across notes

---

## **Migration Plan**

A one-time migration script will read the existing Obsidian vault at: `C:\Claudes Laptop Folder\Joshua`

And seed the Supabase database:

1. Parse all markdown files in `Tasks/`, `Projects/`, `People/`, `Daily/`  
2. Extract YAML frontmatter into structured objects  
3. Resolve wikilinks to database relations (people arrays, project links)  
4. Insert via Supabase JS client  
5. Validate row counts and spot-check linked records

The vault files remain untouched. Migration is non-destructive.

---

## **Portfolio Notes**

This project demonstrates:

- **Full-stack development**: React frontend \+ PostgreSQL backend via Supabase  
- **Database design**: Relational schema with junction tables, RLS security  
- **PWA implementation**: Installable, offline-capable, responsive  
- **Design system**: Custom component library with consistent visual language  
- **Real-time data**: Supabase Realtime subscriptions for live updates  
- **Cloud deployment**: CI/CD pipeline via GitHub → Cloudflare Pages  
- **Future-proofed architecture**: Self-hostable, AI-extensible, migration-friendly

**App Name**: Celerity  
**Live URL**: https://gtd-manager.pages.dev  
**GitHub Repo**: https://github.com/emsmithinmi/Project-manager  
**Stack**: React · Vite · Tailwind · Supabase · PostgreSQL · Cloudflare Pages

---

*Document maintained alongside the project. Update phase checkboxes as work progresses.*  

---

## **Changelog**

### 2026-05-28
- **Avatar images** — Added `avatar_url` column to `people` table and a public `avatars` Supabase Storage bucket (5 MB limit, image types only; RLS allows authenticated upload/update/delete, public read). New `AvatarCircle` shared component renders a circle with an image or initials fallback in three sizes (sm 32px / md 48px / lg 72px); `canUpload` prop adds a camera-icon hover overlay and hidden file input. Person avatars appear in `PersonRow` (list view) and at the top of `PersonPage` (72px, always click-to-upload). User avatar appears in the sidebar footer (32px, click to upload); stored in Supabase Auth user metadata (`user_metadata.avatar_url`) so it persists across sessions.

- **Task subtasks checklist** — Added a `subtasks` JSONB column (`[{id, text, done}]`) to the `tasks` table. New `TaskChecklist` component renders below the Details section on `TaskPage`. Checkboxes save immediately on click; a pencil button opens edit mode for adding, renaming, and removing steps. Steps are scoped to the task only — not treated as standalone tasks anywhere in the system.
