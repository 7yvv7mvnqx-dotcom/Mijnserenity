const CACHE_NAME='mijnserenity-7.0.8';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=7080',
  '/mission-control.css?v=7080',
  '/easy-auto.css?v=7080',
  '/live-split.css?v=7080',
  '/route-control.css?v=7080',
  '/page-swipe.css?v=7080',
  '/app.js?v=7080',
  '/mission-control.js?v=7080',
  '/easy-auto.js?v=7080',
  '/live-split.js?v=7080',
  '/route-control.js?v=7080',
  '/page-swipe.js?v=7080',
  '/manifest.json?v=7080',
  '/icon-192.png?v=7080',
  '/icon-512.png?v=7080',
  '/waterkaarten-dashboard.png?v=7080',
  '/mijnserenity-logo.png?v=7080'
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
