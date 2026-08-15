-- Idempotent sample data for the existing Focus Flow demo account.
-- Run only after 20260815190000_multi_user_ownership.sql has been applied.
-- The account is resolved by its known development email; no password or
-- service credential is stored here.

begin;

do $$
declare
  demo_id uuid;
  demo_project_id uuid := '10000000-0000-4000-8000-000000000001';
  demo_person_id uuid := '10000000-0000-4000-8000-000000000002';
  demo_task_next_id uuid := '10000000-0000-4000-8000-000000000003';
  demo_task_waiting_id uuid := '10000000-0000-4000-8000-000000000004';
  demo_task_done_id uuid := '10000000-0000-4000-8000-000000000005';
begin
  select id into demo_id from auth.users where lower(email) = 'claude-dev@focusflow.dev' limit 1;
  if demo_id is null then
    raise exception 'Demo account claude-dev@focusflow.dev was not found';
  end if;

  perform private.seed_user_defaults(demo_id);

  insert into public.areas (user_id, value, label, sort_order)
  values (demo_id, 'demo_projects', 'Demo Projects', 90)
  on conflict (user_id, value) do nothing;

  insert into public.context_tags (user_id, value, label, sort_order)
  values (demo_id, 'demo', 'Demo', 90)
  on conflict (user_id, value) do nothing;

  insert into public.projects
    (id, user_id, title, slug, status, priority, area, description, start_date, end_date, is_highlight)
  values
    (demo_project_id, demo_id, 'Demo: Plan a Weekend Hiking Trip', 'demo-plan-weekend-hiking-trip', 'in_progress', 'priority', 'demo_projects', 'A representative project showing planning, tasks, dates, people, and completion flow.', current_date, current_date + 14, true)
  on conflict (id) do update set
    user_id = excluded.user_id,
    title = excluded.title,
    status = excluded.status,
    priority = excluded.priority,
    area = excluded.area,
    description = excluded.description,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    is_highlight = excluded.is_highlight;

  insert into public.people
    (id, user_id, first_name, last_name, preferred_name, professional_title, relationship, contact_type, company, email_personal, phone_personal, status, notes)
  values
    (demo_person_id, demo_id, 'Jordan', 'Example', 'Jordan', 'Outdoor Program Coordinator', 'Professional contact', 'person', 'Example Trails', 'jordan.example@example.com', '555-0100', 'active', 'Demo contact showing professional, relationship, and communication fields.')
  on conflict (id) do update set
    user_id = excluded.user_id,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    preferred_name = excluded.preferred_name,
    professional_title = excluded.professional_title,
    relationship = excluded.relationship,
    contact_type = excluded.contact_type,
    company = excluded.company,
    email_personal = excluded.email_personal,
    phone_personal = excluded.phone_personal,
    status = excluded.status,
    notes = excluded.notes;

  insert into public.tasks
    (id, user_id, title, status, priority, area, project_id, notes, context, duration, energy_level, due_date, scheduled_date, description)
  values
    (demo_task_next_id, demo_id, 'Confirm trailhead reservation', 'next_action', 'urgent', 'demo_projects', demo_project_id, 'Call the ranger station and record the confirmation number.', array['call', 'demo'], interval '15 minutes', 'admin', current_date + 2, current_date + 1, 'A clear next action with due and scheduled dates.'),
    (demo_task_waiting_id, demo_id, 'Choose backup route', 'waiting', 'priority', 'demo_projects', demo_project_id, 'Waiting for the weather outlook before choosing the alternate route.', array['demo'], interval '30 minutes', 'deep_focus', current_date + 5, null, 'A waiting task demonstrates the blocked workflow.'),
    (demo_task_done_id, demo_id, 'Create packing checklist', 'done', 'routine', 'demo_projects', demo_project_id, 'Completed example task.', array['computer', 'demo'], interval '20 minutes', 'low_energy', current_date - 1, current_date - 2, 'A completed task demonstrates project progress.')
  on conflict (id) do update set
    user_id = excluded.user_id,
    title = excluded.title,
    status = excluded.status,
    priority = excluded.priority,
    area = excluded.area,
    project_id = excluded.project_id,
    notes = excluded.notes,
    context = excluded.context,
    duration = excluded.duration,
    energy_level = excluded.energy_level,
    due_date = excluded.due_date,
    scheduled_date = excluded.scheduled_date,
    description = excluded.description;

  insert into public.project_people (project_id, person_id)
  values (demo_project_id, demo_person_id)
  on conflict do nothing;

  insert into public.task_people (task_id, person_id)
  values (demo_task_next_id, demo_person_id)
  on conflict do nothing;

  insert into public.project_comments (id, user_id, project_id, body)
  values ('10000000-0000-4000-8000-000000000006', demo_id, demo_project_id, 'Demo comment: this project shows how notes and collaboration context appear.')
  on conflict (id) do update set body = excluded.body;

  insert into public.task_comments (id, user_id, task_id, body)
  values ('10000000-0000-4000-8000-000000000007', demo_id, demo_task_next_id, 'Demo comment: next actions can carry context and a clear requested outcome.')
  on conflict (id) do update set body = excluded.body;

  insert into public.people_comments (id, user_id, person_id, body)
  values ('10000000-0000-4000-8000-000000000008', demo_id, demo_person_id, 'Demo note: contacts can retain useful relationship context.')
  on conflict (id) do update set body = excluded.body;

  insert into public.habits (user_id, key, label, target_weekdays, sort_order)
  values (demo_id, 'habit_demo_walk', 'Demo Walk', '{0,2,4}', 20)
  on conflict (user_id, key) do update set label = excluded.label, target_weekdays = excluded.target_weekdays, sort_order = excluded.sort_order;

  insert into public.habit_history (user_id, date, entries)
  values (demo_id, current_date, jsonb_build_object('habit_morning_meds', true, 'habit_journal', true, 'habit_demo_walk', false))
  on conflict (user_id, date) do update set entries = excluded.entries, updated_at = now();

  insert into public.daily_notes
    (user_id, date, top_of_mind, agenda, notes, quote, quote_author, daily_brief, habit_morning_meds, habit_journal)
  values
    (demo_id, current_date, array['Review the demo project flow', 'Try filtering tasks by context'], '[{"title":"Demo calendar event","time":"10:00 AM"}]'::jsonb, '[{"timestamp":"2026-08-15T09:00:00Z","body":"This is sample daily data for the demo account."}]'::jsonb, 'Small steps make visible progress.', 'Focus Flow demo', '{"summary":"A sample daily brief for demonstration.","next_actions":["Confirm trailhead reservation"]}'::jsonb, true, true)
  on conflict (user_id, date) do update set
    top_of_mind = excluded.top_of_mind,
    agenda = excluded.agenda,
    notes = excluded.notes,
    quote = excluded.quote,
    quote_author = excluded.quote_author,
    daily_brief = excluded.daily_brief,
    habit_morning_meds = excluded.habit_morning_meds,
    habit_journal = excluded.habit_journal,
    updated_at = now();

  insert into public.calendar_events
    (id, user_id, date, summary, start_time, end_time, all_day, calendar_name, notes)
  values
    ('demo-calendar-event-1', demo_id, current_date, 'Demo calendar event', current_date + time '10:00', current_date + time '11:00', false, 'Focus Flow Demo Calendar', 'Sample event for the agenda view.')
  on conflict (id) do update set
    user_id = excluded.user_id,
    date = excluded.date,
    summary = excluded.summary,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    all_day = excluded.all_day,
    calendar_name = excluded.calendar_name,
    notes = excluded.notes,
    synced_at = now();

  insert into public.list_preferences (user_id, list_key, sort_mode, manual_order)
  values (demo_id, 'tasks:next_action', 'manual', jsonb_build_array(demo_task_next_id::text))
  on conflict (user_id, list_key) do update set manual_order = excluded.manual_order, updated_at = now();
end $$;

commit;
