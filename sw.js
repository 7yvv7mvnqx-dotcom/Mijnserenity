const CACHE_NAME='mijnserenity-7.1.2-embed';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=7112',
  '/mission-control.css?v=7112',
  '/easy-auto.css?v=7112',
  '/live-split.css?v=7112',
  '/route-control.css?v=7112',
  '/page-swipe.css?v=7112',
  '/weather-page.css?v=7112',
  '/weather-radar.css?v=7112',
  '/ais-page.css?v=7112',
  '/entertainment-page.css?v=7112',
  '/app.js?v=7112',
  '/mission-control.js?v=7112',
  '/easy-auto.js?v=7112',
  '/live-split.js?v=7112',
  '/route-control.js?v=7112',
  '/weather-page.js?v=7112',
  '/weather-radar.js?v=7112',
  '/ais-page.js?v=7112',
  '/entertainment-page.js?v=7112',
  '/page-swipe.js?v=7112',
  '/manifest.json?v=7112',
  '/icon-192.png?v=7112',
  '/icon-512.png?v=7112',
  '/waterkaarten-dashboard.png?v=7112',
  '/mijnserenity-logo.png?v=7112'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL))
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

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',copy));
          return response;
        })
        .catch(()=>caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request)
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
