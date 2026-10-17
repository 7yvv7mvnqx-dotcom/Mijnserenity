/* MijnSerenity - plaats-, haven- en aanlegplaats-suggesties (OpenStreetMap).
 * Photon is bedoeld voor zoeken-tijdens-typen; Overpass wordt alleen bevraagd
 * na een herkenbare plaatsnaam. Nooit de publieke Nominatim API voor autocomplete.
 */
const cache = globalThis.__msRoutePlaceCache || (globalThis.__msRoutePlaceCache = new Map());
const pending = globalThis.__msRoutePlacePending || (globalThis.__msRoutePlacePending = new Map());
const MIN_QUERY = 2;
const TTL = 30 * 60 * 1000;
const MAX_CACHE = 100;
const PLACE_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'quarter', 'locality', 'district']);

function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status >= 400 ? 'no-store' : 'public, max-age=120, stale-while-revalidate=900',
      'x-content-type-options': 'nosniff'
    }
  });
}
async function getJson(url, opts = {}, timeout = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal });
    if (!response.ok) throw new Error('Locatiebron reageert niet (' + response.status + ')');
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
function validPoint(lat, lon) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))
    && Number(lat) >= 49 && Number(lat) <= 56
    && Number(lon) >= 2 && Number(lon) <= 12;
}
function distanceKm(a, b) {
  const rad = n => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const v = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}
function cityLabel(props) {
  return [props.city, props.district, props.county, props.state].filter(Boolean).filter((s, i, a) => a.indexOf(s) === i).slice(0, 2).join(' · ');
}
function photonRecord(feature) {
  const p = feature?.properties || {};
  const lon = Number(feature?.geometry?.coordinates?.[0]);
  const lat = Number(feature?.geometry?.coordinates?.[1]);
  if (!validPoint(lat, lon) || !p.name || !p.osm_type || !p.osm_id) return null;
  const country = String(p.countrycode || '').trim().toUpperCase();
  const countryName = normalized(p.country);
  const netherlands = country === 'NL' || countryName === 'nederland' || countryName === 'netherlands';
  if (country && country !== 'NL') {
    // Bij een korte invoer geen gelijknamige plaatsen buiten Nederland tonen.
    // Een volledige zoeknaam (5+ letters) mag wél grensoverschrijdend zoeken.
    const queryLength = Number(feature.__msQueryLength || 0);
    if (queryLength < 5) return null;
  }
  if (!country && countryName && !netherlands && Number(feature.__msQueryLength || 0) < 5) return null;
  const category = p.osm_key === 'place' && PLACE_TYPES.has(p.osm_value) ? 'Plaats' :
    p.osm_value === 'marina' ? 'Jachthaven' :
    /harbour|harbor|port/i.test(p.osm_value || '') ? 'Haven' : '';
  if (!category) return null;
  return {
    id: 'osm-' + String(p.osm_type).toLowerCase() + '-' + p.osm_id,
    name: String(p.name).trim().slice(0, 110),
    place: cityLabel(p),
    type: category,
    lat, lon,
    source: 'OpenStreetMap',
    country: country || (netherlands ? 'NL' : ''),
    localityType: String(p.osm_value || '')
  };
}
async function findPlaces(query) {
  const u = new URL('https://photon.komoot.io/api/');
  u.searchParams.set('q', query);
  u.searchParams.set('limit', '25');
  // Geef Nederlandse locaties voorrang bij korte namen zoals 'zw'.
  u.searchParams.set('lat', '52.15');
  u.searchParams.set('lon', '5.30');
  u.searchParams.set('location_bias_scale', '0.2');
  // De publieke Photon-server kent geen 'nl'; gebruik de lokale naam van de plaats.
  u.searchParams.set('lang', 'default');
  const data = await getJson(u, {
    headers: { accept: 'application/json', 'user-agent': 'MijnSerenity/8.32 routeplanner (personal, low-volume)' }
  }, 7000);
  const unique = new Map();
  for (const feature of data.features || []) {
    // De Photon-records zelf alleen binnen dit verzoek uitbreiden.
    feature.__msQueryLength = normalized(query).length;
    const record = photonRecord(feature);
    if (!record) continue;
    // Laat bij een plaatsnaam geen totaal andere plaats uit dezelfde
    // regio zien. Een haven mag wel op plaatsnaam gevonden worden.
    const matchText = normalized(record.name + ' ' + (record.type === 'Plaats' ? '' : record.place));
    if (!matchText.includes(normalized(query))) continue;
    const key = record.id;
    if (!unique.has(key)) unique.set(key, record);
  }
  return [...unique.values()]
    .sort((a, b) =>
      Number(b.country === 'NL') - Number(a.country === 'NL')
      || Number(b.localityType === 'city') - Number(a.localityType === 'city')
      || Number(b.localityType === 'town') - Number(a.localityType === 'town'))
    .slice(0, 12);
}
function closestPlace(places, query) {
  const n = normalized(query);
  return places.find(p => p.type === 'Plaats' && normalized(p.name) === n)
    || (n.length >= 3 ? places.find(p => p.type === 'Plaats'
      && normalized(p.name).startsWith(n)
      && normalized(p.name).length - n.length <= 5) : null);
}
async function findHarbours(city) {
  const lat = Number(city.lat.toFixed(5));
  const lon = Number(city.lon.toFixed(5));
  const query = '[out:json][timeout:11];('
    + 'nwr(around:11000,' + lat + ',' + lon + ')["leisure"="marina"];'
    + 'nwr(around:11000,' + lat + ',' + lon + ')["waterway"="mooring"]["name"];'
    + 'nwr(around:11000,' + lat + ',' + lon + ')["harbour"="yes"]["name"];'
    + 'nwr(around:11000,' + lat + ',' + lon + ')["waterway"="harbour"]["name"];'
    + ');out center 70;';
  const data = await getJson('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ data: query })
  }, 12000);
  const results = [], names = new Set();
  for (const element of data.elements || []) {
    const tags = element.tags || {};
    const name = String(tags['name:nl'] || tags.name || '').trim();
    const plat = Number(element.lat ?? element.center?.lat);
    const plon = Number(element.lon ?? element.center?.lon);
    if (!name || !validPoint(plat, plon)) continue;
    const key = normalized(name);
    if (names.has(key)) continue;
    names.add(key);
    const category = tags.leisure === 'marina' ? 'Jachthaven' :
      tags.waterway === 'mooring' ? 'Aanlegplaats' : 'Haven';
    const distance = distanceKm(city, { lat: plat, lon: plon });
    results.push({
      id: 'osm-' + element.type.slice(0, 1) + '-' + element.id,
      name: name.slice(0, 110),
      place: 'Omgeving ' + city.name,
      type: category,
      lat: plat, lon: plon,
      distanceKm: Number(distance.toFixed(1)),
      source: 'OpenStreetMap'
    });
  }
  return results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 20);
}
async function lookup(query) {
  const places = await findPlaces(query);
  const city = closestPlace(places, query);
  let harbours = [], harboursAvailable = false;
  if (city) {
    try {
      harbours = await findHarbours(city);
      harboursAvailable = true;
    } catch (error) {
      console.warn('Havens rond ' + city.name + ' tijdelijk niet beschikbaar:', error?.message);
    }
  }
  return {
    query,
    place: city?.name || '',
    places,
    harbours,
    harboursAvailable,
    attribution: '© OpenStreetMap-bijdragers',
    updatedAt: new Date().toISOString()
  };
}
export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'Alleen GET toegestaan' }, 405);
  const url = new URL(request.url);
  const query = String(url.searchParams.get('q') || '').trim().slice(0, 80);
  if (query.length < MIN_QUERY) return json({ query, places: [], harbours: [] });
  const key = normalized(query);
  const found = cache.get(key);
  if (found && Date.now() - found.time < TTL) return json(found.value);
  try {
    let work = pending.get(key);
    if (!work) {
      work = lookup(query);
      pending.set(key, work);
    }
    const value = await work;
    cache.set(key, { value, time: Date.now() });
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return json(value);
  } catch (error) {
    return json({ error: 'Locaties zoeken tijdelijk niet beschikbaar', detail: String(error?.message || error).slice(0, 120) }, 503);
  } finally {
    pending.delete(key);
  }
}
