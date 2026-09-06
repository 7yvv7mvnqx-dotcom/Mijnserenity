/* MijnSerenity 8.25.6 — EuRIS/Rijkswaterstaat NtS verrijkt met positie */
const BASE='https://www.eurisportal.eu';
const COUNTRY='NL';
const CACHE_TTL=2*60*1000;
const UPSTREAM_TIMEOUT=9000;
const MAX_PAGES=6;
const cache=globalThis.__msEurisNtsCache||(globalThis.__msEurisNtsCache={at:0,payload:null});
const risCache=globalThis.__msEurisRisCache||(globalThis.__msEurisRisCache=new Map());

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'public, max-age=60, stale-while-revalidate=300',
      'x-content-type-options':'nosniff'
    }
  });
}

async function fetchJson(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),UPSTREAM_TIMEOUT);
  try{
    const response=await fetch(url,{
      signal:controller.signal,
      redirect:'follow',
      headers:{
        accept:'application/json',
        'accept-language':'nl-NL,nl;q=0.9,en;q=0.7',
        'user-agent':'MijnSerenity/8.25.6 (+EuRIS Notice to Skippers; eurisportal.eu)'
      }
    });
    if(!response.ok)throw Object.assign(new Error(`EuRIS gaf HTTP ${response.status}`),{status:response.status});
    return await response.json();
  }finally{
    clearTimeout(timer);
  }
}

function records(payload){
  if(Array.isArray(payload))return payload;
  if(!payload||typeof payload!=='object')return [];
  for(const key of ['items','value','results','data']){
    if(Array.isArray(payload[key]))return payload[key];
  }
  return [];
}

function nextLink(payload){
  if(!payload||typeof payload!=='object')return '';
  return String(payload.nextPageLink||payload['@odata.nextLink']||payload.nextLink||'').trim();
}

async function fetchPages(firstUrl,maxPages=MAX_PAGES){
  const all=[];
  let url=firstUrl;
  for(let page=0;page<maxPages&&url;page++){
    const payload=await fetchJson(url);
    all.push(...records(payload));
    const next=nextLink(payload);
    if(!next)break;
    url=new URL(next,BASE).toString();
  }
  return all;
}

function odata(value){return String(value).replaceAll("'","''")}
function ntsNumber(value){
  const match=String(value||'').match(/\b(\d{4}\/\d+\/\d+)\b/);
  return match?match[1]:'';
}
function organisationFromRef(value){
  const match=String(value||'').match(/\(([^()]+)\)\s*$/);
  return match?match[1].trim():'';
}
function languageValue(value,language='nl'){
  if(!value)return '';
  if(typeof value==='object'&&!Array.isArray(value))return String(value[language]||value.en||'').trim();
  if(typeof value!=='string')return '';
  try{
    const parsed=JSON.parse(value);
    if(parsed&&typeof parsed==='object')return String(parsed[language]||parsed.en||'').trim();
  }catch{}
  return '';
}
function limitationText(values=[]){
  const labels={
    NOSERV:'geen bediening',CAUTIO:'bijzondere voorzichtigheid / caution',OBSTRU:'obstructie',
    DELAY:'vertraging',CLEHEI:'doorvaarthoogte',CLSD:'gestremd / closed',BLOCK:'stremming / blockage',
    PAROBS:'gedeeltelijke obstructie',CONBRE:'beperkte breedte',CONDEP:'beperkte diepte',
    CONLEN:'beperkte lengte',CONHEI:'beperkte hoogte',NOLIM:'geen beperking'
  };
  return [...new Set((Array.isArray(values)?values:[]).map(v=>labels[String(v).toUpperCase()]||String(v)).filter(Boolean))].join(', ');
}
function dateOpenEnded(value){return String(value||'').startsWith('9999-12-31')?null:(value||null)}

function activeFilter(now){return `(dateEnd ge ${now} or dateEnd eq null) and countryCode eq '${COUNTRY}'`}
function ntsFilter(today){return `countryCode eq '${COUNTRY}' and dateEnd ge ${today}`}

async function loadEuRIS(){
  const today=`${new Date().toISOString().slice(0,10)}T00:00:00Z`;
  const now=new Date().toISOString();
  const ntsUrl=`${BASE}/api/v3/nts?$filter=${encodeURIComponent(ntsFilter(today))}&$orderby=${encodeURIComponent('dateIssue desc')}&$top=200`;
  const impactFilter=encodeURIComponent(activeFilter(now));
  const pointsUrl=`${BASE}/api/v3/route-impact/points?$filter=${impactFilter}&$top=200`;
  const linesUrl=`${BASE}/api/v3/route-impact/lines?$filter=${impactFilter}&$top=200`;
  const [notices,points,lines]=await Promise.all([
    fetchPages(ntsUrl),fetchPages(pointsUrl),fetchPages(linesUrl)
  ]);
  return {notices,impacts:[...points,...lines]};
}

function impactCodes(impact){
  return [...new Set([
    impact?.isrs,impact?.isrsStart,impact?.isrsEnd,impact?.startIsrs,impact?.endIsrs
  ].map(v=>String(v||'').trim()).filter(Boolean))];
}

async function resolveRisBatch(codes){
  const wanted=codes.filter(code=>!risCache.has(code));
  if(!wanted.length)return;
  const filter=wanted.map(code=>`isrs eq '${odata(code)}'`).join(' or ');
  const url=`${BASE}/visuris/api/RisIndices_v2/GetRISIndexObjects?$filter=${encodeURIComponent(filter)}&$top=${Math.max(50,wanted.length)}`;
  const items=await fetchPages(url,2);
  for(const item of items){
    const code=String(item?.isrs||item?.ISRS||'').trim();
    const lat=Number(item?.lat??item?.Lat??item?.latitude);
    const lon=Number(item?.lon??item?.Lon??item?.longitude);
    if(code&&Number.isFinite(lat)&&Number.isFinite(lon))risCache.set(code,{lat,lon,name:item?.nationalObjectName||item?.objectName||''});
  }
  for(const code of wanted){if(!risCache.has(code))risCache.set(code,null)}
}

async function resolveCoordinates(impacts){
  const codes=[...new Set(impacts.flatMap(impactCodes))];
  const batches=[];
  for(let i=0;i<codes.length;i+=18)batches.push(codes.slice(i,i+18));
  for(let i=0;i<batches.length;i+=4){
    await Promise.all(batches.slice(i,i+4).map(resolveRisBatch));
  }
  return risCache;
}

function midpoint(a,b){
  if(!a||!b)return null;
  return {lat:(a.lat+b.lat)/2,lon:(a.lon+b.lon)/2,name:'Vaarwegtraject'};
}
function uniqueLocations(values){
  const seen=new Set();
  const result=[];
  for(const item of values){
    if(!item||!Number.isFinite(Number(item.lat))||!Number.isFinite(Number(item.lon)))continue;
    const lat=Number(item.lat),lon=Number(item.lon);
    const key=`${lat.toFixed(5)},${lon.toFixed(5)}`;
    if(seen.has(key))continue;
    seen.add(key);
    result.push({lat,lon,name:item.name||''});
  }
  return result;
}

function buildImpactMap(impacts){
  const map=new Map();
  for(const impact of impacts){
    const number=ntsNumber(impact?.ntsNumber||impact?.number);
    if(!number)continue;
    const codes=impactCodes(impact);
    const coords=codes.map(code=>risCache.get(code)).filter(Boolean);
    if(coords.length>=2){const mid=midpoint(coords[0],coords[1]);if(mid)coords.push(mid)}
    const entry=map.get(number)||{locations:[],impacts:[]};
    entry.locations.push(...coords);
    entry.impacts.push(impact);
    map.set(number,entry);
  }
  for(const value of map.values())value.locations=uniqueLocations(value.locations);
  return map;
}

function enrichNotice(raw,impactEntry){
  const number=ntsNumber(raw?.number);
  const organisation=String(raw?.organisation||raw?.originator||'').trim();
  const dutchTitle=languageValue(raw?.multilanguageTitles,'nl')||String(raw?.title||'').trim()||'Actueel vaarwegbericht';
  const tooltip=languageValue(raw?.multilanguageTooltips,'nl');
  const fairways=Array.isArray(raw?.fairways)?raw.fairways.filter(Boolean):[];
  const limits=Array.isArray(raw?.limitations)?raw.limitations:[];
  const limitText=limitationText(limits);
  const description=dutchTitle;
  const title=number?`${number}${organisation?` (${organisation})`:''}`:dutchTitle;
  return {
    ...raw,
    title,
    description,
    message:[tooltip,limitText].filter(Boolean).join(' · '),
    limitationtext:limitText,
    dateEnd:dateOpenEnded(raw?.dateEnd),
    startdate:raw?.dateStart||null,
    enddate:dateOpenEnded(raw?.dateEnd),
    organisation:organisation||'Rijkswaterstaat',
    countryCode:raw?.countryCode||COUNTRY,
    fairways,
    source:'EuRIS / Rijkswaterstaat',
    locations:impactEntry?.locations||[]
  };
}

function syntheticNotice(number,entry){
  const impact=entry?.impacts?.[0]||{};
  const org=organisationFromRef(impact?.ntsNumber)||'Rijkswaterstaat';
  const waterway=String(impact?.waterwayName||'').trim();
  const subject=String(impact?.title||impact?.objectName||'Actueel vaarwegbericht').trim();
  return {
    number,
    title:`${number} (${org})`,
    description:[subject,waterway].filter(Boolean).join(' - '),
    message:String(impact?.type||''),
    organisation:org,
    countryCode:impact?.countryCode||COUNTRY,
    fairways:waterway?[waterway]:[],
    dateStart:impact?.dateStart||null,
    dateEnd:dateOpenEnded(impact?.dateEnd),
    startdate:impact?.dateStart||null,
    enddate:dateOpenEnded(impact?.dateEnd),
    source:'EuRIS / Rijkswaterstaat',
    locations:entry?.locations||[]
  };
}

async function buildPayload(){
  const {notices,impacts}=await loadEuRIS();
  await resolveCoordinates(impacts);
  const impactMap=buildImpactMap(impacts);
  const byNumber=new Map(notices.map(item=>[ntsNumber(item?.number),item]).filter(([number])=>number));
  const items=[];
  for(const [number,entry] of impactMap){
    if(!entry.locations.length)continue;
    const raw=byNumber.get(number);
    items.push(raw?enrichNotice(raw,entry):syntheticNotice(number,entry));
  }
  items.sort((a,b)=>String(b.dateIssue||b.dateStart||'').localeCompare(String(a.dateIssue||a.dateStart||'')));
  return {
    provider:'EuRIS Notice to Skippers',
    attribution:'API/Service NtS incorporated from EuRIS (eurisportal.eu)',
    country:COUNTRY,
    items,
    count:items.length,
    fetchedAt:new Date().toISOString()
  };
}

export default async request=>{
  if(request.method!=='GET')return json({error:{code:'method_not_allowed',message:'Alleen GET wordt ondersteund.'}},405);
  try{
    if(cache.payload&&Date.now()-cache.at<CACHE_TTL)return json(cache.payload);
    const payload=await buildPayload();
    cache.at=Date.now();
    cache.payload=payload;
    return json(payload);
  }catch(error){
    console.error('EuRIS NtS ophalen mislukt',error);
    if(cache.payload)return json({...cache.payload,stale:true,error:'Actuele EuRIS-update mislukte; laatst bekende gegevens getoond.'},200);
    return json({error:{code:'euris_nts_error',message:error?.message||'EuRIS-berichten konden niet worden opgehaald.'}},502);
  }
};
