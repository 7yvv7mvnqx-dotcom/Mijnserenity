-- MijnSerenity Cloud V18
-- Veilige RLS-fix + boot aanmaken + delen via code
-- Voer dit één keer volledig uit in een NIEUWE query.

create extension if not exists pgcrypto;

create or replace function public.is_boat_member(target_boat uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boat_members bm
    where bm.boat_id = target_boat
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_boat_owner(target_boat uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boats b
    where b.id = target_boat
      and b.created_by = auth.uid()
  );
$$;

revoke all on function public.is_boat_member(uuid) from public;
revoke all on function public.is_boat_owner(uuid) from public;
grant execute on function public.is_boat_member(uuid) to authenticated;
grant execute on function public.is_boat_owner(uuid) to authenticated;

create or replace function public.create_boat_with_owner(boat_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_boat_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn';
  end if;

  insert into public.boats(name, created_by)
  values (coalesce(nullif(trim(boat_name), ''), 'Serenity'), auth.uid())
  returning id into new_boat_id;

  insert into public.boat_members(boat_id, user_id, role)
  values (new_boat_id, auth.uid(), 'owner');

  return new_boat_id;
end;
$$;

revoke all on function public.create_boat_with_owner(text) from public;
revoke all on function public.create_boat_with_owner(text) from anon;
grant execute on function public.create_boat_with_owner(text) to authenticated;

create or replace function public.create_boat_invite(target_boat uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_boat_owner(target_boat) then
    raise exception 'Alleen de eigenaar kan een deelcode maken';
  end if;

  loop
    new_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.boat_invites where code = new_code
    );
  end loop;

  insert into public.boat_invites(boat_id, code, created_by, expires_at)
  values (target_boat, new_code, auth.uid(), now() + interval '7 days');

  return new_code;
end;
$$;

revoke all on function public.create_boat_invite(uuid) from public;
revoke all on function public.create_boat_invite(uuid) from anon;
grant execute on function public.create_boat_invite(uuid) to authenticated;

create or replace function public.join_boat_by_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_boat uuid;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn';
  end if;

  select bi.boat_id
    into target_boat
  from public.boat_invites bi
  where upper(trim(bi.code)) = upper(trim(invite_code))
    and (bi.expires_at is null or bi.expires_at > now())
  order by bi.created_at desc
  limit 1;

  if target_boat is null then
    raise exception 'Ongeldige of verlopen uitnodigingscode';
  end if;

  insert into public.boat_members(boat_id, user_id, role)
  values (target_boat, auth.uid(), 'member')
  on conflict (boat_id, user_id) do nothing;

  return target_boat;
end;
$$;

revoke all on function public.join_boat_by_code(text) from public;
revoke all on function public.join_boat_by_code(text) from anon;
grant execute on function public.join_boat_by_code(text) to authenticated;

drop policy if exists "members can view boats" on public.boats;
drop policy if exists "users can create boats" on public.boats;
drop policy if exists "owners can update boats" on public.boats;

create policy "members can view boats"
on public.boats for select to authenticated
using (public.is_boat_member(id));

create policy "users can create boats"
on public.boats for insert to authenticated
with check (created_by = auth.uid());

create policy "owners can update boats"
on public.boats for update to authenticated
using (public.is_boat_owner(id))
with check (created_by = auth.uid());

drop policy if exists "members can view membership" on public.boat_members;
drop policy if exists "owners can add members" on public.boat_members;
drop policy if exists "owners can remove members" on public.boat_members;

create policy "members can view membership"
on public.boat_members for select to authenticated
using (public.is_boat_member(boat_id));

create policy "owners can add members"
on public.boat_members for insert to authenticated
with check (
  user_id = auth.uid()
  or public.is_boat_owner(boat_id)
);

create policy "owners can remove members"
on public.boat_members for delete to authenticated
using (public.is_boat_owner(boat_id));

drop policy if exists "members can view pois" on public.pois;
drop policy if exists "members can create pois" on public.pois;
drop policy if exists "members can update pois" on public.pois;
drop policy if exists "members can delete pois" on public.pois;

create policy "members can view pois"
on public.pois for select to authenticated
using (public.is_boat_member(boat_id));

create policy "members can create pois"
on public.pois for insert to authenticated
with check (created_by = auth.uid() and public.is_boat_member(boat_id));

create policy "members can update pois"
on public.pois for update to authenticated
using (public.is_boat_member(boat_id))
with check (public.is_boat_member(boat_id));

create policy "members can delete pois"
on public.pois for delete to authenticated
using (public.is_boat_member(boat_id));

drop policy if exists "members can view costs" on public.costs;
drop policy if exists "members can create costs" on public.costs;
drop policy if exists "members can update costs" on public.costs;
drop policy if exists "members can delete costs" on public.costs;

create policy "members can view costs"
on public.costs for select to authenticated
using (public.is_boat_member(boat_id));

create policy "members can create costs"
on public.costs for insert to authenticated
with check (created_by = auth.uid() and public.is_boat_member(boat_id));

create policy "members can update costs"
on public.costs for update to authenticated
using (public.is_boat_member(boat_id))
with check (public.is_boat_member(boat_id));

create policy "members can delete costs"
on public.costs for delete to authenticated
using (public.is_boat_member(boat_id));

drop policy if exists "members can view invites" on public.boat_invites;
drop policy if exists "owners can create invites" on public.boat_invites;
drop policy if exists "owners can delete invites" on public.boat_invites;

create policy "members can view invites"
on public.boat_invites for select to authenticated
using (public.is_boat_member(boat_id));

create policy "owners can create invites"
on public.boat_invites for insert to authenticated
with check (created_by = auth.uid() and public.is_boat_owner(boat_id));

create policy "owners can delete invites"
on public.boat_invites for delete to authenticated
using (public.is_boat_owner(boat_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='pois'
  ) then
    alter publication supabase_realtime add table public.pois;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='costs'
  ) then
    alter publication supabase_realtime add table public.costs;
  end if;
end
$$;
