-- Create projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  budget decimal(15, 2),
  status text not null default 'active' check (status in ('active', 'completed', 'on_hold')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_select_all"
  on public.projects for select
  using (true);

create policy "projects_insert_all"
  on public.projects for insert
  with check (true);

create policy "projects_update_all"
  on public.projects for update
  using (true);

create policy "projects_delete_all"
  on public.projects for delete
  using (true);
