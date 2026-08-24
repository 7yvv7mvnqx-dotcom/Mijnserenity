/* MijnSerenity 7.18.25 — sessieherstel en Marine Glass cache */
const CACHE_NAME='mijnserenity-7.18.25-marine-glass';
const BUILD_VERSION='718250';
const ESSENTIAL=[
  '/index.html',
  `/auth-bootstrap.js?v=${BUILD_VERSION}`,
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

function fetchWithTimeout(request,timeout=5500,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  return fetch(request,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

async function safePut(cache,key,response){
  try{if(response?.ok)await cache.put(key,response.clone());}catch{}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(ESSENTIAL.map(async path=>{
      try{
        const response=await fetchWithTimeout(path,5000,{cache:'reload'});
        await safePut(cache,path,response);
      }catch{}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function cachedFallback(request,fallback=null){
  return (await caches.match(request,{ignoreSearch:true})) ||
    (fallback?await caches.match(fallback,{ignoreSearch:true}):null) || null;
}

async function networkFirst(request,{fallback=null,timeout=5500}={}){
  try{
    const response=await fetchWithTimeout(request,timeout,{cache:'no-store'});
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      safePut(cache,request,response);
      if(fallback)safePut(cache,fallback,response);
    }
    return response;
  }catch{
    return (await cachedFallback(request,fallback)) || new Response('',{status:503});
  }
}

async function staleWhileRevalidate(request){
  const cached=await cachedFallback(request);
  const network=fetchWithTimeout(request,5500,{cache:'no-cache'}).then(async response=>{
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      safePut(cache,request,response);
    }
    return response;
  }).catch(()=>null);
  if(cached){network.catch(()=>{});return cached;}
  return (await network)||new Response('',{status:503});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,{fallback:'/index.html',timeout:6000}).then(response=>{
      if(response.status!==503)return response;
      return new Response('MijnSerenity is offline. Controleer de verbinding en probeer opnieuw.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }));
    return;
  }

  if(url.pathname==='/auth-bootstrap.js'){
    event.respondWith(networkFirst(request,{fallback:`/auth-bootstrap.js?v=${BUILD_VERSION}`,timeout:5000}));
    return;
  }

  if(url.pathname==='/index.html'||url.pathname==='/sw.js'||url.pathname.endsWith('.js')||url.pathname.endsWith('.css')){
    event.respondWith(networkFirst(request,{timeout:5500}));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
