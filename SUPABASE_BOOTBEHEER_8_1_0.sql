-- MijnSerenity 8.1.0 — Bootbeheer cloudopslag
-- Gedeelde bootbeheerdata + privé documentopslag per boot.

create table if not exists public.boat_management_state (
  boat_id uuid primary key references public.boats(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid not null,
  updated_at timestamptz not null default now()
);

alter table public.boat_management_state enable row level security;

-- Data API: alleen ingelogde gebruikers krijgen de handelingen die de app nodig heeft.
revoke all on table public.boat_management_state from anon;
revoke all on table public.boat_management_state from authenticated;
grant select, insert, update on table public.boat_management_state to authenticated;
grant all on table public.boat_management_state to service_role;

drop policy if exists "members can view boat management" on public.boat_management_state;
create policy "members can view boat management"
on public.boat_management_state
for select
to authenticated
using (public.is_boat_member(boat_id));

drop policy if exists "members can create boat management" on public.boat_management_state;
create policy "members can create boat management"
on public.boat_management_state
for insert
to authenticated
with check (
  public.is_boat_member(boat_id)
  and updated_by = (select auth.uid())
);

drop policy if exists "members can update boat management" on public.boat_management_state;
create policy "members can update boat management"
on public.boat_management_state
for update
to authenticated
using (public.is_boat_member(boat_id))
with check (
  public.is_boat_member(boat_id)
  and updated_by = (select auth.uid())
);

-- Live synchronisatie tussen toestellen/accounts.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'boat_management_state'
  ) then
    alter publication supabase_realtime add table public.boat_management_state;
  end if;
end $$;

-- Privé opslag voor handleidingen, verzekeringsdocumenten en scans.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'boat-documents',
  'boat-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'text/plain'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- De eerste map in elk objectpad is het boat_id.
drop policy if exists "boat members can read boat documents" on storage.objects;
create policy "boat members can read boat documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'boat-documents'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "boat members can upload boat documents" on storage.objects;
create policy "boat members can upload boat documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'boat-documents'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "boat members can update boat documents" on storage.objects;
create policy "boat members can update boat documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'boat-documents'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'boat-documents'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "boat members can delete boat documents" on storage.objects;
create policy "boat members can delete boat documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'boat-documents'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);
