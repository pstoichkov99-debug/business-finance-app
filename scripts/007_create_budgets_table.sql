-- Create monthly budgets table
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  month date not null,
  k1_with_vat decimal(15, 2),
  k1_without_vat decimal(15, 2),
  vat decimal(15, 2),
  k2 decimal(15, 2),
  total_without_vat decimal(15, 2),
  total_with_vat decimal(15, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, month, project_id)
);

alter table public.budgets enable row level security;

create policy "budgets_select_all"
  on public.budgets for select
  using (true);

create policy "budgets_insert_all"
  on public.budgets for insert
  with check (true);

create policy "budgets_update_all"
  on public.budgets for update
  using (true);

create policy "budgets_delete_all"
  on public.budgets for delete
  using (true);
