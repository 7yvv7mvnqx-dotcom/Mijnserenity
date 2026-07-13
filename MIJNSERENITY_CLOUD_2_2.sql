-- MijnSerenity Cloud 2.2
alter table public.trips add column if not exists fuel_liters numeric(10,2), add column if not exists fuel_cost numeric(12,2);
create table if not exists public.boat_settings (boat_id uuid primary key references public.boats(id) on delete cascade,boat_name text,fuel_price numeric(10,3),fuel_per_hour numeric(10,2),tank_capacity numeric(10,2),updated_at timestamptz not null default now());
alter table public.boat_settings enable row level security;
drop policy if exists "members can view boat settings" on public.boat_settings;drop policy if exists "members can create boat settings" on public.boat_settings;drop policy if exists "members can update boat settings" on public.boat_settings;
create policy "members can view boat settings" on public.boat_settings for select to authenticated using (public.is_boat_member(boat_id));
create policy "members can create boat settings" on public.boat_settings for insert to authenticated with check (public.is_boat_member(boat_id));
create policy "members can update boat settings" on public.boat_settings for update to authenticated using (public.is_boat_member(boat_id)) with check (public.is_boat_member(boat_id));
do $$ begin if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='boat_settings') then alter publication supabase_realtime add table public.boat_settings; end if; end $$;
