-- MijnSerenity Cloud 5.5.0
-- Veilige Home Assistant -> MijnSerenity-koppeling.
-- Voer dit één keer uit NA de SQL van technisch dashboard 5.4.0.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.home_assistant_integrations (
  boat_id uuid primary key references public.boats(id) on delete cascade,
  secret_hash text not null,
  created_by uuid references auth.users(id) on delete set null,
  enabled boolean not null default true,
  last_seen_at timestamptz,
  last_status text,
  last_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_assistant_integrations enable row level security;

-- De tabel zelf wordt niet rechtstreeks aan de webapp blootgesteld.
revoke all on public.home_assistant_integrations from anon, authenticated;

create or replace function public.configure_home_assistant_integration(
  p_boat_id uuid,
  p_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_now timestamptz := now();
  v_hash text;
  v_data jsonb;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn.';
  end if;

  if not public.is_boat_member(p_boat_id) then
    raise exception 'Geen toegang tot deze boot.';
  end if;

  if length(coalesce(p_secret,'')) < 32 then
    raise exception 'De geheime sleutel is te kort.';
  end if;

  v_hash := encode(extensions.digest(p_secret,'sha256'),'hex');

  insert into public.home_assistant_integrations (
    boat_id,
    secret_hash,
    created_by,
    enabled,
    last_status,
    updated_at
  )
  values (
    p_boat_id,
    v_hash,
    auth.uid(),
    true,
    'configured',
    v_now
  )
  on conflict (boat_id)
  do update set
    secret_hash = excluded.secret_hash,
    created_by = auth.uid(),
    enabled = true,
    last_seen_at = null,
    last_status = 'configured',
    last_payload = '{}'::jsonb,
    updated_at = v_now;

  select coalesce(data,'{}'::jsonb)
  into v_data
  from public.technical_state
  where boat_id = p_boat_id;

  v_data := coalesce(v_data,'{}'::jsonb);

  v_data := v_data || jsonb_build_object(
    'integrations',
    coalesce(v_data->'integrations','{}'::jsonb)
      || jsonb_build_object('homeAssistant','planned'),
    'homeAssistantLastSync',
    null,
    'homeAssistantSource',
    'Home Assistant'
  );

  insert into public.technical_state (
    boat_id,
    updated_by,
    data,
    updated_at
  )
  values (
    p_boat_id,
    auth.uid(),
    v_data,
    v_now
  )
  on conflict (boat_id)
  do update set
    updated_by = auth.uid(),
    data = excluded.data,
    updated_at = v_now;

  return jsonb_build_object(
    'enabled', true,
    'last_seen_at', null,
    'last_status', 'configured',
    'field_count', 0
  );
end
$$;

create or replace function public.get_home_assistant_integration_status(
  p_boat_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.home_assistant_integrations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn.';
  end if;

  if not public.is_boat_member(p_boat_id) then
    raise exception 'Geen toegang tot deze boot.';
  end if;

  select *
  into v_row
  from public.home_assistant_integrations
  where boat_id = p_boat_id;

  if not found then
    return jsonb_build_object(
      'enabled', false,
      'last_seen_at', null,
      'last_status', 'not_configured',
      'field_count', 0
    );
  end if;

  return jsonb_build_object(
    'enabled', v_row.enabled,
    'last_seen_at', v_row.last_seen_at,
    'last_status', v_row.last_status,
    'field_count', jsonb_object_length(
      coalesce(v_row.last_payload,'{}'::jsonb)
    )
  );
end
$$;

create or replace function public.disable_home_assistant_integration(
  p_boat_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn.';
  end if;

  if not public.is_boat_member(p_boat_id) then
    raise exception 'Geen toegang tot deze boot.';
  end if;

  update public.home_assistant_integrations
  set
    enabled = false,
    secret_hash = encode(
      extensions.digest(gen_random_uuid()::text,'sha256'),
      'hex'
    ),
    last_status = 'disabled',
    updated_at = now()
  where boat_id = p_boat_id;

  select coalesce(data,'{}'::jsonb)
  into v_data
  from public.technical_state
  where boat_id = p_boat_id;

  if v_data is not null then
    v_data := v_data || jsonb_build_object(
      'integrations',
      coalesce(v_data->'integrations','{}'::jsonb)
        || jsonb_build_object('homeAssistant','not_configured')
    );

    update public.technical_state
    set
      updated_by = auth.uid(),
      data = v_data,
      updated_at = now()
    where boat_id = p_boat_id;
  end if;

  return true;
end
$$;

create or replace function public.ingest_home_assistant_technical_data(
  p_boat_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_headers jsonb;
  v_secret text;
  v_expected_hash text;
  v_received_hash text;
  v_created_by uuid;
  v_patch jsonb := '{}'::jsonb;
  v_data jsonb;
  v_now timestamptz := now();
  v_field_count integer := 0;
begin
  begin
    v_headers := coalesce(
      current_setting('request.headers',true)::jsonb,
      '{}'::jsonb
    );
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_secret := coalesce(
    v_headers->>'x-mijnserenity-secret',
    ''
  );

  select secret_hash, created_by
  into v_expected_hash, v_created_by
  from public.home_assistant_integrations
  where boat_id = p_boat_id
    and enabled = true;

  if v_expected_hash is null then
    raise exception 'Home Assistant-koppeling is niet actief.'
      using errcode = '28000';
  end if;

  v_received_hash := encode(
    extensions.digest(v_secret,'sha256'),
    'hex'
  );

  if v_secret = '' or v_received_hash <> v_expected_hash then
    raise exception 'Ongeldige MijnSerenity-koppelsleutel.'
      using errcode = '28000';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Ongeldige technische gegevens.';
  end if;

  if p_payload ? 'engine_hours'
    and jsonb_typeof(p_payload->'engine_hours') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'engineHours',
      (p_payload->>'engine_hours')::numeric
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'house_voltage'
    and jsonb_typeof(p_payload->'house_voltage') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'houseVoltage',
      (p_payload->>'house_voltage')::numeric
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'start_voltage'
    and jsonb_typeof(p_payload->'start_voltage') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'startVoltage',
      (p_payload->>'start_voltage')::numeric
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'solar_power'
    and jsonb_typeof(p_payload->'solar_power') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'solarPower',
      (p_payload->>'solar_power')::numeric
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'fuel_pct'
    and jsonb_typeof(p_payload->'fuel_pct') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'fuelPct',
      greatest(0,least(100,(p_payload->>'fuel_pct')::numeric))
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'water_pct'
    and jsonb_typeof(p_payload->'water_pct') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'waterPct',
      greatest(0,least(100,(p_payload->>'water_pct')::numeric))
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'waste_pct'
    and jsonb_typeof(p_payload->'waste_pct') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'wastePct',
      greatest(0,least(100,(p_payload->>'waste_pct')::numeric))
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'shore_power'
    and jsonb_typeof(p_payload->'shore_power') = 'boolean' then
    v_patch := v_patch || jsonb_build_object(
      'shorePower',
      (p_payload->>'shore_power')::boolean
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'engine_temp'
    and jsonb_typeof(p_payload->'engine_temp') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'engineTemp',
      (p_payload->>'engine_temp')::numeric
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'oil_pressure'
    and jsonb_typeof(p_payload->'oil_pressure') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'oilPressure',
      (p_payload->>'oil_pressure')::numeric
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'heater'
    and jsonb_typeof(p_payload->'heater') = 'string' then
    v_patch := v_patch || jsonb_build_object(
      'heater',
      case lower(p_payload->>'heater')
        when 'heat' then 'running'
        when 'heating' then 'running'
        when 'on' then 'running'
        when 'running' then 'running'
        when 'off' then 'off'
        when 'idle' then 'off'
        when 'service' then 'service'
        when 'fault' then 'fault'
        when 'unavailable' then 'unknown'
        else 'unknown'
      end
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'bilge'
    and jsonb_typeof(p_payload->'bilge') = 'string' then
    v_patch := v_patch || jsonb_build_object(
      'bilge',
      case lower(p_payload->>'bilge')
        when 'on' then 'active'
        when 'active' then 'active'
        when 'alarm' then 'alarm'
        when 'problem' then 'alarm'
        when 'off' then 'ok'
        when 'ok' then 'ok'
        else 'unknown'
      end
    );
    v_field_count := v_field_count + 1;
  end if;

  select coalesce(data,'{}'::jsonb)
  into v_data
  from public.technical_state
  where boat_id = p_boat_id;

  v_data := coalesce(v_data,'{}'::jsonb);
  v_data := v_data || v_patch;

  v_data := v_data || jsonb_build_object(
    'integrations',
    coalesce(v_data->'integrations','{}'::jsonb)
      || jsonb_build_object('homeAssistant','connected'),
    'homeAssistantLastSync',
    v_now,
    'homeAssistantSource',
    'Home Assistant',
    'homeAssistantFieldCount',
    v_field_count
  );

  insert into public.technical_state (
    boat_id,
    updated_by,
    data,
    updated_at
  )
  values (
    p_boat_id,
    v_created_by,
    v_data,
    v_now
  )
  on conflict (boat_id)
  do update set
    updated_by = v_created_by,
    data = excluded.data,
    updated_at = v_now;

  update public.home_assistant_integrations
  set
    last_seen_at = v_now,
    last_status = 'connected',
    last_payload = jsonb_strip_nulls(p_payload),
    updated_at = v_now
  where boat_id = p_boat_id;

  return jsonb_build_object(
    'ok', true,
    'received_at', v_now,
    'field_count', v_field_count
  );
end
$$;

revoke all on function public.configure_home_assistant_integration(uuid,text)
from public;
revoke all on function public.get_home_assistant_integration_status(uuid)
from public;
revoke all on function public.disable_home_assistant_integration(uuid)
from public;
revoke all on function public.ingest_home_assistant_technical_data(uuid,jsonb)
from public;

grant execute
on function public.configure_home_assistant_integration(uuid,text)
to authenticated;

grant execute
on function public.get_home_assistant_integration_status(uuid)
to authenticated;

grant execute
on function public.disable_home_assistant_integration(uuid)
to authenticated;

grant execute
on function public.ingest_home_assistant_technical_data(uuid,jsonb)
to anon, authenticated;

select
  'MijnSerenity Cloud 5.5.0 Home Assistant-koppeling gereed'
  as status;
