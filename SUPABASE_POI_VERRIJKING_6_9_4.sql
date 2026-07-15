-- MijnSerenity Cloud 6.9.4
-- Extra velden voor periodieke POI-verrijking en fotobronnen.

begin;

alter table public.pois
  add column if not exists website text;

alter table public.pois
  add column if not exists phone text;

alter table public.pois
  add column if not exists opening_hours text;

alter table public.pois
  add column if not exists external_rating numeric(3,1);

alter table public.pois
  add column if not exists external_rating_source text;

alter table public.pois
  add column if not exists source_url text;

alter table public.pois
  add column if not exists osm_type text;

alter table public.pois
  add column if not exists osm_id text;

alter table public.pois
  add column if not exists enrichment_sources text;

alter table public.pois
  add column if not exists enriched_at timestamptz;

alter table public.pois
  add column if not exists enrichment_status text;

alter table public.poi_photos
  add column if not exists source_url text;

alter table public.poi_photos
  add column if not exists source_title text;

alter table public.poi_photos
  add column if not exists source_attribution text;

alter table public.poi_photos
  add column if not exists source_license text;

alter table public.poi_photos
  add column if not exists auto_imported boolean
  not null default false;

alter table public.poi_photos
  add column if not exists enriched_at timestamptz;

create index if not exists
  pois_boat_enriched_at_idx
on public.pois (boat_id,enriched_at);

create index if not exists
  poi_photos_auto_imported_idx
on public.poi_photos (poi_id,auto_imported);

commit;
