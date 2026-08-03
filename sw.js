const CACHE_NAME='mijnserenity-7.9.4-rws-nearby-r1';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=79400',
  '/ha-live-bridge.css?v=79400',
  '/live-cameras.css?v=79400',
  '/mission-control.css?v=79400',
  '/easy-auto.css?v=79400',
  '/auto-track-reliability.css?v=79400',
  '/gps-continuity-guard.css?v=79400',
  '/waterkaarten-split-launch.css?v=79400',
  '/live-split.css?v=79400',
  '/route-control.css?v=79400',
  '/page-swipe.css?v=79400',
  '/weather-page.css?v=79400',
  '/weather-radar.css?v=79400',
  '/rws-nearby.css?v=79400',
  '/ais-page.css?v=79400',
  '/entertainment-page.css?v=79400',
  '/navigation-compact.css?v=79400',
  '/simple-accessible.css?v=79400',
  '/home-assistant-contrast.css?v=79400',
  '/captain-experience.css?v=79400',
  '/serenity-ivms.css?v=79400',
  '/technical-live-sync.css?v=79400',
  '/auth-bootstrap.js?v=79400',
  '/app.js?v=79400',
  '/receipt-reader-pro.js?v=79400',
  '/mission-control.js?v=79400',
  '/easy-auto.js?v=79400',
  '/auto-track-reliability.js?v=79400',
  '/gps-continuity-guard.js?v=79400',
  '/waterkaarten-split-launch.js?v=79400',
  '/live-split.js?v=79400',
  '/route-control.js?v=79400',
  '/weather-page.js?v=79400',
  '/weather-radar.js?v=79400',
  '/rws-nearby.js?v=79400',
  '/ais-page.js?v=79400',
  '/entertainment-page.js?v=79400',
  '/ha-live-bridge.js?v=79400',
  '/technical-live-sync.js?v=79400',
  '/live-cameras.js?v=79400',
  '/page-swipe.js?v=79400',
  '/navigation-compact.js?v=79400',
  '/simple-accessible.js?v=79400',
  '/device-sync-guard.js?v=79400',
  '/captain-experience.js?v=79400',
  '/serenity-ivms.js?v=79400',
  '/manifest.json?v=79400',
  '/icon-192.png?v=79400',
  '/icon-512.png?v=79400',
  '/waterkaarten-dashboard.png?v=79400',
  '/mijnserenity-logo.png?v=79400',
  '/serenity-ivms-hero.png?v=79400'
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
        .catch(()=>caches.match('/index.html'))
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
      .catch(()=>caches.match(request))
  );
});
