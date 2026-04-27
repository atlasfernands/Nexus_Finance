create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public;
    revoke all on function public.rls_auto_enable() from anon;
    revoke all on function public.rls_auto_enable() from authenticated;
  end if;
end $$;

drop policy if exists "Users can read own finance profile" on public.finance_profiles;
create policy "Users can read own finance profile"
on public.finance_profiles
for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own finance profile" on public.finance_profiles;
create policy "Users can insert own finance profile"
on public.finance_profiles
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance profile" on public.finance_profiles;
create policy "Users can update own finance profile"
on public.finance_profiles
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance profile" on public.finance_profiles;
create policy "Users can delete own finance profile"
on public.finance_profiles
for delete
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own transactions" on public.finance_transactions;
create policy "Users can read own transactions"
on public.finance_transactions
for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own transactions" on public.finance_transactions;
create policy "Users can insert own transactions"
on public.finance_transactions
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own transactions" on public.finance_transactions;
create policy "Users can update own transactions"
on public.finance_transactions
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own transactions" on public.finance_transactions;
create policy "Users can delete own transactions"
on public.finance_transactions
for delete
using ((select auth.uid()) = user_id);
