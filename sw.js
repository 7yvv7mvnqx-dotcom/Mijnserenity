/* MijnSerenity 8.31.0 — eenvoudige PWA-cache zonder HTML-rewrites of oude dashboardlagen. */
const BUILD='8.31.0';
const TOKEN='831000';
const CACHE=`mijnserenity-${BUILD}`;
const CORE=[
  '/',
  '/index.html',
  '/manifest.json',
  `/auth-bootstrap.js?v=${TOKEN}`,
  `/app.js?v=${TOKEN}`,
  `/start-dashboard-71510.css?v=${TOKEN}`,
  `/start-dashboard-core.js?v=${TOKEN}`,
  `/runtime-stability-8202.js?v=${TOKEN}`,
  `/assets/serenity-hero-8274.jpg?v=${TOKEN}`,
  '/icon-192.png','/icon-512.png','/favicon-64.png'
];

async function fetchTimeout(request,options={},ms=5000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(request,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}
async function put(cache,key,response){if(response?.ok)await cache.put(key,response.clone())}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(CORE.map(async asset=>{
      try{const response=await fetchTimeout(asset,{cache:'reload'},9000);await put(cache,asset,response)}catch{}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('mijnserenity-')&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});

async function navigation(request){
  try{
    const response=await fetchTimeout(request,{cache:'no-store'},4500);
    if(response.ok){const cache=await caches.open(CACHE);await put(cache,'/index.html',response);return response}
  }catch{}
  return (await caches.match('/index.html'))||(await caches.match('/'))||new Response('MijnSerenity is offline en heeft nog geen lokale versie.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
}
async function networkFirst(request){
  try{
    const response=await fetchTimeout(request,{cache:'no-cache'},6000);
    if(response.ok){const cache=await caches.open(CACHE);await put(cache,request,response);return response}
  }catch{}
  return (await caches.match(request,{ignoreSearch:false}))||new Response('',{status:503});
}
async function imageCache(request){
  const cached=await caches.match(request,{ignoreSearch:false});
  if(cached)return cached;
  try{const response=await fetchTimeout(request,{cache:'default'},8000);if(response.ok){const cache=await caches.open(CACHE);await put(cache,request,response)}return response}catch{return new Response('',{status:503})}
}

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){event.respondWith(navigation(request));return}
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;
  if(/\.(?:js|css|json)$/i.test(url.pathname)){event.respondWith(networkFirst(request));return}
  if(/\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname)){event.respondWith(imageCache(request));return}
});