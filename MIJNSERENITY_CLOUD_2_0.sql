-- MijnSerenity Cloud 2.0
-- GPS op POI's + digitaal logboek

alter table public.pois
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  trip_date date not null default current_date,
  title text,
  departure text,
  arrival text,
  distance_km numeric(10,2),
  duration_hours numeric(10,2),
  crew text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_boat_id_idx on public.trips(boat_id);
alter table public.trips enable row level security;

drop policy if exists "members can view trips" on public.trips;
drop policy if exists "members can create trips" on public.trips;
drop policy if exists "members can update trips" on public.trips;
drop policy if exists "members can delete trips" on public.trips;

create policy "members can view trips"
on public.trips for select to authenticated
using (public.is_boat_member(boat_id));

create policy "members can create trips"
on public.trips for insert to authenticated
with check (created_by=auth.uid() and public.is_boat_member(boat_id));

create policy "members can update trips"
on public.trips for update to authenticated
using (public.is_boat_member(boat_id))
with check (public.is_boat_member(boat_id));

create policy "members can delete trips"
on public.trips for delete to authenticated
using (public.is_boat_member(boat_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='trips'
  ) then
    alter publication supabase_realtime add table public.trips;
  end if;
end
$$;
