-- MijnSerenity Cloud 3.2
-- GPX-routes opslaan bij vaartochten

alter table public.trips
  add column if not exists gpx_storage_path text,
  add column if not exists route_geojson jsonb;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'trip-gpx',
  'trip-gpx',
  false,
  5242880,
  array[
    'application/gpx+xml',
    'application/xml',
    'text/xml',
    'application/octet-stream'
  ]
)
on conflict (id)
do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members can read trip gpx" on storage.objects;
drop policy if exists "members can upload trip gpx" on storage.objects;
drop policy if exists "members can update trip gpx" on storage.objects;
drop policy if exists "members can delete trip gpx" on storage.objects;

create policy "members can read trip gpx"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trip-gpx'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can upload trip gpx"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trip-gpx'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can update trip gpx"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'trip-gpx'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'trip-gpx'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can delete trip gpx"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trip-gpx'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);
