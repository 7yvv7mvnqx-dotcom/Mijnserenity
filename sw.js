/* MijnSerenity 8.29.0 — opgeschoonde PWA-runtime zonder legacy dashboardinjecties. */
const BUILD='8.29.0';
const BUILD_TOKEN='829000';
const CACHE_NAME=`mijnserenity-${BUILD}-core1`;
const NETWORK_TIMEOUT_MS=9000;

/* Alleen de echte startkern vooraf opslaan. Zware pagina's laden pas bij gebruik. */
const CORE_ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  `/auth-bootstrap.js?v=${BUILD_TOKEN}`,
  `/app.js?v=${BUILD_TOKEN}`,
  `/dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`,
  `/simple-start-8210.js?v=${BUILD_TOKEN}`,
  `/start-dashboard-71510.js?v=${BUILD_TOKEN}`,
  `/release-guard-8290.js?v=${BUILD_TOKEN}`,
  `/runtime-stability-8202.js?v=${BUILD_TOKEN}`,
  `/professional-ui-71700.css?v=${BUILD_TOKEN}`,
  `/marine-glass-mobile-7184.css?v=${BUILD_TOKEN}`,
  `/marine-glass-fixes-7193.css?v=${BUILD_TOKEN}`,
  `/start-dashboard-71510.css?v=${BUILD_TOKEN}`,
  '/icon-192.png',
  '/icon-512.png'
];

const LEGACY_VISUAL_FILES=[
  'futuristic-analog-7140',
  'dashboard-analog-7141',
  'dashboard-premium-7143',
  'start-cockpit-7144'
];

function fetchWithTimeout(input,init={},timeoutMs=NETWORK_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(input,{...init,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

function stripLegacyVisualTags(html){
  let result=html;
  for(const base of LEGACY_VISUAL_FILES){
    result=result
      .replace(new RegExp(`<link[^>]+href=["'][^"']*${base}\\.css[^"']*["'][^>]*>\\s*`,'gi'),'')
      .replace(new RegExp(`<script[^>]+src=["'][^"']*${base}\\.js[^"']*["'][^>]*><\\/script>\\s*`,'gi'),'');
  }
  return result;
}

function rewriteIndexHtml(html){
  let out=stripLegacyVisualTags(String(html||''))
    .replace(/(<meta\s+name=["']mijnserenity-build["']\s+content=["'])[^"']+(["']\s*\/?>)/i,`$1${BUILD}$2`)
    .replace(/window\.MIJSERENITY_BUILD\s*=\s*['"][^'"]+['"]\s*;/g,`window.MIJSERENITY_BUILD='${BUILD}';`)
    .replace(/auth-bootstrap\.js\?v=\d+/g,`auth-bootstrap.js?v=${BUILD_TOKEN}`)
    .replace(/app\.js\?v=\d+/g,`app.js?v=${BUILD_TOKEN}`)
    .replace(/dashboard-unified-71919-loader\.js\?v=\d+/g,`dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`)
    .replace(/simple-start-8210\.js\?v=\d+/g,`simple-start-8210.js?v=${BUILD_TOKEN}`)
    .replace(/start-dashboard-71510\.js\?v=\d+/g,`start-dashboard-71510.js?v=${BUILD_TOKEN}`)
    .replace(/runtime-stability-8202\.js\?v=\d+/g,`runtime-stability-8202.js?v=${BUILD_TOKEN}`)
    .replace(/start-dashboard-71510\.css\?v=\d+/g,`start-dashboard-71510.css?v=${BUILD_TOKEN}`);

  if(!/name=["']mijnserenity-build["']/i.test(out)){
    out=out.replace(/<head([^>]*)>/i,`<head$1>\n<meta name="mijnserenity-build" content="${BUILD}">`);
  }

  if(!/id=["']ms8290InitialGuard["']/i.test(out)){
    out=out.replace(/<\/head>/i,`<style id="ms8290InitialGuard">#dashboard>#msMarineGlass,#dashboard>#msDashboardPremium7143,#dashboard>#msStartCockpit7144,#dashboard>#serenityIvms{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}</style>\n</head>`);
  }

  if(!/release-guard-8290\.js/i.test(out)){
    out=out.replace(/<\/body>/i,`<script src="/release-guard-8290.js?v=${BUILD_TOKEN}"></script>\n</body>`);
  }
  return out;
}

async function htmlResponse(response){
  if(!response)return null;
  try{
    const type=String(response.headers.get('content-type')||'');
    if(!type.includes('text/html'))return response;
    const body=rewriteIndexHtml(await response.text());
    const headers=new Headers(response.headers);
    headers.set('cache-control','no-store, max-age=0, must-revalidate');
    headers.set('x-mijnserenity-build',BUILD);
    return new Response(body,{status:response.status,statusText:response.statusText,headers});
  }catch{
    return response;
  }
}

async function cacheCore(cache,path){
  try{
    const response=await fetchWithTimeout(path,{cache:'reload'},18000);
    if(!response.ok)return;
    if(path==='/'||path==='/index.html'){
      const rewritten=await htmlResponse(response.clone());
      if(rewritten)await cache.put(path,rewritten);
    }else{
      await cache.put(path,response);
    }
  }catch(error){
    console.warn('MijnSerenity core-asset overgeslagen:',path,error);
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
    await Promise.all(keys.filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();

    /* Eén geforceerde navigatie bij deze release voorkomt dat iOS een oude
       standalone-PWA-snapshot (zoals 8.25.8 Marine Glass) blijft tonen. */
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(clients.map(async client=>{
      try{
        const url=new URL(client.url);
        if(url.origin!==self.location.origin)return;
        if(url.searchParams.get('ms-release')===BUILD_TOKEN)return;
        url.searchParams.set('ms-release',BUILD_TOKEN);
        await client.navigate(url.href);
      }catch{}
    }));
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function navigationNetworkFirst(request){
  try{
    const network=await fetchWithTimeout(request,{cache:'no-store'},11000);
    if(network.ok){
      const rewritten=await htmlResponse(network);
      if(rewritten){
        const cache=await caches.open(CACHE_NAME);
        cache.put('/index.html',rewritten.clone()).catch(()=>{});
        cache.put('/',rewritten.clone()).catch(()=>{});
        return rewritten;
      }
    }
  }catch{}
  const cached=(await caches.match('/index.html'))||(await caches.match('/'));
  if(cached)return (await htmlResponse(cached))||cached;
  return new Response('MijnSerenity kon niet worden geladen.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
}

async function networkFirst(request){
  let network=null;
  try{
    network=await fetchWithTimeout(request,{cache:'no-store'});
    if(network.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(request,network.clone()).catch(()=>{});
      return network;
    }
  }catch{}
  const cached=await caches.match(request,{ignoreSearch:false});
  return cached||network||new Response('',{status:503});
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
  if(cached){network.catch(()=>{});return cached}
  return (await network)||new Response('',{status:503});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/victron-gui/')||url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(request.mode==='navigate'){
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  const critical=new Set([
    '/auth-bootstrap.js','/dashboard-unified-71919-loader.js','/simple-start-8210.js',
    '/start-dashboard-71510.js','/release-guard-8290.js','/runtime-stability-8202.js',
    '/dashboard-pro-71700.js'
  ]);
  if(critical.has(url.pathname)){
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
