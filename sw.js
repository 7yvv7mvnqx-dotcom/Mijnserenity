const CACHE_NAME='mijnserenity-6.7.2';
const APP_SHELL=[
  '/',
  '/index.html',
  '/styles.css?v=6720',
  '/app.js?v=6720',
  '/manifest.json?v=6720',
  '/icon-192.png?v=6720',
  '/icon-512.png?v=6720',
  '/waterkaarten-dashboard.png?v=6720',
  '/mijnserenity-logo.png?v=6720'
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
