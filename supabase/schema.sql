create extension if not exists "pgcrypto";

create table if not exists public.finance_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  store_name text,
  monthly_goal numeric(12,2) not null default 0,
  show_cents boolean not null default true,
  include_pending_in_balance boolean not null default false,
  enable_alerts boolean not null default true,
  animations_enabled boolean not null default true,
  reporting_month integer not null default 0 check (reporting_month between 0 and 11),
  reporting_year integer not null default extract(year from now()),
  reporting_granularity text not null default 'month' check (reporting_granularity in ('month', 'year')),
  ai_last_analysis text,
  ai_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  transaction_date text not null,
  description text not null,
  category text not null default 'Outros',
  subcategory text not null check (subcategory in ('Casa', 'Loja')),
  transaction_type text not null check (transaction_type in ('entrada', 'saída')),
  amount numeric(12,2) not null default 0,
  running_balance numeric(12,2),
  source_order integer,
  status text not null check (status in ('realizado', 'pendente', 'pago', 'cancelado')),
  recurring boolean not null default false,
  notes text,
  tags jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists finance_transactions_user_date_idx
on public.finance_transactions (user_id, transaction_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_finance_profiles_updated_at on public.finance_profiles;
create trigger set_finance_profiles_updated_at
before update on public.finance_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_finance_transactions_updated_at on public.finance_transactions;
create trigger set_finance_transactions_updated_at
before update on public.finance_transactions
for each row
execute function public.set_updated_at();

alter table public.finance_profiles enable row level security;
alter table public.finance_transactions enable row level security;

drop policy if exists "Users can read own finance profile" on public.finance_profiles;
create policy "Users can read own finance profile"
on public.finance_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own finance profile" on public.finance_profiles;
create policy "Users can insert own finance profile"
on public.finance_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own finance profile" on public.finance_profiles;
create policy "Users can update own finance profile"
on public.finance_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own finance profile" on public.finance_profiles;
create policy "Users can delete own finance profile"
on public.finance_profiles
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own transactions" on public.finance_transactions;
create policy "Users can read own transactions"
on public.finance_transactions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.finance_transactions;
create policy "Users can insert own transactions"
on public.finance_transactions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.finance_transactions;
create policy "Users can update own transactions"
on public.finance_transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.finance_transactions;
create policy "Users can delete own transactions"
on public.finance_transactions
for delete
using (auth.uid() = user_id);
