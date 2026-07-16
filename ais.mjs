
const API_BASE = "https://api.vesselapi.com/v1";
const cache = globalThis.__mijnSerenityAisCache ||
  (globalThis.__mijnSerenityAisCache = new Map());

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

function apiKey() {
  try {
    const fromNetlify = globalThis.Netlify?.env?.get?.("VESSELAPI_KEY");
    if (fromNetlify) return fromNetlify;
  } catch {}
  return process.env.VESSELAPI_KEY || "";
}

function numberParam(params, name, min, max, fallback = null) {
  const value = Number(params.get(name));
  if (!Number.isFinite(value)) {
    if (fallback !== null) return fallback;
    throw Object.assign(new Error(`Ongeldige parameter: ${name}`), {
      status: 400,
      code: "invalid_parameter",
    });
  }
  if (value < min || value > max) {
    throw Object.assign(
      new Error(`${name} moet tussen ${min} en ${max} liggen.`),
      { status: 400, code: "invalid_parameter" },
    );
  }
  return value;
}

function textParam(params, name, maxLength = 120) {
  return String(params.get(name) || "").trim().slice(0, maxLength);
}

function cacheKey(path, params) {
  return `${path}?${params.toString()}`;
}

async function vesselRequest(path, params = new URLSearchParams(), ttlMs = 20000) {
  const key = apiKey();
  if (!key) {
    throw Object.assign(
      new Error("Voeg VESSELAPI_KEY toe aan de Netlify-omgeving en start een nieuwe deploy."),
      { status: 503, code: "ais_not_configured" },
    );
  }

  const keyName = cacheKey(path, params);
  const cached = cache.get(keyName);
  if (cached && Date.now() - cached.at < ttlMs) {
    return { ...cached.value, cached: true };
  }

  const response = await fetch(`${API_BASE}${path}?${params.toString()}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      "user-agent": "MijnSerenity/7.1.1",
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  const retryAfter = response.headers.get("retry-after");
  const remaining = response.headers.get("x-ratelimit-remaining");
  const requestId = response.headers.get("x-request-id");

  if (!response.ok) {
    const upstreamMessage =
      payload?.error?.message ||
      payload?.message ||
      `AIS-databron gaf fout ${response.status}`;

    const error = Object.assign(new Error(upstreamMessage), {
      status: response.status,
      code: payload?.error?.code || payload?.code || "upstream_error",
      retryAfter,
      requestId,
    });
    throw error;
  }

  const value = {
    data: payload,
    remaining,
    requestId,
    fetchedAt: new Date().toISOString(),
  };
  cache.set(keyName, { at: Date.now(), value });
  return value;
}

function cleanMmsiList(value) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^\d{9}$/.test(item));
  return [...new Set(items)].slice(0, 50);
}

async function optionalRequest(path, params, ttlMs) {
  try {
    const result = await vesselRequest(path, params, ttlMs);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      status: error.status || 500,
      error: {
        code: error.code || "request_failed",
        message: error.message,
      },
    };
  }
}

export default async (request) => {
  if (request.method !== "GET") {
    return json({ error: { code: "method_not_allowed", message: "Alleen GET wordt ondersteund." } }, 405, {
      allow: "GET",
    });
  }

  const url = new URL(request.url);
  const params = url.searchParams;
  const mode = textParam(params, "mode", 30) || "status";

  try {
    if (mode === "status") {
      return json({
        configured: Boolean(apiKey()),
        provider: "VesselAPI",
        proxy: true,
      });
    }

    if (mode === "nearby") {
      const latitude = numberParam(params, "lat", -90, 90);
      const longitude = numberParam(params, "lon", -180, 180);
      const radiusKm = numberParam(params, "radiusKm", 1, 100, 20);
      const limit = Math.round(numberParam(params, "limit", 1, 50, 50));
      const now = new Date();
      const from = new Date(now.getTime() - 45 * 60 * 1000);

      const query = new URLSearchParams({
        "filter.latitude": String(latitude),
        "filter.longitude": String(longitude),
        "filter.radius": String(Math.round(radiusKm * 1000)),
        "time.from": from.toISOString(),
        "time.to": now.toISOString(),
        "pagination.limit": String(limit),
      });

      const result = await vesselRequest(
        "/location/vessels/radius",
        query,
        20000,
      );
      return json(result);
    }

    if (mode === "fleet") {
      const mmsi = cleanMmsiList(params.get("mmsi"));
      if (!mmsi.length) {
        return json({ data: { vesselPositions: [] }, fetchedAt: new Date().toISOString() });
      }

      const query = new URLSearchParams({
        "filter.ids": mmsi.join(","),
        "filter.idType": "mmsi",
        "pagination.limit": String(Math.min(50, mmsi.length)),
      });

      const result = await vesselRequest(
        "/vessels/positions",
        query,
        20000,
      );
      return json(result);
    }

    if (mode === "search") {
      const queryText = textParam(params, "q", 80);
      const limit = Math.round(numberParam(params, "limit", 1, 50, 20));

      if (queryText.length < 2) {
        return json({
          error: {
            code: "invalid_search",
            message: "Gebruik minimaal twee letters of een geldig MMSI.",
          },
        }, 400);
      }

      const query = new URLSearchParams({
        "pagination.limit": String(limit),
      });

      if (/^\d{9}$/.test(queryText)) {
        query.set("filter.mmsi", queryText);
      } else {
        query.set("filter.name", queryText);
      }

      const result = await vesselRequest(
        "/search/vessels",
        query,
        10 * 60 * 1000,
      );
      return json(result);
    }

    if (mode === "vessel") {
      const mmsi = textParam(params, "mmsi", 9);
      if (!/^\d{9}$/.test(mmsi)) {
        return json({
          error: {
            code: "invalid_mmsi",
            message: "MMSI moet uit precies negen cijfers bestaan.",
          },
        }, 400);
      }

      const idQuery = new URLSearchParams({
        "filter.idType": "mmsi",
      });

      const [info, position, eta] = await Promise.all([
        optionalRequest(`/vessel/${mmsi}`, idQuery, 24 * 60 * 60 * 1000),
        optionalRequest(`/vessel/${mmsi}/position`, idQuery, 20000),
        optionalRequest(`/vessel/${mmsi}/eta`, idQuery, 5 * 60 * 1000),
      ]);

      return json({
        data: { info, position, eta },
        fetchedAt: new Date().toISOString(),
      });
    }

    return json({
      error: {
        code: "invalid_mode",
        message: "Onbekende AIS-opdracht.",
      },
    }, 400);
  } catch (error) {
    const status = Number(error.status) || 500;
    const headers = {};
    if (error.retryAfter) headers["retry-after"] = String(error.retryAfter);

    return json({
      error: {
        code: error.code || "ais_error",
        message: error.message || "AIS-service kon niet worden uitgevoerd.",
        requestId: error.requestId || null,
      },
    }, status, headers);
  }
};
