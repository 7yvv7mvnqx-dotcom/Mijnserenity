const CACHE_NAME='mijnserenity-7.4.7-dashboard-route-guard';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=7470',
  '/ha-live-bridge.css?v=7470',
  '/live-cameras.css?v=7470',
  '/mission-control.css?v=7470',
  '/easy-auto.css?v=7470',
  '/auto-track-reliability.css?v=7470',
  '/gps-continuity-guard.css?v=7470',
  '/waterkaarten-split-launch.css?v=7470',
  '/live-split.css?v=7470',
  '/route-control.css?v=7470',
  '/page-swipe.css?v=7470',
  '/weather-page.css?v=7470',
  '/weather-radar.css?v=7470',
  '/ais-page.css?v=7470',
  '/entertainment-page.css?v=7470',
  '/navigation-compact.css?v=7470',
  '/auth-bootstrap.js?v=7470',
  '/app.js?v=7470',
  '/receipt-reader-pro.js?v=7470',
  '/mission-control.js?v=7470',
  '/easy-auto.js?v=7470',
  '/auto-track-reliability.js?v=7470',
  '/gps-continuity-guard.js?v=7470',
  '/waterkaarten-split-launch.js?v=7470',
  '/live-split.js?v=7470',
  '/route-control.js?v=7470',
  '/weather-page.js?v=7470',
  '/weather-radar.js?v=7470',
  '/ais-page.js?v=7470',
  '/entertainment-page.js?v=7470',
  '/ha-live-bridge.js?v=7470',
  '/live-cameras.js?v=7470',
  '/page-swipe.js?v=7470',
  '/navigation-compact.js?v=7470',
  '/manifest.json?v=7470',
  '/icon-192.png?v=7470',
  '/icon-512.png?v=7470',
  '/waterkaarten-dashboard.png?v=7470',
  '/mijnserenity-logo.png?v=7470'
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
