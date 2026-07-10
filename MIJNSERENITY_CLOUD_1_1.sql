-- MijnSerenity Cloud 1.1
-- POI bewerken + foto's in Supabase Storage
-- Voer dit één keer uit in een nieuwe SQL-query.

alter table public.pois
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.poi_photos (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null references public.pois(id) on delete cascade,
  boat_id uuid not null references public.boats(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  created_at timestamptz not null default now()
);

create index if not exists poi_photos_poi_id_idx on public.poi_photos(poi_id);
create index if not exists poi_photos_boat_id_idx on public.poi_photos(boat_id);

alter table public.poi_photos enable row level security;

drop policy if exists "members can view poi photos" on public.poi_photos;
drop policy if exists "members can create poi photos" on public.poi_photos;
drop policy if exists "members can delete poi photos" on public.poi_photos;

create policy "members can view poi photos"
on public.poi_photos for select to authenticated
using (public.is_boat_member(boat_id));

create policy "members can create poi photos"
on public.poi_photos for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_boat_member(boat_id)
);

create policy "members can delete poi photos"
on public.poi_photos for delete to authenticated
using (public.is_boat_member(boat_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'poi-photos',
  'poi-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members can read poi photo files" on storage.objects;
drop policy if exists "members can upload poi photo files" on storage.objects;
drop policy if exists "members can delete poi photo files" on storage.objects;

create policy "members can read poi photo files"
on storage.objects for select to authenticated
using (
  bucket_id = 'poi-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can upload poi photo files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'poi-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can delete poi photo files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'poi-photos'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='poi_photos'
  ) then
    alter publication supabase_realtime add table public.poi_photos;
  end if;
end
$$;
