const CACHE_NAME='mijnserenity-7.3.6-auto-track';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=7360',
  '/ha-live-bridge.css?v=7360',
  '/live-cameras.css?v=7360',
  '/mission-control.css?v=7360',
  '/easy-auto.css?v=7360',
  '/auto-track-reliability.css?v=7360',
  '/live-split.css?v=7360',
  '/route-control.css?v=7360',
  '/page-swipe.css?v=7360',
  '/weather-page.css?v=7360',
  '/weather-radar.css?v=7360',
  '/ais-page.css?v=7360',
  '/entertainment-page.css?v=7360',
  '/auth-bootstrap.js?v=7360',
  '/app.js?v=7360',
  '/mission-control.js?v=7360',
  '/easy-auto.js?v=7360',
  '/auto-track-reliability.js?v=7360',
  '/live-split.js?v=7360',
  '/route-control.js?v=7360',
  '/weather-page.js?v=7360',
  '/weather-radar.js?v=7360',
  '/ais-page.js?v=7360',
  '/entertainment-page.js?v=7360',
  '/ha-live-bridge.js?v=7360',
  '/live-cameras.js?v=7360',
  '/page-swipe.js?v=7360',
  '/manifest.json?v=7360',
  '/icon-192.png?v=7360',
  '/icon-512.png?v=7360',
  '/waterkaarten-dashboard.png?v=7360',
  '/mijnserenity-logo.png?v=7360'
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
