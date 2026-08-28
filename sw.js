/* MijnSerenity 7.19.1 — eenvoudige PWA-cache zonder navigatie- of update-loop */
const CACHE_NAME='mijnserenity-7.19.1-stable';
const BUILD_TOKEN='719010';
const CORE_ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  '/auth-bootstrap.js?v=718130',
  `/auth-bootstrap.js?v=${BUILD_TOKEN}`,
  `/app.js?v=${BUILD_TOKEN}`,
  `/professional-ui-71700.css?v=${BUILD_TOKEN}`,
  `/marine-glass-mobile-7184.css?v=${BUILD_TOKEN}`,
  `/dashboard-pro-71531-loader.js?v=${BUILD_TOKEN}`,
  `/dashboard-pro-71700.js?v=${BUILD_TOKEN}`,
  '/icon-192.png',
  '/icon-512.png'
];

async function cacheCore(cache,path){
  try{
    const response=await fetch(path,{cache:'reload'});
    if(response.ok)await cache.put(path,response);
  }catch(error){console.warn('Core asset niet vooraf opgeslagen:',path,error)}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE_ASSETS.map(path=>cacheCore(cache,path)));
    /* Bewust niet automatisch skipWaiting: app.js toont één updateknop. */
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

async function networkFirst(request,fallbackPath=null){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(request,response.clone()).catch(()=>{});
      if(fallbackPath)cache.put(fallbackPath,response.clone()).catch(()=>{});
    }
    return response;
  }catch{
    return (await caches.match(request,{ignoreSearch:false}))||
      (fallbackPath?await caches.match(fallbackPath):null)||
      new Response('',{status:503});
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
  if(cached){network.catch(()=>{});return cached}
  return (await network)||new Response('',{status:503});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,'/index.html'));
    return;
  }
  if(url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname==='/manifest.json'){
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

function pushPayload(event){
  if(!event.data)return {};
  try{return event.data.json()||{}}catch{}
  try{return {body:event.data.text()}}catch{return {}}
}

self.addEventListener('push',event=>{
  const payload=pushPayload(event);
  const level=String(payload.level||'warning').toLowerCase()==='critical'?'critical':'warning';
  const title=String(payload.title||(level==='critical'?'🚨 SERENITY ALARM':'⚠️ Serenity waarschuwing'));
  const body=String(payload.body||payload.text||'Controleer MijnSerenity.');
  const url=String(payload.url||'/?alarm=1');
  event.waitUntil(self.registration.showNotification(title,{
    body,icon:'/icon-192.png',badge:'/favicon-64.png',
    tag:String(payload.tag||`serenity-${level}-alarm`),renotify:true,
    requireInteraction:level==='critical',silent:false,
    vibrate:level==='critical'?[300,120,300,120,500]:[180,80,180],
    data:{...payload,url,level}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(String(event.notification?.data?.url||'/?alarm=1'),self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        if('navigate' in client)await client.navigate(target);
        client.postMessage({type:'mijnserenity-open-alarm',data:event.notification?.data||{}});
        if('focus' in client)return client.focus();
      }catch{}
    }
    return self.clients.openWindow?self.clients.openWindow(target):null;
  })());
});
