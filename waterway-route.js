const DEFAULT_ENDPOINTS = [
  'https://brouter.grade.de/brouter',
  'https://brouter.de/brouter'
];

const DEFAULT_PROFILES = [
  'motorboat',
  'waterway_nomod',
  'river',
  'river_canoe_nomod'
];

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validPoint(point) {
  const lat = number(point?.lat);
  const lon = number(point?.lon);

  return (
    lat !== null &&
    lon !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function distanceKm(a, b) {
  const radians = value => value * Math.PI / 180;
  const earthRadius = 6371;
  const latitudeDifference = radians(b.lat - a.lat);
  const longitudeDifference = radians(b.lon - a.lon);
  const latitudeA = radians(a.lat);
  const latitudeB = radians(b.lat);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitudeA) *
    Math.cos(latitudeB) *
    Math.sin(longitudeDifference / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function routeDistanceKm(coordinates) {
  let total = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    total += distanceKm(
      {
        lon: coordinates[index - 1][0],
        lat: coordinates[index - 1][1]
      },
      {
        lon: coordinates[index][0],
        lat: coordinates[index][1]
      }
    );
  }

  return total;
}

function extractLineString(payload) {
  const candidates = [];

  if (payload?.type === 'FeatureCollection') {
    candidates.push(
      ...(Array.isArray(payload.features) ? payload.features : [])
    );
  } else if (payload?.type === 'Feature') {
    candidates.push(payload);
  } else if (payload?.type === 'LineString') {
    candidates.push({
      type: 'Feature',
      geometry: payload,
      properties: {}
    });
  }

  const feature = candidates.find(candidate =>
    candidate?.geometry?.type === 'LineString' &&
    Array.isArray(candidate.geometry.coordinates) &&
    candidate.geometry.coordinates.length >= 2
  );

  if (!feature) {
    throw new Error('Router gaf geen geldige waterwegroute terug.');
  }

  const coordinates = feature.geometry.coordinates
    .map(coordinate => [
      Number(coordinate?.[0]),
      Number(coordinate?.[1])
    ])
    .filter(coordinate =>
      Number.isFinite(coordinate[0]) &&
      Number.isFinite(coordinate[1])
    );

  if (coordinates.length < 2) {
    throw new Error('De waterwegroute bevat te weinig routepunten.');
  }

  return {
    coordinates,
    properties: feature.properties || {}
  };
}

async function fetchCandidate(candidate, points) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const url = new URL(candidate.endpoint);
    url.searchParams.set(
      'lonlats',
      points
        .map(point => `${point.lon},${point.lat}`)
        .join('|')
    );
    url.searchParams.set('profile', candidate.profile);
    url.searchParams.set('alternativeidx', '0');
    url.searchParams.set('format', 'geojson');

    const response = await fetch(url, {
      headers: {
        accept: 'application/geo+json, application/json',
        'user-agent': 'MijnSerenity/6.5.0 waterway-router'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `${candidate.profile}: HTTP ${response.status}`
      );
    }

    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(
        `${candidate.profile}: antwoord was geen JSON`
      );
    }

    const route = extractLineString(payload);

    return {
      ...route,
      endpoint: candidate.endpoint,
      profile: candidate.profile
    };
  } finally {
    clearTimeout(timeout);
  }
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        allow: 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, {
      ok: false,
      error: 'Gebruik POST.'
    });
  }

  let body;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, {
      ok: false,
      error: 'Ongeldige JSON.'
    });
  }

  const points = (Array.isArray(body.points) ? body.points : [])
    .map(point => ({
      lat: number(point?.lat),
      lon: number(point?.lon),
      label: String(point?.label || '')
    }))
    .filter(validPoint);

  if (points.length < 2) {
    return json(400, {
      ok: false,
      error: 'Minimaal twee geldige routepunten zijn nodig.'
    });
  }

  if (points.length > 10) {
    return json(400, {
      ok: false,
      error: 'Maximaal tien routepunten per berekening.'
    });
  }

  const configuredEndpoint =
    String(process.env.WATERWAY_ROUTER_URL || '').trim();
  const configuredProfile =
    String(process.env.WATERWAY_ROUTER_PROFILE || '').trim();

  const endpoints = [
    configuredEndpoint,
    ...DEFAULT_ENDPOINTS
  ].filter((value, index, values) =>
    value && values.indexOf(value) === index
  );

  const profiles = [
    configuredProfile,
    ...DEFAULT_PROFILES
  ].filter((value, index, values) =>
    value && values.indexOf(value) === index
  );

  const candidates = [];

  endpoints.forEach(endpoint => {
    profiles.forEach(profile => {
      candidates.push({ endpoint, profile });
    });
  });

  const attempts = candidates.map(candidate =>
    fetchCandidate(candidate, points)
      .then(result => ({
        status: 'fulfilled',
        result
      }))
      .catch(error => ({
        status: 'rejected',
        candidate,
        error: String(error?.message || error)
      }))
  );

  const results = await Promise.all(attempts);
  const success = results.find(result =>
    result.status === 'fulfilled'
  );

  if (!success) {
    return json(502, {
      ok: false,
      error:
        'De waterwegrouter is momenteel niet bereikbaar. ' +
        'MijnSerenity kan terugvallen op een schatting.',
      attempts: results
        .filter(result => result.status === 'rejected')
        .slice(0, 8)
        .map(result => ({
          profile: result.candidate.profile,
          message: result.error
        }))
    });
  }

  const route = success.result;
  const distance =
    routeDistanceKm(route.coordinates);

  return json(200, {
    ok: true,
    source: 'BRouter waterway',
    profile: route.profile,
    coordinates: route.coordinates,
    distanceKm: distance,
    properties: route.properties,
    warning:
      'Open-data waterwegroute. Controleer bruggen, sluizen, diepte, ' +
      'stremmingen en doorvaarbaarheid altijd in Waterkaarten.'
  }, {
    'cache-control': 'public, max-age=900'
  });
};
