const CACHE_NAME='mijnserenity-7.15.31-pro2';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=715140',
  '/ha-live-bridge.css?v=715140',
  '/live-cameras.css?v=715140',
  '/mission-control.css?v=715140',
  '/easy-auto.css?v=715140',
  '/auto-track-reliability.css?v=715140',
  '/gps-continuity-guard.css?v=715140',
  '/waterkaarten-split-launch.css?v=715140',
  '/live-split.css?v=715140',
  '/route-control.css?v=715140',
  '/page-swipe.css?v=715140',
  '/weather-page.css?v=715140',
  '/weather-radar.css?v=715140',
  '/rws-nearby.css?v=715140',
  '/ais-page.css?v=715140',
  '/entertainment-page.css?v=715140',
  '/navigation-compact.css?v=715140',
  '/simple-accessible.css?v=715140',
  '/home-assistant-contrast.css?v=715140',
  '/captain-experience.css?v=715140',
  '/serenity-ivms.css?v=715140',
  '/technical-live-sync.css?v=715140',
  '/ruuvi-climate.css?v=715140',
  '/movement-presence.css?v=715140',
  '/futuristic-analog-7140.css?v=715140',
  '/dashboard-analog-7141.css?v=715140',
  '/dashboard-premium-7143.css?v=71430',
  '/start-cockpit-7144.css?v=71450',
  '/start-dashboard-71510.css?v=715141',
  '/captain-ux-711.css?v=715140',
  '/wind-direction-71512.css?v=715140',
  '/dashboard-visual-71523.css?v=715240',
  '/dashboard-pro-71531.css?v=715311',
  '/update-prompt.js?v=715260',
  '/auth-bootstrap.js?v=715310',
  '/futuristic-analog-7140.js?v=715140',
  '/dashboard-analog-7141.js?v=715140',
  '/dashboard-premium-7143.js?v=71430',
  '/start-cockpit-7144.js?v=71450',
  '/start-dashboard-71510.js?v=715141',
  '/app.js?v=715140',
  '/receipt-reader-pro.js?v=715140',
  '/mission-control.js?v=715140',
  '/easy-auto.js?v=715140',
  '/auto-track-reliability.js?v=715140',
  '/gps-continuity-guard.js?v=715140',
  '/waterkaarten-split-launch.js?v=715140',
  '/live-split.js?v=715140',
  '/route-control.js?v=715140',
  '/weather-page.js?v=715140',
  '/weather-radar.js?v=715140',
  '/rws-nearby.js?v=715140',
  '/ais-page.js?v=715140',
  '/entertainment-page.js?v=715140',
  '/entertainment-pro-802.js?v=715310',
  '/dashboard-pro-71531-loader.js?v=715311',
  '/dashboard-pro-71531.js?v=715311',
  '/ha-live-bridge.js?v=715140',
  '/ruuvi-climate.js?v=715140',
  '/movement-presence.js?v=715140',
  '/technical-live-sync.js?v=715140',
  '/live-cameras.js?v=715140',
  '/page-swipe.js?v=715140',
  '/navigation-compact.js?v=715140',
  '/simple-accessible.js?v=715140',
  '/device-sync-guard.js?v=715140',
  '/captain-experience.js?v=715140',
  '/serenity-ivms.js?v=715140',
  '/captain-ux-711.js?v=715140',
  '/wind-direction-71512.js?v=715140',
  '/manifest.json?v=715140',
  '/icon-192.png?v=715140',
  '/icon-512.png?v=715140',
  '/waterkaarten-dashboard.png?v=715140',
  '/mijnserenity-logo.png?v=715140',
];

async function cacheFile(cache,path){
  try{
    const response=await fetch(path,{cache:'reload'});
    if(response.ok)await cache.put(path,response);
  }catch(error){
    console.warn('Bestand niet vooraf gecachet:',path,error);
  }
}

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>Promise.all(APP_SHELL.map(path=>cacheFile(cache,path))))
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key.startsWith('mijnserenity-')&&key!==CACHE_NAME)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

function injectUpdatePrompt(html){
  const scripts=[];
  if(!html.includes('update-prompt.js'))scripts.push('<script src="/update-prompt.js?v=715260"></script>');
  if(!html.includes('entertainment-pro-802.js'))scripts.push('<script src="/entertainment-pro-802.js?v=715310"></script>');
  if(!html.includes('dashboard-pro-71531-loader.js'))scripts.push('<script src="/dashboard-pro-71531-loader.js?v=715311"></script>');
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
          fetch('/dashboard-visual-71523.css?v=715240',{cache:'no-store'})
        ]);
        const css=`${base.ok?await base.text():''}\n${visual.ok?await visual.text():''}`;
        return new Response(css,{status:200,headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'}});
      }catch(error){
        return (await caches.match(request))||new Response('',{status:503});
      }
    })());
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(!response.ok)return response;
        const html=injectUpdatePrompt(await response.text());
        const result=new Response(html,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
        const copy=result.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',copy));
        return result;
      }catch(error){
        const cached=await caches.match('/index.html');
        if(cached){
          const html=injectUpdatePrompt(await cached.text());
          return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
        }
        return new Response('<h1>MijnSerenity is tijdelijk offline</h1><p>Open de app opnieuw zodra er verbinding is.</p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }

  event.respondWith(
    fetch(request,{cache:'no-cache'})
      .then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
        }
        return response;
      })
      .catch(async()=>
        (await caches.match(request))||
        new Response('',{status:503,statusText:'Offline'})
      )
  );
});