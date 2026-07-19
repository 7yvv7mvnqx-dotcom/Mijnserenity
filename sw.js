const CACHE_NAME='mijnserenity-7.4.6-policy-periodic-cost-guard';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=7460',
  '/ha-live-bridge.css?v=7460',
  '/live-cameras.css?v=7460',
  '/mission-control.css?v=7460',
  '/easy-auto.css?v=7460',
  '/auto-track-reliability.css?v=7460',
  '/gps-continuity-guard.css?v=7460',
  '/waterkaarten-split-launch.css?v=7460',
  '/live-split.css?v=7460',
  '/route-control.css?v=7460',
  '/page-swipe.css?v=7460',
  '/weather-page.css?v=7460',
  '/weather-radar.css?v=7460',
  '/ais-page.css?v=7460',
  '/entertainment-page.css?v=7460',
  '/navigation-compact.css?v=7460',
  '/auth-bootstrap.js?v=7460',
  '/app.js?v=7460',
  '/receipt-reader-pro.js?v=7460',
  '/mission-control.js?v=7460',
  '/easy-auto.js?v=7460',
  '/auto-track-reliability.js?v=7460',
  '/gps-continuity-guard.js?v=7460',
  '/waterkaarten-split-launch.js?v=7460',
  '/live-split.js?v=7460',
  '/route-control.js?v=7460',
  '/weather-page.js?v=7460',
  '/weather-radar.js?v=7460',
  '/ais-page.js?v=7460',
  '/entertainment-page.js?v=7460',
  '/ha-live-bridge.js?v=7460',
  '/live-cameras.js?v=7460',
  '/page-swipe.js?v=7460',
  '/navigation-compact.js?v=7460',
  '/manifest.json?v=7460',
  '/icon-192.png?v=7460',
  '/icon-512.png?v=7460',
  '/waterkaarten-dashboard.png?v=7460',
  '/mijnserenity-logo.png?v=7460'
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
