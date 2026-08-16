/* MijnSerenity 7.17.0 — lichte service worker
   Geen scriptinjecties, geen complete app-shell van zware modules. */
const CACHE_NAME='mijnserenity-7.17.0-core';
const CORE_ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  '/auth-bootstrap.js?v=717000',
  '/professional-ui-71700.css?v=717000',
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
  })());
});

async function networkFirstNavigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put('/index.html',response.clone()).catch(()=>{});
    }
    return response;
  }catch(error){
    return (await caches.match('/index.html'))||
      new Response('MijnSerenity is offline. Controleer de verbinding en probeer opnieuw.',{
        status:503,
        headers:{'Content-Type':'text/plain; charset=utf-8'}
      });
  }
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
  return (await network)||new Response('',{status:503});
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

  event.respondWith(staleWhileRevalidate(request));
});
