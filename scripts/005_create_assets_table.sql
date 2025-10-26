-- Create assets table
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  value decimal(15, 2) not null,
  currency text not null default 'BGN',
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets enable row level security;

create policy "assets_select_all"
  on public.assets for select
  using (true);

create policy "assets_insert_all"
  on public.assets for insert
  with check (true);

create policy "assets_update_all"
  on public.assets for update
  using (true);

create policy "assets_delete_all"
  on public.assets for delete
  using (true);
