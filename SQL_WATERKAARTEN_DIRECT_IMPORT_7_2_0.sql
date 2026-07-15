-- MijnSerenity 7.2.0 — Waterkaarten direct delen
-- Eenmalig uitvoeren in Supabase > SQL Editor.

create extension if not exists pgcrypto;

alter table public.boat_settings
  add column if not exists waterkaarten_import_token text;

create table if not exists public.waterkaarten_route_inbox (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  file_name text not null,
  file_base64 text not null,
  content_type text not null default 'application/gpx+xml',
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid
);

create index if not exists waterkaarten_route_inbox_token_created_idx
  on public.waterkaarten_route_inbox(token_hash, created_at desc);

alter table public.waterkaarten_route_inbox enable row level security;
revoke all on table public.waterkaarten_route_inbox from anon, authenticated;

create or replace function public.receive_waterkaarten_route(
  p_token text,
  p_file_name text,
  p_file_base64 text,
  p_content_type text default 'application/gpx+xml'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_name text;
  v_token text;
begin
  v_token := trim(coalesce(p_token,''));
  v_name := regexp_replace(trim(coalesce(p_file_name,'waterkaarten-route.gpx')), '[\\/:*?"<>|]', '_', 'g');

  if length(v_token) < 24 or length(v_token) > 160 then
    raise exception 'Ongeldige MijnSerenity-importcode';
  end if;

  if v_name !~* '\.(gpx|kml|kmz)$' then
    raise exception 'Alleen GPX, KML en KMZ worden geaccepteerd';
  end if;

  if length(coalesce(p_file_base64,'')) < 20 then
    raise exception 'Het routebestand is leeg';
  end if;

  -- Circa 7,5 MB bestand na Base64. Ruim voldoende voor Waterkaarten-routes.
  if length(p_file_base64) > 10000000 then
    raise exception 'Het routebestand is te groot';
  end if;

  delete from public.waterkaarten_route_inbox
    where created_at < now() - interval '7 days';

  insert into public.waterkaarten_route_inbox(
    token_hash,file_name,file_base64,content_type
  ) values (
    encode(digest(v_token,'sha256'),'hex'),
    v_name,
    regexp_replace(p_file_base64,'\s','','g'),
    coalesce(nullif(trim(p_content_type),''),'application/gpx+xml')
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.claim_waterkaarten_route(p_token text)
returns table(
  id uuid,
  file_name text,
  file_base64 text,
  content_type text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Log eerst in bij MijnSerenity';
  end if;

  return query
  with next_route as (
    select inbox.id
    from public.waterkaarten_route_inbox inbox
    where inbox.token_hash=encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex')
      and inbox.claimed_at is null
      and inbox.created_at > now() - interval '7 days'
    order by inbox.created_at asc
    limit 1
    for update skip locked
  )
  update public.waterkaarten_route_inbox inbox
  set claimed_at=now(), claimed_by=auth.uid()
  from next_route
  where inbox.id=next_route.id
  returning inbox.id,inbox.file_name,inbox.file_base64,inbox.content_type,inbox.created_at;
end;
$$;

create or replace function public.release_waterkaarten_route(
  p_token text,
  p_route_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.waterkaarten_route_inbox
  set claimed_at=null, claimed_by=null
  where id=p_route_id
    and token_hash=encode(digest(trim(coalesce(p_token,'')),'sha256'),'hex')
    and claimed_by=auth.uid();

  return found;
end;
$$;

grant execute on function public.receive_waterkaarten_route(text,text,text,text)
  to anon, authenticated;
grant execute on function public.claim_waterkaarten_route(text)
  to authenticated;
grant execute on function public.release_waterkaarten_route(text,uuid)
  to authenticated;
