-- Focus Flow multi-user ownership foundation.
-- Apply only after the preflight and backup described in docs/MULTI_USER_DATA_MODEL.md.

begin;

create schema if not exists private;

-- Existing rows belong to the oldest current account, which is the established
-- personal account in this single-user database. New rows default to auth.uid().
do $$
declare
  owner_id uuid;
begin
  select id into owner_id from auth.users order by created_at asc limit 1;
  if owner_id is null then
    raise exception 'Cannot backfill ownership: no auth.users row exists';
  end if;

  alter table public.projects add column if not exists user_id uuid;
  alter table public.tasks add column if not exists user_id uuid;
  alter table public.people add column if not exists user_id uuid;
  alter table public.daily_notes add column if not exists user_id uuid;
  alter table public.people_comments add column if not exists user_id uuid;
  alter table public.project_comments add column if not exists user_id uuid;
  alter table public.task_comments add column if not exists user_id uuid;
  alter table public.calendar_events add column if not exists user_id uuid;
  alter table public.code_challenges add column if not exists user_id uuid;
  alter table public.areas add column if not exists user_id uuid;
  alter table public.priorities add column if not exists user_id uuid;
  alter table public.energy_levels add column if not exists user_id uuid;
  alter table public.context_tags add column if not exists user_id uuid;
  alter table public.list_preferences add column if not exists user_id uuid;

  update public.projects set user_id = owner_id where user_id is null;
  update public.tasks set user_id = owner_id where user_id is null;
  update public.people set user_id = owner_id where user_id is null;
  update public.daily_notes set user_id = owner_id where user_id is null;
  update public.people_comments set user_id = owner_id where user_id is null;
  update public.project_comments set user_id = owner_id where user_id is null;
  update public.task_comments set user_id = owner_id where user_id is null;
  update public.calendar_events set user_id = owner_id where user_id is null;
  update public.code_challenges set user_id = owner_id where user_id is null;
  update public.areas set user_id = owner_id where user_id is null;
  update public.priorities set user_id = owner_id where user_id is null;
  update public.energy_levels set user_id = owner_id where user_id is null;
  update public.context_tags set user_id = owner_id where user_id is null;
  update public.list_preferences set user_id = owner_id where user_id is null;
  update public.habits set user_id = owner_id where user_id is null;
  update public.habit_history set user_id = owner_id where user_id is null;
end $$;

-- Add ownership references to tables that did not already have them.
alter table public.projects add constraint projects_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.tasks add constraint tasks_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.people add constraint people_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.daily_notes add constraint daily_notes_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.people_comments add constraint people_comments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.project_comments add constraint project_comments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.task_comments add constraint task_comments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.calendar_events add constraint calendar_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.code_challenges add constraint code_challenges_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.areas add constraint areas_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.priorities add constraint priorities_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.energy_levels add constraint energy_levels_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.context_tags add constraint context_tags_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.list_preferences add constraint list_preferences_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- Existing user-owned tables already have ownership references; make all
-- ownership columns non-null and default to the authenticated caller.
alter table public.projects alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.tasks alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.people alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.daily_notes alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.people_comments alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.project_comments alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.task_comments alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.calendar_events alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.code_challenges alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.areas alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.priorities alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.energy_levels alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.context_tags alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.list_preferences alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.habits alter column user_id set default auth.uid(), alter column user_id set not null;
alter table public.habit_history alter column user_id set default auth.uid(), alter column user_id set not null;

-- Make formerly global values unique per user.
alter table public.areas drop constraint if exists areas_value_key;
alter table public.areas add constraint areas_user_value_key unique (user_id, value);
alter table public.priorities drop constraint if exists priorities_value_key;
alter table public.priorities add constraint priorities_user_value_key unique (user_id, value);
alter table public.energy_levels drop constraint if exists energy_levels_value_key;
alter table public.energy_levels add constraint energy_levels_user_value_key unique (user_id, value);
alter table public.context_tags drop constraint if exists context_tags_value_key;
alter table public.context_tags add constraint context_tags_user_value_key unique (user_id, value);
alter table public.projects drop constraint if exists projects_slug_key;
alter table public.projects add constraint projects_user_slug_key unique (user_id, slug);
alter table public.daily_notes drop constraint if exists daily_notes_date_key;
alter table public.daily_notes add constraint daily_notes_user_date_key unique (user_id, date);
alter table public.habits drop constraint if exists habits_key_key;
alter table public.habits add constraint habits_user_key_key unique (user_id, key);
alter table public.list_preferences drop constraint if exists list_preferences_pkey;
alter table public.list_preferences add constraint list_preferences_pkey primary key (user_id, list_key);

-- Anonymous clients must not retain table privileges for personal data, even
-- though the owner policies below would deny their rows through RLS.
revoke all on table
  public.areas, public.calendar_events, public.code_challenges, public.context_tags,
  public.daily_notes, public.energy_levels, public.habit_history, public.habits,
  public.list_preferences, public.people, public.people_comments, public.priorities,
  public.project_comments, public.project_people, public.projects, public.task_comments,
  public.task_people, public.tasks, public.user_integrations, public.user_settings
from anon;

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists people_user_id_idx on public.people(user_id);
create index if not exists daily_notes_user_date_idx on public.daily_notes(user_id, date);
create index if not exists calendar_events_user_date_idx on public.calendar_events(user_id, date);
create index if not exists code_challenges_user_id_idx on public.code_challenges(user_id);
create index if not exists areas_user_id_idx on public.areas(user_id);
create index if not exists priorities_user_id_idx on public.priorities(user_id);
create index if not exists energy_levels_user_id_idx on public.energy_levels(user_id);
create index if not exists context_tags_user_id_idx on public.context_tags(user_id);
create index if not exists list_preferences_user_id_idx on public.list_preferences(user_id);

-- Remove the old permissive policy set before installing owner-scoped rules.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'areas', 'calendar_events', 'code_challenges', 'context_tags',
        'daily_notes', 'energy_levels', 'habit_history', 'habits',
        'list_preferences', 'people', 'people_comments', 'priorities',
        'project_comments', 'project_people', 'projects', 'task_comments',
        'task_people', 'tasks', 'user_integrations', 'user_settings'
      )
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

alter table public.areas enable row level security;
alter table public.calendar_events enable row level security;
alter table public.code_challenges enable row level security;
alter table public.context_tags enable row level security;
alter table public.daily_notes enable row level security;
alter table public.energy_levels enable row level security;
alter table public.habit_history enable row level security;
alter table public.habits enable row level security;
alter table public.list_preferences enable row level security;
alter table public.people enable row level security;
alter table public.people_comments enable row level security;
alter table public.priorities enable row level security;
alter table public.project_comments enable row level security;
alter table public.project_people enable row level security;
alter table public.projects enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_people enable row level security;
alter table public.tasks enable row level security;
alter table public.user_integrations enable row level security;
alter table public.user_settings enable row level security;

-- Owner-scoped tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'areas', 'calendar_events', 'code_challenges', 'context_tags',
    'daily_notes', 'energy_levels', 'habit_history', 'habits',
    'list_preferences', 'people', 'priorities', 'projects', 'tasks',
    'user_integrations', 'user_settings'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_owner_access', table_name
    );
  end loop;
end $$;

create policy people_comments_owner_access on public.people_comments
  for all to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.people p where p.id = people_comments.person_id and p.user_id = (select auth.uid())))
  with check ((select auth.uid()) = user_id and exists (select 1 from public.people p where p.id = people_comments.person_id and p.user_id = (select auth.uid())));

create policy project_comments_owner_access on public.project_comments
  for all to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.projects p where p.id = project_comments.project_id and p.user_id = (select auth.uid())))
  with check ((select auth.uid()) = user_id and exists (select 1 from public.projects p where p.id = project_comments.project_id and p.user_id = (select auth.uid())));

create policy task_comments_owner_access on public.task_comments
  for all to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.tasks t where t.id = task_comments.task_id and t.user_id = (select auth.uid())))
  with check ((select auth.uid()) = user_id and exists (select 1 from public.tasks t where t.id = task_comments.task_id and t.user_id = (select auth.uid())));

create policy project_people_owner_access on public.project_people
  for all to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_people.project_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.people pe where pe.id = project_people.person_id and pe.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_people.project_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.people pe where pe.id = project_people.person_id and pe.user_id = (select auth.uid()))
  );

create policy task_people_owner_access on public.task_people
  for all to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_people.task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.people pe where pe.id = task_people.person_id and pe.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.tasks t where t.id = task_people.task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.people pe where pe.id = task_people.person_id and pe.user_id = (select auth.uid()))
  );

-- Prevent tasks from being attached across user boundaries.
drop policy if exists tasks_owner_access on public.tasks;
create policy tasks_owner_access on public.tasks
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and (project_id is null or exists (select 1 from public.projects p where p.id = tasks.project_id and p.user_id = (select auth.uid())))
  )
  with check (
    (select auth.uid()) = user_id
    and (project_id is null or exists (select 1 from public.projects p where p.id = tasks.project_id and p.user_id = (select auth.uid())))
  );

-- Defaults for every new account live outside the exposed public schema.
create or replace function private.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.areas (user_id, value, label, sort_order) values
    (p_user_id, 'Work', 'Work', 10), (p_user_id, 'Home', 'Home', 20),
    (p_user_id, 'Personal', 'Personal', 30), (p_user_id, 'Health', 'Health', 40)
  on conflict (user_id, value) do nothing;

  insert into public.priorities (user_id, value, label, bg_color, text_color, sort_order) values
    (p_user_id, 'stat', 'STAT', '#DB4437', '#ffffff', 10),
    (p_user_id, 'urgent', 'Urgent', '#E8710A', '#ffffff', 20),
    (p_user_id, 'priority', 'Priority', '#feeb20', '#000000', 30),
    (p_user_id, 'routine', 'Routine', '#F1EFE8', '#000000', 40)
  on conflict (user_id, value) do nothing;

  insert into public.energy_levels (user_id, value, label, description, icon, bg_color, text_color, sort_order) values
    (p_user_id, 'errand', 'Errand', 'Out-of-office or on-the-go task', '', '#2a1f3d', '#cba6f7', 10),
    (p_user_id, 'physical', 'Physical', 'Requires physical effort or labor', '', '#3d2c2c', '#f28b82', 20),
    (p_user_id, 'deep_focus', 'Deep Focus', 'Mentally demanding computer work', '', '#1e2d3d', '#89b4fa', 30),
    (p_user_id, 'admin', 'Admin', 'Light computer tasks', '', '#1e2d1e', '#a8d5a2', 40),
    (p_user_id, 'low_energy', 'Low Energy', 'Can do when tired or distracted', '', '#2d2d1e', '#e9c46a', 50)
  on conflict (user_id, value) do nothing;

  insert into public.context_tags (user_id, value, label, sort_order) values
    (p_user_id, 'email', 'Email', 10), (p_user_id, 'call', 'Call', 20),
    (p_user_id, 'computer', 'Computer', 30), (p_user_id, 'errand', 'Errand', 40)
  on conflict (user_id, value) do nothing;

  insert into public.code_challenges (user_id, prompt, answer, difficulty)
  values (p_user_id, 'Write a function that returns the values shared by two lists.', 'Use a set intersection or a membership filter.', 'beginner');

  insert into public.habits (user_id, key, label, target_weekdays, sort_order)
  values
    (p_user_id, 'habit_morning_meds', 'Morning Meds', '{0,1,2,3,4,5,6}', 0),
    (p_user_id, 'habit_journal', 'Journal', '{0,1,2,3,4,5,6}', 1),
    (p_user_id, 'habit_meditation', 'Meditation', '{0,1,2,3,4,5,6}', 2)
  on conflict (user_id, key) do nothing;

  insert into public.user_settings (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function private.seed_user_defaults(uuid) from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  perform private.seed_user_defaults(new.id);
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'focus_flow_on_auth_user_created'
  ) then
    create trigger focus_flow_on_auth_user_created
      after insert on auth.users
      for each row execute function private.handle_new_user();
  end if;
end $$;

-- Seed defaults for accounts that already existed before the trigger.
do $$
declare
  user_row record;
begin
  for user_row in select id from auth.users loop
    perform private.seed_user_defaults(user_row.id);
  end loop;
end $$;

commit;
