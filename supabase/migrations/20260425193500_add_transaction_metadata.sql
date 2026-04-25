alter table public.finance_transactions
add column if not exists running_balance numeric(12,2);

alter table public.finance_transactions
add column if not exists source_order integer;
