# GTD App

**Status:** In progress — Phase 2 complete
**Repo:** TBD (GitHub)
**Live URL:** TBD (Cloudflare Pages)
**Supabase:** egxbhglczkslnskxorlf.supabase.co

## What
Personal GTD productivity PWA replacing an Obsidian/Dataview/Templater system.
Manages Tasks, Projects, People, and Daily Notes with real-time Supabase sync.

## Phase Progress
- [x] Phase 1 — Foundation (scaffold, routing, Tailwind tokens, PWA, Supabase client)
- [x] Phase 2 — UI Components (StatusPill, PriorityBadge, ContextTag, Button, Modal, mobile nav)
- [ ] Phase 3 — Tasks (list, detail, form, status transitions)
- [ ] Phase 4 — Projects (list, detail, form, rollup counts)
- [ ] Phase 5 — People (list, detail, form, comments)
- [ ] Phase 6 — Daily Notes (stat cards, habits, quote, auto-create)
- [ ] Phase 7 — Polish & PWA (offline, mobile UX, keyboard shortcuts)
- [ ] Phase 8 — AI Layer (Claude API, pgvector, weekly/monthly review skills)

## Data Model
- **tasks** — title, status, priority, area, due_date, project_id, notes, context[]
- **projects** — title, slug, status, priority, area, start/end dates, description, waiting_for
- **people** — name, title, relationship, contact_type, company, contact info, birthday
- **daily_notes** — date (unique), top_of_mind[], agenda (jsonb), notes, 6 habit booleans, quote
- **junction tables** — task_people, project_people, people_comments

## Migration Plan
One-time script to parse Obsidian vault at `C:\Claudes Laptop Folder\Joshua` and seed Supabase.
Non-destructive — vault files stay untouched.

## Future
Claude API for daily note processing + weekly/monthly review skills.
pgvector for semantic search. Self-hostable Supabase on home server.
