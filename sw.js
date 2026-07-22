const CACHE_NAME='mijnserenity-7.5.11-home-assistant-contrast';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=75110',
  '/ha-live-bridge.css?v=75110',
  '/live-cameras.css?v=75110',
  '/mission-control.css?v=75110',
  '/easy-auto.css?v=75110',
  '/auto-track-reliability.css?v=75110',
  '/gps-continuity-guard.css?v=75110',
  '/waterkaarten-split-launch.css?v=75110',
  '/live-split.css?v=75110',
  '/route-control.css?v=75110',
  '/page-swipe.css?v=75110',
  '/weather-page.css?v=75110',
  '/weather-radar.css?v=75110',
  '/ais-page.css?v=75110',
  '/entertainment-page.css?v=75110',
  '/navigation-compact.css?v=75110',
  '/simple-accessible.css?v=75110',
  '/home-assistant-contrast.css?v=75110',
  '/auth-bootstrap.js?v=75110',
  '/app.js?v=75110',
  '/receipt-reader-pro.js?v=75110',
  '/mission-control.js?v=75110',
  '/easy-auto.js?v=75110',
  '/auto-track-reliability.js?v=75110',
  '/gps-continuity-guard.js?v=75110',
  '/waterkaarten-split-launch.js?v=75110',
  '/live-split.js?v=75110',
  '/route-control.js?v=75110',
  '/weather-page.js?v=75110',
  '/weather-radar.js?v=75110',
  '/ais-page.js?v=75110',
  '/entertainment-page.js?v=75110',
  '/ha-live-bridge.js?v=75110',
  '/live-cameras.js?v=75110',
  '/page-swipe.js?v=75110',
  '/navigation-compact.js?v=75110',
  '/simple-accessible.js?v=75110',
  '/device-sync-guard.js?v=75110',
  '/manifest.json?v=75110',
  '/icon-192.png?v=75110',
  '/icon-512.png?v=75110',
  '/waterkaarten-dashboard.png?v=75110',
  '/mijnserenity-logo.png?v=75110'
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
