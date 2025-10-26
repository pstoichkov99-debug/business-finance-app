-- Create transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  pl_date date not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  category_id uuid references public.categories(id) on delete set null,
  debt_id uuid references public.debts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  amount_with_vat decimal(15, 2),
  amount_without_vat decimal(15, 2),
  vat_amount decimal(15, 2),
  k2_amount decimal(15, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "transactions_select_all"
  on public.transactions for select
  using (true);

create policy "transactions_insert_all"
  on public.transactions for insert
  with check (true);

create policy "transactions_update_all"
  on public.transactions for update
  using (true);

create policy "transactions_delete_all"
  on public.transactions for delete
  using (true);
