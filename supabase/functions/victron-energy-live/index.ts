import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const INSTALLATION_ID = 1003203;
const ALLOWED_ORIGINS = new Set([
  "https://mijnserenity.nl",
  "https://www.mijnserenity.nl",
  "http://localhost:8888",
  "http://localhost:3000",
]);
const NETLIFY_PREVIEW_ORIGIN = /^https:\/\/deploy-preview-\d+--radiant-pithivier-5c37cf\.netlify\.app$/;

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin) || NETLIFY_PREVIEW_ORIGIN.test(origin);
}

function headers(req: Request) {
  const origin = String(req.headers.get("origin") || "");
  const allowed = isAllowedOrigin(origin) ? origin : "https://mijnserenity.nl";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vrm-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function reply(req: Request, status: number, data: unknown) {
  return new Response(JSON.stringify(data), { status, headers: headers(req) });
}

function finite(value: unknown) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function number(value: unknown): number | null {
  return finite(value) ? Number(value) : null;
}

function walkRows(value: any, output: any[] = []) {
  if (!value || typeof value !== "object") return output;
  if (!Array.isArray(value) && ("dbusPath" in value || "dataAttributeName" in value || "instance" in value)) {
    output.push(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) walkRows(item, output);
  } else {
    for (const item of Object.values(value)) walkRows(item, output);
  }
  return output;
}

function rowValue(row: any): number | null {
  for (const candidate of [row?.valueFloat, row?.rawValue, row?.valueFormattedValueOnly, row?.value]) {
    if (finite(candidate)) return Number(candidate);
  }
  return null;
}

function rowPath(row: any) {
  return String(row?.dbusPath || "").toLowerCase();
}

function rowText(row: any) {
  return [row?.dataAttributeName, row?.description, row?.dbusPath, row?.dbusServiceType, row?.productName]
    .filter(Boolean).join(" ").toLowerCase();
}

function rowString(row: any) {
  for (const candidate of [
    row?.rawValue,
    row?.value,
    row?.valueFormatted,
    row?.formattedValue,
    row?.valueFormattedValueOnly,
  ]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function bestAcInstance(rows: any[]): number | null {
  const scores = new Map<number, number>();
  for (const row of rows) {
    const instance = number(row?.instance);
    if (instance === null) continue;
    const path = rowPath(row);
    const text = rowText(row);
    let score = scores.get(instance) || 0;
    if (path === "/ac/activein/l1/v" || path === "/ac/in/1/l1/v") score += 160;
    if (path === "/ac/activein/l1/p" || path === "/ac/in/1/l1/p") score += 130;
    if (path === "/ac/out/l1/p") score += 130;
    if (path === "/ac/activein/activeinput") score += 100;
    if (path === "/dc/0/current" || path === "/dc/0/power") score += 25;
    if (/vebus|multi(?:plus)?|quattro|inverter.?charger|omvormer.?lader/.test(text)) score += 80;
    if (/inverter|charger|lader|omvormer/.test(text)) score += 20;
    if (/smartsolar|mppt|solar charger|battery monitor|smartshunt/.test(text)) score -= 100;
    scores.set(instance, score);
  }
  const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 40 ? best[0] : null;
}

function pick(rows: any[], instance: number | null, paths: string[], patterns: RegExp[] = [], exclusions: RegExp[] = []) {
  const pool = instance === null ? rows : rows.filter((row) => Number(row?.instance) === Number(instance));
  for (const path of paths) {
    const found = pool.find((row) => rowPath(row) === path.toLowerCase() && rowValue(row) !== null);
    if (found) return found;
  }
  for (const pattern of patterns) {
    const found = pool.find((row) => {
      const text = rowText(row);
      return rowValue(row) !== null && pattern.test(text) && !exclusions.some((item) => item.test(text));
    });
    if (found) return found;
  }
  return null;
}

function metric(row: any) {
  if (!row) return null;
  return {
    value: rowValue(row),
    path: String(row?.dbusPath || ""),
    name: String(row?.dataAttributeName || row?.description || ""),
    instance: number(row?.instance),
  };
}

function readAc(rows: any[]) {
  const instance = bestAcInstance(rows);
  const inputVoltageRow = pick(rows, instance,
    ["/Ac/ActiveIn/L1/V", "/Ac/In/1/L1/V", "/Ac/Grid/L1/Voltage"],
    [/active.*in.*voltage|ac.*input.*voltage|grid.*voltage|mains.*voltage|walstroom.*spanning/],
    [/dc|battery|accu/]);
  const inputCurrentRow = pick(rows, instance,
    ["/Ac/ActiveIn/L1/I", "/Ac/In/1/L1/I", "/Ac/Grid/L1/Current"],
    [/active.*in.*current|ac.*input.*current|grid.*current|mains.*current/],
    [/dc|battery|accu/]);
  const inputPowerRow = pick(rows, instance,
    ["/Ac/ActiveIn/L1/P", "/Ac/In/1/L1/P", "/Ac/Grid/L1/Power"],
    [/active.*in.*power|ac.*input.*power|grid.*power|mains.*power|walstroom.*vermogen/],
    [/dc|battery|accu/]);
  const outputPowerRow = pick(rows, instance,
    ["/Ac/Out/L1/P", "/Ac/Consumption/L1/Power"],
    [/ac.*out.*power|ac.*output.*power|consumption.*power|load.*power|verbruik.*vermogen/],
    [/solar|pv|mppt|battery|accu/]);
  const activeInputRow = pick(rows, instance,
    ["/Ac/ActiveIn/ActiveInput"],
    [/active input|active.*ac.*input/]);
  const dcVoltageRow = pick(rows, instance,
    ["/Dc/0/Voltage"], [/dc.*voltage/], [/solar|mppt|smartshunt/]);
  const dcCurrentRow = pick(rows, instance,
    ["/Dc/0/Current"], [/dc.*current/], [/solar|mppt|smartshunt/]);
  const dcPowerRow = pick(rows, instance,
    ["/Dc/0/Power"], [/dc.*power/], [/solar|mppt|smartshunt/]);

  const inputVoltage = rowValue(inputVoltageRow);
  const inputCurrent = rowValue(inputCurrentRow);
  let inputPower = rowValue(inputPowerRow);
  const outputPower = rowValue(outputPowerRow);
  const activeInput = rowValue(activeInputRow);
  const dcVoltage = rowValue(dcVoltageRow);
  const dcCurrent = rowValue(dcCurrentRow);
  let dcPower = rowValue(dcPowerRow);

  if (inputPower === null && inputVoltage !== null && inputCurrent !== null) inputPower = inputVoltage * inputCurrent;
  if (dcPower === null && dcVoltage !== null && dcCurrent !== null) dcPower = dcVoltage * dcCurrent;

  let shoreConnected: boolean | null = null;
  if (inputVoltage !== null) {
    if (inputVoltage >= 180 && inputVoltage <= 280) shoreConnected = true;
    else if (inputVoltage < 80) shoreConnected = false;
  }
  if (shoreConnected === null && activeInput !== null) {
    if (activeInput === 240 || activeInput === 255) shoreConnected = false;
    else if (activeInput >= 0 && activeInput <= 2) shoreConnected = true;
  }
  if (shoreConnected === null && inputPower !== null && Math.abs(inputPower) > 2) shoreConnected = true;

  const deviceFound = instance !== null || Boolean(inputVoltageRow || inputPowerRow || outputPowerRow || activeInputRow);
  let loadPower: number | null = outputPower;
  if (loadPower === null && deviceFound) loadPower = 0;

  let chargerPower: number | null = null;
  if (shoreConnected === true) {
    if (dcPower !== null && dcPower > 0) chargerPower = dcPower;
    else if (inputPower !== null && outputPower !== null) chargerPower = Math.max(0, inputPower - outputPower);
    else if (deviceFound) chargerPower = 0;
  } else if (shoreConnected === false && deviceFound) chargerPower = 0;

  let inverterPower: number | null = null;
  if (shoreConnected === false) {
    inverterPower = outputPower !== null ? Math.max(0, outputPower) : (dcPower !== null && dcPower < 0 ? Math.abs(dcPower) : (deviceFound ? 0 : null));
  } else if (shoreConnected === true && deviceFound) inverterPower = 0;

  return {
    instance, deviceFound, shoreConnected, inputVoltage, inputCurrent, inputPower, outputPower,
    loadPower, chargerPower, inverterPower, dcVoltage, dcCurrent, dcPower, activeInput,
    sourceMetrics: {
      inputVoltage: metric(inputVoltageRow), inputPower: metric(inputPowerRow),
      outputPower: metric(outputPowerRow), activeInput: metric(activeInputRow), dcPower: metric(dcPowerRow),
    },
  };
}

function readWasteTank(rows: any[]) {
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const path = rowPath(row);
    const service = String(row?.dbusServiceType || "").toLowerCase();
    if (!service.includes("tank") && !["/level", "/fluidtype", "/capacity", "/remaining", "/customname"].includes(path)) continue;
    const instance = number(row?.instance);
    const key = `${service || "tank"}:${instance === null ? "unknown" : instance}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let best: { score: number; rows: any[] } | null = null;
  for (const group of groups.values()) {
    const fluidRow = group.find((row) => rowPath(row) === "/fluidtype");
    const levelRow = group.find((row) => rowPath(row) === "/level" && rowValue(row) !== null);
    const fluidType = rowValue(fluidRow);
    const identity = group.map((row) => `${rowText(row)} ${rowString(row)}`).join(" ").toLowerCase();
    let score = 0;
    if (fluidType === 5) score += 1200;
    if (/zwart\s*water|black\s*water|sewage|riool/.test(identity)) score += 900;
    if (fluidType === 2) score += 300;
    if (/waste\s*water|wastewater|afvalwater|vuilwater/.test(identity)) score += 250;
    if (identity.includes("tank")) score += 40;
    if (levelRow) score += 40;
    if (fluidType !== null && ![2, 5].includes(fluidType) && !/zwart\s*water|black\s*water|sewage|riool|waste\s*water|wastewater|afvalwater|vuilwater/.test(identity)) score -= 1000;
    if (/fresh\s*water|freshwater|drinkwater|brandstof|fuel|diesel|gasoline|lpg/.test(identity) && fluidType !== 5) score -= 700;
    if (!best || score > best.score) best = { score, rows: group };
  }

  if (!best || best.score < 250) return null;
  const group = best.rows;
  const levelRow = group.find((row) => rowPath(row) === "/level" && rowValue(row) !== null);
  const fluidRow = group.find((row) => rowPath(row) === "/fluidtype");
  const statusRow = group.find((row) => rowPath(row) === "/status");
  const capacityRow = group.find((row) => rowPath(row) === "/capacity" && rowValue(row) !== null);
  const remainingRow = group.find((row) => rowPath(row) === "/remaining" && rowValue(row) !== null);
  const nameRow = group.find((row) => rowPath(row) === "/customname") || group.find((row) => rowPath(row) === "/productname");
  const rawLevel = rowValue(levelRow);
  const levelPct = rawLevel !== null && rawLevel >= 0 && rawLevel <= 100 ? Math.round(rawLevel * 10) / 10 : null;
  const capacityM3 = rowValue(capacityRow);
  const remainingM3 = rowValue(remainingRow);
  return {
    levelPct,
    fluidType: rowValue(fluidRow),
    status: rowValue(statusRow),
    instance: number(levelRow?.instance ?? fluidRow?.instance ?? group[0]?.instance),
    name: rowString(nameRow) || "Zwart water (riool)",
    capacityLiters: capacityM3 === null ? null : Math.round(capacityM3 * 1000),
    remainingLiters: remainingM3 === null ? null : Math.round(remainingM3 * 1000),
    sourceMetrics: {
      level: metric(levelRow), fluidType: metric(fluidRow), status: metric(statusRow),
      capacity: metric(capacityRow), remaining: metric(remainingRow),
    },
  };
}

function environmentApiKey() {
  const direct = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    const candidate = parsed?.default || Object.values(parsed || {})[0] || "";
    if (String(candidate).startsWith("sb_")) return String(candidate);
    return Deno.env.get(String(candidate)) || "";
  } catch { return ""; }
}

async function authorize(authHeader: string, boatId: string) {
  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "");
  const apiKey = environmentApiKey();
  if (!supabaseUrl || !apiKey) throw new Error("supabase_configuration");
  const common = { Authorization: authHeader, apikey: apiKey, Accept: "application/json" };
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: common });
  if (!userResponse.ok) throw new Error("invalid_user");
  const user = await userResponse.json();
  if (!user?.id) throw new Error("invalid_user");
  const boatUrl = new URL(`${supabaseUrl}/rest/v1/boats`);
  boatUrl.searchParams.set("id", `eq.${boatId}`);
  boatUrl.searchParams.set("select", "id");
  boatUrl.searchParams.set("limit", "1");
  const boatResponse = await fetch(boatUrl, { headers: common });
  if (!boatResponse.ok) throw new Error("membership_check_failed");
  const boats = await boatResponse.json();
  if (!Array.isArray(boats) || boats.length !== 1) throw new Error("not_a_boat_member");
}

async function mergeTechnicalStatePatch(boatId: string, patch: Record<string, unknown>) {
  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "");
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (!supabaseUrl || !serviceKey) throw new Error("technical_state_configuration");
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/merge_technical_state_patch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ p_boat_id: boatId, p_patch: patch }),
  });
  if (!response.ok) throw new Error(`technical_state_http_${response.status}`);
}

async function vrmDiagnostics(token: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://vrmapi.victronenergy.com/v2/installations/${INSTALLATION_ID}/diagnostics?count=1000`, {
      headers: { "X-Authorization": `Token ${token}`, Accept: "application/json" }, signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success === false) {
      if (response.status === 401 || response.status === 403) throw new Error("vrm_unauthorized");
      throw new Error(`vrm_http_${response.status}`);
    }
    return body;
  } finally { clearTimeout(timer); }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const origin = String(req.headers.get("origin") || "");
    if (origin && !isAllowedOrigin(origin)) return reply(req, 403, { success: false, error: "Origin niet toegestaan." });
    return new Response(null, { status: 204, headers: headers(req) });
  }
  if (req.method !== "POST") return reply(req, 405, { success: false, error: "Alleen POST is toegestaan." });
  const origin = String(req.headers.get("origin") || "");
  if (origin && !isAllowedOrigin(origin)) return reply(req, 403, { success: false, error: "Origin niet toegestaan." });

  const authHeader = String(req.headers.get("authorization") || "");
  if (!/^Bearer\s+[^\s]+$/i.test(authHeader)) return reply(req, 401, { success: false, error: "Log opnieuw in bij MijnSerenity." });
  const token = String(req.headers.get("x-vrm-token") || "").trim().replace(/^Token\s+/i, "");
  if (!token) return reply(req, 400, { success: false, error: "VRM-token ontbreekt." });

  let body: any = {};
  try { body = await req.json(); } catch { return reply(req, 400, { success: false, error: "Ongeldige aanvraag." }); }
  const boatId = String(body?.boatId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(boatId)) {
    return reply(req, 400, { success: false, error: "Boot-ID ontbreekt of is ongeldig." });
  }

  try {
    await authorize(authHeader, boatId);
    const diagnostics = await vrmDiagnostics(token);
    const rows = walkRows(diagnostics);
    const ac = readAc(rows);
    const waste = readWasteTank(rows);
    let wastePersisted = false;
    if (waste?.levelPct !== null && (waste?.status === null || waste?.status === 0)) {
      try {
        await mergeTechnicalStatePatch(boatId, { wastePct: waste.levelPct });
        wastePersisted = true;
      } catch (persistError) {
        console.warn("Victron zwartwaterniveau kon niet worden opgeslagen:", persistError);
      }
    }
    return reply(req, 200, {
      success: true,
      sampledAt: new Date().toISOString(),
      installationId: INSTALLATION_ID,
      ac,
      tanks: { waste, wastePersisted },
      source: { diagnostics: true, rowCount: rows.length },
    });
  } catch (error: any) {
    const code = String(error?.message || error);
    const status = code === "not_a_boat_member" ? 403 : code === "invalid_user" ? 401 : 502;
    const messages: Record<string, string> = {
      not_a_boat_member: "U heeft geen toegang tot deze boot.",
      invalid_user: "Uw MijnSerenity-login kon niet worden gecontroleerd.",
      vrm_unauthorized: "De VRM-token is ongeldig of heeft geen toegang tot Serenity.",
    };
    return reply(req, status, { success: false, error: messages[code] || "Victron VRM kon niet live worden uitgelezen." });
  }
});
