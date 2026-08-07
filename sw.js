const CACHE_NAME='mijnserenity-7.13.2-iphone-fit-r1';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=71100',
  '/ha-live-bridge.css?v=71100',
  '/live-cameras.css?v=71100',
  '/mission-control.css?v=71100',
  '/easy-auto.css?v=71100',
  '/auto-track-reliability.css?v=71100',
  '/gps-continuity-guard.css?v=71100',
  '/waterkaarten-split-launch.css?v=71100',
  '/live-split.css?v=71100',
  '/route-control.css?v=71100',
  '/page-swipe.css?v=71100',
  '/weather-page.css?v=71100',
  '/weather-radar.css?v=71100',
  '/rws-nearby.css?v=71100',
  '/ais-page.css?v=71100',
  '/entertainment-page.css?v=71100',
  '/navigation-compact.css?v=71100',
  '/simple-accessible.css?v=71100',
  '/home-assistant-contrast.css?v=71100',
  '/captain-experience.css?v=71100',
  '/serenity-ivms.css?v=71100',
  '/technical-live-sync.css?v=71100',
  '/ruuvi-climate.css?v=71100',
  '/movement-presence.css?v=71100',
  '/captain-ux-711.css?v=71100',
  '/tank-humor.css?v=71110',
  '/technical-cartoon.css?v=71200',
  '/home-cartoon.css?v=71300',
  '/iphone-compact-7132.css?v=71320',
  '/auth-bootstrap.js?v=71100',
  '/app.js?v=71100',
  '/receipt-reader-pro.js?v=71100',
  '/mission-control.js?v=71100',
  '/easy-auto.js?v=71100',
  '/auto-track-reliability.js?v=71100',
  '/gps-continuity-guard.js?v=71100',
  '/waterkaarten-split-launch.js?v=71100',
  '/live-split.js?v=71100',
  '/route-control.js?v=71100',
  '/weather-page.js?v=71100',
  '/weather-radar.js?v=71100',
  '/rws-nearby.js?v=71100',
  '/ais-page.js?v=71100',
  '/entertainment-page.js?v=71100',
  '/ha-live-bridge.js?v=71100',
  '/ruuvi-climate.js?v=71100',
  '/movement-presence.js?v=71100',
  '/technical-live-sync.js?v=71100',
  '/live-cameras.js?v=71100',
  '/page-swipe.js?v=71100',
  '/navigation-compact.js?v=71100',
  '/simple-accessible.js?v=71100',
  '/device-sync-guard.js?v=71100',
  '/captain-experience.js?v=71100',
  '/serenity-ivms.js?v=71100',
  '/captain-ux-711.js?v=71100',
  '/tank-humor.js?v=71110',
  '/technical-cartoon.js?v=71200',
  '/home-cartoon.js?v=71300',
  '/manifest.json?v=71100',
  '/icon-192.png?v=71100',
  '/icon-512.png?v=71100',
  '/waterkaarten-dashboard.png?v=71100',
  '/mijnserenity-logo.png?v=71100',
  '/tank-water-full.svg',
  '/tank-water-good.svg',
  '/tank-water-mid.svg',
  '/tank-water-low.svg',
  '/tank-water-empty.svg',
  '/tank-waste-empty.svg',
  '/tank-waste-good.svg',
  '/tank-waste-mid.svg',
  '/tank-waste-high.svg',
  '/tank-waste-full.svg',
  '/tech-engine-good.svg',
  '/tech-engine-warn.svg',
  '/tech-battery-good.svg',
  '/tech-battery-warn.svg',
  '/tech-battery-crit.svg',
  '/tech-fuel-good.svg',
  '/tech-fuel-warn.svg',
  '/tech-fuel-crit.svg',
  '/tech-solar-good.svg',
  '/tech-solar-idle.svg',
  '/tech-system-good.svg',
  '/tech-system-warn.svg',
  '/tech-system-crit.svg',
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
