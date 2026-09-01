/* MijnSerenity 8.21.5 — eenvoudige Startpagina hard gekoppeld en cache vernieuwd */
const CACHE_NAME='mijnserenity-8.21.5-stable';
const BUILD='8.21.5';
const BUILD_TOKEN='821500';
const NETWORK_TIMEOUT_MS=8000;
const CORE_ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  `/auth-bootstrap.js?v=${BUILD_TOKEN}`,
  `/app.js?v=${BUILD_TOKEN}`,
  `/runtime-stability-8202.js?v=${BUILD_TOKEN}`,
  `/professional-ui-71700.css?v=${BUILD_TOKEN}`,
  `/marine-glass-mobile-7184.css?v=${BUILD_TOKEN}`,
  `/marine-glass-fixes-7193.css?v=${BUILD_TOKEN}`,
  `/dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`,
  `/dashboard-pro-71700.js?v=${BUILD_TOKEN}`,
  `/mobile-viewport-guard-71911.js?v=${BUILD_TOKEN}`,
  `/dashboard-live-values-fix-71914.js?v=${BUILD_TOKEN}`,
  `/dashboard-energy-bridge-8206.js?v=${BUILD_TOKEN}`,
  `/dashboard-cerbo-live-8208.js?v=${BUILD_TOKEN}`,
  `/victron-remote-console-8209.js?v=${BUILD_TOKEN}`,
  `/dashboard-collision-radar-8201.js?v=${BUILD_TOKEN}`,
  `/simple-start-8210.js?v=${BUILD_TOKEN}`,
  '/icon-192.png',
  '/icon-512.png'
];

function fetchWithTimeout(input,init={},timeoutMs=NETWORK_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(input,{...init,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

function rewriteIndexHtml(html){
  let rewritten=String(html||'')
    .replace(/(<meta\s+name=["']mijnserenity-build["']\s+content=["'])[^"']+(["']\s*\/?>)/i,`$1${BUILD}$2`)
    .replace(/window\.MIJSERENITY_BUILD\s*=\s*['"][^'"]+['"]\s*;/g,`window.MIJSERENITY_BUILD='${BUILD}';`)
    .replace(/auth-bootstrap\.js\?v=\d+/g,`auth-bootstrap.js?v=${BUILD_TOKEN}`)
    .replace(/dashboard-unified-71919-loader\.js\?v=\d+/g,`dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`)
    .replace(/simple-start-8210\.js\?v=\d+/g,`simple-start-8210.js?v=${BUILD_TOKEN}`)
    .replace(/(window\.MIJSERENITY_BUILD\|\|document\.querySelector\([^;]+\)\?\.content\|\|)['"][^'"]+['"]/g,`$1'${BUILD}'`);

  /* Fail-safe voor iOS/PWA: laad de eenvoudige Startpagina altijd rechtstreeks.
     De uniforme runtime probeert dit ook, maar deze koppeling voorkomt dat alleen
     de nieuwe ondernavigatie zichtbaar wordt terwijl de oude dashboardinhoud blijft staan. */
  if(!/simple-start-8210\.js/i.test(rewritten)){
    rewritten=rewritten.replace(/<\/body>/i,`<script src="/simple-start-8210.js?v=${BUILD_TOKEN}"></script>\n</body>`);
  }
  return rewritten;
}

async function rewrittenHtmlResponse(response){
  if(!response)return null;
  try{
    const type=String(response.headers.get('content-type')||'');
    if(!type.includes('text/html'))return response;
    const html=rewriteIndexHtml(await response.text());
    const headers=new Headers(response.headers);
    headers.set('cache-control','no-store, max-age=0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{
    return response;
  }
}

async function cacheCore(cache,path){
  try{
    const response=await fetchWithTimeout(path,{cache:'reload'},10000);
    if(!response.ok)return;
    if(path==='/'||path==='/index.html'){
      const rewritten=await rewrittenHtmlResponse(response.clone());
      if(rewritten)await cache.put(path,rewritten);
      return;
    }
    await cache.put(path,response);
  }catch(error){
    console.warn('Core asset niet vooraf opgeslagen:',path,error);
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
      keys.filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME).map(key=>caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function networkFirst(request,fallbackPath=null){
  let networkResponse=null;
  try{
    networkResponse=await fetchWithTimeout(request,{cache:'no-store'});
    if(networkResponse.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(request,networkResponse.clone()).catch(()=>{});
      if(fallbackPath)cache.put(fallbackPath,networkResponse.clone()).catch(()=>{});
      return networkResponse;
    }
  }catch{}

  const cached=(await caches.match(request,{ignoreSearch:false}))
    ||(fallbackPath?await caches.match(fallbackPath):null);
  if(cached)return cached;
  if(networkResponse)return networkResponse;
  return new Response('',{status:503});
}

async function navigationNetworkFirst(request){
  try{
    const network=await fetchWithTimeout(request,{cache:'no-store'},10000);
    if(network.ok){
      const rewritten=await rewrittenHtmlResponse(network);
      if(rewritten){
        const cache=await caches.open(CACHE_NAME);
        cache.put('/index.html',rewritten.clone()).catch(()=>{});
        return rewritten;
      }
    }
  }catch{}

  const cached=(await caches.match('/index.html'))||(await caches.match('/'));
  if(cached){
    const rewritten=await rewrittenHtmlResponse(cached);
    if(rewritten)return rewritten;
  }
  return new Response('MijnSerenity kon niet worden geladen.',{
    status:503,
    headers:{'content-type':'text/plain; charset=utf-8'}
  });
}

async function staleWhileRevalidate(request){
  const cached=await caches.match(request,{ignoreSearch:false});
  const network=fetchWithTimeout(request,{cache:'no-cache'}).then(async response=>{
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

  /* De officiële Victron GUI-v2 is een zelfstandige WebAssembly-app. Laat al
     haar HTML/JS/WASM/assets rechtstreeks door Netlify afhandelen. Anders zou
     de gewone MijnSerenity navigatiefallback haar index.html vervangen. */
  if(url.pathname.startsWith('/victron-gui/'))return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(request.mode==='navigate'){
    event.respondWith(navigationNetworkFirst(request));
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