/* MijnSerenity 7.18.28 — service worker + achtergrondalarmen */
const CACHE_NAME='mijnserenity-7.18.28-serenity-control';
const CORE_ASSETS=['/','/index.html','/manifest.json','/auth-bootstrap.js?v=718280','/waterkaarten-route-receiver-71870.js?v=718280','/waterkaarten-route-enrichment-71811.js?v=718280','/marine-map-route-fit-71812.js?v=718280','/professional-ui-71700.css?v=718280','/dashboard-pro-71531-loader.js?v=718280','/dashboard-pro-71700.js?v=718280','/start-battery-soc-71822.js?v=718280','/tank-systems-climate-71823.js?v=718280','/dashboard-ais-map-71824.js?v=718280','/marine-glass-start-fix-71801.js?v=718280','/marine-glass-mobile-7184.css?v=718280','/marine-glass-polish-7185.css?v=718280','/marine-glass-polish-7185.js?v=718280','/marine-glass-waterkaarten-route-7188.js?v=718280','/cerbo-truth-71818.js?v=718280','/serenity-control-dashboard.css?v=718140c2','/serenity-control-dashboard.js?v=718140c2','/navigation-compact.css?v=718280','/navigation-compact.js?v=718280','/ai-destination-search.css?v=718280','/ai-destination-search.js?v=718280','/captain-ai-71814.js?v=718280','/serenity-alarm-notifications-71826.js?v=718280','/serenity-background-push-71827.js?v=718280','/logbook-route-assist-71828.js?v=718280','/icon-192.png','/icon-512.png'];

async function cacheCore(cache,path){
  try{
    const response=await fetch(path,{cache:'reload'});
    if(response.ok)await cache.put(path,response);
  }catch(error){console.warn('Core asset niet vooraf opgeslagen:',path)}
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
    await Promise.all(keys.filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
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
    const cached=(await caches.match(request,{ignoreSearch:false}))||(fallbackPath?await caches.match(fallbackPath):null);
    return cached||new Response('',{status:503});
  }
}

async function networkFirstNavigation(request){
  const response=await networkFirst(request,'/index.html');
  if(response.status!==503)return response;
  return new Response('MijnSerenity is offline. Controleer de verbinding en probeer opnieuw.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
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
  return(await network)||new Response('',{status:503});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;
  if(request.mode==='navigate'){event.respondWith(networkFirstNavigation(request));return}
  if(url.pathname.endsWith('.js')||url.pathname.endsWith('.css')){event.respondWith(networkFirst(request));return}
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
    body,
    icon:'/icon-192.png',
    badge:'/favicon-64.png',
    tag:String(payload.tag||`serenity-${level}-alarm`),
    renotify:true,
    requireInteraction:level==='critical',
    silent:false,
    vibrate:level==='critical'?[300,120,300,120,500]:[180,80,180],
    data:{...payload,url,level}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const requested=String(event.notification?.data?.url||'/?alarm=1');
  const target=new URL(requested,self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        if('navigate' in client)await client.navigate(target);
        client.postMessage({type:'mijnserenity-open-alarm',data:event.notification?.data||{}});
        if('focus' in client)return client.focus();
      }catch{}
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
    return null;
  })());
});
