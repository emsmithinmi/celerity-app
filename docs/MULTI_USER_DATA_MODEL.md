# Focus Flow Multi-User Data Model

## Decision

Focus Flow will support multiple isolated users. The existing personal account remains the owner of the current data. The existing development account is the intended demo account and will receive its own representative sample data. No user will be able to read, modify, or delete another user's personal data through the client or the Supabase Data API.

## Ownership model

The following tables are user-owned and receive a non-null `user_id` that references `auth.users(id)`:

- `projects`, `tasks`, `people`, and `daily_notes`
- `people_comments`, `project_comments`, and `task_comments`
- `habits`, `habit_history`, and `calendar_events`
- `areas`, `priorities`, `energy_levels`, `context_tags`, and `code_challenges`
- `list_preferences`, `user_integrations`, and `user_settings`

The link tables `project_people` and `task_people` remain relationship tables. Their policies require both linked records to belong to the current user.

User-owned reference values use composite uniqueness such as `(user_id, value)`. Personal slugs and daily records use `(user_id, slug)` and `(user_id, date)` respectively, so two users may use the same normal title, area, or date without collisions.

New rows default `user_id` to the authenticated user. This keeps the existing client API shape safe while the RLS policies enforce that the value cannot be reassigned to another user.

## Rollout order

1. Verify the current account inventory and take a database backup/export outside the application repository.
2. Add nullable ownership columns and backfill all existing rows to the current personal account.
3. Add owner-scoped uniqueness, foreign keys, indexes, and non-null/default constraints.
4. Replace the current broad policies with owner-scoped authenticated policies; remove anonymous access to personal tables.
5. Install a private signup-defaults trigger so every new user gets their own taxonomy, habits, challenge, and settings rows.
6. Seed the existing demo account with clearly labeled sample projects, tasks, people, habits, daily data, and relationship records.
7. Verify the personal and demo accounts separately, including direct Data API reads/writes and attempted cross-user IDs.
8. Re-run Supabase security/performance advisors and deploy the frontend only after the database checks pass.

The migration draft in `supabase/migrations/20260815190000_multi_user_ownership.sql` is intentionally not applied until the preflight and backup steps are complete. The demo seed is separate so it can be reset or regenerated without altering the ownership migration.

## Verification requirements

- Personal account sees its current projects, tasks, contacts, settings, and taxonomy.
- Demo account sees no personal rows and receives only demo rows.
- A personal ID queried while signed in as demo returns no row and cannot be updated or deleted.
- A demo ID queried while signed in personally returns no row and cannot be updated or deleted.
- A new authenticated account receives defaults without seeing either existing account's data.
- Anonymous requests cannot read or write personal tables.
- Deleting a user's account cascades or safely removes that user's owned records and integrations.

