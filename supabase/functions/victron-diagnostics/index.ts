import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const INSTALLATION_ID = 1003203;
const MAX_HISTORY_DAYS = 14;
const ALLOWED_ORIGINS = new Set([
  "https://mijnserenity.nl",
  "https://www.mijnserenity.nl",
  "http://localhost:8888",
  "http://localhost:3000",
]);
const NETLIFY_PREVIEW_ORIGIN =
  /^https:\/\/deploy-preview-\d+--radiant-pithivier-5c37cf\.netlify\.app$/;

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || NETLIFY_PREVIEW_ORIGIN.test(origin);
}

function corsHeaders(req) {
  const origin = String(req.headers.get("origin") || "");
  const allowedOrigin = isAllowedOrigin(origin)
    ? origin
    : "https://mijnserenity.nl";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-vrm-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function reply(req, status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(req),
  });
}

function finite(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function number(value) {
  return finite(value) ? Number(value) : null;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function walkRows(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (
    !Array.isArray(value) &&
    ("dbusPath" in value ||
      "dataAttributeName" in value ||
      "instance" in value)
  ) {
    output.push(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) walkRows(item, output);
  } else {
    for (const item of Object.values(value)) walkRows(item, output);
  }
  return output;
}

function rowValue(row) {
  const candidates = [
    row?.valueFloat,
    row?.rawValue,
    row?.valueFormattedValueOnly,
    row?.value,
  ];
  for (const candidate of candidates) {
    if (finite(candidate)) return Number(candidate);
  }
  return null;
}

function rowText(row) {
  return [
    row?.dataAttributeName,
    row?.description,
    row?.dbusPath,
    row?.dbusServiceType,
    row?.productName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function rowPath(row) {
  return String(row?.dbusPath || "").toLowerCase();
}

function rowFormatted(row) {
  const value =
    row?.formattedValue ??
    row?.valueFormattedWithUnit ??
    row?.valueFormattedValueOnly ??
    row?.rawValue ??
    row?.value;
  return value === null || value === undefined ? "" : String(value);
}

function metricFromRow(row) {
  if (!row) return null;
  return {
    value: rowValue(row),
    formatted: rowFormatted(row),
    path: String(row?.dbusPath || ""),
    name: String(row?.dataAttributeName || row?.description || ""),
  };
}

function pickRow(rows, instance, paths, patterns = [], exclusions = []) {
  const wanted = rows.filter(
    (row) =>
      Number(row?.instance) === Number(instance) && rowValue(row) !== null,
  );
  for (const path of paths) {
    const match = wanted.find((row) => rowPath(row) === path.toLowerCase());
    if (match) return match;
  }
  for (const pattern of patterns) {
    const match = wanted.find((row) => {
      const text = rowText(row);
      return pattern.test(text) && !exclusions.some((item) => item.test(text));
    });
    if (match) return match;
  }
  return null;
}

function bestInstance(rows, kind) {
  const scores = new Map();
  for (const row of rows) {
    const instance = number(row?.instance);
    if (instance === null) continue;
    const path = rowPath(row);
    const text = rowText(row);
    let score = scores.get(instance) || 0;
    if (kind === "battery") {
      if (path === "/soc") score += 140;
      if (path === "/consumedamphours") score += 90;
      if (path === "/timetogo") score += 70;
      if (path.startsWith("/history/")) score += 16;
      if (/smartshunt|battery monitor|\bbmv\b/.test(text)) score += 45;
      if (/battery|accu/.test(text)) score += 12;
      if (/solar|mppt|charger/.test(text)) score -= 20;
    } else {
      if (path === "/yield/power") score += 150;
      if (path === "/pv/v" || path === "/pv/0/v") score += 100;
      if (/smartsolar|mppt|solar charger/.test(text)) score += 50;
      if (/solar|pv|yield/.test(text)) score += 16;
      if (/battery monitor|smartshunt/.test(text)) score -= 25;
    }
    scores.set(instance, score);
  }
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0] && sorted[0][1] > 0 ? sorted[0][0] : null;
}

function readBattery(rows) {
  const instance = bestInstance(rows, "battery");
  if (instance === null) return { instance: null };
  const get = (paths, patterns = [], exclusions = []) =>
    metricFromRow(pickRow(rows, instance, paths, patterns, exclusions));
  const voltage = get(
    ["/dc/0/voltage", "/voltage"],
    [/battery.*voltage|voltage.*battery|accuspanning/],
    [/starter|startaccu|aux|midpoint/],
  );
  const current = get(
    ["/dc/0/current", "/current"],
    [/battery.*current|current.*battery|accustroom/],
    [/starter|startaccu|aux/],
  );
  let power = get(
    ["/dc/0/power", "/power"],
    [/battery.*power|power.*battery|accuvermogen/],
    [/solar|pv|mppt|charger/],
  );
  if (!power && finite(voltage?.value) && finite(current?.value)) {
    power = {
      value: Number(voltage.value) * Number(current.value),
      formatted: "",
      path: "calculated",
      name: "Berekend uit spanning en stroom",
    };
  }
  return {
    instance,
    soc: get(["/soc"], [/state of charge|\bsoc\b|laadpercentage/]),
    voltage,
    current,
    power,
    timeToGo: get(["/timetogo"], [/time to go|resterende tijd/]),
    consumedAh: get(
      ["/consumedamphours"],
      [/consumed.*amp|verbruikte.*ah/],
    ),
    starterVoltage: get(
      ["/dc/1/voltage", "/startervoltage", "/auxvoltage"],
      [/starter.*voltage|startaccu.*spanning|aux.*voltage/],
    ),
    midpointVoltage: get(
      ["/dc/0/midvoltage", "/midpointvoltage"],
      [/midpoint.*voltage|middelpunt.*spanning/],
    ),
    midpointDeviation: get(
      ["/dc/0/midvoltagedeviation", "/midpointdeviation"],
      [/midpoint.*deviation|middelpunt.*afwijking/],
    ),
    history: {
      deepestDischarge: get(
        ["/history/deepestdischarge"],
        [/deepest discharge|diepste ontlading/],
      ),
      lastDischarge: get(
        ["/history/lastdischarge"],
        [/last discharge|laatste ontlading/],
      ),
      averageDischarge: get(
        ["/history/averagedischarge"],
        [/average discharge|gemiddelde ontlading/],
      ),
      cycleCount: get(
        ["/history/chargecycles", "/history/cyclecount"],
        [/charge cycles|cycle count|laadcycli/],
      ),
      fullDischarges: get(
        ["/history/fulldischarges"],
        [/full discharges|volledige ontladingen/],
      ),
      cumulativeAh: get(
        ["/history/cumulativeahdrawn"],
        [/cumulative.*ah|cumulatief.*ah/],
      ),
      minimumVoltage: get(
        ["/history/minimumvoltage"],
        [/minimum voltage|laagste spanning/],
      ),
      maximumVoltage: get(
        ["/history/maximumvoltage"],
        [/maximum voltage|hoogste spanning/],
      ),
      timeSinceFullCharge: get(
        ["/history/timesincelastfullcharge"],
        [/time since.*full charge|tijd sinds.*volledig/],
      ),
      synchronizations: get(
        ["/history/synchronizationcount"],
        [/synchroni[sz]ation count|synchronisaties/],
      ),
    },
  };
}

function readSolar(rows) {
  const preferred = rows.some(
    (row) => Number(row?.instance) === 278 && rowPath(row) === "/yield/power",
  )
    ? 278
    : bestInstance(rows, "solar");
  if (preferred === null) return { instance: null };
  const get = (paths, patterns = [], exclusions = []) =>
    metricFromRow(pickRow(rows, preferred, paths, patterns, exclusions));
  return {
    instance: preferred,
    power: get(
      ["/yield/power", "/pv/0/p", "/dc/0/power"],
      [/solar.*power|pv.*power|yield.*power/],
      [/battery|load/],
    ),
    pvVoltage: get(["/pv/v", "/pv/0/v"], [/pv.*voltage|solar.*voltage/]),
    chargeCurrent: get(
      ["/dc/0/current"],
      [/charger.*current|laadstroom/],
    ),
    batteryVoltage: get(
      ["/dc/0/voltage"],
      [/charger.*voltage|accuspanning/],
    ),
    yieldToday: get(
      ["/history/daily/0/yield", "/yield/user"],
      [/yield today|opbrengst vandaag/],
    ),
    maximumPowerToday: get(
      ["/history/daily/0/maximumpower", "/history/daily/0/maxpower"],
      [/maximum power today|max.*power.*today/],
    ),
    chargerState: get(["/state"], [/charger state|laadstatus/]),
    errorCode: get(["/errorcode"], [/error code|foutcode/]),
  };
}

function readActiveAlarms(rows) {
  const inactive = /^(|0|off|ok|no alarm|geen alarm|inactive|false)$/i;
  return rows
    .filter((row) => /\/alarms?\//i.test(String(row?.dbusPath || "")))
    .filter((row) => {
      const numeric = rowValue(row);
      if (numeric !== null) return numeric !== 0;
      return !inactive.test(rowFormatted(row).trim());
    })
    .slice(0, 20)
    .map((row) => ({
      instance: number(row?.instance),
      path: String(row?.dbusPath || ""),
      name: String(row?.dataAttributeName || row?.description || "Alarm"),
      value: rowValue(row),
      formatted: rowFormatted(row),
    }));
}

function timestampMs(value) {
  if (finite(value)) {
    const numeric = Number(value);
    return numeric < 100000000000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function pointsFrom(value) {
  const points = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (Array.isArray(item) && item.length >= 2) {
        const at = timestampMs(item[0]);
        const measured = number(item[1]);
        if (at !== null && measured !== null) points.push([at, measured]);
      } else if (item && typeof item === "object") {
        const at = timestampMs(item.timestamp ?? item.time ?? item.x);
        const measured = number(item.value ?? item.y);
        if (at !== null && measured !== null) points.push([at, measured]);
      }
    }
  } else if (value && typeof value === "object") {
    for (const [key, measuredValue] of Object.entries(value)) {
      const at = timestampMs(key);
      const measured = number(measuredValue);
      if (at !== null && measured !== null) points.push([at, measured]);
    }
  }
  return points.sort((a, b) => a[0] - b[0]);
}

function findRecord(records, names) {
  if (!records || typeof records !== "object") return [];
  const entries = Object.entries(records);
  for (const name of names) {
    const match = entries.find(
      ([key]) => key.toLowerCase() === String(name).toLowerCase(),
    );
    if (match) {
      const points = pointsFrom(match[1]);
      if (points.length) return points;
    }
  }
  return [];
}

function downsample(points, maximum = 240) {
  if (points.length <= maximum) return points;
  const step = (points.length - 1) / (maximum - 1);
  const output = [];
  for (let index = 0; index < maximum; index += 1) {
    output.push(points[Math.round(index * step)]);
  }
  return output;
}

function seriesSummary(points) {
  if (!points.length) return null;
  const values = points.map((point) => point[1]);
  const first = points[0];
  const last = points[points.length - 1];
  const hours = Math.max(0, (last[0] - first[0]) / 3600000);
  return {
    count: points.length,
    firstAt: new Date(first[0]).toISOString(),
    lastAt: new Date(last[0]).toISOString(),
    first: first[1],
    last: last[1],
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    change: last[1] - first[1],
    changePerHour: hours >= 0.5 ? (last[1] - first[1]) / hours : null,
    durationHours: hours,
  };
}

function readHistory(statsBodies, days) {
  const records = {};
  for (const body of statsBodies.filter(Boolean)) {
    if (body?.records && typeof body.records === "object") {
      Object.assign(records, body.records);
    }
  }
  const voltagePoints = findRecord(records, [
    "bv",
    "battery_voltage",
    "batteryVoltage",
  ]);
  const possibleSoc = findRecord(records, [
    "bs",
    "battery_soc",
    "state_of_charge",
  ]);
  const socValues = possibleSoc.map((point) => point[1]);
  const socPoints =
    socValues.length &&
    socValues.some((value) => value > 1) &&
    socValues.every((value) => value >= 0 && value <= 100)
      ? possibleSoc
      : [];
  const powerPoints = findRecord(records, [
    "Pdc",
    "battery_power",
    "batteryPower",
  ]);
  return {
    days,
    voltage: {
      summary: seriesSummary(voltagePoints),
      points: downsample(voltagePoints),
    },
    soc: {
      summary: seriesSummary(socPoints),
      points: downsample(socPoints),
    },
    dcPower: {
      summary: seriesSummary(powerPoints),
      points: downsample(powerPoints),
    },
    availableCodes: Object.keys(records).slice(0, 80),
  };
}

function metricValue(metric) {
  return number(metric?.value);
}

function assessBattery(battery, history, batteryType) {
  const voltage = metricValue(battery?.voltage);
  const soc = metricValue(battery?.soc);
  const current = metricValue(battery?.current);
  const minimumVoltage = metricValue(battery?.history?.minimumVoltage);
  const fullDischarges = metricValue(battery?.history?.fullDischarges);
  const socTrend = history?.soc?.summary || null;
  const checks = [];
  const nextSteps = [];
  let level = "info";

  const add = (severity, code, text) => {
    checks.push({ severity, code, text });
    if (severity === "critical") level = "critical";
    else if (severity === "warning" && level !== "critical") level = "warning";
  };

  if (voltage === null && soc === null) {
    add(
      "warning",
      "battery_not_found",
      "Geen SmartShunt-accuspanning of laadpercentage in VRM gevonden.",
    );
  }

  const lead = !/lith|lifepo|lithium/i.test(String(batteryType || "lead"));
  const charging = current !== null && current > 1;
  const modestLoad = current === null || Math.abs(current) < 5;

  if (lead && voltage !== null && !charging) {
    if (voltage <= 11.8) {
      add(
        "critical",
        "very_low_voltage",
        `De huishoudaccu staat op ${voltage.toFixed(2)} V en is zeer laag.`,
      );
    } else if (voltage <= 12.1) {
      add(
        "warning",
        "low_voltage",
        `De huishoudaccu staat op ${voltage.toFixed(2)} V en vraagt aandacht.`,
      );
    }
  }

  if (soc !== null) {
    if (soc <= 15) {
      add("critical", "very_low_soc", `De SmartShunt meldt nog ${soc.toFixed(0)}%.`);
    } else if (soc <= 30) {
      add("warning", "low_soc", `De SmartShunt meldt nog ${soc.toFixed(0)}%.`);
    }
  }

  if (
    lead &&
    soc !== null &&
    voltage !== null &&
    soc >= 70 &&
    voltage < 12.15 &&
    modestLoad &&
    !charging
  ) {
    add(
      "critical",
      "soc_voltage_mismatch",
      `${soc.toFixed(0)}% SOC past niet bij ${voltage.toFixed(2)} V onder deze belasting. Controleer SmartShunt-synchronisatie, bekabeling en de accu's.`,
    );
  }

  if (minimumVoltage !== null && lead && minimumVoltage < 10.8) {
    add(
      "warning",
      "historic_deep_voltage",
      `De SmartShunt-historie bevat een minimum van ${minimumVoltage.toFixed(2)} V; dat wijst op een diepe ontlading of spanningsval.`,
    );
  }

  if (fullDischarges !== null && fullDischarges > 0) {
    add(
      "warning",
      "full_discharges",
      `De SmartShunt registreert ${Math.round(fullDischarges)} volledige ontlading${Math.round(fullDischarges) === 1 ? "" : "en"}.`,
    );
  }

  if (
    socTrend &&
    socTrend.durationHours >= 2 &&
    finite(socTrend.changePerHour) &&
    socTrend.changePerHour <= -2
  ) {
    add(
      "warning",
      "rapid_soc_drop",
      `Het laadpercentage daalde gemiddeld ${Math.abs(socTrend.changePerHour).toFixed(1)} procentpunt per uur.`,
    );
  }

  const hasUsefulTrend = Boolean(
    socTrend && socTrend.count >= 8 && socTrend.durationHours >= 4,
  );
  if (!hasUsefulTrend) {
    add(
      "info",
      "capacity_not_proven",
      "Er is nog onvoldoende bruikbare SOC-historie voor een betrouwbare capaciteitsbeoordeling.",
    );
  }

  if (voltage !== null && lead && voltage <= 12.1 && !charging) {
    nextSteps.push(
      "Laad de huishoudaccu's eerst volledig op en voorkom verdere diepe ontlading.",
    );
  }
  if (checks.some((item) => item.code === "soc_voltage_mismatch")) {
    nextSteps.push(
      "Synchroniseer de SmartShunt pas na een aantoonbaar volledige laadcyclus en controleer de shunt- en accuklemmen.",
    );
  }
  nextSteps.push(
    "Voer daarna een gecontroleerde ontlaadtest uit met een bekende belasting en vergelijk verbruikte Ah met de opgegeven accucapaciteit.",
  );
  nextSteps.push(
    "Laat bij twijfel iedere 12 V-accu afzonderlijk met een belasting-/conductantietester meten; rustspanning alleen is geen capaciteitstest.",
  );

  let title = "Nog onvoldoende meetgegevens";
  let conclusion =
    "Met deze meting kan nog niet betrouwbaar worden vastgesteld dat de accu's versleten zijn.";
  if (level === "critical") {
    title = "Accusysteem direct controleren";
    conclusion =
      "De actuele waarden zijn afwijkend. Eerst laden en SmartShunt/bekabeling controleren; daarna bepaalt een gecontroleerde belastingstest of de accu's werkelijk capaciteit verloren hebben.";
  } else if (level === "warning") {
    title = "Accu's vragen aandacht";
    conclusion =
      "Er zijn aanwijzingen voor lage spanning, snelle ontlading of eerdere diepe ontlading, maar een capaciteitstest blijft nodig voor een definitief oordeel.";
  } else if (voltage !== null || soc !== null) {
    title = "Geen direct alarm, capaciteit nog niet bewezen";
  }

  return {
    level,
    title,
    conclusion,
    checks,
    nextSteps: [...new Set(nextSteps)],
    capacityJudgement: hasUsefulTrend ? "indicative" : "insufficient_data",
  };
}

function environmentApiKey() {
  const direct =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    const candidate = parsed?.default || Object.values(parsed || {})[0] || "";
    if (String(candidate).startsWith("sb_")) return String(candidate);
    return Deno.env.get(String(candidate)) || "";
  } catch {
    return "";
  }
}

async function authenticateAndAuthorize(authHeader, boatId) {
  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "");
  const apiKey = environmentApiKey();
  if (!supabaseUrl || !apiKey) throw new Error("supabase_configuration");
  const headers = {
    Authorization: authHeader,
    apikey: apiKey,
    Accept: "application/json",
  };
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers });
  if (!userResponse.ok) throw new Error("invalid_user");
  const user = await userResponse.json();
  if (!user?.id) throw new Error("invalid_user");
  const boatUrl = new URL(`${supabaseUrl}/rest/v1/boats`);
  boatUrl.searchParams.set("id", `eq.${boatId}`);
  boatUrl.searchParams.set("select", "id");
  boatUrl.searchParams.set("limit", "1");
  const boatResponse = await fetch(boatUrl, { headers });
  if (!boatResponse.ok) throw new Error("membership_check_failed");
  const boats = await boatResponse.json();
  if (!Array.isArray(boats) || boats.length !== 1) {
    throw new Error("not_a_boat_member");
  }
  return { user, supabaseUrl, apiKey, headers };
}

async function vrmRequest(path, token, optional = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://vrmapi.victronenergy.com/v2${path}`, {
      headers: {
        "X-Authorization": `Token ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success === false) {
      if (optional) return null;
      if (response.status === 401 || response.status === 403) {
        throw new Error("vrm_unauthorized");
      }
      throw new Error(`vrm_http_${response.status}`);
    }
    return body;
  } catch (error) {
    if (optional) return null;
    if (error?.name === "AbortError") throw new Error("vrm_timeout");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function persistDiagnosis(context, boatId, sampledAt, data) {
  const response = await fetch(
    `${context.supabaseUrl}/rest/v1/victron_diagnostics?on_conflict=boat_id`,
    {
      method: "POST",
      headers: {
        ...context.headers,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        boat_id: boatId,
        installation_id: INSTALLATION_ID,
        sampled_at: sampledAt,
        data,
        updated_by: context.user.id,
        updated_at: sampledAt,
      }),
    },
  );
  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = String(req.headers.get("origin") || "");
    if (origin && !isAllowedOrigin(origin)) {
      return reply(req, 403, { success: false, error: "Origin niet toegestaan." });
    }
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return reply(req, 405, { success: false, error: "Alleen POST is toegestaan." });
  }

  const origin = String(req.headers.get("origin") || "");
  if (origin && !isAllowedOrigin(origin)) {
    return reply(req, 403, { success: false, error: "Origin niet toegestaan." });
  }

  const authHeader = String(req.headers.get("authorization") || "");
  if (!/^Bearer\s+[^\s]+$/i.test(authHeader)) {
    return reply(req, 401, { success: false, error: "Log opnieuw in bij MijnSerenity." });
  }
  const rawVrmToken = String(req.headers.get("x-vrm-token") || "")
    .trim()
    .replace(/^Token\s+/i, "");
  if (!rawVrmToken) {
    return reply(req, 400, { success: false, error: "VRM-token ontbreekt." });
  }

  let requestData = {};
  try {
    requestData = await req.json();
  } catch {
    return reply(req, 400, { success: false, error: "Ongeldige aanvraag." });
  }
  const boatId = String(requestData?.boatId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(boatId)) {
    return reply(req, 400, { success: false, error: "Boot-ID ontbreekt of is ongeldig." });
  }
  const days = clamp(Math.round(number(requestData?.days) || 7), 1, MAX_HISTORY_DAYS);
  const batteryType = String(requestData?.batteryType || "lead").slice(0, 40);

  let authContext;
  try {
    authContext = await authenticateAndAuthorize(authHeader, boatId);
  } catch (error) {
    const code = String(error?.message || error);
    const status = code === "not_a_boat_member" ? 403 : 401;
    return reply(req, status, {
      success: false,
      error:
        status === 403
          ? "U heeft geen toegang tot deze boot."
          : "Uw MijnSerenity-login kon niet worden gecontroleerd.",
    });
  }

  try {
    const diagnostics = await vrmRequest(
      `/installations/${INSTALLATION_ID}/diagnostics?count=1000`,
      rawVrmToken,
    );
    const rows = walkRows(diagnostics);
    const battery = readBattery(rows);
    const solar = readSolar(rows);
    const activeAlarms = readActiveAlarms(rows);

    const end = Math.floor(Date.now() / 1000);
    const start = end - days * 86400;
    const statsQuery = (type) => {
      const query = new URLSearchParams({
        type,
        interval: "15mins",
        start: String(start),
        end: String(end),
      });
      return `/installations/${INSTALLATION_ID}/stats?${query}`;
    };
    const [liveFeed, liveFeedExtra, alarmsEndpoint] = await Promise.all([
      vrmRequest(statsQuery("live_feed"), rawVrmToken, true),
      vrmRequest(statsQuery("live_feed_extra"), rawVrmToken, true),
      vrmRequest(`/installations/${INSTALLATION_ID}/alarms`, rawVrmToken, true),
    ]);
    const history = readHistory([liveFeed, liveFeedExtra], days);
    const assessment = assessBattery(battery, history, batteryType);
    const sampledAt = new Date().toISOString();
    const endpointAlarmCount = Array.isArray(alarmsEndpoint?.records)
      ? alarmsEndpoint.records.filter((alarm) => alarm?.active !== false).length
      : null;
    const data = {
      schemaVersion: 1,
      sampledAt,
      installationId: INSTALLATION_ID,
      battery,
      solar,
      alarms: {
        active: activeAlarms,
        endpointActiveCount: endpointAlarmCount,
      },
      history,
      assessment,
      source: {
        diagnostics: true,
        liveFeed: Boolean(liveFeed),
        liveFeedExtra: Boolean(liveFeedExtra),
        rowCount: rows.length,
      },
    };
    const saved = await persistDiagnosis(authContext, boatId, sampledAt, data);
    return reply(req, 200, { success: true, saved, ...data });
  } catch (error) {
    const code = String(error?.message || error);
    const messages = {
      vrm_unauthorized: "De VRM-token is ongeldig of heeft geen toegang tot Serenity.",
      vrm_timeout: "Victron VRM reageerde niet op tijd. Probeer het opnieuw.",
    };
    return reply(req, 502, {
      success: false,
      error: messages[code] || "Victron VRM kon niet veilig worden uitgelezen.",
    });
  }
});
