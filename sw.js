/* MijnSerenity 7.18.33 — fail-safe shell met Marine Glass timingfix */
const CACHE_NAME='mijnserenity-7.18.33-marine-glass-ready';
const BUILD_TOKEN='718330';
const CORE_ASSETS=[
  '/manifest.json',
  '/auth-bootstrap.js?v=718330',
  '/membership-load-fix-71821.js?v=718330',
  '/dashboard-pro-71531-loader.js?v=718330',
  '/dashboard-pro-71700.js?v=718330',
  '/page-swipe.css?v=718330',
  '/page-swipe.js?v=718330',
  '/poi-bearing-71826.js?v=718330',
  '/marine-glass-start-fix-71801.js?v=718330',
  '/marine-glass-mobile-7184.css?v=718330',
  '/marine-glass-polish-7185.css?v=718330',
  '/marine-glass-polish-7185.js?v=718330',
  '/marine-glass-waterkaarten-route-7188.js?v=718330',
  '/energy-flow-fix-71819.js?v=718330',
  '/version-fix-71820.js?v=718330',
  '/professional-ui-71700.css?v=718330',
  '/navigation-compact.js?v=718330',
  '/ai-destination-search.css?v=718330',
  '/ai-destination-search.js?v=718330',
  '/cost-form-hotfix-71815.js?v=718330',
  '/waterkaarten-route-receiver-71870.js?v=718330',
  '/waterkaarten-route-enrichment-71811.js?v=718330',
  '/marine-map-route-fit-71812.js?v=718330',
  '/captain-ai-71814.js?v=718330',
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
      keys.filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME)
        .map(key=>caches.delete(key))
    );
    await self.clients.claim();

    /* Eenmalige 7.18.33-herlaadactie zodat een reeds geopend fallback-dashboard
       de nieuwe Marine Glass timingfix direct binnenhaalt. */
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(windows.map(async client=>{
      try{
        const url=new URL(client.url);
        if(url.origin!==self.location.origin)return;
        if(url.searchParams.get('msfix')===BUILD_TOKEN)return;
        url.searchParams.set('msfix',BUILD_TOKEN);
        await client.navigate(url.toString());
      }catch(error){
        console.warn('Eenmalige PWA-herlaadactie mislukt:',error);
      }
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
    url.pathname==='/page-swipe.css'||
    url.pathname==='/page-swipe.js'||
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
