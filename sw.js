const CACHE_NAME='mijnserenity-7.15.4-ha-filter-scroll';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=71540',
  '/ha-live-bridge.css?v=71540',
  '/live-cameras.css?v=71540',
  '/mission-control.css?v=71540',
  '/easy-auto.css?v=71540',
  '/auto-track-reliability.css?v=71540',
  '/gps-continuity-guard.css?v=71540',
  '/waterkaarten-split-launch.css?v=71540',
  '/live-split.css?v=71540',
  '/route-control.css?v=71540',
  '/page-swipe.css?v=71540',
  '/weather-page.css?v=71540',
  '/weather-radar.css?v=71540',
  '/rws-nearby.css?v=71540',
  '/ais-page.css?v=71540',
  '/entertainment-page.css?v=71540',
  '/navigation-compact.css?v=71540',
  '/simple-accessible.css?v=71540',
  '/home-assistant-contrast.css?v=71540',
  '/captain-experience.css?v=71540',
  '/serenity-ivms.css?v=71540',
  '/technical-live-sync.css?v=71540',
  '/ruuvi-climate.css?v=71540',
  '/movement-presence.css?v=71540',
  '/futuristic-analog-7140.css?v=71540',
  '/dashboard-analog-7141.css?v=71540',
  '/dashboard-premium-7143.css?v=71430',
  '/start-cockpit-7144.css?v=71450',
  '/captain-ux-711.css?v=71540',
  '/auth-bootstrap.js?v=71540',
  '/futuristic-analog-7140.js?v=71540',
  '/dashboard-analog-7141.js?v=71540',
  '/dashboard-premium-7143.js?v=71430',
  '/start-cockpit-7144.js?v=71450',
  '/app.js?v=71540',
  '/receipt-reader-pro.js?v=71540',
  '/mission-control.js?v=71540',
  '/easy-auto.js?v=71540',
  '/auto-track-reliability.js?v=71540',
  '/gps-continuity-guard.js?v=71540',
  '/waterkaarten-split-launch.js?v=71540',
  '/live-split.js?v=71540',
  '/route-control.js?v=71540',
  '/weather-page.js?v=71540',
  '/weather-radar.js?v=71540',
  '/rws-nearby.js?v=71540',
  '/ais-page.js?v=71540',
  '/entertainment-page.js?v=71540',
  '/ha-live-bridge.js?v=71540',
  '/ruuvi-climate.js?v=71540',
  '/movement-presence.js?v=71540',
  '/technical-live-sync.js?v=71540',
  '/live-cameras.js?v=71540',
  '/page-swipe.js?v=71540',
  '/navigation-compact.js?v=71540',
  '/simple-accessible.js?v=71540',
  '/device-sync-guard.js?v=71540',
  '/captain-experience.js?v=71540',
  '/serenity-ivms.js?v=71540',
  '/captain-ux-711.js?v=71540',
  '/manifest.json?v=71540',
  '/icon-192.png?v=71540',
  '/icon-512.png?v=71540',
  '/waterkaarten-dashboard.png?v=71540',
  '/mijnserenity-logo.png?v=71540',
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
      .then(()=>self.skipWaiting())
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

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/.netlify/functions/'))return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request,{cache:'no-store'})
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',copy));
          }
          return response;
        })
        .catch(async()=>
          (await caches.match('/index.html'))||
          new Response('<h1>MijnSerenity is tijdelijk offline</h1><p>Open de app opnieuw zodra er verbinding is.</p>',{
            status:503,
            headers:{'Content-Type':'text/html; charset=utf-8'}
          })
        )
    );
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
