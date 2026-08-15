-- Cover ownership and relationship foreign keys used by RLS and deletes.

create index if not exists people_comments_user_id_idx
  on public.people_comments (user_id);

create index if not exists project_comments_user_id_idx
  on public.project_comments (user_id);

create index if not exists task_comments_user_id_idx
  on public.task_comments (user_id);

create index if not exists project_people_person_id_idx
  on public.project_people (person_id);

create index if not exists task_people_person_id_idx
  on public.task_people (person_id);
