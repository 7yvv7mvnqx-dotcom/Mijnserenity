const CACHE_NAME='mijnserenity-7.4.0-auto-track';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=7390',
  '/ha-live-bridge.css?v=7390',
  '/live-cameras.css?v=7390',
  '/mission-control.css?v=7390',
  '/easy-auto.css?v=7390',
  '/auto-track-reliability.css?v=7390',
  '/gps-continuity-guard.css?v=7390',
  '/waterkaarten-split-launch.css?v=7390',
  '/live-split.css?v=7390',
  '/route-control.css?v=7390',
  '/page-swipe.css?v=7390',
  '/weather-page.css?v=7390',
  '/weather-radar.css?v=7390',
  '/ais-page.css?v=7390',
  '/entertainment-page.css?v=7390',
  '/auth-bootstrap.js?v=7390',
  '/app.js?v=7390',
  '/mission-control.js?v=7390',
  '/easy-auto.js?v=7390',
  '/auto-track-reliability.js?v=7390',
  '/gps-continuity-guard.js?v=7390',
  '/waterkaarten-split-launch.js?v=7390',
  '/live-split.js?v=7390',
  '/route-control.js?v=7390',
  '/weather-page.js?v=7390',
  '/weather-radar.js?v=7390',
  '/ais-page.js?v=7390',
  '/entertainment-page.js?v=7390',
  '/ha-live-bridge.js?v=7390',
  '/live-cameras.js?v=7390',
  '/page-swipe.js?v=7390',
  '/manifest.json?v=7390',
  '/icon-192.png?v=7390',
  '/icon-512.png?v=7390',
  '/waterkaarten-dashboard.png?v=7390',
  '/mijnserenity-logo.png?v=7390'
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
