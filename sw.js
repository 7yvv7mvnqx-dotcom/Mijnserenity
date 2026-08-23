/* MijnSerenity 7.18.23 — frisse shell, kritieke cockpit en netwerkherstel */
const CACHE_NAME='mijnserenity-7.18.23-fresh-shell';
const CORE_ASSETS=[
  '/manifest.json',
  '/auth-bootstrap.js?v=718230',
  '/membership-load-fix-71821.js?v=718230',
  '/dashboard-pro-71531-loader.js?v=718230',
  '/dashboard-pro-71700.js?v=718230',
  '/marine-glass-start-fix-71801.js?v=718230',
  '/marine-glass-mobile-7184.css?v=718230',
  '/marine-glass-polish-7185.css?v=718230',
  '/marine-glass-polish-7185.js?v=718230',
  '/marine-glass-waterkaarten-route-7188.js?v=718230',
  '/energy-flow-fix-71819.js?v=718230',
  '/version-fix-71820.js?v=718230',
  '/professional-ui-71700.css?v=718230',
  '/navigation-compact.js?v=718230',
  '/ai-destination-search.css?v=718230',
  '/ai-destination-search.js?v=718230',
  '/cost-form-hotfix-71815.js?v=718230',
  '/waterkaarten-route-receiver-71870.js?v=718230',
  '/waterkaarten-route-enrichment-71811.js?v=718230',
  '/marine-map-route-fit-71812.js?v=718230',
  '/captain-ai-71814.js?v=718230',
  '/icon-192.png',
  '/icon-512.png'
];

async function cacheCore(cache,path){
  try{
    const response=await fetch(path,{cache:'reload'});
    if(response.ok)await cache.put(path,response);
  }catch(error){
    console.warn('Core asset niet vooraf opgeslagen:',path);
  }
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE_ASSETS.map(path=>cacheCore(cache,path)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME)
        .map(key=>caches.delete(key))
    );
    await self.clients.claim();

    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(windows.map(async client=>{
      try{await client.navigate(client.url)}catch{}
    }));
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function networkFirst(request,fallbackPath=null){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(request,response.clone()).catch(()=>{});
      if(fallbackPath)cache.put(fallbackPath,response.clone()).catch(()=>{});
    }
    return response;
  }catch(error){
    const cached=(await caches.match(request,{ignoreSearch:false}))||
      (fallbackPath?await caches.match(fallbackPath):null);
    return cached||new Response('',{status:503});
  }
}

async function networkFirstNavigation(request){
  const response=await networkFirst(request,'/index.html');
  if(response.status!==503)return response;
  return new Response(
    'MijnSerenity is offline. Controleer de verbinding en probeer opnieuw.',
    {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}
  );
}

async function staleWhileRevalidate(request){
  const cached=await caches.match(request,{ignoreSearch:false});
  const network=fetch(request,{cache:'no-cache'}).then(async response=>{
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(request,response.clone()).catch(()=>{});
    }
    return response;
  }).catch(()=>null);

  if(cached){
    network.catch(()=>{});
    return cached;
  }
  return(await network)||new Response('',{status:503});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(request.mode==='navigate'){
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if(
    url.pathname==='/index.html'||
    url.pathname==='/auth-bootstrap.js'||
    url.pathname==='/membership-load-fix-71821.js'||
    url.pathname==='/dashboard-pro-71531-loader.js'||
    url.pathname==='/dashboard-pro-71700.js'||
    url.pathname==='/version-fix-71820.js'||
    url.pathname==='/sw.js'
  ){
    event.respondWith(networkFirst(request));
    return;
  }

  if(url.pathname.endsWith('.js')||url.pathname.endsWith('.css')){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
