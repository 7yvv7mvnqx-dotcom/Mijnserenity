-- MijnSerenity Cloud 3.0
-- Adres toevoegen aan POI's
-- Breedtegraad en lengtegraad bestaan al vanaf Cloud 2.0.

alter table public.pois
  add column if not exists address text;
