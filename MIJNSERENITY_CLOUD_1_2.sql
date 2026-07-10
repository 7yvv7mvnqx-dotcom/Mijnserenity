-- MijnSerenity Cloud 1.2
-- Favorieten voor POI's

alter table public.pois
  add column if not exists is_favorite boolean not null default false;
