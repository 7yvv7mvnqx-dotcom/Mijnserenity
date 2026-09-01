const API_BASE='https://api.vesselapi.com/v1';
const CACHE_MAX=120;
const UPSTREAM_TIMEOUT_MS=9000;
const cache=globalThis.__mijnSerenityCollisionAisCache||(globalThis.__mijnSerenityCollisionAisCache=new Map());

const AIS_ENV_KEYS=['VESSELAPI_KEY','VESSELF_API_KEY','VESSEL_API_KEY'];

function apiKey(){
  for(const name of AIS_ENV_KEYS){
    try{
      const value=globalThis.Netlify?.env?.get?.(name);
      if(value)return value;
    }catch{}
  }
  for(const name of AIS_ENV_KEYS){
    const value=process.env[name];
    if(value)return value;
  }
  return '';
}

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      ...headers
    }
  });
}

function numberParam(params,name,min,max,fallback=null){
  const raw=params.get(name);
  const value=raw===null||raw===''?fallback:Number(raw);
  if(!Number.isFinite(value)||value<min||value>max){
    const error=new Error(`${name} moet tussen ${min} en ${max} liggen.`);
    error.status=400;
    error.code='invalid_parameter';
    throw error;
  }
  return value;
}

function stableCacheKey(path,params){
  const stable=new URLSearchParams(params);
  stable.delete('time.from');
  stable.delete('time.to');
  stable.sort();
  return `${path}?${stable.toString()}`;
}

function pruneCache(now=Date.now(),ttlMs=20000){
  for(const [key,item] of cache){
    if(!item||now-item.at>Math.max(ttlMs*4,120000))cache.delete(key);
  }
  while(cache.size>CACHE_MAX){
    const oldest=cache.keys().next().value;
    if(oldest===undefined)break;
    cache.delete(oldest);
  }
}

async function fetchWithTimeout(url,options={},timeoutMs=UPSTREAM_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{...options,signal:controller.signal});
  }catch(error){
    if(error?.name==='AbortError'){
      const timeout=new Error('AIS-databron reageert te langzaam.');
      timeout.status=504;
      timeout.code='upstream_timeout';
      throw timeout;
    }
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

async function vesselRequest(path,params,ttlMs=25000){
  const key=apiKey();
  if(!key){
    const error=new Error('AIS-databron is nog niet ingesteld.');
    error.status=503;
    error.code='ais_not_configured';
    throw error;
  }

  const now=Date.now();
  pruneCache(now,ttlMs);
  const cacheKey=stableCacheKey(path,params);
  const cached=cache.get(cacheKey);
  if(cached&&now-cached.at<ttlMs)return {...cached.value,cached:true};

  const response=await fetchWithTimeout(`${API_BASE}${path}?${params.toString()}`,{
    headers:{
      accept:'application/json',
      authorization:`Bearer ${key}`,
      'user-agent':'MijnSerenity/8.20.3'
    }
  });

  let payload={};
  try{payload=await response.json()}catch{}

  if(!response.ok){
    const error=new Error(payload?.error?.message||payload?.message||`AIS-databron gaf fout ${response.status}`);
    error.status=response.status;
    error.code=payload?.error?.code||payload?.code||'upstream_error';
    error.requestId=response.headers.get('x-request-id');
    error.retryAfter=response.headers.get('retry-after');
    throw error;
  }

  const value={
    data:payload,
    fetchedAt:new Date().toISOString(),
    requestId:response.headers.get('x-request-id'),
    remaining:response.headers.get('x-ratelimit-remaining')
  };
  cache.delete(cacheKey);
  cache.set(cacheKey,{at:Date.now(),value});
  pruneCache(Date.now(),ttlMs);
  return value;
}

export default async request=>{
  if(request.method!=='GET'){
    return json({error:{code:'method_not_allowed',message:'Alleen GET wordt ondersteund.'}},405,{allow:'GET'});
  }

  const url=new URL(request.url);
  const mode=String(url.searchParams.get('mode')||'status').toLowerCase();

  try{
    if(mode==='status'){
      return json({configured:Boolean(apiKey()),provider:'VesselAPI',proxy:true,collisionRadar:'8.20.3'});
    }

    if(mode==='nearby'){
      const lat=numberParam(url.searchParams,'lat',-90,90);
      const lon=numberParam(url.searchParams,'lon',-180,180);
      const radiusKm=numberParam(url.searchParams,'radiusKm',1,100,3);
      const limit=Math.round(numberParam(url.searchParams,'limit',1,50,50));
      const now=new Date();
      const from=new Date(now.getTime()-45*60*1000);

      const params=new URLSearchParams({
        'filter.latitude':String(lat),
        'filter.longitude':String(lon),
        'filter.radius':String(Math.round(radiusKm*1000)),
        'time.from':from.toISOString(),
        'time.to':now.toISOString(),
        'pagination.limit':String(limit)
      });

      const result=await vesselRequest('/location/vessels/radius',params,25000);
      if(Array.isArray(result?.data?.vessels)){
        result.data.vessels=result.data.vessels.map(vessel=>({
          ...vessel,
          vesselName:vessel?.vesselName||vessel?.vessel_name||''
        }));
      }
      return json(result);
    }

    return json({error:{code:'invalid_mode',message:'Onbekende AIS-opdracht.'}},400);
  }catch(error){
    const headers={};
    if(error?.retryAfter)headers['retry-after']=String(error.retryAfter);
    return json({
      error:{
        code:error?.code||'ais_error',
        message:error?.message||'AIS-service kon niet worden uitgevoerd.',
        requestId:error?.requestId||null
      }
    },Number(error?.status)||500,headers);
  }
};