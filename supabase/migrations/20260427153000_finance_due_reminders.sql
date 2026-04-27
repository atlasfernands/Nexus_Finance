create extension if not exists "pgcrypto";
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.finance_notification_suppressions (
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id text not null,
  channel text not null default 'all' check (channel in ('all', 'in_app', 'email', 'push')),
  reason text,
  muted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, transaction_id, channel),
  foreign key (user_id, transaction_id)
    references public.finance_transactions (user_id, id)
    on delete cascade
);

create table if not exists public.finance_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'push')),
  notification_kind text not null check (notification_kind in ('due_tomorrow', 'due_today', 'overdue')),
  notification_date date not null default current_date,
  scheduled_for date not null,
  title text not null,
  message text not null,
  status text not null default 'unread' check (status in ('queued', 'unread', 'read', 'dismissed', 'sent', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, transaction_id, channel, notification_kind, notification_date),
  foreign key (user_id, transaction_id)
    references public.finance_transactions (user_id, id)
    on delete cascade
);

create index if not exists finance_notifications_user_status_idx
on public.finance_notifications (user_id, status, notification_date desc);

create index if not exists finance_notifications_due_idx
on public.finance_notifications (scheduled_for, notification_kind);

create index if not exists finance_notification_suppressions_user_idx
on public.finance_notification_suppressions (user_id, channel);

drop trigger if exists set_finance_notifications_updated_at on public.finance_notifications;
create trigger set_finance_notifications_updated_at
before update on public.finance_notifications
for each row
execute function public.set_updated_at();

drop trigger if exists set_finance_notification_suppressions_updated_at on public.finance_notification_suppressions;
create trigger set_finance_notification_suppressions_updated_at
before update on public.finance_notification_suppressions
for each row
execute function public.set_updated_at();

alter table public.finance_notifications enable row level security;
alter table public.finance_notification_suppressions enable row level security;

drop policy if exists "Users can read own finance notifications" on public.finance_notifications;
create policy "Users can read own finance notifications"
on public.finance_notifications
for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance notifications" on public.finance_notifications;
create policy "Users can update own finance notifications"
on public.finance_notifications
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own notification suppressions" on public.finance_notification_suppressions;
create policy "Users can read own notification suppressions"
on public.finance_notification_suppressions
for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notification suppressions" on public.finance_notification_suppressions;
create policy "Users can insert own notification suppressions"
on public.finance_notification_suppressions
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notification suppressions" on public.finance_notification_suppressions;
create policy "Users can update own notification suppressions"
on public.finance_notification_suppressions
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own notification suppressions" on public.finance_notification_suppressions;
create policy "Users can delete own notification suppressions"
on public.finance_notification_suppressions
for delete
using ((select auth.uid()) = user_id);

grant select, update on public.finance_notifications to authenticated;
grant select, insert, update, delete on public.finance_notification_suppressions to authenticated;

create or replace function public.finance_parse_transaction_date(value text)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  cleaned text := btrim(value);
  parsed date;
begin
  if cleaned is null or cleaned = '' then
    return null;
  end if;

  begin
    if cleaned ~ '^\d{2}/\d{2}/\d{4}$' then
      parsed := to_date(cleaned, 'DD/MM/YYYY');

      if to_char(parsed, 'DD/MM/YYYY') = cleaned then
        return parsed;
      end if;
    elsif cleaned ~ '^\d{4}-\d{2}-\d{2}$' then
      parsed := cleaned::date;
      return parsed;
    end if;
  exception
    when others then
      return null;
  end;

  return null;
end;
$$;

create or replace function public.generate_finance_due_notifications(p_run_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.finance_notifications (
    user_id,
    transaction_id,
    channel,
    notification_kind,
    notification_date,
    scheduled_for,
    title,
    message,
    status,
    metadata
  )
  select
    tx.user_id,
    tx.id,
    'in_app',
    case
      when due.due_date = p_run_date + 1 then 'due_tomorrow'
      when due.due_date = p_run_date then 'due_today'
      else 'overdue'
    end,
    p_run_date,
    due.due_date,
    case
      when due.due_date = p_run_date + 1 then 'Conta vence amanha'
      when due.due_date = p_run_date then 'Conta vence hoje'
      else 'Conta vencida'
    end,
    concat(
      tx.description,
      ' - ',
      to_char(due.due_date, 'DD/MM/YYYY'),
      ' - R$ ',
      trim(to_char(tx.amount, 'FM999999999990D00'))
    ),
    'unread',
    jsonb_build_object(
      'amount', tx.amount,
      'category', tx.category,
      'subcategory', tx.subcategory,
      'transaction_date', tx.transaction_date
    )
  from public.finance_transactions as tx
  join public.finance_profiles as profile
    on profile.user_id = tx.user_id
    and profile.enable_alerts is true
  cross join lateral (
    select public.finance_parse_transaction_date(tx.transaction_date) as due_date
  ) as due
  left join public.finance_notification_suppressions as suppression
    on suppression.user_id = tx.user_id
    and suppression.transaction_id = tx.id
    and suppression.channel in ('all', 'in_app')
  where tx.status = 'pendente'
    and tx.transaction_type = 'saida'
    and due.due_date is not null
    and due.due_date <= p_run_date + 1
    and due.due_date >= p_run_date - 30
    and suppression.user_id is null
  on conflict (user_id, transaction_id, channel, notification_kind, notification_date)
  do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.generate_finance_due_notifications(date) from public;
revoke all on function public.generate_finance_due_notifications(date) from anon;
revoke all on function public.generate_finance_due_notifications(date) from authenticated;
grant execute on function public.generate_finance_due_notifications(date) to service_role;

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'finance-due-notifications-daily'
  ) then
    perform cron.schedule(
      'finance-due-notifications-daily',
      '0 11 * * *',
      'select public.generate_finance_due_notifications(current_date);'
    );
  end if;
end;
$$;
