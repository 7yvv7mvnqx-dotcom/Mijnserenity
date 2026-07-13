-- MijnSerenity Cloud 5.6.0
-- Live camera radarbeugel via Home Assistant.
-- Voer dit één keer uit NA de SQL van 5.5.0.

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
  v_camera_patch jsonb := '{}'::jsonb;
  v_data jsonb;
  v_now timestamptz := now();
  v_field_count integer := 0;
begin
  begin
    v_headers := coalesce(
      current_setting('request.headers', true)::jsonb,
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
    raise exception
      'Home Assistant-koppeling is niet actief.'
      using errcode = '28000';
  end if;

  v_received_hash := encode(
    extensions.digest(v_secret, 'sha256'),
    'hex'
  );

  if v_secret = ''
    or v_received_hash <> v_expected_hash then
    raise exception
      'Ongeldige MijnSerenity-koppelsleutel.'
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
      greatest(
        0,
        least(100, (p_payload->>'fuel_pct')::numeric)
      )
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'water_pct'
    and jsonb_typeof(p_payload->'water_pct') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'waterPct',
      greatest(
        0,
        least(100, (p_payload->>'water_pct')::numeric)
      )
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'waste_pct'
    and jsonb_typeof(p_payload->'waste_pct') = 'number' then
    v_patch := v_patch || jsonb_build_object(
      'wastePct',
      greatest(
        0,
        least(100, (p_payload->>'waste_pct')::numeric)
      )
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

  if p_payload ? 'camera_entity'
    and jsonb_typeof(p_payload->'camera_entity') = 'string'
    and length(trim(p_payload->>'camera_entity')) > 0 then
    v_camera_patch := v_camera_patch || jsonb_build_object(
      'entityId',
      trim(p_payload->>'camera_entity')
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'camera_base_url'
    and jsonb_typeof(p_payload->'camera_base_url') = 'string'
    and length(trim(p_payload->>'camera_base_url')) > 0 then
    v_camera_patch := v_camera_patch || jsonb_build_object(
      'homeAssistantBaseUrl',
      regexp_replace(
        trim(p_payload->>'camera_base_url'),
        '/+$',
        ''
      )
    );
    v_field_count := v_field_count + 1;
  end if;

  if p_payload ? 'camera_access_token'
    and jsonb_typeof(p_payload->'camera_access_token') = 'string'
    and length(trim(p_payload->>'camera_access_token')) > 20 then
    v_camera_patch := v_camera_patch || jsonb_build_object(
      'accessToken',
      trim(p_payload->>'camera_access_token'),
      'tokenUpdatedAt',
      v_now,
      'liveEnabled',
      true,
      'enabled',
      true
    );
    v_field_count := v_field_count + 1;
  end if;

  select coalesce(data, '{}'::jsonb)
  into v_data
  from public.technical_state
  where boat_id = p_boat_id;

  v_data := coalesce(v_data, '{}'::jsonb);
  v_data := v_data || v_patch;

  if v_camera_patch <> '{}'::jsonb then
    v_data := v_data || jsonb_build_object(
      'camera',
      coalesce(v_data->'camera', '{}'::jsonb)
        || v_camera_patch
    );
  end if;

  v_data := v_data || jsonb_build_object(
    'integrations',
    coalesce(v_data->'integrations', '{}'::jsonb)
      || jsonb_build_object(
        'homeAssistant',
        'connected'
      ),
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
    last_payload = jsonb_strip_nulls(
      p_payload - 'camera_access_token'
    ),
    updated_at = v_now
  where boat_id = p_boat_id;

  return jsonb_build_object(
    'ok', true,
    'received_at', v_now,
    'field_count', v_field_count,
    'camera_live',
    length(
      coalesce(
        v_camera_patch->>'accessToken',
        ''
      )
    ) > 20
  );
end
$$;

revoke all
on function public.ingest_home_assistant_technical_data(
  uuid,
  jsonb
)
from public;

grant execute
on function public.ingest_home_assistant_technical_data(
  uuid,
  jsonb
)
to anon, authenticated;

notify pgrst, 'reload schema';

select
  'MijnSerenity Cloud 5.6.0 live camera gereed'
  as status;
