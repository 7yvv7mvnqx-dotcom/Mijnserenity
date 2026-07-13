-- MijnSerenity Cloud 5.1.4
-- Bonnetjes/facturen koppelen aan kosten.
-- Voer dit één keer uit in Supabase SQL Editor.

create table if not exists public.cost_receipts (
  id uuid primary key default gen_random_uuid(),
  cost_id uuid not null references public.costs(id) on delete cascade,
  boat_id uuid not null references public.boats(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists cost_receipts_cost_id_idx
on public.cost_receipts(cost_id);

create index if not exists cost_receipts_boat_id_idx
on public.cost_receipts(boat_id);

alter table public.cost_receipts enable row level security;

drop policy if exists "members can view cost receipts"
on public.cost_receipts;

drop policy if exists "members can create cost receipts"
on public.cost_receipts;

drop policy if exists "members can delete cost receipts"
on public.cost_receipts;

create policy "members can view cost receipts"
on public.cost_receipts
for select
to authenticated
using (
  public.is_boat_member(boat_id)
);

create policy "members can create cost receipts"
on public.cost_receipts
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_boat_member(boat_id)
);

create policy "members can delete cost receipts"
on public.cost_receipts
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
  'cost-receipts',
  'cost-receipts',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
on conflict (id)
do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members can read cost receipt files"
on storage.objects;

drop policy if exists "members can upload cost receipt files"
on storage.objects;

drop policy if exists "members can delete cost receipt files"
on storage.objects;

create policy "members can read cost receipt files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cost-receipts'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can upload cost receipt files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cost-receipts'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

create policy "members can delete cost receipt files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cost-receipts'
  and public.is_boat_member(((storage.foldername(name))[1])::uuid)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cost_receipts'
  ) then
    alter publication supabase_realtime
    add table public.cost_receipts;
  end if;
end
$$;

select 'MijnSerenity Cloud 5.1.4 bonnetjes gereed' as status;
