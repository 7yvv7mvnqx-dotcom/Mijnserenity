-- MijnSerenity Cloud 6.8.1
-- Omschrijving en GPS-positie bij foto's van een vaartocht.

begin;

alter table public.trip_photos
  add column if not exists description text;

alter table public.trip_photos
  add column if not exists latitude double precision;

alter table public.trip_photos
  add column if not exists longitude double precision;

alter table public.trip_photos
  add column if not exists captured_at timestamptz;

create index if not exists
  trip_photos_trip_location_idx
on public.trip_photos (
  trip_id,
  captured_at
)
where latitude is not null
  and longitude is not null;

comment on column public.trip_photos.description
  is 'Omschrijving van de foto tijdens de vaartocht.';

comment on column public.trip_photos.latitude
  is 'GPS-breedtegraad waarop de routefoto is toegevoegd.';

comment on column public.trip_photos.longitude
  is 'GPS-lengtegraad waarop de routefoto is toegevoegd.';

comment on column public.trip_photos.captured_at
  is 'Tijdstip waarop de routefoto is gemaakt of toegevoegd.';

commit;
