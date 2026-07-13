-- MijnSerenity Cloud 5.4.0
-- Technisch scheepsdashboard voor gedeelde technische status en logboek.
-- Voer dit één keer volledig uit in Supabase SQL Editor.

create table if not exists public.technical_state (
  boat_id uuid primary key references public.boats(id) on delete cascade,
  updated_by uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.technical_events (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  event_date date not null default current_date,
  category text not null default 'Overig',
  title text not null,
  notes text,
  engine_hours numeric,
  value numeric,
  unit text,
  created_at timestamptz not null default now()
);

create index if not exists technical_events_boat_date_idx
on public.technical_events(boat_id, event_date desc, created_at desc);

alter table public.technical_state enable row level security;
alter table public.technical_events enable row level security;

drop policy if exists "members can view technical state"
on public.technical_state;
drop policy if exists "members can create technical state"
on public.technical_state;
drop policy if exists "members can update technical state"
on public.technical_state;
drop policy if exists "members can delete technical state"
on public.technical_state;

create policy "members can view technical state"
on public.technical_state
for select
to authenticated
using (
  public.is_boat_member(boat_id)
);

create policy "members can create technical state"
on public.technical_state
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and public.is_boat_member(boat_id)
);

create policy "members can update technical state"
on public.technical_state
for update
to authenticated
using (
  public.is_boat_member(boat_id)
)
with check (
  updated_by = auth.uid()
  and public.is_boat_member(boat_id)
);

create policy "members can delete technical state"
on public.technical_state
for delete
to authenticated
using (
  public.is_boat_member(boat_id)
);

drop policy if exists "members can view technical events"
on public.technical_events;
drop policy if exists "members can create technical events"
on public.technical_events;
drop policy if exists "members can update technical events"
on public.technical_events;
drop policy if exists "members can delete technical events"
on public.technical_events;

create policy "members can view technical events"
on public.technical_events
for select
to authenticated
using (
  public.is_boat_member(boat_id)
);

create policy "members can create technical events"
on public.technical_events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_boat_member(boat_id)
);

create policy "members can update technical events"
on public.technical_events
for update
to authenticated
using (
  public.is_boat_member(boat_id)
)
with check (
  public.is_boat_member(boat_id)
);

create policy "members can delete technical events"
on public.technical_events
for delete
to authenticated
using (
  public.is_boat_member(boat_id)
);

grant select, insert, update, delete
on public.technical_state
to authenticated;

grant select, insert, update, delete
on public.technical_events
to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'technical_state'
  ) then
    alter publication supabase_realtime
    add table public.technical_state;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'technical_events'
  ) then
    alter publication supabase_realtime
    add table public.technical_events;
  end if;
end
$$;

select 'MijnSerenity Cloud 5.4.0 technisch dashboard gereed' as status;
