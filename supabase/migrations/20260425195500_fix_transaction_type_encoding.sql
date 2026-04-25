alter table if exists public.finance_profiles
add column if not exists full_name text;

alter table if exists public.finance_profiles
add column if not exists store_name text;

alter table if exists public.finance_profiles
add column if not exists monthly_goal numeric(12,2) not null default 0;

alter table if exists public.finance_profiles
add column if not exists show_cents boolean not null default true;

alter table if exists public.finance_profiles
add column if not exists include_pending_in_balance boolean not null default false;

alter table if exists public.finance_profiles
add column if not exists enable_alerts boolean not null default true;

alter table if exists public.finance_profiles
add column if not exists animations_enabled boolean not null default true;

alter table if exists public.finance_profiles
add column if not exists reporting_month integer not null default 0;

alter table if exists public.finance_profiles
add column if not exists reporting_year integer not null default extract(year from now());

alter table if exists public.finance_profiles
add column if not exists reporting_granularity text not null default 'month';

alter table if exists public.finance_profiles
add column if not exists ai_last_analysis text;

alter table if exists public.finance_profiles
add column if not exists ai_history jsonb not null default '[]'::jsonb;

alter table if exists public.finance_profiles
add column if not exists created_at timestamptz not null default now();

alter table if exists public.finance_profiles
add column if not exists updated_at timestamptz not null default now();

alter table if exists public.finance_transactions
add column if not exists running_balance numeric(12,2);

alter table if exists public.finance_transactions
add column if not exists source_order integer;

alter table if exists public.finance_transactions
add column if not exists notes text;

alter table if exists public.finance_transactions
add column if not exists tags jsonb;

alter table if exists public.finance_transactions
add column if not exists created_at timestamptz not null default now();

alter table if exists public.finance_transactions
add column if not exists updated_at timestamptz not null default now();

update public.finance_transactions
set transaction_type = case
  when lower(trim(transaction_type)) = 'entrada' then 'entrada'
  else 'saida'
end
where transaction_type is not null;

alter table if exists public.finance_transactions
drop constraint if exists finance_transactions_transaction_type_check;

alter table if exists public.finance_transactions
add constraint finance_transactions_transaction_type_check
check (transaction_type in ('entrada', 'saida'));
