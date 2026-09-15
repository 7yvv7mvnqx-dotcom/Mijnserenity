-- MijnSerenity 8.27.9 — Fase 4: Data, database & realtime
-- Productiemigratie toegepast op 2026-09-15 als:
-- phase4_merge_technical_state_upsert
--
-- Doel:
-- De Victron/background-sync moet technical_state ook kunnen initialiseren
-- wanneer voor een geldige boot nog geen technical_state-rij bestaat.

create or replace function public.merge_technical_state_patch(
  p_boat_id uuid,
  p_patch jsonb
)
returns void
language sql
set search_path to 'public'
as $function$
  insert into public.technical_state (
    boat_id,
    data,
    updated_at
  )
  values (
    p_boat_id,
    coalesce(p_patch, '{}'::jsonb),
    now()
  )
  on conflict (boat_id)
  do update set
    data = coalesce(public.technical_state.data, '{}'::jsonb)
      || coalesce(excluded.data, '{}'::jsonb),
    updated_at = now();
$function$;
