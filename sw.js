/* MijnSerenity 8.30.4 — PWA-runtime met één canonieke Start en schone cache. */
const BUILD='8.30.4';
const BUILD_TOKEN='830400';
const CACHE_NAME=`mijnserenity-${BUILD}-clean2-core`;
const NETWORK_TIMEOUT_MS=5000;

const CORE_ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  `/auth-bootstrap.js?v=${BUILD_TOKEN}`,
  `/app.js?v=${BUILD_TOKEN}`,
  `/start-dashboard-71510.css?v=${BUILD_TOKEN}`,
  `/iphone-landscape-8301.css?v=${BUILD_TOKEN}`,
  `/start-dashboard-core-8300.js?v=${BUILD_TOKEN}`,
  `/start-dashboard-71510.js?v=${BUILD_TOKEN}`,
  `/dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`,
  `/runtime-stability-8202.js?v=${BUILD_TOKEN}`,
  `/rws-compat-8233.js?v=823300`,
  `/assets/serenity-hero-8274.jpg?v=${BUILD_TOKEN}`,
  `/assets/serenity-home-hero-8266.jpg?v=${BUILD_TOKEN}`,
  '/icon-192.png','/icon-512.png','/favicon-64.png'
];

const LEGACY_VISUAL_FILES=['futuristic-analog-7140','dashboard-analog-7141','dashboard-premium-7143','start-cockpit-7144'];
const LEGACY_STYLE_FILES=['dashboard-analog-7141','dashboard-premium-7143','start-cockpit-7144','serenity-ivms'];
const VISUAL_ROOT_IDS=new Set(['dashboard','msLegacyTelemetryBridge','ms8210Start','ms71510Dashboard','serenityIvms','msDashboardAnalog7141','msDashboardPremium7143','msStartCockpit7144','msWelcomeCard7140','msWelcomeCard7137']);

function fetchWithTimeout(input,init={},timeoutMs=NETWORK_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(input,{...init,signal:controller.signal}).finally(()=>clearTimeout(timer));
}

function stripLegacyVisualTags(html){
  let out=String(html||'');
  for(const base of LEGACY_VISUAL_FILES){
    out=out.replace(new RegExp(`<script[^>]+src=["'][^"']*${base}\\.js[^"']*["'][^>]*><\\/script>\\s*`,'gi'),'');
  }
  for(const base of LEGACY_STYLE_FILES){
    out=out.replace(new RegExp(`<link[^>]+href=["'][^"']*${base}\\.css[^"']*["'][^>]*>\\s*`,'gi'),'');
  }
  return out;
}

function dashboardRange(html){
  const source=String(html||'');
  const startRe=/<section\b[^>]*\bid=["']dashboard["'][^>]*>/i;
  const match=startRe.exec(source);
  if(!match)return null;
  const start=match.index,openEnd=start+match[0].length;
  const tokenRe=/<section\b[^>]*>|<\/section\s*>/gi;
  tokenRe.lastIndex=start;
  let depth=0,token;
  while((token=tokenRe.exec(source))){
    if(/^<section\b/i.test(token[0]))depth+=1;else depth-=1;
    if(depth===0)return {start,openEnd,closeStart:token.index,end:tokenRe.lastIndex,openTag:match[0],inner:source.slice(openEnd,token.index)};
  }
  return null;
}

function telemetryBridgeFrom(sourceHtml){
  const entries=[],seen=new Set();
  const tagRe=/<([a-z][a-z0-9-]*)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
  let match;
  while((match=tagRe.exec(sourceHtml))){
    const tag=match[1].toLowerCase(),id=match[2];
    if(VISUAL_ROOT_IDS.has(id)||seen.has(id))continue;
    seen.add(id);entries.push({tag,id});
  }
  const voidTags=new Set(['img','input','br','hr','meta','link','source','area','base','col','embed','param','track','wbr']);
  const nodes=entries.map(({tag,id})=>voidTags.has(tag)?`<${tag} id="${id}">`:`<${tag} id="${id}"></${tag}>`).join('');
  return `<div id="msLegacyTelemetryBridge" hidden aria-hidden="true" data-purpose="telemetry-compat">${nodes}</div>`;
}

function compactDashboard(html){
  const source=String(html||'');
  const range=dashboardRange(source);
  if(!range)return source;
  const bridge=telemetryBridgeFrom(range.inner);
  return source.slice(0,range.start)+`${range.openTag}\n${bridge}\n</section>`+source.slice(range.end);
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
  let out=compactDashboard(stripLegacyVisualTags(html))
    .replace(/(<meta\s+name=["']mijnserenity-build["']\s+content=["'])[^"']+(["']\s*\/?>)/i,`$1${BUILD}$2`)
    .replace(/window\.MIJSERENITY_BUILD\s*=\s*['"][^'"]+['"]\s*;/g,`window.MIJSERENITY_BUILD='${BUILD}';`)
    .replace(/auth-bootstrap\.js\?v=\d+/g,`auth-bootstrap.js?v=${BUILD_TOKEN}`)
    .replace(/app\.js\?v=\d+/g,`app.js?v=${BUILD_TOKEN}`)
    .replace(/start-dashboard-71510\.css\?v=\d+/g,`start-dashboard-71510.css?v=${BUILD_TOKEN}`)
    .replace(/start-dashboard-71510\.js\?v=\d+/g,`start-dashboard-71510.js?v=${BUILD_TOKEN}`)
    .replace(/dashboard-unified-71919-loader\.js\?v=\d+/g,`dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`)
    .replace(/runtime-stability-8202\.js\?v=\d+/g,`runtime-stability-8202.js?v=${BUILD_TOKEN}`);

  if(!/name=["']mijnserenity-build["']/i.test(out))out=out.replace(/<head([^>]*)>/i,`<head$1>\n<meta name="mijnserenity-build" content="${BUILD}">`);
  if(!/id=["']ms8304InitialGuard["']/i.test(out)){
    out=out.replace(/<\/head>/i,`<style id="ms8304InitialGuard">#dashboard>:not(#ms8210Start):not(#msLegacyTelemetryBridge){display:none!important;visibility:hidden!important;pointer-events:none!important}#msLegacyTelemetryBridge{display:none!important}body:not(.ms8300-start-page):not(.ms8300-sub-page) .bottom-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}</style>\n</head>`);
  }
  out=ensureStyle(out,`/iphone-landscape-8301.css?v=${BUILD_TOKEN}`,'iphone-landscape-8301\\.css');
  out=ensureScript(out,`/rws-compat-8233.js?v=823300`,'rws-compat-8233\\.js');
  out=ensureScript(out,`/dashboard-unified-71919-loader.js?v=${BUILD_TOKEN}`,'dashboard-unified-71919-loader\\.js');
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
    const response=await fetchWithTimeout(path,{cache:'reload'},10000);
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
    const network=await fetchWithTimeout(request,{cache:'no-store'},4000);
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
  if(/\.(?:js|css|json)$/i.test(url.pathname)){event.respondWith(networkFirst(request));return;}
  if(/\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname)){event.respondWith(staleWhileRevalidate(request));return;}
});