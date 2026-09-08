/* MijnSerenity 8.30.1 — compacte PWA-runtime voor één canonieke Start. */
const BUILD='8.30.1';
const BUILD_TOKEN='830100';
const CACHE_NAME=`mijnserenity-${BUILD}-core`;
const NETWORK_TIMEOUT_MS=9000;

const CORE_ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  `/auth-bootstrap.js?v=${BUILD_TOKEN}`,
  `/app.js?v=${BUILD_TOKEN}`,
  `/start-dashboard-71510.css?v=${BUILD_TOKEN}`,
  `/iphone-landscape-8301.css?v=${BUILD_TOKEN}`,
  `/start-dashboard-71510.js?v=${BUILD_TOKEN}`,
  `/dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`,
  `/runtime-stability-8202.js?v=${BUILD_TOKEN}`,
  '/icon-192.png','/icon-512.png','/favicon-64.png'
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
  let out=String(html||'');
  for(const base of LEGACY_VISUAL_FILES){
    out=out
      .replace(new RegExp(`<link[^>]+href=["'][^"']*${base}\\.css[^"']*["'][^>]*>\\s*`,'gi'),'')
      .replace(new RegExp(`<script[^>]+src=["'][^"']*${base}\\.js[^"']*["'][^>]*><\\/script>\\s*`,'gi'),'');
  }
  return out;
}

function ensureScript(html,src,needle){
  if(new RegExp(needle,'i').test(html))return html;
  return html.replace(/<\/body>/i,`<script src="${src}"></script>\n</body>`);
}

function ensureStyle(html,href,needle){
  if(new RegExp(needle,'i').test(html))return html;
  return html.replace(/<\/head>/i,`<link rel="stylesheet" href="${href}">\n</head>`);
}

function rewriteIndexHtml(html){
  let out=stripLegacyVisualTags(html)
    .replace(/(<meta\s+name=["']mijnserenity-build["']\s+content=["'])[^"']+(["']\s*\/?>)/i,`$1${BUILD}$2`)
    .replace(/window\.MIJSERENITY_BUILD\s*=\s*['"][^'"]+['"]\s*;/g,`window.MIJSERENITY_BUILD='${BUILD}';`)
    .replace(/auth-bootstrap\.js\?v=\d+/g,`auth-bootstrap.js?v=${BUILD_TOKEN}`)
    .replace(/app\.js\?v=\d+/g,`app.js?v=${BUILD_TOKEN}`)
    .replace(/start-dashboard-71510\.css\?v=\d+/g,`start-dashboard-71510.css?v=${BUILD_TOKEN}`)
    .replace(/start-dashboard-71510\.js\?v=\d+/g,`start-dashboard-71510.js?v=${BUILD_TOKEN}`)
    .replace(/dashboard-unified-71919-loader\.js\?v=\d+/g,`dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`)
    .replace(/runtime-stability-8202\.js\?v=\d+/g,`runtime-stability-8202.js?v=${BUILD_TOKEN}`);

  if(!/name=["']mijnserenity-build["']/i.test(out)){
    out=out.replace(/<head([^>]*)>/i,`<head$1>\n<meta name="mijnserenity-build" content="${BUILD}">`);
  }

  /* Ook vóór JavaScript mag de historische inline Start nooit zichtbaar worden. */
  if(!/id=["']ms8300InitialGuard["']/i.test(out)){
    out=out.replace(/<\/head>/i,`<style id="ms8300InitialGuard">#dashboard>:not(#ms8210Start){display:none!important;visibility:hidden!important;pointer-events:none!important}</style>\n</head>`);
  }

  out=ensureStyle(out,`/iphone-landscape-8301.css?v=${BUILD_TOKEN}`,'iphone-landscape-8301\\.css');
  out=ensureScript(out,`/dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`,'dashboard-unified-71919-loader\\.js');
  /* 8.29-releaseguard is vervangen door de canonieke runtime zelf. */
  out=out.replace(/<script[^>]+src=["'][^"']*release-guard-8290\.js[^"']*["'][^>]*><\/script>\s*/gi,'');
  return out;
}

async function asRewrittenHtml(response){
  if(!response)return null;
  try{
    const type=String(response.headers.get('content-type')||'');
    if(!type.includes('text/html'))return response;
    const body=rewriteIndexHtml(await response.text());
    const headers=new Headers(response.headers);
    headers.set('cache-control','no-store, max-age=0, must-revalidate');
    headers.set('x-mijnserenity-build',BUILD);
    return new Response(body,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function cacheAsset(cache,path){
  try{
    const response=await fetchWithTimeout(path,{cache:'reload'},18000);
    if(!response.ok)return;
    const stored=(path==='/'||path==='/index.html')?(await asRewrittenHtml(response.clone())):response;
    if(stored)await cache.put(path,stored);
  }catch(error){console.debug('Core asset niet vooraf opgeslagen:',path,error);}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE_ASSETS.map(path=>cacheAsset(cache,path)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();

    /* Eén cutover-navigatie voor iOS/PWA; daarna nooit meer release-loops. */
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(clients.map(async client=>{
      try{
        const url=new URL(client.url);
        if(url.origin!==self.location.origin||url.searchParams.get('ms-release')===BUILD_TOKEN)return;
        url.searchParams.set('ms-release',BUILD_TOKEN);
        await client.navigate(url.href);
      }catch{}
    }));
  })());
});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});

async function navigationNetworkFirst(request){
  try{
    const network=await fetchWithTimeout(request,{cache:'no-store'},11000);
    if(network.ok){
      const rewritten=await asRewrittenHtml(network);
      if(rewritten){
        const cache=await caches.open(CACHE_NAME);
        cache.put('/index.html',rewritten.clone()).catch(()=>{});
        cache.put('/',rewritten.clone()).catch(()=>{});
        return rewritten;
      }
    }
  }catch{}
  const cached=(await caches.match('/index.html'))||(await caches.match('/'));
  if(cached)return (await asRewrittenHtml(cached))||cached;
  return new Response('MijnSerenity kon niet worden geladen.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
}

async function networkFirst(request){
  try{
    const network=await fetchWithTimeout(request,{cache:'no-store'});
    if(network.ok){
      const cache=await caches.open(CACHE_NAME);
      cache.put(request,network.clone()).catch(()=>{});
      return network;
    }
  }catch{}
  return (await caches.match(request,{ignoreSearch:false}))||new Response('',{status:503});
}

async function staleWhileRevalidate(request){
  const cached=await caches.match(request,{ignoreSearch:false});
  const network=fetchWithTimeout(request,{cache:'no-cache'}).then(async response=>{
    if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone()).catch(()=>{});}
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

  if(request.mode==='navigate'){event.respondWith(navigationNetworkFirst(request));return;}
  if(url.pathname.startsWith('/.netlify/functions/')||url.pathname.startsWith('/api/'))return;

  if(/\.(?:js|css|json)$/i.test(url.pathname)){
    event.respondWith(networkFirst(request));return;
  }
  if(/\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname)){
    event.respondWith(staleWhileRevalidate(request));return;
  }
});