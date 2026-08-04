const CACHE_NAME='mijnserenity-7.9.6-energy-merged-r1';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=79600',
  '/ha-live-bridge.css?v=79600',
  '/live-cameras.css?v=79600',
  '/mission-control.css?v=79600',
  '/easy-auto.css?v=79600',
  '/auto-track-reliability.css?v=79600',
  '/gps-continuity-guard.css?v=79600',
  '/waterkaarten-split-launch.css?v=79600',
  '/live-split.css?v=79600',
  '/route-control.css?v=79600',
  '/page-swipe.css?v=79600',
  '/weather-page.css?v=79600',
  '/weather-radar.css?v=79600',
  '/rws-nearby.css?v=79600',
  '/ais-page.css?v=79600',
  '/entertainment-page.css?v=79600',
  '/navigation-compact.css?v=79600',
  '/simple-accessible.css?v=79600',
  '/home-assistant-contrast.css?v=79600',
  '/captain-experience.css?v=79600',
  '/serenity-ivms.css?v=79600',
  '/technical-live-sync.css?v=79600',
  '/auth-bootstrap.js?v=79600',
  '/app.js?v=79600',
  '/receipt-reader-pro.js?v=79600',
  '/mission-control.js?v=79600',
  '/easy-auto.js?v=79600',
  '/auto-track-reliability.js?v=79600',
  '/gps-continuity-guard.js?v=79600',
  '/waterkaarten-split-launch.js?v=79600',
  '/live-split.js?v=79600',
  '/route-control.js?v=79600',
  '/weather-page.js?v=79600',
  '/weather-radar.js?v=79600',
  '/rws-nearby.js?v=79600',
  '/ais-page.js?v=79600',
  '/entertainment-page.js?v=79600',
  '/ha-live-bridge.js?v=79600',
  '/technical-live-sync.js?v=79600',
  '/live-cameras.js?v=79600',
  '/page-swipe.js?v=79600',
  '/navigation-compact.js?v=79600',
  '/simple-accessible.js?v=79600',
  '/device-sync-guard.js?v=79600',
  '/captain-experience.js?v=79600',
  '/serenity-ivms.js?v=79600',
  '/manifest.json?v=79600',
  '/icon-192.png?v=79600',
  '/icon-512.png?v=79600',
  '/waterkaarten-dashboard.png?v=79600',
  '/mijnserenity-logo.png?v=79600',
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
