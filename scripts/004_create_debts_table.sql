-- Create debts table for loans and credits
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  initial_amount decimal(15, 2) not null,
  current_amount decimal(15, 2) not null,
  interest_rate decimal(5, 2),
  currency text not null default 'BGN',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts enable row level security;

create policy "debts_select_all"
  on public.debts for select
  using (true);

create policy "debts_insert_all"
  on public.debts for insert
  with check (true);

create policy "debts_update_all"
  on public.debts for update
  using (true);

create policy "debts_delete_all"
  on public.debts for delete
  using (true);
