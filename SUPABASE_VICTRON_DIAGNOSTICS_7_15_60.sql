-- MijnSerenity 7.15.60
-- Bewaart uitsluitend genormaliseerde Victron-diagnoses.
-- De VRM API-token wordt nooit in Supabase opgeslagen.

create table if not exists public.victron_diagnostics (
  boat_id uuid primary key references public.boats(id) on delete cascade,
  installation_id bigint not null,
  sampled_at timestamptz not null,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create index if not exists victron_diagnostics_updated_by_idx
  on public.victron_diagnostics(updated_by);

alter table public.victron_diagnostics enable row level security;

drop policy if exists "members can view victron diagnostics"
  on public.victron_diagnostics;
create policy "members can view victron diagnostics"
  on public.victron_diagnostics
  for select
  to authenticated
  using (public.is_boat_member(boat_id));

drop policy if exists "members can create victron diagnostics"
  on public.victron_diagnostics;
create policy "members can create victron diagnostics"
  on public.victron_diagnostics
  for insert
  to authenticated
  with check (
    updated_by = (select auth.uid())
    and public.is_boat_member(boat_id)
  );

drop policy if exists "members can update victron diagnostics"
  on public.victron_diagnostics;
create policy "members can update victron diagnostics"
  on public.victron_diagnostics
  for update
  to authenticated
  using (public.is_boat_member(boat_id))
  with check (
    updated_by = (select auth.uid())
    and public.is_boat_member(boat_id)
  );

revoke all on public.victron_diagnostics from anon;
grant select, insert, update on public.victron_diagnostics to authenticated;

comment on table public.victron_diagnostics is
  'Laatste genormaliseerde VRM/SmartShunt-diagnose per boot; bevat nooit een VRM-token.';
