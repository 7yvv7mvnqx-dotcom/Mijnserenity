const CACHE_NAME='mijnserenity-7.15.31-pro7';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=715140',
  '/auth-bootstrap.js?v=715310',
  '/update-prompt.js?v=715320',
  '/dashboard-pro-71531-loader.js?v=715320',
  '/dashboard-pro-71531.js?v=715320',
  '/dashboard-pro-71531.css?v=715320',
  '/entertainment-pro-802.js?v=715310',
  '/wind-direction-71512.css?v=715140',
  '/dashboard-visual-71523.css?v=715250',
  '/app.js?v=715140',
  '/ha-live-bridge.js?v=715140',
  '/technical-live-sync.js?v=715140',
  '/ruuvi-climate.js?v=715140',
  '/movement-presence.js?v=715140',
  '/navigation-compact.js?v=715140',
  '/captain-mode-800.css?v=800001',
  '/captain-mode-800.js?v=800001',
  '/captain-route-801.css?v=801001',
  '/captain-route-801.js?v=801001',
  '/wind-compass-fix-71527.js?v=715320',
  '/manifest.json?v=715140',
  '/mijnserenity-logo.png?v=715140'
];

async function cacheFile(cache,path){
  try{
    const response=await fetch(path,{cache:'reload'});
    if(response.ok)await cache.put(path,response);
  }catch(error){console.warn('Bestand niet vooraf gecachet:',path,error);}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(path=>cacheFile(cache,path)));
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

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});

function injectRuntimeExtras(html){
  const scripts=[];
  if(!html.includes('update-prompt.js'))scripts.push('<script src="/update-prompt.js?v=715320"></script>');
  if(!html.includes('entertainment-pro-802.js'))scripts.push('<script src="/entertainment-pro-802.js?v=715310"></script>');
  if(!html.includes('dashboard-pro-71531-loader.js'))scripts.push('<script src="/dashboard-pro-71531-loader.js?v=715320"></script>');
  if(!scripts.length)return html;
  const injection=scripts.join('');
  return html.includes('</body>')?html.replace('</body>',`${injection}</body>`):`${html}${injection}`;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(url.pathname==='/wind-direction-71512.css'){
    event.respondWith((async()=>{
      try{
        const [base,visual]=await Promise.all([
          fetch(request,{cache:'no-store'}),
          fetch('/dashboard-visual-71523.css?v=715250',{cache:'no-store'})
        ]);
        const css=`${base.ok?await base.text():''}\n${visual.ok?await visual.text():''}`;
        return new Response(css,{status:200,headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'}});
      }catch(error){return (await caches.match(request))||new Response('',{status:503});}
    })());
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(!response.ok)return response;
        const html=injectRuntimeExtras(await response.text());
        const result=new Response(html,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
        caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',result.clone()));
        return result;
      }catch(error){
        const cached=await caches.match('/index.html');
        if(cached){
          const html=injectRuntimeExtras(await cached.text());
          return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
        }
        return new Response('<h1>MijnSerenity is tijdelijk offline</h1><p>Open de app opnieuw zodra er verbinding is.</p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }

  event.respondWith(fetch(request,{cache:'no-cache'}).then(response=>{
    if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
    return response;
  }).catch(async()=>(await caches.match(request))||new Response('',{status:503,statusText:'Offline'})));
});
