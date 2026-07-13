-- MijnSerenity Cloud 2.3
-- Dashboardfoto voor Serenity

alter table public.boat_settings
  add column if not exists dashboard_photo_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'boat-photos',
  'boat-photos',
  false,
  15728640,
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

drop policy if exists "members can read boat photos" on storage.objects;
drop policy if exists "members can upload boat photos" on storage.objects;
drop policy if exists "members can update boat photos" on storage.objects;
drop policy if exists "members can delete boat photos" on storage.objects;

create policy "members can read boat photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'boat-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can upload boat photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'boat-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can update boat photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'boat-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'boat-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can delete boat photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'boat-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);
