-- MijnSerenity Cloud 6.4.0
-- Gedeelde live vaarkaart voor alle geopende apparaten.

begin;

create table if not exists public.live_navigation_state (
  boat_id uuid primary key references public.boats(id) on delete cascade,
  session_id uuid,
  status text not null default 'idle' check (status in ('idle','active','paused','stopped')),
  controller_user_id uuid references auth.users(id) on delete set null,
  controller_device_id text,
  controller_name text,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.live_navigation_state replica identity full;
create index if not exists live_navigation_state_updated_idx on public.live_navigation_state(updated_at desc);
alter table public.live_navigation_state enable row level security;

drop policy if exists "members read live navigation" on public.live_navigation_state;
create policy "members read live navigation" on public.live_navigation_state for select to authenticated using (public.is_boat_member(boat_id) or public.is_boat_owner(boat_id));
drop policy if exists "members insert live navigation" on public.live_navigation_state;
create policy "members insert live navigation" on public.live_navigation_state for insert to authenticated with check (public.is_boat_member(boat_id) or public.is_boat_owner(boat_id));
drop policy if exists "members update live navigation" on public.live_navigation_state;
create policy "members update live navigation" on public.live_navigation_state for update to authenticated using (public.is_boat_member(boat_id) or public.is_boat_owner(boat_id)) with check (public.is_boat_member(boat_id) or public.is_boat_owner(boat_id));
drop policy if exists "members delete live navigation" on public.live_navigation_state;
create policy "members delete live navigation" on public.live_navigation_state for delete to authenticated using (public.is_boat_member(boat_id) or public.is_boat_owner(boat_id));

grant select,insert,update,delete on public.live_navigation_state to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.live_navigation_state;
exception when duplicate_object then null;
end
$$;

commit;
