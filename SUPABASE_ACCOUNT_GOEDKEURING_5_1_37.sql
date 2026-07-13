-- MijnSerenity Cloud 5.1.37
-- Nieuwe accounts krijgen pas toegang nadat Michel ze goedkeurt.
-- Voer dit volledige bestand één keer uit in Supabase > SQL Editor.

begin;

create table if not exists public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  is_admin boolean not null default false,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists account_access_status_idx
  on public.account_access(status, requested_at desc);

alter table public.account_access enable row level security;

create or replace function public.is_app_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_access
    where user_id = check_user
      and status = 'approved'
      and is_admin = true
  );
$$;

create or replace function public.is_app_approved(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_access
    where user_id = check_user
      and status = 'approved'
  );
$$;

revoke all on function public.is_app_admin(uuid) from public;
revoke all on function public.is_app_approved(uuid) from public;
grant execute on function public.is_app_admin(uuid) to authenticated;
grant execute on function public.is_app_approved(uuid) to authenticated;

drop policy if exists "account_access_own_or_admin_read"
  on public.account_access;

create policy "account_access_own_or_admin_read"
on public.account_access
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_app_admin(auth.uid())
);

create or replace function public.handle_new_account_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_access (
    user_id,
    email,
    status,
    is_admin,
    requested_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email,''),
    'pending',
    false,
    now(),
    now()
  )
  on conflict (user_id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_account_access on auth.users;

create trigger on_auth_user_created_account_access
after insert on auth.users
for each row execute procedure public.handle_new_account_access();

-- Alle accounts die al bestonden vóór deze wijziging worden vertrouwd.
insert into public.account_access (
  user_id,
  email,
  status,
  is_admin,
  requested_at,
  reviewed_at,
  updated_at
)
select
  id,
  coalesce(email,''),
  'approved',
  lower(coalesce(email,'')) = lower('michelvissia@gmail.com'),
  coalesce(created_at,now()),
  now(),
  now()
from auth.users
on conflict (user_id) do update
set email = excluded.email,
    status = 'approved',
    is_admin = (
      public.account_access.is_admin
      or lower(excluded.email) = lower('michelvissia@gmail.com')
    ),
    reviewed_at = coalesce(public.account_access.reviewed_at,now()),
    updated_at = now();

-- Michel blijft altijd beheerder.
update public.account_access
set status = 'approved',
    is_admin = true,
    reviewed_at = coalesce(reviewed_at,now()),
    updated_at = now()
where lower(email) = lower('michelvissia@gmail.com');

create or replace function public.ensure_my_account_access()
returns public.account_access
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.account_access;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  insert into public.account_access (
    user_id,
    email,
    status,
    is_admin,
    requested_at,
    updated_at
  )
  select
    u.id,
    coalesce(u.email,''),
    case
      when lower(coalesce(u.email,'')) = lower('michelvissia@gmail.com')
        then 'approved'
      else 'pending'
    end,
    lower(coalesce(u.email,'')) = lower('michelvissia@gmail.com'),
    now(),
    now()
  from auth.users u
  where u.id = auth.uid()
  on conflict (user_id) do update
  set email = excluded.email,
      updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.admin_set_account_status(
  target_user uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Alleen de beheerder mag accounts goedkeuren';
  end if;

  if new_status not in ('approved','rejected','pending') then
    raise exception 'Ongeldige accountstatus';
  end if;

  if target_user = auth.uid() then
    raise exception 'Je kunt je eigen beheeraccount niet blokkeren';
  end if;

  if exists (
    select 1
    from public.account_access
    where user_id = target_user
      and is_admin = true
  ) then
    raise exception 'Een beheeraccount kan hier niet worden geblokkeerd';
  end if;

  update public.account_access
  set status = new_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where user_id = target_user;

  if not found then
    raise exception 'Account niet gevonden';
  end if;
end;
$$;

revoke all on function public.ensure_my_account_access() from public;
revoke all on function public.admin_set_account_status(uuid,text) from public;
grant execute on function public.ensure_my_account_access() to authenticated;
grant execute on function public.admin_set_account_status(uuid,text) to authenticated;

grant select on public.account_access to authenticated;

-- Realtime helpt het beheer- en statusscherm sneller te verversen.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'account_access'
  ) then
    alter publication supabase_realtime add table public.account_access;
  end if;
end
$$;

commit;
