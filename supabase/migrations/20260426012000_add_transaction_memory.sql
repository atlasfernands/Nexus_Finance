alter table public.finance_profiles
add column if not exists category_memory jsonb not null default '[]'::jsonb;

alter table public.finance_profiles
add column if not exists description_memory jsonb not null default '[]'::jsonb;
