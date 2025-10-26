-- Create categories and subcategories for budget tracking
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_all"
  on public.categories for select
  using (true);

create policy "categories_insert_all"
  on public.categories for insert
  with check (true);

create policy "categories_update_all"
  on public.categories for update
  using (true);

create policy "categories_delete_all"
  on public.categories for delete
  using (true);
