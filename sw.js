/* MijnSerenity 8.31.1 — eenvoudige, voorspelbare PWA-cache.
   Geen HTML-mutaties, geen geforceerde client-reloads en geen oude dashboard-cacheketen. */
const BUILD='8.31.1';
const TOKEN='831100';
const CACHE_NAME=`mijnserenity-${BUILD}-core`;
const NAV_TIMEOUT_MS=3500;
const CORE_ASSETS=[
  '/','/index.html','/manifest.json',
  `/auth-bootstrap.js?v=${TOKEN}`,
  `/start-dashboard-core-8311.js?v=${TOKEN}`,
  `/serenity-theme-8311.js?v=${TOKEN}`,
  `/serenity-theme-8311.css?v=${TOKEN}`,
  `/dashboard-unified-71919-loader.js?v=${TOKEN}`,
  `/app.js?v=${TOKEN}`,
  `/mission-control.js?v=${TOKEN}`,
  `/route-control.js?v=${TOKEN}`,
  `/easy-auto.js?v=${TOKEN}`,
  `/assets/serenity-hero-8274.jpg?v=${TOKEN}`,
  `/assets/serenity-home-hero-8266.jpg?v=${TOKEN}`,
  '/icon-192.png','/icon-512.png','/favicon-64.png'
];

function timeoutFetch(request,timeoutMs=NAV_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(request,{signal:controller.signal,cache:'no-store'}).finally(()=>clearTimeout(timer));
}
async function putSafe(cache,key,response){
  try{if(response?.ok&&response.type!=='opaque')await cache.put(key,response.clone())}catch{}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(async asset=>{
      const response=await fetch(asset,{cache:'reload'});
      if(response.ok)await cache.put(asset,response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('mijnserenity-')&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function navigationResponse(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await timeoutFetch(request);
    if(response.ok)await putSafe(cache,'/index.html',response);
    return response;
  }catch{
    return (await cache.match('/index.html'))||(await cache.match('/'))||new Response('MijnSerenity is offline niet beschikbaar.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
}
async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok)await putSafe(cache,request,response);
    return response;
  }catch{
    return (await cache.match(request))||Response.error();
  }
}
async function cacheFirst(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok)await putSafe(cache,request,response);
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;
  if(request.mode==='navigate'){
    event.respondWith(navigationResponse(request));
    return;
  }
  if(/\.(?:js|css)$/i.test(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }
  if(/\.(?:png|jpe?g|gif|webp|svg|ico|woff2?)$/i.test(url.pathname)){
    event.respondWith(cacheFirst(request));
  }
});