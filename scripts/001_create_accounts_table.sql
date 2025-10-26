-- Create accounts table for bank accounts, credit cards, and cash
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('bank', 'credit_card', 'cash')),
  initial_balance decimal(15, 2) not null default 0,
  current_balance decimal(15, 2) not null default 0,
  currency text not null default 'BGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

-- Allow all operations for now (we'll add user-specific policies later if needed)
create policy "accounts_select_all"
  on public.accounts for select
  using (true);

create policy "accounts_insert_all"
  on public.accounts for insert
  with check (true);

create policy "accounts_update_all"
  on public.accounts for update
  using (true);

create policy "accounts_delete_all"
  on public.accounts for delete
  using (true);
