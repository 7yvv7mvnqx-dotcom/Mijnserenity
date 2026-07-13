-- MijnSerenity Cloud 5.1.38
-- Online status en zichtbare accountnamen voor de beheerder.
-- Voer eerst de SQL van Cloud 5.1.37 uit wanneer dat nog niet is gebeurd.
-- Voer daarna dit volledige bestand één keer uit.

begin;

alter table public.account_access
  add column if not exists display_name text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_device text;

create index if not exists account_access_last_seen_idx
  on public.account_access(last_seen_at desc);

create or replace function public.touch_my_account_presence(
  device_name text default null,
  profile_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  insert into public.account_access (
    user_id,
    email,
    display_name,
    status,
    is_admin,
    requested_at,
    last_seen_at,
    last_device,
    updated_at
  )
  select
    users.id,
    coalesce(users.email,''),
    nullif(trim(profile_name),''),
    case
      when lower(coalesce(users.email,''))
        = lower('michelvissia@gmail.com')
      then 'approved'
      else 'pending'
    end,
    lower(coalesce(users.email,''))
      = lower('michelvissia@gmail.com'),
    now(),
    now(),
    nullif(trim(device_name),''),
    now()
  from auth.users users
  where users.id = auth.uid()
  on conflict (user_id) do update
  set email = excluded.email,
      display_name = coalesce(
        nullif(excluded.display_name,''),
        public.account_access.display_name
      ),
      last_seen_at = now(),
      last_device = coalesce(
        nullif(excluded.last_device,''),
        public.account_access.last_device
      ),
      updated_at = now();
end;
$$;

revoke all on function public.touch_my_account_presence(text,text)
  from public;

grant execute on function public.touch_my_account_presence(text,text)
  to authenticated;

-- Bestaande accounts krijgen een eerste zichtbare naam uit het e-mailadres.
update public.account_access
set display_name = initcap(
      replace(
        replace(
          split_part(email,'@',1),
          '.',
          ' '
        ),
        '_',
        ' '
      )
    ),
    updated_at = now()
where coalesce(trim(display_name),'') = '';

commit;
