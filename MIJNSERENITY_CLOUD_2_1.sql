-- MijnSerenity Cloud 2.1
-- Logboek bewerken + foto's per vaartocht

create table if not exists public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  boat_id uuid not null references public.boats(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  created_at timestamptz not null default now()
);

create index if not exists trip_photos_trip_id_idx
on public.trip_photos(trip_id);

create index if not exists trip_photos_boat_id_idx
on public.trip_photos(boat_id);

alter table public.trip_photos enable row level security;

drop policy if exists "members can view trip photos"
on public.trip_photos;

drop policy if exists "members can create trip photos"
on public.trip_photos;

drop policy if exists "members can delete trip photos"
on public.trip_photos;

create policy "members can view trip photos"
on public.trip_photos
for select
to authenticated
using (
  public.is_boat_member(boat_id)
);

create policy "members can create trip photos"
on public.trip_photos
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_boat_member(boat_id)
);

create policy "members can delete trip photos"
on public.trip_photos
for delete
to authenticated
using (
  public.is_boat_member(boat_id)
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'trip-photos',
  'trip-photos',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id)
do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members can read trip photo files"
on storage.objects;

drop policy if exists "members can upload trip photo files"
on storage.objects;

drop policy if exists "members can delete trip photo files"
on storage.objects;

create policy "members can read trip photo files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trip-photos'
  and public.is_boat_member(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "members can upload trip photo files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-photos'
  and public.is_boat_member(
    ((storage.foldername(name))[1])::uuid
  )
);

create policy "members can delete trip photo files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-photos'
  and public.is_boat_member(
    ((storage.foldername(name))[1])::uuid
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_photos'
  ) then
    alter publication supabase_realtime
    add table public.trip_photos;
  end if;
end
$$;
