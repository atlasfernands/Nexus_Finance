-- Nexus Finance
-- Correcao segura para SQL Editor do Supabase
-- Objetivo: restaurar a persistencia de finance_profiles e finance_transactions

begin;

-- 1) Alinhamento de schema do perfil do usuario
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

-- 2) Alinhamento de schema dos lancamentos
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

-- 3) Correcao de dados antigos de transaction_type
update public.finance_transactions
set transaction_type = case
  when lower(trim(transaction_type)) = 'entrada' then 'entrada'
  else 'saida'
end
where transaction_type is not null;

-- 4) Recriacao segura da constraint de transaction_type
alter table if exists public.finance_transactions
drop constraint if exists finance_transactions_transaction_type_check;

alter table if exists public.finance_transactions
add constraint finance_transactions_transaction_type_check
check (transaction_type in ('entrada', 'saida'));

commit;

-- 5) Verificacao: valores atuais de transaction_type
select distinct transaction_type
from public.finance_transactions
order by transaction_type;

-- 6) Verificacao: colunas esperadas em finance_transactions
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'finance_transactions'
  and column_name in (
    'id',
    'user_id',
    'transaction_date',
    'description',
    'category',
    'subcategory',
    'transaction_type',
    'amount',
    'status',
    'recurring',
    'running_balance',
    'source_order',
    'notes',
    'tags',
    'created_at',
    'updated_at'
  )
order by column_name;

-- 7) Verificacao: ultimos perfis salvos
select
  user_id,
  full_name,
  store_name,
  monthly_goal,
  show_cents,
  include_pending_in_balance,
  enable_alerts,
  animations_enabled,
  reporting_month,
  reporting_year,
  reporting_granularity,
  updated_at
from public.finance_profiles
order by updated_at desc nulls last
limit 10;

-- 8) Verificacao: ultimos lancamentos salvos
select
  user_id,
  id,
  transaction_date,
  description,
  category,
  subcategory,
  transaction_type,
  amount,
  status,
  recurring,
  running_balance,
  source_order,
  updated_at
from public.finance_transactions
order by updated_at desc nulls last, created_at desc nulls last
limit 20;

-- 9) Verificacao: linhas fora do padrao esperado
select
  count(*) as invalid_transaction_type_rows
from public.finance_transactions
where transaction_type not in ('entrada', 'saida')
   or transaction_type is null;
